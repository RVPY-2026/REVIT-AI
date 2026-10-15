import { readFile } from "node:fs/promises";

/** Apply the actual committed journal to an isolated fixture; never connects to the app DB. */
export async function migrateTestDatabase(pg: { exec: (sql: string) => Promise<unknown> }, startAt = 0) {
  const root = new URL("../../src/server/db/migrations/", import.meta.url);
  const journal = JSON.parse(await readFile(new URL("meta/_journal.json", root), "utf8")) as { entries: { idx: number; tag: string }[] };
  for (const entry of journal.entries.filter(entry => entry.idx >= startAt))
    await pg.exec(await readFile(new URL(`${entry.tag}.sql`, root), "utf8"));
}
