import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { can, type SessionUser } from "@/lib/auth/permissions";
import { STUDENT_DELETION_REFERENCES, studentDeletionStateBlockers } from "@/lib/student-deletion";
import { studentScope } from "@/server/auth/scope";
import type { Db } from "@/server/db";
import { students } from "@/server/db/schema";

type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

/** Fail closed if a migration adds an incoming FK without a retention decision. */
export async function assertStudentDeletionForeignKeys(connection: Db | Tx) {
  const references = await connection.execute<{ table_name: string; column_name: string }>(sql`
    select relation.relname as table_name, attribute.attname as column_name
    from pg_catalog.pg_constraint constraint_row
    join pg_catalog.pg_class relation on relation.oid = constraint_row.conrelid
    join pg_catalog.pg_namespace namespace on namespace.oid = relation.relnamespace
    cross join lateral unnest(constraint_row.conkey) column_key(attnum)
    join pg_catalog.pg_attribute attribute on attribute.attrelid = relation.oid and attribute.attnum = column_key.attnum
    where constraint_row.contype = 'f' and constraint_row.confrelid = 'public.students'::regclass
      and namespace.nspname = 'public'
  `);
  const rows = Array.isArray(references) ? references : (references as unknown as { rows: { table_name: string; column_name: string }[] }).rows;
  const actual = rows.map(row => `${row.table_name}.${row.column_name}`).sort();
  const expected = STUDENT_DELETION_REFERENCES.map(row => `${row.table}.${row.column}`).sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error("Student deletion FK decisions are incomplete");
}

/** The caller holds FOR UPDATE on the scoped parent before using this for a delete. */
export async function studentDeletionBlockers(connection: Db | Tx, user: SessionUser,
  row: { id: string; archivedAt: Date | null; userId: string | null }) {
  if (!can(user, "students.delete")) throw new Error("Forbidden");
  await assertStudentDeletionForeignKeys(connection);
  const decisions = STUDENT_DELETION_REFERENCES.filter(reference => reference.decision === "block");
  const selection = Object.fromEntries(decisions.map(reference => [reference.table,
    sql<boolean>`exists(select 1 from ${sql.identifier(reference.table)} where ${sql.identifier(reference.column)} = ${row.id} ${reference.table === "students" ? sql`and ${studentScope(user, "management")}` : sql``})`,
  ]));
  // Preserve Postgres timestamp precision at the destructive 30-day boundary.
  selection.retentionReady = sql<boolean>`${students.archivedAt} <= current_timestamp - interval '30 days'`;
  const [flags] = await connection.select(selection).from(students)
    .where(and(eq(students.id, row.id), studentScope(user, "management"))).limit(1);
  if (!flags) return ["Không tìm thấy học viên."];
  return [...studentDeletionStateBlockers({ ...row, retentionReady: flags.retentionReady === true }), ...decisions.filter(reference => flags[reference.table]).map(reference => reference.message)];
}
