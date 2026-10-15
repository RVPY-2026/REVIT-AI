import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { readMigrations } from "./helpers/db-migrations.ts";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import vm from "node:vm";
import test from "node:test";
import schema from "../src/server/db/schema/index.ts";
import * as permissions from "../src/lib/auth/permissions.ts";
import * as studentCode from "../src/lib/student-code.ts";

const pglitePath = process.env.RVPY_PGLITE_MODULE;

test("actual student Server Actions enforce scope, transact, audit, and stop in mock mode", { skip: !pglitePath }, async () => {
  const { PGlite } = await import(pathToFileURL(pglitePath).href);
  const require = createRequire(import.meta.url);
  const Module = require("node:module");
  const originalResolveFilename = Module._resolveFilename;
  const cjsPglitePath = pglitePath.replace(/index\.js$/, "index.cjs");
  Module._resolveFilename = function (request, parent, ...rest) {
    if (request === "@electric-sql/pglite") return cjsPglitePath;
    return originalResolveFilename.call(this, request, parent, ...rest);
  };
  let drizzle;
  try {
    ({ drizzle } = require("drizzle-orm/pglite"));
  } finally {
    Module._resolveFilename = originalResolveFilename;
  }
  const drizzleOrm = require("drizzle-orm");
  const pg = await PGlite.create();
  const db = drizzle(pg, { schema, casing: "snake_case" });
  const revalidated = [];
  let caller;

  const loadTsModule = async (path, dependencies) => {
    const ts = require("typescript");
    const source = await readFile(new URL(`../${path}`, import.meta.url), "utf8");
    const output = ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    const loadedModule = { exports: {} };
    const localRequire = (name) => {
      if (name in dependencies) return dependencies[name];
      if (name === "server-only") return {};
      return require(name);
    };
    vm.runInNewContext(output, { module: loadedModule, exports: loadedModule.exports, require: localRequire, Date, Buffer, URL }, { filename: path });
    return loadedModule.exports;
  };

  try {
    for (const migration of await readMigrations()) await pg.exec(migration.sql);

    const ids = (await pg.query(`
      INSERT INTO users(email,name) VALUES
        ('crud-admin@example.test','Test admin'),
        ('crud-sale-a@example.test','Test sale A'),
        ('crud-sale-b@example.test','Test sale B'),
        ('crud-student@example.test','Test student')
      RETURNING id,email
    `)).rows;
    const userId = (email) => ids.find((row) => row.email === email).id;
    const sourceRows = (await pg.query(`
      INSERT INTO ad_sources(code,name,owner_user_id,active) VALUES
        ('A','Source A',$1,true), ('B','Source B',$2,true), ('C','Inactive source',$1,false)
      RETURNING id,code
    `, [userId("crud-sale-a@example.test"), userId("crud-sale-b@example.test")])).rows;
    const sourceId = (code) => sourceRows.find((row) => row.code === code).id;

    const permissionsModule = permissions;
    const schemaModule = schema;
    const drizzleModule = drizzleOrm;
    const auditModule = await loadTsModule("src/server/audit.ts", {
      "@/server/db/schema": schemaModule,
    });
    const scopeModule = await loadTsModule("src/server/auth/scope.ts", {
      "drizzle-orm": drizzleModule,
      "@/lib/auth/permissions": permissionsModule,
      "@/server/db/schema": schemaModule,
    });
    const phonesModule = await loadTsModule("src/server/phone-matches.ts", {
      "drizzle-orm": drizzleModule, "@/lib/auth/permissions": permissionsModule,
      "@/server/db/schema": schemaModule, "@/server/auth/scope": scopeModule,
      "@/lib/phone": await import("../src/lib/phone.ts"), "@/lib/schemas/lead": await import("../src/lib/schemas/lead.ts"),
    });
    const leadRecordModule = await loadTsModule("src/server/lead-record.ts", {
      "drizzle-orm": drizzleModule,
      "@/lib/student-code": studentCode,
      "@/server/audit": auditModule,
      "@/server/db/schema": schemaModule,
    });
    const shared = {
      "drizzle-orm": drizzleModule,
      "next/cache": { revalidatePath: (...args) => revalidated.push(args) },
      "@/lib/auth/permissions": permissionsModule,
      "@/server/auth/session": {
        requirePermission: async (permission) => {
          if (!permissionsModule.can(caller, permission)) throw new Error("forbidden");
          return caller;
        },
      },
      "@/server/auth/scope": scopeModule,
      "@/server/audit": auditModule,
      "@/server/db": { db },
      "@/server/db/schema": schemaModule,
      "@/server/phone-matches": phonesModule,
    };

    const createLeadAction = async (useMock = false) => loadTsModule("src/server/actions/leads.ts", {
      ...shared,
      "@/lib/runtime-mode": { USE_MOCK: useMock },
      "@/lib/schemas/lead": await import("../src/lib/schemas/lead.ts"),
      "@/server/lead-record": leadRecordModule,
      "next/headers": {},
      "@/server/env": { serverEnv: {} },
      "@/server/signup-session": {},
      "@/server/signup-protection": {},
    });
    const createContactAction = async (useMock = false) => loadTsModule("src/server/actions/student-contact.ts", {
      ...shared,
      "@/lib/runtime-mode": { USE_MOCK: useMock },
      "@/lib/schemas/student-contact": await import("../src/lib/schemas/student-contact.ts"),
    });

    const createStatusAction = async (useMock = false) => loadTsModule("src/server/actions/student-status.ts", {
      ...shared,
      "@/lib/runtime-mode": { USE_MOCK: useMock },
      "@/lib/schemas/student-status": await import("../src/lib/schemas/student-status.ts"),
    });

    const createFieldAction = async (useMock = false) => loadTsModule("src/server/actions/student-field.ts", {
      ...shared,
      "@/lib/runtime-mode": { USE_MOCK: useMock },
      "@/lib/schemas/student-field": await import("../src/lib/schemas/student-field.ts"),
    });

    const createStudent = async (code, source, linkedUser) => (await pg.query(`
      INSERT INTO students(code,code_month,source_id,seq,full_name,phone,email,signup_answers,status,user_id)
      VALUES ($1,'2601',$2,$3,'Original Student','0900000001','old@example.test','{"source":"import"}'::jsonb,'trial',$4)
      RETURNING id
    `, [code, source, Number(code.slice(-3)), linkedUser])).rows[0].id;

    const saleAStudentId = await createStudent("A2601001", sourceId("A"), userId("crud-student@example.test"));
    const saleBStudentId = await createStudent("B2601001", sourceId("B"), null);
    const admin = { id: userId("crud-admin@example.test"), roles: ["admin"], sourceIds: [], studentId: null };
    const saleA = { id: userId("crud-sale-a@example.test"), roles: ["sale"], sourceIds: [sourceId("A")], studentId: null };
    const student = { id: userId("crud-student@example.test"), roles: ["student"], sourceIds: [], studentId: saleAStudentId };

    const leadAction = await createLeadAction();
    const contactAction = await createContactAction();
    caller = saleA;
    revalidated.length = 0;
    const leadResult = await leadAction.createManualLead({
      sourceId: sourceId("A"), fullName: "  New Student  ", phone: "090-123-4567", email: "NEW@Example.Test",
      answers: { heardAbout: "Bài viết Facebook" },
    });
    assert.equal(leadResult.ok, true, JSON.stringify(leadResult));
    assert.equal(leadResult.data.code[0], "A");
    const created = (await pg.query("SELECT id,code,source_id,full_name,phone,email,status,signup_answers FROM students WHERE id=$1", [leadResult.data.id])).rows[0];
    assert.equal(created.code, leadResult.data.code);
    assert.equal(created.source_id, sourceId("A"));
    assert.equal(created.full_name, "New Student");
    assert.equal(created.phone, "0901234567");
    assert.equal(created.email, "new@example.test");
    assert.equal(created.status, "new");
    assert.deepEqual(created.signup_answers, { heardAbout: "Bài viết Facebook" });
    const counter = (await pg.query("SELECT next_seq FROM source_month_counters WHERE source_id=$1", [sourceId("A")])).rows[0];
    assert.equal(counter.next_seq, 2, "the new lead consumed exactly one monthly code in its transaction");
    assert.equal((await pg.query("SELECT count(*)::int n FROM student_status_events WHERE student_id=$1 AND to_status='new'", [created.id])).rows[0].n, 1);
    assert.equal((await pg.query("SELECT count(*)::int n FROM audit_log WHERE entity_id=$1 AND action='student.created_manually'", [created.id])).rows[0].n, 1);
    assert.deepEqual(revalidated, [["/quan-tri/hoc-vien"], ["/quan-tri"]]);

    const beforeFailedCreates = (await pg.query("SELECT count(*)::int n FROM students")).rows[0].n;
    const foreignSourceResult = await leadAction.createManualLead({ sourceId: sourceId("B"), fullName: "Foreign Source", phone: "0901234568" });
    const inactiveSourceResult = await leadAction.createManualLead({ sourceId: sourceId("C"), fullName: "Inactive Source", phone: "0901234569" });
    assert.equal(foreignSourceResult.ok, false);
    assert.equal(inactiveSourceResult.ok, false);
    assert.equal(foreignSourceResult.error, inactiveSourceResult.error);
    assert.equal((await pg.query("SELECT count(*)::int n FROM students")).rows[0].n, beforeFailedCreates);
    assert.equal((await pg.query("SELECT count(*)::int n FROM source_month_counters WHERE source_id=$1", [sourceId("B")])).rows[0].n, 0);
    assert.equal((await pg.query("SELECT next_seq FROM source_month_counters WHERE source_id=$1", [sourceId("A")])).rows[0].next_seq, 2);

    caller = admin;
    revalidated.length = 0;
    const contactResult = await contactAction.updateStudentContact({
      studentId: saleAStudentId, fullName: "  Updated Student  ", phone: "090-987-6543", email: "  Staff@Example.COM ",
      expected: { fullName: "Original Student", phone: "0900000001", email: "old@example.test" },
    });
    assert.equal(contactResult.ok, true);
    const updated = (await pg.query(`
      SELECT full_name,phone,email,user_id,source_id,code,status,signup_answers FROM students WHERE id=$1
    `, [saleAStudentId])).rows[0];
    assert.equal(updated.full_name, "Updated Student");
    assert.equal(updated.phone, "0909876543");
    assert.equal(updated.email, "staff@example.com");
    assert.equal(updated.user_id, userId("crud-student@example.test"));
    assert.equal(updated.source_id, sourceId("A"));
    assert.equal(updated.code, "A2601001");
    assert.equal(updated.status, "trial");
    assert.deepEqual(updated.signup_answers, { source: "import" });
    assert.deepEqual(revalidated, [
      ["/quan-tri/hoc-vien"], [`/quan-tri/hoc-vien/${saleAStudentId}`], ["/quan-tri"],
    ]);
    const contactAudit = (await pg.query("SELECT data FROM audit_log WHERE entity_id=$1 AND action='student.contact_updated' ORDER BY created_at DESC LIMIT 1", [saleAStudentId])).rows[0].data;
    assert.deepEqual(contactAudit.before, { fullName: "Original Student", phone: "0900000001", email: "old@example.test" });
    assert.deepEqual(contactAudit.after, { fullName: "Updated Student", phone: "0909876543", email: "staff@example.com" });

    const clearEmailResult = await contactAction.updateStudentContact({
      studentId: saleAStudentId, fullName: "Updated Student", phone: "0909876543", email: "   ",
      expected: { fullName: "Updated Student", phone: "0909876543", email: "staff@example.com" },
    });
    assert.equal(clearEmailResult.ok, true);
    assert.equal((await pg.query("SELECT email FROM students WHERE id=$1", [saleAStudentId])).rows[0].email, null);

    caller = saleA;
    const foreignStudentResult = await contactAction.updateStudentContact({
      studentId: saleBStudentId, fullName: "Stolen Update", phone: "0901111111", email: "stolen@example.test",
      expected: { fullName: "Original Student", phone: "0900000001", email: "old@example.test" },
    });
    const missingStudentResult = await contactAction.updateStudentContact({
      studentId: "00000000-0000-4000-8000-000000000099", fullName: "Missing Update", phone: "0901111112", email: "missing@example.test",
      expected: { fullName: "Original Student", phone: "0900000001", email: "old@example.test" },
    });
    assert.equal(foreignStudentResult.ok, false);
    assert.equal(foreignStudentResult.error, missingStudentResult.error, "foreign and missing IDs share one generic response");
    assert.equal((await pg.query("SELECT full_name FROM students WHERE id=$1", [saleBStudentId])).rows[0].full_name, "Original Student");

    caller = student;
    await assert.rejects(contactAction.updateStudentContact({
      studentId: saleAStudentId, fullName: "Forbidden Update", phone: "0901111113", email: "forbidden@example.test",
      expected: { fullName: "Updated Student", phone: "0909876543", email: null },
    }), /forbidden/);

    const countsBeforeMock = (await pg.query("SELECT (SELECT count(*) FROM students)::int students,(SELECT count(*) FROM audit_log)::int audits")).rows[0];
    const mockLeadAction = await createLeadAction(true);
    const mockContactAction = await createContactAction(true);
    caller = admin;
    revalidated.length = 0;
    const mockLeadResult = await mockLeadAction.createManualLead({ sourceId: sourceId("A"), fullName: "Mock Student", phone: "0902222222" });
    const mockContactResult = await mockContactAction.updateStudentContact({
      studentId: saleAStudentId, fullName: "Mock Update", phone: "0902222223", email: "mock@example.test",
      expected: { fullName: "Updated Student", phone: "0909876543", email: null },
    });
    assert.equal(mockLeadResult.ok, false);
    assert.equal(mockContactResult.ok, false);
    assert.deepEqual((await pg.query("SELECT (SELECT count(*) FROM students)::int students,(SELECT count(*) FROM audit_log)::int audits")).rows[0], countsBeforeMock);
    assert.deepEqual(revalidated, []);

    const statusAction = await createStatusAction();
    caller = saleA;
    await pg.query("INSERT INTO enrollments(student_id,kind,status,agreed_fee_vnd) VALUES ($1,'formal','active',4500000)", [saleAStudentId]);
    const enrollmentBefore = (await pg.query("SELECT * FROM enrollments WHERE student_id=$1", [saleAStudentId])).rows[0];
    const eventsBefore = Number((await pg.query("SELECT count(*) AS count FROM student_status_events WHERE student_id=$1", [saleAStudentId])).rows[0].count);
    for (const status of ["enrolled", "dropped", "trial", "consulting", "new"]) {
      const result = await statusAction.updateStudentStatus({ studentId: saleAStudentId, status, ...(status === "dropped" ? { reason: "price" } : {}) });
      assert.equal(result.ok, true);
      assert.equal((await pg.query("SELECT status FROM students WHERE id=$1", [saleAStudentId])).rows[0].status, status);
    }
    assert.deepEqual((await pg.query("SELECT * FROM enrollments WHERE student_id=$1", [saleAStudentId])).rows[0], enrollmentBefore);
    const eventsAfter = Number((await pg.query("SELECT count(*) AS count FROM student_status_events WHERE student_id=$1", [saleAStudentId])).rows[0].count);
    assert.equal(eventsAfter - eventsBefore, 5);
    const auditsAfter = Number((await pg.query("SELECT count(*) AS count FROM audit_log WHERE entity_id=$1 AND action='student.status_edited'", [saleAStudentId])).rows[0].count);
    assert.equal(auditsAfter, 5);
    assert.equal((await statusAction.updateStudentStatus({ studentId: saleAStudentId, status: "new" })).ok, true);
    assert.equal(Number((await pg.query("SELECT count(*) AS count FROM student_status_events WHERE student_id=$1", [saleAStudentId])).rows[0].count), eventsAfter);
    assert.equal((await statusAction.updateStudentStatus({ studentId: saleBStudentId, status: "enrolled" })).ok, false);
    assert.equal((await statusAction.updateStudentStatus({ studentId: saleAStudentId, status: "invalid" })).ok, false);
    caller = student;
    await assert.rejects(statusAction.updateStudentStatus({ studentId: saleAStudentId, status: "enrolled" }), /forbidden/);
    caller = saleA;
    const mockStatusAction = await createStatusAction(true);
    assert.equal((await mockStatusAction.updateStudentStatus({ studentId: saleAStudentId, status: "enrolled" })).ok, false);
    assert.equal((await pg.query("SELECT status FROM students WHERE id=$1", [saleAStudentId])).rows[0].status, "new");

    const fieldAction = await createFieldAction();
    caller = saleA;
    const patch = (field, value, expectedValue, answerKey) => fieldAction.updateStudentField({ studentId: saleAStudentId, field, value, expectedValue, ...(answerKey ? { answerKey } : {}) });
    assert.equal((await patch("fullName", " Inline Student ", "Updated Student")).ok, true);
    assert.equal((await patch("phone", "090-111-2222", "0909876543")).data.value, "0901112222");
    assert.equal((await patch("email", " INLINE@Example.Test ", "")).data.value, "inline@example.test");
    assert.equal((await patch("birthYear", "2003", "")).data.value, "2003");
    assert.equal((await patch("occupation", " Sinh viên ", "")).data.value, "Sinh viên");
    assert.equal((await patch("specialty", "KTS", "")).ok, true);
    assert.equal((await patch("hometown", "Ho Chi Minh", "")).ok, true);
    assert.equal((await patch("organization", "UAH", "")).ok, true);
    assert.equal((await patch("zaloName", "Tên mẫu", "")).ok, true);
    await pg.query(`UPDATE students SET signup_answers = signup_answers || '{"learningGoal":"Keep this"}'::jsonb WHERE id=$1`, [saleAStudentId]);
    assert.equal((await patch("signupAnswer", " Manually updated ", "import", "source")).ok, true);
    assert.deepEqual((await pg.query("SELECT signup_answers FROM students WHERE id=$1", [saleAStudentId])).rows[0].signup_answers, { source: "Manually updated", learningGoal: "Keep this" });
    assert.equal((await patch("signupAnswer", "", "Manually updated", "source")).ok, true);
    assert.equal((await patch("signupAnswer", "malicious", "", "unknown")).ok, false);
    assert.equal((await patch("fullName", "Stale edit", "Updated Student")).ok, false);
    assert.equal((await patch("birthYear", "2003junk", "2003")).ok, false);
    assert.equal((await patch("sourceId", sourceId("B"), sourceId("A"))).ok, false);
    const scopedPatch = await fieldAction.updateStudentField({ studentId: saleBStudentId, field: "fullName", value: "Foreign edit", expectedValue: "Original Student" });
    assert.equal(scopedPatch.ok, false);
    assert.equal((await statusAction.updateStudentStatus({ studentId: saleAStudentId, status: "enrolled", expectedStatus: "trial" })).ok, false);
    await pg.exec("ALTER TABLE audit_log ADD CONSTRAINT inline_audit_failure CHECK (action <> 'student.field_updated') NOT VALID");
    assert.equal((await patch("fullName", "Must roll back", "Inline Student")).ok, false);
    assert.equal((await pg.query("SELECT full_name FROM students WHERE id=$1", [saleAStudentId])).rows[0].full_name, "Inline Student");
    await pg.exec("ALTER TABLE audit_log DROP CONSTRAINT inline_audit_failure");
    const mockFieldAction = await createFieldAction(true);
    assert.equal((await mockFieldAction.updateStudentField({ studentId: saleAStudentId, field: "fullName", value: "Mock edit", expectedValue: "Inline Student" })).ok, false);
    const fieldAudit = (await pg.query("SELECT data FROM audit_log WHERE entity_id=$1 AND action='student.field_updated' AND data->>'field'='fullName'", [saleAStudentId])).rows[0].data;
    assert.deepEqual(fieldAudit, { field: "fullName", before: "Updated Student", after: "Inline Student" });
    assert.deepEqual((await pg.query("SELECT * FROM enrollments WHERE student_id=$1", [saleAStudentId])).rows[0], enrollmentBefore);

    console.log("Passed isolated PGlite Server Action integration: manual lead ownership/activity, contact scope/preservation/audit, email clearing, forbidden role, revalidation, and zero mock writes.");
  } finally {
    await pg.close();
  }
});
