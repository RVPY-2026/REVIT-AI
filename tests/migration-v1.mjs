import assert from "node:assert/strict";
import { readMigrations } from "./helpers/db-migrations.ts";
import { pathToFileURL } from "node:url";
import { createRequire } from "node:module";
import { loadServerModule } from "./helpers/server-module.ts";
import * as permissions from "../src/lib/auth/permissions.ts";
import * as studentCode from "../src/lib/student-code.ts";
import { FOUNDATION_LESSONS } from "../src/server/db/seed/lessons.ts";
import schema from "../src/server/db/schema/index.ts";

if (!process.env.RVPY_PGLITE_MODULE) throw new Error("Set RVPY_PGLITE_MODULE to temporary PGlite dist/index.js");
const { PGlite } = await import(pathToFileURL(process.env.RVPY_PGLITE_MODULE).href);
const { drizzle } = createRequire(import.meta.url)("drizzle-orm/pglite");
const pg = await PGlite.create();
const orm = drizzle(pg, { casing: "snake_case" });
const dependencies = { "drizzle-orm": createRequire(import.meta.url)("drizzle-orm"), "@/server/db": { db: orm },
  "@/server/db/schema": schema, "@/lib/auth/permissions": permissions, "@/lib/student-code": studentCode };
const audit = await loadServerModule("src/server/audit.ts", dependencies);
const scope = await loadServerModule("src/server/auth/scope.ts", dependencies);
const recordDependencies = { ...dependencies, "@/server/audit": audit, "@/server/auth/scope": scope };
const { insertLeadRecord } = await loadServerModule("src/server/lead-record.ts", recordDependencies);
const { enrollStudent } = await loadServerModule("src/server/enrollment-record.ts", { ...recordDependencies,
  // This migration/CRM runner never delivers messages. Outbox transitions have
  // their own isolated integration tests; do not import the live DB boundary.
  "@/server/zalo/outbox": { queueTrialThanks: async () => undefined } });
