import { config } from "dotenv";
import postgres from "postgres";
import { ZALO_OUTBOX_CRON_COMMAND } from "../src/lib/zalo-cron";

config({ path: ".env.local", quiet: true });
class SchedulerSetupError extends Error {}

/** Supabase Cron works independently of the Vercel Hobby daily cron limit. No messages are sent by setup. */
async function main() {
  const connectionUrl = process.env.DATABASE_URL_DIRECT;
  if (!connectionUrl) throw new SchedulerSetupError("Set DATABASE_URL_DIRECT before configuring the scheduler.");
  const sql = postgres(connectionUrl, { prepare: false, max: 1, connect_timeout: 10 });
  try {
    const extensions = await sql<{ extname: string }[]>`select extname from pg_extension where extname in ('pg_cron', 'pg_net', 'supabase_vault')`;
    const installed = new Set(extensions.map((row) => row.extname));
    if (!["pg_cron", "pg_net", "supabase_vault"].every((name) => installed.has(name)))
      throw new SchedulerSetupError("Enable Supabase Cron (pg_cron), pg_net and Vault in the Supabase dashboard first.");
    if (!process.argv.includes("--apply")) {
      const jobs = await sql<{ active: boolean }[]>`select active from cron.job where jobname = 'rvpy-zalo-outbox'`;
      console.log(JSON.stringify({ extensionsReady: true, schedulerConfigured: Boolean(jobs.length), active: jobs[0]?.active ?? false }));
      return;
    }
    const origin = new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "");
    if (origin.protocol !== "https:" || origin.username || origin.password || origin.search || origin.hash || origin.pathname !== "/")
      throw new SchedulerSetupError("NEXT_PUBLIC_SITE_URL must be the deployed public HTTPS origin.");
    const secret = process.env.CRON_SECRET;
    if (!secret || secret.length < 16) throw new SchedulerSetupError("Set CRON_SECRET to the same value as the deployed worker.");
    await sql.begin(async (tx) => {
      await tx`select pg_advisory_xact_lock(hashtext('rvpy-zalo-scheduler-setup'))`;
      for (const [name, value] of [["rvpy_zalo_worker_url", new URL("/api/cron/zalo-outbox", origin).href], ["rvpy_zalo_worker_secret", secret]]) {
        const [existing] = await tx<{ id: string }[]>`select id from vault.secrets where name = ${name}`;
        if (existing) await tx`select vault.update_secret(${existing.id}::uuid, ${value}, ${name})`;
        else await tx`select vault.create_secret(${value}, ${name})`;
      }
      await tx`select cron.schedule('rvpy-zalo-outbox', '* * * * *', ${ZALO_OUTBOX_CRON_COMMAND})`;
      const [job] = await tx<{ active: boolean; schedule: string }[]>`select active, schedule from cron.job where jobname = 'rvpy-zalo-outbox'`;
      if (!job?.active || job.schedule !== "* * * * *") throw new SchedulerSetupError("Scheduler verification failed.");
    });
    console.log("Supabase Zalo worker scheduled every minute. Inspect pg_net responses and worker logs after deployment.");
  } finally { await sql.end({ timeout: 1 }); }
}

main().catch((error) => {
  // Postgres errors can embed SQL parameters, including secrets. Never print the driver error.
  console.error(error instanceof SchedulerSetupError ? error.message : "Scheduler setup failed. Check database connectivity and the public HTTPS origin. No credentials are printed.");
  process.exitCode = 1;
});
