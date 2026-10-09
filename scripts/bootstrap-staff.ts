import { config } from "dotenv";
import { readFile } from "node:fs/promises";
import { eq } from "drizzle-orm";
import { staffBootstrapSchema } from "../src/lib/schemas/staff-bootstrap";

config({ path: ".env.local" });

async function main() {
  const file = process.argv[2];
  if (!file)
    throw new Error("Usage: pnpm db:staff <private JSON file outside Git>");
  const input = staffBootstrapSchema.parse(
    JSON.parse(await readFile(file, "utf8")),
  );
  const { db } = await import("../src/server/db");
  const { users, userRoles, adSources } =
    await import("../src/server/db/schema");
  const { audit } = await import("../src/server/audit");
  await db.transaction(async (tx) => {
    const ids = new Map<string, string>();
    for (const person of input.staff) {
      await tx
        .insert(users)
        .values({ email: person.email, name: person.name })
        .onConflictDoNothing({ target: users.email });
      const [user] = await tx
        .select({ id: users.id, disabledAt: users.disabledAt })
        .from(users)
        .where(eq(users.email, person.email));
      if (user.disabledAt)
        throw new Error(
          "A requested staff account is disabled; review it before granting roles",
        );
      ids.set(person.email, user.id);
      const granted = await tx
        .insert(userRoles)
        .values(
          [...new Set(person.roles)].map((role) => ({ userId: user.id, role })),
        )
        .onConflictDoNothing()
        .returning({ role: userRoles.role });
      if (granted.length)
        await audit(tx, {
          actorId: null,
          action: "staff.bootstrapped",
          entity: "users",
          entityId: user.id,
          data: { roles: granted.map((row) => row.role) },
        });
    }
    for (const source of input.sources) {
      const ownerUserId = ids.get(source.ownerEmail)!;
      const [existing] = await tx
        .select({ id: adSources.id, ownerUserId: adSources.ownerUserId })
        .from(adSources)
        .where(eq(adSources.code, source.code));
      if (existing?.ownerUserId && existing.ownerUserId !== ownerUserId)
        throw new Error(
          "Source is already assigned to another staff account; review ownership before changing it",
        );
      if (existing?.ownerUserId === ownerUserId) continue;
      const [row] = await tx
        .insert(adSources)
        .values({ code: source.code, name: source.name, ownerUserId })
        .onConflictDoUpdate({ target: adSources.code, set: { ownerUserId } })
        .returning({ id: adSources.id });
      await audit(tx, {
        actorId: null,
        action: "source.bootstrapped",
        entity: "ad_sources",
        entityId: row.id,
      });
    }
  });
  console.log(
    `Staff setup complete: ${input.staff.length} accounts, ${input.sources.length} owned sources`,
  );
  process.exit(0);
}

main().catch((error: unknown) => {
  const cause = error instanceof Error ? error.cause : undefined;
  const code =
    cause && typeof cause === "object" && "code" in cause
      ? String(cause.code)
      : error instanceof Error
        ? error.name
        : "UnknownError";
  console.error(
    `Staff setup failed (${code}). Check the private JSON and database configuration; no partial changes were committed.`,
  );
  process.exit(1);
});