try {
  const migrations = await readMigrations();
  await pg.exec(migrations[0].sql);
  assert.deepEqual((await pg.query("SELECT count(*)::int n, bool_and(relrowsecurity) rls FROM pg_class WHERE relnamespace='public'::regnamespace AND relkind='r'")).rows, [{ n: 16, rls: true }]);
  for (const migration of migrations.slice(1)) await pg.exec(migration.sql);
  const actorId = (await pg.query("INSERT INTO users(email,name) VALUES ('admin@example.com','Test admin') RETURNING id")).rows[0].id;
  const source = (await pg.query("INSERT INTO ad_sources(code,name) VALUES ('R','Test source') RETURNING id,code")).rows[0];
  const user = { id: actorId, roles: ["admin"], sourceIds: [], studentId: null };
  const lead = { fullName: "Test Person", phone: "0901234567" };
  const signup = () => orm.transaction(tx => insertLeadRecord(tx, source, lead, {}, null));
  const first = await signup();
  await assert.rejects(signup(), /đã đăng ký/);
  assert.equal((await pg.query("SELECT next_seq FROM source_month_counters")).rows[0].next_seq, 2);
  await pg.query("UPDATE students SET signed_up_at=now()-interval '6 minutes' WHERE id=$1", [first.id]);
  const later = await signup();
  assert.notEqual(later.id, first.id);
  const manual = await orm.transaction(tx => insertLeadRecord(tx, source, lead, {}, actorId));
  assert.notEqual(manual.id, later.id);
  await assert.rejects(orm.transaction(tx => enrollStudent(tx, user, first.id)), /3 bài/);
  assert.equal((await pg.query("SELECT status FROM students WHERE id=$1", [first.id])).rows[0].status, "new");
  assert.equal((await pg.query("SELECT count(*)::int n FROM enrollments")).rows[0].n, 0);
  await orm.insert(schema.lessons).values(FOUNDATION_LESSONS.map(row => ({ ...row, phase: "foundation" })));
  await orm.transaction(tx => enrollStudent(tx, user, first.id));
  let enrollment = (await pg.query("SELECT * FROM enrollments WHERE student_id=$1", [first.id])).rows[0];
  assert.equal(enrollment.kind, "trial");
  assert.equal((await pg.query("SELECT status FROM students WHERE id=$1", [first.id])).rows[0].status, "trial");
  const before = (await pg.query("SELECT title,base_days FROM study_plan_lessons WHERE enrollment_id=$1 ORDER BY sort_order", [enrollment.id])).rows;
  await pg.exec("UPDATE lessons SET title='Edited template',base_days=9");
  await orm.transaction(tx => enrollStudent(tx, user, first.id, { agreedFeeVnd: 4500000 }));
  enrollment = (await pg.query("SELECT * FROM enrollments WHERE student_id=$1", [first.id])).rows[0];
  assert.equal(enrollment.kind, "formal");
  assert.equal((await pg.query("SELECT status FROM students WHERE id=$1", [first.id])).rows[0].status, "enrolled");
  assert.deepEqual((await pg.query("SELECT title,base_days FROM study_plan_lessons WHERE enrollment_id=$1 ORDER BY sort_order", [enrollment.id])).rows, before);
  await assert.rejects(orm.transaction(tx => enrollStudent(tx, user, first.id)), /chính thức/);
  const sale = { ...user, roles: ["sale"], sourceIds: [source.id] };
  await assert.rejects(orm.transaction(tx => enrollStudent(tx, sale, later.id, { agreedFeeVnd: 1 })), /quyền/);
  await assert.rejects(orm.transaction(tx => enrollStudent(tx, { ...sale, sourceIds: [] }, later.id)), /tìm thấy/);
  await pg.query("INSERT INTO payments(student_id,enrollment_id,amount_vnd,paid_at) VALUES ($1,$2,4500000,now())", [first.id,enrollment.id]);
  await assert.rejects(pg.query("INSERT INTO payments(student_id,enrollment_id,amount_vnd,paid_at) VALUES ($1,$2,1,now())", [later.id,enrollment.id]), /payments_enrollment_student_fk/);
  await assert.rejects(pg.exec("INSERT INTO learning_resources(title) VALUES ('Missing origin')"), /one_origin/);
  await assert.rejects(pg.exec("INSERT INTO learning_resources(title,bucket,object_path,external_url) VALUES ('Both','private','a.pdf','https://youtube.com/embed/abcdefghijk')"), /one_origin/);
  await assert.rejects(pg.exec("INSERT INTO learning_resources(title,external_url) VALUES ('Drive','https://drive.google.com/test')"), /external_provider/);
  await pg.exec("INSERT INTO learning_resources(title,bucket,object_path) VALUES ('Private','materials','a.pdf'); INSERT INTO learning_resources(title,external_url) VALUES ('Video','https://www.youtube-nocookie.com/embed/abcdefghijk')");
  await assert.rejects(pg.query("INSERT INTO student_status_events(student_id,to_status) VALUES ($1,'paid')", [first.id]), /student_status/);
  assert.equal((await pg.query("SELECT status FROM enrollments WHERE id=$1", [enrollment.id])).rows[0].status, "active");
  const allocate = (month) => pg.query(`INSERT INTO source_month_counters(source_id,code_month,next_seq)
    VALUES ($1,$2,2) ON CONFLICT(source_id,code_month) DO UPDATE
    SET next_seq=source_month_counters.next_seq+1 WHERE source_month_counters.next_seq<=999 RETURNING next_seq-1 seq`, [source.id,month]);
  assert.equal((await allocate("9911")).rows[0].seq, 1);
  await pg.query("UPDATE source_month_counters SET next_seq=999 WHERE source_id=$1 AND code_month='9911'", [source.id]);
  assert.equal((await allocate("9911")).rows[0].seq, 999);
  assert.equal((await allocate("9911")).rows.length, 0);
  assert.equal((await allocate("9912")).rows[0].seq, 1);
  await assert.rejects(pg.exec("INSERT INTO feedback(kind,addin_score) VALUES ('addin',11)"), /feedback_scores_range/);
  console.log("Passed: clean 16-table migration/RLS, public retry/counter reuse, manual entry, atomic enrollment rollback/transitions, snapshot stability, scope/permissions, payment ownership, resource origins/providers and history enum.");
} finally { await pg.close(); }
