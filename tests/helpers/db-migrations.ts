import { readFile, readdir } from "node:fs/promises";

/** Read every committed migration in journal order; never silently omit new migrations. */
export async function readMigrations() {
  const directory = new URL("../../src/server/db/migrations/", import.meta.url);
  const journal = JSON.parse(await readFile(new URL("meta/_journal.json", directory), "utf8")) as {
    entries: { idx: number; tag: string }[];
  };
  const files = (await readdir(directory)).filter((name) => name.endsWith(".sql")).sort();
  const expected = journal.entries.map((entry, index) => {
    if (entry.idx !== index) throw new Error(`Out-of-order migration: ${entry.tag}`);
    return `${entry.tag}.sql`;
  });
  if (JSON.stringify(files) !== JSON.stringify(expected)) throw new Error("Migration files and journal disagree");
  return Promise.all(files.map(async (name) => ({ name, sql: await readFile(new URL(name, directory), "utf8") })));
}
