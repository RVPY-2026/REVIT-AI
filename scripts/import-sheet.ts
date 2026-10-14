import { config } from "dotenv";
import { readFile } from "node:fs/promises";

config({ path: ".env.local" });

/**
 * Command-line twin of the admin page "Nhập dữ liệu" (BACKEND_RULES §7).
 *   pnpm db:import "<file.xlsx>"                    report only, writes nothing
 *   pnpm db:import "<file.xlsx>" --commit           add new students
 *   pnpm db:import "<file.xlsx>" --commit --update  also fill gaps / follow untouched statuses of existing students
 */
async function main() {
  const file = process.argv[2];
  const commit = process.argv.includes("--commit");
  const update = process.argv.includes("--update");
  if (!file) throw new Error('Usage: pnpm db:import "<sheet.xlsx>" [--commit] [--update]');

  const { parseStudentSheet, planStudentImport, applyStudentImport } = await import("../src/server/import/student-sheet");
  const buffer = await readFile(file);
  const plan = await planStudentImport(await parseStudentSheet(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer));
  const { issues } = plan.parse;
  console.log(JSON.stringify({
    mode: commit ? "COMMIT" : "DRY RUN (nothing is written)",
    new: plan.newRows.length, alreadyInDatabase: plan.existingCount,
    existingWithChanges: plan.changes.length, statusFollowsSheet: plan.changes.filter((c) => c.statusChange).length,
    statusKeptBecauseEditedOnSite: plan.changes.filter((c) => c.statusConflict).length,
    sourcesToCreate: plan.missingSources,
    problemRows: { badCodeOrName: issues.badCode, badPhone: issues.badPhone, unknownStatus: issues.unknownStatus, duplicateCode: issues.duplicateCode },
  }, null, 2));
  if (!commit) { console.log("\nRe-run with --commit to write."); return; }
  console.log(JSON.stringify(await applyStudentImport(plan, null, update), null, 2));
}

main().then(() => process.exit(0)).catch((error) => { console.error(error instanceof Error ? error.message : error); process.exit(1); });
