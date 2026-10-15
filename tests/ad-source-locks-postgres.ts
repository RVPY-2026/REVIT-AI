import assert from "node:assert/strict";
import { setTimeout as delay } from "node:timers/promises";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as orm from "drizzle-orm";
import * as schema from "../src/server/db/schema";
import * as permissions from "../src/lib/auth/permissions";
import * as leadSchema from "../src/lib/schemas/lead";
import * as sourceSchema from "../src/lib/schemas/ad-source";
import * as studentCode from "../src/lib/student-code";
import * as phone from "../src/lib/phone";
import { loadServerModule } from "./helpers/server-module";
import { readMigrations } from "./helpers/db-migrations";
import { withLocalPostgres } from "./helpers/local-postgres";

function gate() { let resolve!: () => void; const promise = new Promise<void>((r) => { resolve = r; }); return { promise, resolve }; }

// Run explicitly with tsx --conditions=react-server. This creates an ephemeral
// loopback-only database and ignores every project/live DATABASE_URL variable.
withLocalPostgres(async (url) => {
  const sql = postgres(url, { max: 8, prepare: false, connection: { application_name: "rvpy-source-locks" } });
  const conn = drizzle(sql, { schema, casing: "snake_case" });
  const releaseSignups = gate(); const bothReadSource = gate(); const releaseDeactivation = gate();
  const pending: Promise<unknown>[] = [];
  try {
    for (const migration of await readMigrations()) await sql.unsafe(migration.sql);
    const [actor] = await conn.insert(schema.users).values({ name: "Fixture admin", email: "locks@example.invalid" }).returning();
    const admin: permissions.SessionUser = { id: actor.id, name: actor.name, email: actor.email, avatarUrl: null, roles: ["admin"], sourceIds: [], studentId: null };
    const sources = await conn.insert(schema.adSources).values([{ code: "A", name: "Fixture A" }, { code: "R", name: "Fixture R" }]).returning();
    const source = sources.find((s) => s.code === "A")!;
    const common = { "drizzle-orm": orm, "@/server/db": { db: conn }, "@/server/db/schema": schema, "@/lib/auth/permissions": permissions };
    const audit = await loadServerModule<typeof import("../src/server/audit")>("src/server/audit.ts", common);
    const scope = await loadServerModule<typeof import("../src/server/auth/scope")>("src/server/auth/scope.ts", common);
    const deps = { ...common, "@/server/audit": audit, "@/server/auth/scope": scope };
    const records = await loadServerModule<typeof import("../src/server/ad-source-record")>("src/server/ad-source-record.ts", { ...deps, "@/lib/schemas/ad-source": sourceSchema });
    const leads = await loadServerModule<typeof import("../src/server/lead-record")>("src/server/lead-record.ts", { ...deps, "@/lib/student-code": studentCode });
    const phones = await loadServerModule<typeof import("../src/server/phone-matches")>("src/server/phone-matches.ts", { ...deps, "@/lib/phone": phone, "@/lib/schemas/lead": leadSchema });
    let entrants = 0; let token = 0;
    const actions = await loadServerModule<typeof import("../src/server/actions/leads")>("src/server/actions/leads.ts", {
      ...deps, "@/server/phone-matches": phones, "@/lib/schemas/lead": leadSchema, "@/lib/runtime-mode": { USE_MOCK: false },
      "@/server/auth/session": { requirePermission: async () => admin }, "@/server/env": { serverEnv: {} },
      "next/headers": { headers: async () => new Headers(), cookies: async () => ({ get: () => undefined, set: () => undefined }) },
      "next/cache": { revalidatePath: () => undefined },
      "@/server/lead-record": { ...leads, insertLeadRecord: async (...args: Parameters<typeof leads.insertLeadRecord>) => {
        if (++entrants <= 2) { if (entrants === 2) bothReadSource.resolve(); await releaseSignups.promise; }
        return leads.insertLeadRecord(...args);
      } },
      "@/server/signup-session": { SIGNUP_COOKIE: "fixture", getSignupSession: async () => null, newSignupToken: () => `fixture-${++token}`,
        hashSignupToken: (value: string) => value, SIGNUP_SESSION_SECONDS: 100 },
      "@/server/signup-protection": { requireSignupLimits: async () => undefined, validateSignupCaptcha: async () => undefined,
        signupClientIp: () => "fixture", SignupProtectionError: class extends Error {} },
    });
    const signup = (suffix: number) => actions.submitLeadSignup({ sourceCode: "A", fullName: "Fixture public", phone: `090100000${suffix}`,
      email: `fixture${suffix}@gmail.com`, occupation: "Đang đi làm", birthYear: 1995, specialty: "Kiến trúc", hometown: "Fixture",
      organization: "Fixture", facebookLink: "https://example.invalid", answers: {} });
    const change = (active: boolean) => ({ id: source.id, name: source.name, ownerUserId: null, active, expectedName: source.name,
      expectedOwnerUserId: null, expectedActive: !active });
    const waitForLock = async () => {
      const deadline = Date.now() + 5000;
      while (Date.now() < deadline) {
        const rows = await sql`select count(*)::int n from pg_stat_activity where application_name = 'rvpy-source-locks' and wait_event_type = 'Lock'`;
        if (rows[0].n > 0) return;
        await delay(20);
      }
      throw new Error("Expected a transaction waiting on the source lock");
    };
    const first = signup(1); const second = signup(2); pending.push(first, second);
    await Promise.race([bothReadSource.promise, delay(5000).then(() => { throw new Error("Signups serialized their source reads"); })]);
    let deactivated = false;
    const deactivate = conn.transaction(async (tx) => { await records.updateSourceRecord(tx as never, admin, change(false)); deactivated = true; });
    pending.push(deactivate); await waitForLock(); assert.equal(deactivated, false);
    releaseSignups.resolve();
    for (const result of await Promise.all([first, second])) { assert.equal(result.ok, true); if (result.ok) assert.match(result.data.code, /^A/); }
    await deactivate; assert.equal(deactivated, true);
    assert.equal((await conn.select().from(schema.students).where(orm.eq(schema.students.sourceId, source.id))).length, 2);
    await conn.transaction((tx) => records.updateSourceRecord(tx as never, admin, change(true)));
    const changed = gate();
    const deactivateFirst = conn.transaction(async (tx) => { await records.updateSourceRecord(tx as never, admin, change(false)); changed.resolve(); await releaseDeactivation.promise; });
    pending.push(deactivateFirst); await changed.promise;
    const later = signup(3); pending.push(later); await waitForLock(); releaseDeactivation.resolve(); await deactivateFirst;
    const fallback = await later; assert.equal(fallback.ok, true); if (fallback.ok) assert.match(fallback.data.code, /^R/);
    console.log(JSON.stringify({ passed: true, postgres: "ephemeral loopback cluster", checks: ["two public signups hold compatible source locks", "source deactivation waits for both signups", "signup waits for deactivation then falls back to R"] }));
  } finally {
    releaseSignups.resolve(); releaseDeactivation.resolve(); await Promise.allSettled(pending); await sql.end({ timeout: 5 });
  }
}).catch((error: unknown) => { console.error(error); process.exitCode = 1; });
