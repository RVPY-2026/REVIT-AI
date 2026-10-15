import { readMigrations } from "./db-migrations";

/** Apply the committed journal, including the shared migration file/order checks. */
export async function migrateTestDatabase(pg: { exec: (sql: string) => Promise<unknown> }, startAt = 0) {
  for (const migration of (await readMigrations()).slice(startAt)) await pg.exec(migration.sql);
}
