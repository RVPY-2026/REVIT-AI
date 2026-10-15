import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import * as orm from "drizzle-orm";
import * as schema from "../src/server/db/schema";
import * as permissions from "../src/lib/auth/permissions";
import * as studentCode from "../src/lib/student-code";
import * as phone from "../src/lib/phone";
import * as search from "../src/lib/student-search";
import * as followUp from "../src/lib/follow-up";
import * as contactNote from "../src/lib/contact-note";
import * as constants from "../src/lib/constants";
import * as studentsSchema from "../src/lib/schemas/student";
import * as leadSchema from "../src/lib/schemas/lead";
import * as contactSchema from "../src/lib/schemas/student-contact";
import * as fieldSchema from "../src/lib/schemas/student-field";
import * as statusSchema from "../src/lib/schemas/student-status";
import * as noteSchema from "../src/lib/schemas/student-note";
import * as managementSchema from "../src/lib/schemas/student-management";
import { loadServerModule } from "./helpers/server-module";
import { readMigrations } from "./helpers/db-migrations";
import type { Db } from "../src/server/db";

test("CRM hardening runs actual actions and queries against isolated migrated Postgres", async t => {
  const pg = await PGlite.create();
  const connection = drizzle(pg, { schema, casing: "snake_case" });
  const db = connection as unknown as Db;
  const invalidations: string[] = [];
  let caller: permissions.SessionUser;
  try {
    for (const migration of await readMigrations()) await pg.exec(migration.sql);
    const [actor, owner] = await connection.insert(schema.users).values([
      { email: "crm-admin@example.invalid", name: "Fixture admin" }, { email: "crm-sale@example.invalid", name: "Fixture sale" },
    ]).returning();
    const [a, b, c, inactive] = await connection.insert(schema.adSources).values([
      { code: "A", name: "Fixture A", ownerUserId: owner.id }, { code: "B", name: "Fixture B" },
      { code: "C", name: "Fixture C" }, { code: "D", name: "Inactive", active: false },
    ]).returning();
    const admin: permissions.SessionUser = { id: actor.id, email: actor.email, name: actor.name, avatarUrl: null, roles: ["admin"], sourceIds: [], studentId: null };
    const sale: permissions.SessionUser = { ...admin, id: owner.id, roles: ["sale"], sourceIds: [a.id] };
    caller = admin;
    const shared: Record<string, unknown> = { "drizzle-orm": orm, "@/server/db": { db }, "@/server/db/schema": schema,
      "@/lib/auth/permissions": permissions, "@/lib/phone": phone, "@/lib/student-search": search, "@/lib/follow-up": followUp,
      "@/lib/constants": constants, "@/lib/schemas/student": studentsSchema, "@/lib/schemas/lead": leadSchema,
      "@/lib/contact-note": contactNote,
      "@/lib/schemas/student-contact": contactSchema, "@/lib/schemas/student-field": fieldSchema,
      "@/lib/schemas/student-status": statusSchema, "@/lib/schemas/student-note": noteSchema,
      "@/lib/schemas/student-management": managementSchema, "@/lib/runtime-mode": { USE_MOCK: false },
      "next/cache": { revalidatePath: (path: string) => invalidations.push(path) },
      "@/server/auth/session": { requirePermission: async (permission: permissions.Permission) => {
        if (!permissions.can(caller, permission)) throw new Error("Forbidden"); return caller;
      } },
    };
    shared["@/server/auth/scope"] = await loadServerModule("src/server/auth/scope.ts", shared);
    shared["@/server/audit"] = await loadServerModule("src/server/audit.ts", shared);
    const phones = await loadServerModule<typeof import("../src/server/phone-matches")>("src/server/phone-matches.ts", shared);
    shared["@/server/phone-matches"] = phones;
    const queries = await loadServerModule<typeof import("../src/server/queries/students")>("src/server/queries/students.ts", shared);
    shared["@/server/queries/students"] = queries;
    shared["@/server/lead-record"] = await loadServerModule("src/server/lead-record.ts", { ...shared, "@/lib/student-code": studentCode });
    const lead = await loadServerModule<typeof import("../src/server/actions/leads")>("src/server/actions/leads.ts", { ...shared,
      "next/headers": {}, "@/server/env": { serverEnv: {} }, "@/server/signup-session": {}, "@/server/signup-protection": {} });
    const fields = await loadServerModule<typeof import("../src/server/actions/student-field")>("src/server/actions/student-field.ts", shared);
    const contacts = await loadServerModule<typeof import("../src/server/actions/student-contact")>("src/server/actions/student-contact.ts", shared);
    const statuses = await loadServerModule<typeof import("../src/server/actions/student-status")>("src/server/actions/student-status.ts", shared);
    const management = await loadServerModule<typeof import("../src/server/actions/student-management")>("src/server/actions/student-management.ts", shared);
    const notes = await loadServerModule<typeof import("../src/server/actions/student-notes")>("src/server/actions/student-notes.ts", shared);
    const phoneLimit = await loadServerModule<typeof import("../src/server/student-phone-limit")>("src/server/student-phone-limit.ts", shared);
    let phoneQueryCount = 0;
    const lookup = await loadServerModule<typeof import("../src/server/actions/student-phone")>("src/server/actions/student-phone.ts", {
      ...shared, "@/server/student-phone-limit": phoneLimit, "@/lib/api/students": { getPhoneMatches: async (value: string) => {
        phoneQueryCount++; return queries.findPhoneMatches(caller, value);
      } },
    });
    let seq = 0;
    async function student(source = a, extra: Partial<typeof schema.students.$inferInsert> = {}) {
      seq++;
      return (await connection.insert(schema.students).values({ code: `${source.code}9901${String(seq).padStart(3,"0")}`, codeMonth: "9901", seq,
        sourceId: source.id, fullName: "Nguyễn Đặng", phone: `090000${String(seq).padStart(4,"0")}`, ...extra }).returning())[0];
    }
    const own = await student(a, { phone: "0901234567" });
    const hidden = await student(b, { phone: "+84901234567", fullName: "Hidden private name" });
    const hidden2 = await student(b, { phone: "0901 234 567" });

    await t.test("search function has a fixed empty path and denies both inherited and explicit API privileges", async () => {
      await pg.exec("CREATE ROLE anon; CREATE ROLE authenticated; GRANT EXECUTE ON FUNCTION public.rvpy_search_text(text) TO anon, authenticated;");
      await pg.exec(await readFile(new URL("../src/server/db/migrations/0005_crm_review_function_security.sql", import.meta.url), "utf8"));
      const result = await pg.query<{ normalized: string; anon_allowed: boolean; auth_allowed: boolean; config: string[] }>(
        "select public.rvpy_search_text('Nguyễn Đặng') as normalized, has_function_privilege('anon', 'public.rvpy_search_text(text)', 'EXECUTE') as anon_allowed, has_function_privilege('authenticated', 'public.rvpy_search_text(text)', 'EXECUTE') as auth_allowed, proconfig as config from pg_proc where oid = 'public.rvpy_search_text(text)'::regprocedure");
      assert.equal(result.rows[0].normalized, "nguyen dang");
      assert.equal(result.rows[0].anon_allowed, false); assert.equal(result.rows[0].auth_allowed, false);
      assert.deepEqual(result.rows[0].config, ['search_path=""']);
    });

    await t.test("phone lookup validates inputs and consumes an atomic durable per-user budget before reading matches", async () => {
      caller = sale;
      assert.equal((await lookup.checkStudentPhone({ phone: "bad" })).ok, false);
      assert.equal((await lookup.checkStudentPhone({ phone: "0901234567", excludeId: "bad" })).ok, false);
      assert.equal(phoneQueryCount, 0);
      for (let i = 0; i < 30; i++) assert.equal((await lookup.checkStudentPhone({ phone: "0901234567" })).ok, true);
      const denied = await lookup.checkStudentPhone({ phone: "0901234567" });
      assert.equal(denied.ok, false); assert.equal(phoneQueryCount, 30);
      const time = new Date("2027-01-01T00:00:00Z");
      const concurrent = await Promise.all(Array.from({ length: 35 }, () => phoneLimit.consumeStudentPhoneLookup(db, "parallel-fixture", time)));
      assert.equal(concurrent.filter(Boolean).length, 30);
      assert.equal(await phoneLimit.consumeStudentPhoneLookup(db, "another-fixture", time), true);
      assert.equal(await phoneLimit.consumeStudentPhoneLookup(db, "parallel-fixture", new Date(time.getTime() + 60_000)), true);
      const counters = await connection.select().from(schema.signupRateLimits);
      assert.equal(counters.some(row => row.keyHash.includes(sale.id)), false);
      caller = admin;
    });

    await t.test("archived duplicates are history only, do not block creation, and never reveal foreign archives", async () => {
      const number = "0907777777";
      const historic = await student(a, { phone: number, archivedAt: new Date(), archiveReason: "duplicate", archivedById: actor.id });
      await student(b, { phone: number, archivedAt: new Date(), archiveReason: "spam", archivedById: actor.id });
      const visible = await queries.findPhoneMatches(sale, number);
      assert.equal(visible.length, 1); assert.ok(!("otherSource" in visible[0]) && visible[0].archived);
      assert.equal((await phones.phoneMatches(db, sale, number)).length, 0);
      caller = sale;
      const created = await lead.createManualLead({ sourceId: a.id, fullName: "Active replacement", phone: number });
      assert.equal(created.ok, true);
      if (!created.ok) return;
      const decorated = await queries.listStudents(admin, { search: number });
      assert.equal(decorated.rows.length, 1); assert.equal(decorated.rows[0].duplicatePhone, false);
      const archivedRows = await queries.listStudents(admin, { search: number, archived: "true" });
      assert.equal(archivedRows.rows.find(row => row.id === historic.id)?.duplicatePhone, false);
      caller = admin;
    });

    await t.test("sent-message acknowledgments preserve future and overdue appointments; ordinary contact can complete them", async () => {
      caller = sale;
      for (const delta of [-86_400_000, 86_400_000]) {
        const target = await student();
        const appointment = new Date(Date.now() + delta).toISOString();
        assert.equal((await notes.addCallNote({ studentId: target.id, body: "Appointment", nextActionAt: appointment })).ok, true);
        assert.equal((await notes.recordStudentMessageSent({ studentId: target.id, title: "Trial reminder" })).ok, true);
        const profile = await queries.getStudent(sale, target.id);
        assert.equal(profile?.nextActionAt, appointment);
        assert.equal((await queries.listStudents(sale, { search: target.code, followUp: "due" })).total, delta < 0 ? 1 : 0);
        assert.equal((await notes.addCallNote({ studentId: target.id, body: "Completed callback" })).ok, true);
        assert.equal((await queries.getStudent(sale, target.id))?.nextActionAt, null);
        assert.equal((await notes.recordStudentMessageSent({ studentId: target.id, title: "Follow-up" })).ok, true);
        assert.equal((await queries.getStudent(sale, target.id))?.nextActionAt, null);
      }
      assert.equal((await notes.recordStudentMessageSent({ studentId: hidden.id, title: "Hidden" })).ok, false);
      caller = admin;
    });

    await t.test("student codes containing digits do not also match unrelated phone substrings", async () => {
      const exact = await student(a, { code: "A2610999" });
      await student(b, { phone: "0926109990" });
      assert.deepEqual((await queries.listStudents(admin, { search: "A2610999" })).rows.map(row => row.id), [exact.id]);
    });

    await t.test("phone query returns own detail and only one boolean for any number of hidden matches", async () => {
      const matches = await queries.findPhoneMatches(sale, "84901234567");
      assert.equal(matches.length, 2);
      assert.deepEqual(JSON.parse(JSON.stringify(matches.find(match => "otherSource" in match))), { otherSource: true });
      assert.equal(JSON.stringify(matches).includes(hidden.fullName), false);
      assert.equal(JSON.stringify(matches).includes(hidden.id), false);
      assert.equal((await queries.findPhoneMatches(admin, "0901 234 567")).length, 3);
      assert.equal((await queries.findPhoneMatches(sale, "invalid")).length, 0);
      await assert.rejects(queries.findPhoneMatches({ ...sale, roles: ["student"] }, "0901234567"), /Forbidden/);
    });

    await t.test("manual creation and all phone editors reject duplicates until explicitly acknowledged", async () => {
      caller = sale;
      const input = { sourceId: a.id, fullName: "Duplicate fixture", phone: "0901234567" };
      assert.equal((await lead.createManualLead(input)).ok, false);
      const accepted = await lead.createManualLead({ ...input, duplicateAcknowledged: true });
      assert.equal(accepted.ok, true);
      if (!accepted.ok) return;
      const [createdAudit] = await connection.select().from(schema.auditLog).where(orm.and(orm.eq(schema.auditLog.action, "student.created_manually"), orm.eq(schema.auditLog.entityId, accepted.data.id)));
      assert.equal((createdAudit.data as Record<string, unknown>).duplicateAcknowledged, true);
      const target = await student();
      const edit = { studentId: target.id, field: "phone", value: "+84901234567", expectedValue: target.phone };
      assert.equal((await fields.updateStudentField(edit)).ok, false);
      assert.equal((await fields.updateStudentField({ ...edit, duplicateAcknowledged: true })).ok, true);
      assert.equal((await fields.updateStudentField({ ...edit, value: "0909999999" })).ok, false, "stale expected phone still conflicts");
      const profile = await student();
      const batch = { studentId: profile.id, changes: [{ field: "phone", value: "0901234567", expectedValue: profile.phone }] };
      assert.equal((await fields.updateStudentProfile(batch)).ok, false);
      assert.equal((await fields.updateStudentProfile({ ...batch, duplicateAcknowledged: true })).ok, true);
      const contact = await student();
      const contactInput = { studentId: contact.id, fullName: contact.fullName, phone: "0901234567", email: "", expected: { fullName: contact.fullName, phone: contact.phone, email: null } };
      assert.equal((await contacts.updateStudentContact(contactInput)).ok, false);
      assert.equal((await contacts.updateStudentContact({ ...contactInput, duplicateAcknowledged: true })).ok, true);
      assert.equal((await lead.createManualLead({ ...input, sourceId: b.id, duplicateAcknowledged: true })).ok, false);
    });

    await t.test("archive/restore are admin-only, scoped, optimistic and excluded from list, kanban and dashboard counts", async () => {
      const input = { studentId: own.id, expectedArchivedAt: null, reason: "spam" };
      caller = sale;
      await assert.rejects(management.archiveStudent(input), /Forbidden/);
      caller = admin;
      const before = (await queries.getStudentOverview(admin)).total;
      assert.equal((await management.archiveStudent({ ...input, reason: "other" })).ok, false);
      assert.equal((await management.archiveStudent(input)).ok, true);
      assert.equal((await management.archiveStudent(input)).ok, false);
      assert.equal((await queries.getStudentOverview(admin)).total, before - 1);
      assert.equal((await queries.listStudents(admin, {})).rows.some(row => row.id === own.id), false);
      assert.equal((await queries.getStudentKanban(admin, {})).columns.some(column => column.rows.some(row => row.id === own.id)), false);
      assert.equal((await queries.listStudents(admin, { archived: "true" })).rows.some(row => row.id === own.id), true);
      await assert.rejects(queries.listStudents(sale, { archived: "true" }), /Chỉ quản trị viên/);
      await assert.rejects(queries.getStudentKanban(sale, { archived: "true" }), /Chỉ quản trị viên/);
      await assert.rejects(queries.exportStudents(sale, { archived: "true" }), /Chỉ quản trị viên/);
      assert.equal((await fields.updateStudentField({ studentId: own.id, field: "fullName", value: "Changed", expectedValue: own.fullName })).ok, false);
      assert.equal((await notes.addCallNote({ studentId: own.id, body: "Blocked" })).ok, false);
      assert.equal((await notes.recordStudentMessageSent({ studentId: own.id, title: "Blocked" })).ok, false);
      assert.equal((await statuses.updateStudentStatus({ studentId: own.id, status: "consulting", expectedStatus: "new" })).ok, false);
      const archived = (await queries.getStudent(admin, own.id))!;
      assert.equal(archived.timeline.at(-1)?.kind, "archive");
      caller = sale;
      await assert.rejects(management.restoreStudent({ studentId: own.id, expectedArchivedAt: archived.archivedAt }), /Forbidden/);
      caller = admin;
      assert.equal((await management.restoreStudent({ studentId: own.id, expectedArchivedAt: "2020-01-01T00:00:00Z" })).ok, false);
      assert.equal((await management.restoreStudent({ studentId: own.id, expectedArchivedAt: archived.archivedAt })).ok, true);
      assert.equal((await queries.getStudentOverview(admin)).total, before);
      assert.equal((await queries.getStudent(admin, own.id))!.timeline.at(-1)?.kind, "restore");
    });

    await t.test("dropped requires a reason and status changes never alter enrollment", async () => {
      const target = await student();
      await connection.insert(schema.enrollments).values({ studentId: target.id, status: "active", kind: "trial" });
      assert.equal((await statuses.updateStudentStatus({ studentId: target.id, status: "dropped" })).ok, false);
      assert.equal((await statuses.updateStudentStatus({ studentId: target.id, status: "dropped", reason: "other" })).ok, false);
      assert.equal((await statuses.updateStudentStatus({ studentId: target.id, status: "dropped", reason: "price", note: "Fixture reason", expectedStatus: "new" })).ok, true);
      const detail = (await queries.getStudent(admin, target.id))!;
      assert.equal(detail.timeline.at(-1)?.reason, "price");
      assert.equal(detail.timeline.at(-1)?.note, "Fixture reason");
      assert.equal((await queries.listStudents(admin, { status: "dropped" })).rows[0].droppedReason, "price");
      assert.equal((await statuses.updateStudentStatus({ studentId: target.id, status: "consulting", expectedStatus: "dropped" })).ok, true);
      const [enrollment] = await connection.select().from(schema.enrollments).where(orm.eq(schema.enrollments.studentId, target.id));
      assert.equal(enrollment.status, "active");
    });

    await t.test("two source transfers with the same sequence cannot collide and never consume destination codes", async () => {
      const first = await student(a);
      const second = await student(b, { seq: first.seq, code: `B9901${String(first.seq).padStart(3,"0")}` });
      const move = (row: typeof first, source = c) => ({ studentId: row.id, expectedSourceId: row.sourceId, sourceId: source.id, reason: "Fixture ownership correction" });
      caller = sale;
      await assert.rejects(management.transferStudentSource(move(first)), /Forbidden/);
      caller = admin;
      assert.equal((await management.transferStudentSource(move(first, inactive))).ok, false);
      assert.equal((await management.transferStudentSource(move(first))).ok, true);
      assert.equal((await management.transferStudentSource(move(second))).ok, true);
      const transferred = await connection.select().from(schema.students).where(orm.inArray(schema.students.id, [first.id, second.id]));
      assert.deepEqual(transferred.map(row => row.code).sort(), [first.code, second.code].sort());
      assert.ok(transferred.every(row => row.sourceId === c.id && row.seq === first.seq));
      assert.equal((await queries.getStudent(sale, first.id)), null);
      assert.equal((await management.transferStudentSource(move(first))).ok, false, "stale ownership fails");
      const fresh = await lead.createManualLead({ sourceId: c.id, fullName: "Fresh destination lead", phone: "0909998888" });
      assert.equal(fresh.ok, true);
      if (fresh.ok) assert.equal(fresh.data.code.slice(-3), "001");
      assert.equal((await queries.getStudent(admin, first.id))!.timeline.at(-1)?.kind, "source_transfer");
    });

    await t.test("notes keep channel/outcome/schedule, permit only author body correction for 15 minutes, and audit atomically", async () => {
      const target = await student();
      caller = sale;
      const result = await notes.addCallNote({ studentId: target.id, body: "Original", channel: "zalo", outcome: "thinking", nextActionAt: "2026-10-15T10:00:00+07:00" });
      assert.equal(result.ok, true);
      if (!result.ok) return;
      const edit = { studentId: target.id, noteId: result.data.id, expectedBody: "Original", body: "Corrected" };
      caller = admin;
      assert.equal((await notes.editCallNote(edit)).ok, false);
      caller = sale;
      assert.equal((await notes.editCallNote(edit)).ok, true);
      assert.equal((await notes.editCallNote(edit)).ok, false);
      const [note] = await connection.select().from(schema.callNotes).where(orm.eq(schema.callNotes.id, result.data.id));
      assert.equal(note.channel, "zalo"); assert.equal(note.outcome, "thinking"); assert.equal(note.nextActionAt?.toISOString(), "2026-10-15T03:00:00.000Z"); assert.ok(note.editedAt);
      await connection.update(schema.callNotes).set({ createdAt: new Date(Date.now() - 15 * 60_000 - 1) }).where(orm.eq(schema.callNotes.id, note.id));
      assert.equal((await notes.editCallNote({ ...edit, expectedBody: "Corrected" })).ok, false);
      assert.equal((await notes.addCallNote({ studentId: hidden.id, body: "Unauthorized" })).ok, false);
      const broken = await loadServerModule<typeof import("../src/server/actions/student-notes")>("src/server/actions/student-notes.ts", { ...shared, "@/server/audit": { audit: async () => { throw new Error("Audit failure"); } } });
      const before = (await connection.select().from(schema.callNotes)).length;
      assert.equal((await broken.addCallNote({ studentId: target.id, body: "Rollback" })).ok, false);
      assert.equal((await connection.select().from(schema.callNotes)).length, before);
    });

    await t.test("due SQL and grouped counts agree with the follow-up matrix for the latest note in scope", async () => {
      caller = admin;
      const targets = await Promise.all([student(), student(), student(), student(), student(), student(b)]);
      const time = new Date();
      for (const [index, row] of targets.entries()) {
        if (index === 0) continue;
        await connection.insert(schema.callNotes).values({ studentId: row.id, body: "Contact", channel: "zalo",
          createdAt: new Date(time.getTime() - (index === 1 || index === 3 ? 3 * 86_400_000 : 1000)),
          nextActionAt: index === 2 || index === 5 ? new Date(time.getTime() - 1000) : index === 3 ? new Date(time.getTime() + 86_400_000) : null });
      }
      const expected = targets.filter((_, index) => [0,1,2].includes(index)).map(row => row.id);
      const due = await queries.listStudents(sale, { followUp: "due", pageSize: 100 });
      for (const row of targets) assert.equal(due.rows.some(item => item.id === row.id), expected.includes(row.id));
      for (const row of due.rows) assert.equal(followUp.needsFollowUp(row, new Date()), true);
      const facets = await queries.getStudentFacets(sale, {});
      assert.equal(facets.dueCount, due.total);
      assert.equal((await queries.listStudents(sale, { followUp: "overdue", pageSize: 100 })).rows.some(row => row.id === targets[3].id), false);
      const scheduled = targets[3];
      await connection.insert(schema.callNotes).values({ studentId: scheduled.id, body: "New contact clears old schedule", createdAt: new Date(time.getTime() + 1) });
      assert.equal((await queries.getStudent(sale, scheduled.id))?.nextActionAt, null);
      assert.equal((await queries.getStudentKanban(sale, { followUp: "due" })).columns.flatMap(column => column.rows).some(row => row.id === targets[5].id), false);
    });

    await t.test("Unicode search and canonical phone search use literal LIKE patterns on Vietnamese fixtures", async () => {
      for (const search of ["nguyen", "Nguyễn", "dang"]) assert.ok((await queries.listStudents(sale, { search })).total > 0);
      for (const search of ["0901 234 567", "+84901234567", "84901234567"]) {
        const rows = (await queries.listStudents(sale, { search })).rows;
        assert.ok(rows.some(row => row.id === own.id)); assert.ok(rows.every(row => row.sourceId === a.id));
      }
      assert.equal((await queries.listStudents(sale, { search: "%_" })).total, 0);
      const [result] = (await pg.query<{ value: string }>("select rvpy_search_text('ĐẶNG Nguyễn Ứng') as value")).rows;
      assert.equal(result.value, "dang nguyen ung");
    });

    await t.test("bulk only allows consulting/dropped, skips stale or hidden rows and bounds filter selection at 100", async () => {
      caller = sale;
      const first = await student(), second = await student();
      const input = { studentIds: [first.id, second.id, hidden2.id], expectedStatuses: { [first.id]: "new", [second.id]: "new", [hidden2.id]: "new" }, status: "consulting" };
      await connection.update(schema.students).set({ status: "trial" }).where(orm.eq(schema.students.id, second.id));
      for (const status of ["trial", "enrolled", "new"]) assert.equal((await statuses.bulkUpdateStudentStatus({ ...input, status })).ok, false);
      const result = await statuses.bulkUpdateStudentStatus(input);
      assert.equal(result.ok, true);
      if (result.ok) { assert.equal(result.data.updated, 1); assert.deepEqual([...result.data.skipped].sort(), [second.id,hidden2.id].sort()); }
      assert.equal((await statuses.bulkUpdateStudentStatus({ ...input, status: "dropped" })).ok, false);
      const byFilter = await student(a, { fullName: "Filter snapshot" });
      const snapshot = await queries.selectMatchingStudents(sale, { search: "Filter snapshot" });
      await connection.update(schema.students).set({ fullName: "No longer matches" }).where(orm.eq(schema.students.id, byFilter.id));
      const skipped = await statuses.bulkUpdateStudentStatus({ studentIds: snapshot.map(row => row.id), expectedStatuses: Object.fromEntries(snapshot.map(row => [row.id,row.status])), status: "consulting", filter: { search: "Filter snapshot" } });
      assert.equal(skipped.ok, true); if (skipped.ok) assert.equal(skipped.data.updated, 0);
      for (let i=0;i<105;i++) await student();
      assert.equal((await queries.selectMatchingStudents(sale, {})).length, 100);
    });

    await t.test("trial page aggregates checklist, active plans and three confirmations without cross-source leakage", async () => {
      const target = await student(a, { status: "trial", group1At: new Date(), softwareReadyAt: new Date() });
      const noPlan = await student(a, { status: "trial" });
      const foreign = await student(b, { status: "trial" });
      const [enrollment] = await connection.insert(schema.enrollments).values({ studentId: target.id, trialStartedAt: new Date(Date.now() - 2 * 86_400_000) }).returning();
      await connection.insert(schema.studyPlanLessons).values([1,2,3].map(order => ({ enrollmentId: enrollment.id, title: "Trial fixture", phase: "foundation" as const, trialOrder: order, sortOrder: order, completedAt: order <= 2 ? new Date() : null })));
      const decorated = await queries.decoratePageStudents(sale, [target, noPlan, foreign].map(row => ({ ...row, sourceCode: "A", sourceName: "Fixture", signedUpAt: row.signedUpAt.toISOString(), lastContactAt: null, archivedAt: null })));
      assert.equal(decorated[0].trial?.checklist, 2); assert.equal(decorated[0].trial?.confirmed, 2); assert.equal(decorated[0].trial?.daysLeft, 7); assert.equal(decorated[0].trial?.hasPlan, true);
      assert.equal(decorated[1].trial?.hasPlan, false); assert.equal(decorated[2].trial, null);
      assert.ok((await queries.listStudents(sale, { status: "trial", pageSize: 100 })).rows.every(row => row.sourceId === a.id));
      assert.equal((await queries.listStudents(admin, { search: "0901234567" })).rows.find(row => row.id === own.id)?.duplicatePhone, true);
      assert.equal((await queries.listStudents(sale, { search: "0901234567" })).rows.some(row => Object.hasOwn(row, "duplicatePhone")), false);
    });
    await t.test("new mutation paths return the mock-mode error without writing", async () => {
      caller = admin;
      const mock = { ...shared, "@/lib/runtime-mode": { USE_MOCK: true } };
      const mockManagement = await loadServerModule<typeof import("../src/server/actions/student-management")>("src/server/actions/student-management.ts", mock);
      const mockNotes = await loadServerModule<typeof import("../src/server/actions/student-notes")>("src/server/actions/student-notes.ts", mock);
      const mockStatuses = await loadServerModule<typeof import("../src/server/actions/student-status")>("src/server/actions/student-status.ts", mock);
      const before = (await pg.query("select (select count(*) from audit_log) audits, (select count(*) from call_notes) notes")).rows[0];
      const results = await Promise.all([
        mockManagement.archiveStudent({ studentId: own.id, expectedArchivedAt: null, reason: "spam" }),
        mockManagement.restoreStudent({ studentId: own.id, expectedArchivedAt: new Date().toISOString() }),
        mockManagement.transferStudentSource({ studentId: own.id, expectedSourceId: a.id, sourceId: c.id, reason: "Mock transfer" }),
        mockNotes.addCallNote({ studentId: own.id, body: "Mock contact", channel: "zalo" }),
        mockNotes.recordStudentMessageSent({ studentId: own.id, title: "Mock template" }),
        mockNotes.editCallNote({ studentId: own.id, noteId: own.id, body: "Mock correction", expectedBody: "Original" }),
        mockStatuses.updateStudentStatus({ studentId: own.id, status: "trial", expectedStatus: "new" }),
        mockStatuses.bulkUpdateStudentStatus({ studentIds: [own.id], status: "consulting", expectedStatuses: { [own.id]: "new" } }),
      ]);
      for (const result of results) { assert.equal(result.ok, false); if (!result.ok) assert.match(result.error, /xem thử/); }
      assert.deepEqual((await pg.query("select (select count(*) from audit_log) audits, (select count(*) from call_notes) notes")).rows[0], before);
    });
    assert.ok(invalidations.includes("/quan-tri") && invalidations.includes(`/quan-tri/hoc-vien/${own.id}`));
    const tables = (await pg.query<{ relrowsecurity: boolean }>("select relrowsecurity from pg_class where relname in ('students','call_notes','student_status_events')")).rows;
    assert.ok(tables.every(table => table.relrowsecurity));
    assert.equal((await pg.query("select * from pg_policies where tablename in ('students','call_notes','student_status_events')")).rows.length, 0);
  } finally { await pg.close(); }
});
