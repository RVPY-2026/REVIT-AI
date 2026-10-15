import assert from "node:assert/strict";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import * as orm from "drizzle-orm";
import * as schema from "../src/server/db/schema";
import * as permissions from "../src/lib/auth/permissions";
import * as deletion from "../src/lib/student-deletion";
import * as managementSchema from "../src/lib/schemas/student-management";
import * as code from "../src/lib/student-code";
import { loadServerModule } from "./helpers/server-module";
import { migrateTestDatabase } from "./helpers/migrations";
import type { Db } from "../src/server/db";

test("permanent deletion is a scoped, retained-code transaction with exhaustive relationship decisions", async t => {
  const pg = await PGlite.create();
  const connection = drizzle(pg, { schema, casing: "snake_case" });
  const db = connection as unknown as Db;
  try {
    await migrateTestDatabase(pg);
    const [actor, linked] = await connection.insert(schema.users).values([
      { email: "delete-admin@example.invalid", name: "Fixture admin" },
      { email: "delete-linked@example.invalid", name: "Fixture linked user" },
    ]).returning();
    const [source] = await connection.insert(schema.adSources).values({ code: "R", name: "Fixture source" }).returning();
    const admin: permissions.SessionUser = { id: actor.id, name: actor.name, email: actor.email, roles: ["admin"], avatarUrl: null, studentId: null, sourceIds: [] };
    const sale: permissions.SessionUser = { ...admin, roles: ["sale"], sourceIds: [source.id] };
    let caller = admin;
    const invalidated: string[] = [];
    const common: Record<string, unknown> = {
      "drizzle-orm": orm, "@/server/db": { db }, "@/server/db/schema": schema,
      "@/lib/auth/permissions": permissions, "@/lib/student-deletion": deletion, "@/lib/student-code": code,
      "@/lib/schemas/student-management": managementSchema, "@/lib/runtime-mode": { USE_MOCK: false },
      "@/server/auth/session": { requirePermission: async (permission: permissions.Permission) => {
        if (!permissions.can(caller, permission)) throw new Error("Forbidden"); return caller;
      } }, "next/cache": { revalidatePath: (path: string) => invalidated.push(path) },
    };
    common["@/server/auth/scope"] = await loadServerModule("src/server/auth/scope.ts", common);
    common["@/server/audit"] = await loadServerModule("src/server/audit.ts", common);
    const helper = await loadServerModule<typeof import("../src/server/student-deletion")>("src/server/student-deletion.ts", common);
    common["@/server/student-deletion"] = helper;
    const actions = await loadServerModule<typeof import("../src/server/actions/student-delete")>("src/server/actions/student-delete.ts", common);
    const queries = await loadServerModule<typeof import("../src/server/queries/student-deletion")>("src/server/queries/student-deletion.ts", common);
    const lead = await loadServerModule<typeof import("../src/server/lead-record")>("src/server/lead-record.ts", common);
    let seq = 0;
    async function fixture(extra: Partial<typeof schema.students.$inferInsert> = {}) {
      seq++;
      return (await connection.insert(schema.students).values({ sourceId: source.id, code: `R9901${String(seq).padStart(3,"0")}`,
        codeMonth: "9901", seq, fullName: "Private fixture name", phone: `090000${String(seq).padStart(4,"0")}`, email: "private@example.invalid",
        archivedAt: new Date(Date.now() - 31 * 86_400_000), archiveReason: "test", archivedById: actor.id, ...extra }).returning())[0];
    }
    const request = (row: Awaited<ReturnType<typeof fixture>>) => ({ studentId: row.id, expectedArchivedAt: row.archivedAt!.toISOString(), confirmationCode: row.code, reason: "Fixture junk cleanup" });

    await t.test("catalog coverage fails closed on every new undecided foreign key", async () => {
      await helper.assertStudentDeletionForeignKeys(db);
      await pg.exec("create table delete_fk_fixture(student_id uuid references students(id))");
      await assert.rejects(helper.assertStudentDeletionForeignKeys(db), /FK decisions/);
      const row = await fixture();
      assert.equal((await actions.deleteStudentPermanently(request(row))).ok, false);
      await pg.exec("drop table delete_fk_fixture");
      await helper.assertStudentDeletionForeignKeys(db);
    });

    await t.test("sale cannot read blockers or delete; malformed, unarchived and recent archives cannot delete", async () => {
      const row = await fixture(); caller = sale;
      await assert.rejects(actions.deleteStudentPermanently(request(row)), /Forbidden/);
      await assert.rejects(queries.getStudentDeletionCheck(sale, row.id), /Forbidden/);
      caller = admin;
      assert.equal((await actions.deleteStudentPermanently({ ...request(row), reason: " " })).ok, false);
      assert.equal((await actions.deleteStudentPermanently({ ...request(row), confirmationCode: row.code.toLowerCase() })).ok, false);
      assert.equal((await actions.deleteStudentPermanently({ ...request(row), expectedArchivedAt: new Date().toISOString() })).ok, false);
      const active = await fixture({ archivedAt: null, archiveReason: null });
      assert.match((await queries.getStudentDeletionCheck(admin, active.id)).blockers.join(" "), /lưu trữ/);
      const recent = await fixture({ archivedAt: new Date() });
      const refused = await actions.deleteStudentPermanently(request(recent));
      assert.equal(refused.ok, false); if (!refused.ok) assert.match(refused.error, /30 ngày/);
      const now = new Date();
      assert.deepEqual(deletion.studentDeletionStateBlockers({ archivedAt: new Date(now.getTime() - deletion.STUDENT_DELETE_RETENTION_MS), userId: null }, now), []);
      assert.ok(deletion.studentDeletionStateBlockers({ archivedAt: new Date(now.getTime() - deletion.STUDENT_DELETE_RETENTION_MS + 1), userId: null }, now).length);
    });

    await t.test("every retained relation is a specific blocker even for inactive or already sent records", async () => {
      const cases: { name: string; pattern: RegExp; setup: (row: Awaited<ReturnType<typeof fixture>>) => Promise<unknown> }[] = [
        { name: "enrollment", pattern: /ghi danh/, setup: row => connection.insert(schema.enrollments).values({ studentId: row.id, status: "cancelled" }) },
        { name: "study plan", pattern: /kế hoạch/, setup: async row => {
          const [enrollment] = await connection.insert(schema.enrollments).values({ studentId: row.id }).returning();
          await connection.insert(schema.studyPlanLessons).values({ enrollmentId: enrollment.id, phase: "foundation", title: "Fixture plan", sortOrder: 1 });
        } },
        { name: "payment", pattern: /thanh toán/, setup: row => connection.insert(schema.payments).values({ studentId: row.id, amountVnd: 1, paidAt: new Date() }) },
        { name: "license", pattern: /giấy phép/, setup: row => connection.insert(schema.licenses).values({ studentId: row.id, email: "fixture@example.invalid", product: "suite", status: "revoked" }) },
        { name: "linked login", pattern: /tài khoản/, setup: row => connection.update(schema.students).set({ userId: linked.id }).where(orm.eq(schema.students.id, row.id)) },
        { name: "referrer", pattern: /giới thiệu/, setup: row => fixture({ referredById: row.id }) },
        { name: "Zalo connection", pattern: /kết nối/, setup: row => connection.insert(schema.zaloBotConnections).values({ studentId: row.id, linkTokenHash: row.id, expiresAt: new Date(0) }) },
        { name: "Zalo outbox", pattern: /hàng đợi/, setup: row => connection.insert(schema.zaloBotOutbox).values({ studentId: row.id, chatId: "fixture", eventKey: row.id, sequence: 1, kind: "text", body: "Fixture", status: "sent" }) },
        { name: "feedback", pattern: /phản hồi/, setup: row => connection.insert(schema.feedback).values({ studentId: row.id, kind: "course", body: "Fixture feedback" }) },
      ];
      for (const item of cases) {
        const row = await fixture(); await item.setup(row);
        const check = await queries.getStudentDeletionCheck(admin, row.id);
        assert.match(check.blockers.join(" "), item.pattern, item.name);
        const result = await actions.deleteStudentPermanently(request(row));
        assert.equal(result.ok, false, item.name); if (!result.ok) assert.match(result.error, item.pattern);
        assert.equal((await connection.select().from(schema.deletedStudentCodes).where(orm.eq(schema.deletedStudentCodes.code, row.code))).length, 0);
      }
    });

    await t.test("eligible deletion removes only permitted children, burns code, and audits no personal data", async () => {
      const row = await fixture();
      await connection.insert(schema.callNotes).values({ studentId: row.id, body: "Private note" });
      await connection.insert(schema.studentStatusEvents).values({ studentId: row.id, toStatus: "new", note: "Private history" });
      await connection.insert(schema.leadSignupSessions).values({ studentId: row.id, tokenHash: row.id, expiresAt: new Date() });
      assert.deepEqual((await queries.getStudentDeletionCheck(admin, row.id)).blockers, []);
      assert.equal((await actions.deleteStudentPermanently(request(row))).ok, true);
      for (const table of [schema.students, schema.callNotes, schema.studentStatusEvents, schema.leadSignupSessions]) {
        const column = table === schema.students ? schema.students.id : (table as typeof schema.callNotes).studentId;
        assert.equal((await connection.select().from(table).where(orm.eq(column, row.id))).length, 0);
      }
      const [burned] = await connection.select().from(schema.deletedStudentCodes).where(orm.eq(schema.deletedStudentCodes.code, row.code));
      assert.equal(burned.deletedById, actor.id); assert.equal(burned.sourceId, source.id); assert.equal(burned.reason, request(row).reason);
      const [audit] = await connection.select().from(schema.auditLog).where(orm.eq(schema.auditLog.entityId, row.id));
      assert.deepEqual(audit.data, { code: row.code, sourceCode: source.code, status: row.status, archiveReason: row.archiveReason, signedUpAt: row.signedUpAt.toISOString() });
      for (const value of [row.fullName, row.phone, row.email, "Private note", "Private history"]) assert.equal(JSON.stringify(audit).includes(value!), false);
      assert.ok(invalidated.includes("/quan-tri/hoc-vien"));
      assert.equal((await actions.deleteStudentPermanently(request(row))).ok, false);
      const table = (await pg.query<{ relrowsecurity: boolean }>("select relrowsecurity from pg_class where oid='deleted_student_codes'::regclass")).rows[0];
      assert.equal(table.relrowsecurity, true);
      assert.equal((await pg.query("select * from pg_policies where tablename='deleted_student_codes'")).rows.length, 0);
      await assert.rejects(pg.query("update deleted_student_codes set reason='changed' where code=$1", [row.code]), /append-only/);
      await assert.rejects(pg.query("delete from deleted_student_codes where code=$1", [row.code]), /append-only/);
      await assert.rejects(pg.exec("truncate deleted_student_codes"), /append-only/);
    });

    await t.test("audit failure rolls back student, children and burned-code insert together", async () => {
      const row = await fixture();
      await connection.insert(schema.callNotes).values({ studentId: row.id, body: "Retained on rollback" });
      await connection.insert(schema.studentStatusEvents).values({ studentId: row.id, toStatus: "new" });
      await connection.insert(schema.leadSignupSessions).values({ studentId: row.id, tokenHash: row.id, expiresAt: new Date() });
      const broken = await loadServerModule<typeof import("../src/server/actions/student-delete")>("src/server/actions/student-delete.ts", { ...common, "@/server/audit": { audit: async () => { throw new Error("Audit fixture failure"); } } });
      assert.equal((await broken.deleteStudentPermanently(request(row))).ok, false);
      assert.equal((await connection.select().from(schema.students).where(orm.eq(schema.students.id, row.id))).length, 1);
      assert.equal((await connection.select().from(schema.callNotes).where(orm.eq(schema.callNotes.studentId, row.id))).length, 1);
      assert.equal((await connection.select().from(schema.studentStatusEvents).where(orm.eq(schema.studentStatusEvents.studentId, row.id))).length, 1);
      assert.equal((await connection.select().from(schema.leadSignupSessions).where(orm.eq(schema.leadSignupSessions.studentId, row.id))).length, 1);
      assert.equal((await connection.select().from(schema.deletedStudentCodes).where(orm.eq(schema.deletedStudentCodes.code, row.code))).length, 0);
    });

    await t.test("allocator skips burned codes after a counter reset and mock deletion never writes", async () => {
      const month = code.studentCodeMonth(new Date());
      const burnedCode = code.formatStudentCode(source.code, month, 1);
      await connection.insert(schema.deletedStudentCodes).values({ code: burnedCode, sourceId: source.id, codeMonth: month, seq: 1, deletedById: actor.id, reason: "Fixture prior deletion" });
      const created = await db.transaction(tx => lead.insertLeadRecord(tx, source, { fullName: "Replacement", phone: "0901234567" }, {}, actor.id));
      assert.equal(created.code, code.formatStudentCode(source.code, month, 2));
      const row = await fixture();
      const mock = await loadServerModule<typeof import("../src/server/actions/student-delete")>("src/server/actions/student-delete.ts", { ...common, "@/lib/runtime-mode": { USE_MOCK: true } });
      const result = await mock.deleteStudentPermanently(request(row));
      assert.equal(result.ok, false); if (!result.ok) assert.match(result.error, /xem thử/);
      assert.equal((await connection.select().from(schema.students).where(orm.eq(schema.students.id, row.id))).length, 1);
    });
  } finally { await pg.close(); }
});
