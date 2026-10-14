import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import * as orm from "drizzle-orm";
import * as schema from "../src/server/db/schema";
import * as permissions from "../src/lib/auth/permissions";
import * as contentRules from "../src/lib/learning-content";
import * as contentSchema from "../src/lib/schemas/learning-content";
import * as onboardingSchema from "../src/lib/schemas/student-onboarding";
import * as studentRules from "../src/lib/student-learning";
import * as studyPlan from "../src/lib/study-plan";
import type { Db } from "../src/server/db";
import { loadServerModule } from "./helpers/server-module";
import { mockManagedLessons, mockManagedResources } from "../src/mocks/learning-content";
import ExcelJS from "exceljs";

test("upload allowlists require matching MIME, extension, mode and actual size limits", () => {
  const file = { filename: "guide.pdf", contentType: "application/pdf", size: contentRules.VIEW_LIMIT, mode: "view" as const };
  assert.equal(contentRules.validateUpload(file), null);
  for (const bad of [{ size: file.size + 1 }, { size: 0 }, { filename: "guide.html" }, { contentType: "text/html" }, { filename: "guide.pdf.exe" }]) assert.ok(contentRules.validateUpload({ ...file, ...bad }));
  for (const extension of ["exe", "msi", "rvt", "rfa"]) {
    const binary = { filename: `setup.${extension}`, contentType: "application/octet-stream", size: contentRules.DOWNLOAD_LIMIT, mode: "download" as const };
    assert.equal(contentRules.validateUpload(binary), null);
    assert.ok(contentRules.validateUpload({ ...binary, mode: "view" }));
    assert.ok(contentRules.validateUpload({ ...binary, size: binary.size + 1 }));
  }
  assert.equal(contentRules.validateUpload({ filename: "setup.zip", contentType: "application/zip", size: 1, mode: "download" }), null);
});
test("YouTube URLs normalize to the schema's embed provider, reject other origins", () => {
  for (const url of ["https://youtu.be/aqz-KE-bpKQ?t=2", "https://www.youtube.com/watch?v=aqz-KE-bpKQ&list=abc", "https://m.youtube.com/shorts/aqz-KE-bpKQ", "https://youtube.com/live/aqz-KE-bpKQ", "https://youtube-nocookie.com/embed/aqz-KE-bpKQ"])
    assert.equal(contentRules.normalizeYoutube(url), "https://www.youtube-nocookie.com/embed/aqz-KE-bpKQ");
  for (const url of ["https://youtube.com.evil.test/watch?v=aqz-KE-bpKQ", "javascript:alert(1)", "https://user@youtube.com/watch?v=aqz-KE-bpKQ", "https://youtu.be/short", "https://example.com/aqz-KE-bpKQ", "https://youtube.com:4430/watch?v=aqz-KE-bpKQ"])
    assert.equal(contentRules.normalizeYoutube(url), null);
});
test("upload paths derive from server UUID and sanitized basename; injected paths are rejected", () => {
  assert.equal(contentRules.resourceObjectPath("../../evil\\guide.pdf", "server-id"), "resources/server-id/guide.pdf");
  assert.equal(contentRules.resourceObjectPath("..pdf", "server-id"), "resources/server-id/file.pdf");
  assert.equal(contentSchema.uploadSchema.safeParse({ filename: "a.pdf", contentType: "application/pdf", size: 1, mode: "view", objectPath: "victim" }).success, false);
  assert.equal(contentSchema.bulkConfirmSchema.safeParse({ studentId: "00000000-0000-4000-8000-000000000001", lessons: Array.from({ length: 31 }, () => ({ planLessonId: "00000000-0000-4000-8000-000000000002", expectedCompletedAt: null, expectedReportedAt: null })) }).success, false);
});
test("upload streaming counts actual bytes and rejects public storage", async (t) => {
  let publicBucket = false; let storedSize = 3;
  const storage = { getBucket: async () => ({ data: { public: publicBucket }, error: null }), from: () => ({ info: async () => ({ data: { size: storedSize, contentType: "application/pdf" }, error: null }) }) };
  const mockFetch = t.mock.method(globalThis, "fetch", async (_url: unknown, options: RequestInit) => {
    const reader = (options.body as ReadableStream<Uint8Array>).getReader();
    let total = 0; while (true) { const chunk = await reader.read(); if (chunk.done) break; total += chunk.value.length; }
    assert.equal(total, 3); return new Response("", { status: 200 });
  });
  const storageModule = await loadServerModule<typeof import("../src/server/learning-storage")>("src/server/learning-storage.ts", {
    "@supabase/supabase-js": { createClient: () => ({ storage }) }, "@/server/env": { serverEnv: { SUPABASE_SECRET_KEY: "fixture-secret" } }, "@/lib/learning-content": contentRules,
  }, { NEXT_PUBLIC_SUPABASE_URL: "https://storage.example.invalid" });
  const bytes = (size: number) => new ReadableStream<Uint8Array>({ start(c) { c.enqueue(new Uint8Array(size)); c.close(); } });
  const upload = (size: number) => storageModule.streamLearningObject("fixture.pdf", "application/pdf", 3, bytes(size), new AbortController().signal);
  await upload(3);
  await assert.rejects(upload(4), /exceeds/);
  await assert.rejects(upload(2), /mismatch/);
  storedSize = 4;
  await assert.rejects(upload(3), /does not match/);
  const calls = mockFetch.mock.calls.length;
  publicBucket = true;
  await assert.rejects(upload(3), /private/);
  assert.equal(mockFetch.mock.calls.length, calls);
});
test("content Excel export enforces permissions and exports all filtered rows without storage paths", async () => {
  const requested: string[] = [];
  const exportRoute = await loadServerModule<typeof import("../src/app/api/export/learning-content/route")>("src/app/api/export/learning-content/route.ts", {
    "@/lib/api/learning-content": { getLearningContent: async () => ({ lessons: mockManagedLessons, resources: mockManagedResources }) },
    "@/lib/learning-content": contentRules, "@/lib/student-learning": studentRules,
    "@/server/auth/session": { requirePermission: async (permission: string) => { requested.push(permission); } },
  });
  const response = await exportRoute.GET(new Request("https://example.invalid/api/export/learning-content?domain=resources&audience=trial"));
  assert.equal(response.status, 200); assert.equal(requested[0], "resources.manage");
  const workbook = new ExcelJS.Workbook(); await workbook.xlsx.load(await response.arrayBuffer());
  assert.equal(workbook.worksheets[0].rowCount, 2);
  assert.equal(workbook.worksheets[0].getCell("B2").value, "Tài liệu CAD trong Revit");
  assert.equal(workbook.worksheets[0].getCell("F2").value, "cad-trong-revit.pdf");
  assert.equal((await exportRoute.GET(new Request("https://example.invalid/api/export/learning-content?domain=resources&lesson=bad"))).status, 400);
  const denied = await loadServerModule<typeof import("../src/app/api/export/learning-content/route")>("src/app/api/export/learning-content/route.ts", {
    "@/lib/api/learning-content": { getLearningContent: async () => { throw new Error("Should not query"); } },
    "@/lib/learning-content": contentRules, "@/lib/student-learning": studentRules,
    "@/server/auth/session": { requirePermission: async () => { throw new Error("Forbidden"); } },
  });
  await assert.rejects(denied.GET(new Request("https://example.invalid/api/export/learning-content?domain=lessons")), /Forbidden/);
});

test("learning management, snapshots and student visibility on isolated Postgres", async (t) => {
  const pg = await PGlite.create(); const conn = drizzle(pg, { schema, casing: "snake_case" }); const db = conn as unknown as Db;
  try {
    for (const name of ["0000_init", "0001_public_user_role", "0002_zalo_bot_outbox", "0003_signup_protection", "0006_admin_learning_content"])
      await pg.exec(await readFile(new URL(`../src/server/db/migrations/${name}.sql`, import.meta.url), "utf8"));
    const [actor] = await conn.insert(schema.users).values({ email: "content-admin@example.invalid", name: "Fixture admin" }).returning();
    const [source] = await conn.insert(schema.adSources).values({ code: "R", name: "Fixture source" }).returning();
    const admin: permissions.SessionUser = { id: actor.id, email: actor.email, name: actor.name, avatarUrl: null, roles: ["admin"], sourceIds: [], studentId: null };
    const sale = { ...admin, roles: ["sale"] as permissions.Role[], sourceIds: [source.id] };
    const outsider = { ...sale, sourceIds: [] };
    const common = { "drizzle-orm": orm, "@/server/db": { db }, "@/server/db/schema": schema, "@/lib/auth/permissions": permissions };
    const audit = await loadServerModule<typeof import("../src/server/audit")>("src/server/audit.ts", common);
    const scope = await loadServerModule<typeof import("../src/server/auth/scope")>("src/server/auth/scope.ts", common);
    const records = await loadServerModule<typeof import("../src/server/learning-content-record")>("src/server/learning-content-record.ts", { ...common, "@/lib/learning-content": contentRules, "@/lib/schemas/learning-content": contentSchema, "@/server/audit": audit });
    const progress = await loadServerModule<typeof import("../src/server/student-onboarding-record")>("src/server/student-onboarding-record.ts", { ...common, "@/lib/schemas/student-onboarding": onboardingSchema, "@/server/auth/scope": scope, "@/server/audit": audit });
    const queries = await loadServerModule<typeof import("../src/server/queries/learning-content")>("src/server/queries/learning-content.ts", { ...common, "@/lib/student-learning": studentRules, "@/lib/study-plan": studyPlan, "@/server/auth/scope": scope });
    const studentQueries = await loadServerModule<typeof import("../src/server/queries/student-area")>("src/server/queries/student-area.ts", { ...common, "@/lib/student-learning": studentRules, "@/lib/study-plan": studyPlan, "@/server/auth/scope": scope });
    const templates = await conn.insert(schema.lessons).values(Array.from({ length: 5 }, (_, i) => ({ phase: "foundation" as const, lessonNumbers: [i + 1], title: `Fixture ${i + 1}`, baseDays: 2, sortOrder: i, trialOrder: i < 3 ? i + 1 : null }))).returning();
    const students = await conn.insert(schema.students).values([1, 2].map((i) => ({ code: `R990100${i}`, codeMonth: "9901", seq: i, sourceId: source.id, fullName: `Fixture ${i}`, phone: `099900000${i}` }))).returning();
    for (const [i, student] of students.entries()) {
      const [enrollment] = await conn.insert(schema.enrollments).values({ studentId: student.id, kind: i === 0 ? "trial" : "formal", startDate: i === 0 ? null : "2026-10-01" }).returning();
      await conn.insert(schema.studyPlanLessons).values(templates.map(({ id, ...lesson }) => ({ ...lesson, enrollmentId: enrollment.id, lessonId: id })));
    }
    await t.test("RLS is enabled with no public policies on migration 0006", async () => {
      const row = await pg.query<{ relrowsecurity: boolean }>("select relrowsecurity from pg_class where relname = 'learning_uploads'");
      assert.equal(row.rows[0].relrowsecurity, true);
      assert.equal((await pg.query("select * from pg_policies where tablename = 'learning_uploads'")).rows.length, 0);
    });
    await t.test("admin-only template/resource mutation and queries reject sale", async () => {
      const input = { title: "Denied", phase: "foundation" as const, baseDays: 1, lessonNumbers: [6], active: true };
      await assert.rejects(conn.transaction((tx) => records.saveLessonRecord(tx as never, sale, input)), /quyền/);
      await assert.rejects(queries.listManagedLessons(sale, db), /Forbidden/);
      await assert.rejects(queries.listManagedResources(sale, db), /Forbidden/);
    });
    await t.test("reorder avoids transient uniqueness violations and persists, stale order rejected", async () => {
      await conn.transaction((tx) => records.reorderContent(tx as never, admin, "lessons", { id: templates[0].id, direction: "down", expectedOrder: templates.map((l) => l.id) }));
      const ordered = await conn.select().from(schema.lessons).orderBy(orm.asc(schema.lessons.sortOrder));
      assert.deepEqual(ordered.map((l) => l.id), [templates[1].id, templates[0].id, ...templates.slice(2).map((l) => l.id)]);
      await assert.rejects(conn.transaction((tx) => records.reorderContent(tx as never, admin, "lessons", { id: templates[0].id, direction: "down", expectedOrder: templates.map((l) => l.id) })), /Thứ tự/);
    });
    await t.test("trial swap always commits exactly three active foundation slots; duplicate/inactive rejected", async () => {
      const expectedIds = templates.slice(0, 3).map((l) => l.id); const lessonIds = [templates[3].id, templates[1].id, templates[2].id];
      await conn.transaction((tx) => records.swapTrialRecords(tx as never, admin, { expectedIds, lessonIds }));
      assert.deepEqual((await conn.select().from(schema.lessons).where(orm.isNotNull(schema.lessons.trialOrder)).orderBy(orm.asc(schema.lessons.trialOrder))).map((l) => l.id), lessonIds);
      await assert.rejects(conn.transaction((tx) => records.swapTrialRecords(tx as never, admin, { expectedIds: lessonIds, lessonIds: [templates[0].id, templates[0].id, templates[2].id] })));
      await assert.rejects(conn.transaction((tx) => records.toggleContent(tx as never, admin, "lessons", { id: templates[3].id, active: false, expectedActive: true })), /đổi bài học thử/);
    });
    await t.test("template edits and deactivation never rewrite or delete referenced plan snapshots", async () => {
      const before = await conn.select().from(schema.studyPlanLessons);
      await conn.transaction((tx) => records.saveLessonRecord(tx as never, admin, { id: templates[0].id, phase: "foundation", title: "Changed template", baseDays: 20, lessonNumbers: [1], active: false }));
      assert.deepEqual(await conn.select().from(schema.studyPlanLessons), before);
      assert.equal((await conn.select().from(schema.lessons).where(orm.eq(schema.lessons.id, templates[0].id))).length, 1);
    });
    const resourceIds: string[] = [];
    await t.test("resource save normalizes YouTube, reorders, hides inactive/formal resources from trial queries", async () => {
      for (const audience of ["trial", "formal", "all"] as const) {
        const result = await conn.transaction((tx) => records.saveResourceRecord(tx as never, admin, { title: `Fixture ${audience}`, lessonId: null, audience, mode: "view", active: true, source: "youtube", youtubeUrl: "https://youtu.be/aqz-KE-bpKQ" })); resourceIds.push(result.id);
      }
      const trialUser = { ...admin, roles: ["student"] as permissions.Role[], studentId: students[0].id };
      assert.deepEqual((await studentQueries.listMyResources(trialUser, db)).map((r) => r.title).sort(), ["Fixture all", "Fixture trial"]);
      await conn.transaction((tx) => records.reorderContent(tx as never, admin, "resources", { id: resourceIds[2], direction: "up", expectedOrder: resourceIds }));
      assert.deepEqual((await queries.listManagedResources(admin, db)).map((r) => r.id), [resourceIds[0], resourceIds[2], resourceIds[1]]);
      await conn.transaction((tx) => records.toggleContent(tx as never, admin, "resources", { id: resourceIds[0], active: false, expectedActive: true }));
      assert.deepEqual((await studentQueries.listMyResources(trialUser, db)).map((r) => r.title), ["Fixture all"]);
      await assert.rejects(conn.transaction((tx) => records.deleteResourceRecord(tx as never, sale, resourceIds[2])), /quyền/);
      await conn.transaction((tx) => records.deleteResourceRecord(tx as never, admin, resourceIds[2]));
      assert.equal((await studentQueries.listMyResources(trialUser, db)).length, 0);
    });
    await t.test("opaque uploads enforce ownership, single consumption, and replacement preserves resource ID", async () => {
      const upload = (filename: string) => conn.insert(schema.learningUploads).values({ actorId: admin.id, filename, objectPath: contentRules.resourceObjectPath(filename, crypto.randomUUID()), contentType: "application/pdf", size: 100, mode: "view", status: "uploaded", expiresAt: new Date(Date.now() + 60000) }).returning();
      const [first] = await upload("first.pdf"); const data = { title: "Uploaded", lessonId: null, audience: "formal" as const, mode: "view" as const, active: true, source: "file" as const, youtubeUrl: "", uploadId: first.id };
      const saved = await conn.transaction((tx) => records.saveResourceRecord(tx as never, admin, data));
      await assert.rejects(conn.transaction((tx) => records.saveResourceRecord(tx as never, admin, data)), /hết hạn/);
      const [second] = await upload("second.pdf");
      const replaced = await conn.transaction((tx) => records.saveResourceRecord(tx as never, admin, { ...data, id: saved.id, uploadId: second.id }));
      assert.equal(replaced.id, saved.id); assert.equal(replaced.cleanup?.path, first.objectPath);
      assert.equal((await queries.listManagedResources(admin, db)).find((r) => r.id === saved.id)?.filename, "second.pdf");
      assert.ok(!(JSON.stringify(await queries.listManagedResources(admin, db))).includes("resources/"));
    });
    await t.test("formal confirmation is source-scoped, stale-protected, and immediately updates student progress", async () => {
      const formalPlan = (await queries.getManagedLearningProgress(admin, students[1].id, db))!;
      const lesson = formalPlan.lessons.find((l) => l.trialOrder === null)!;
      await conn.update(schema.studyPlanLessons).set({ reportedAt: new Date("2026-10-12T00:00:00Z"), progressNote: "Keep report", submissionUrl: "https://example.invalid/work" }).where(orm.eq(schema.studyPlanLessons.id, lesson.id));
      const input = { studentId: students[1].id, planLessonId: lesson.id, completed: true, expectedCompletedAt: null, expectedReportedAt: "2026-10-12T00:00:00.000Z" };
      await assert.rejects(conn.transaction((tx) => progress.confirmStudentLesson(tx as never, outsider, input)), /Không tìm thấy/);
      await assert.rejects(conn.transaction((tx) => progress.confirmStudentTrialLesson(tx as never, admin, input)), /Không tìm thấy/);
      await assert.rejects(conn.transaction((tx) => progress.confirmStudentLesson(tx as never, admin, { ...input, expectedReportedAt: null })), /thay đổi/);
      const confirmed = await conn.transaction((tx) => progress.confirmStudentLesson(tx as never, sale, input));
      const studentUser = { ...admin, roles: ["student"] as permissions.Role[], studentId: students[1].id };
      const learning = (await studentQueries.getMyLearning(studentUser, db))!;
      assert.equal(learning.lessons.find((l) => l.id === lesson.id)?.state, "completed");
      assert.equal(studentRules.summarizeProgress(learning.lessons, "formal").completed, 1);
      await conn.transaction((tx) => progress.confirmStudentLesson(tx as never, sale, { ...input, completed: false, expectedCompletedAt: confirmed.completedAt }));
      const after = (await queries.getManagedLearningProgress(admin, students[1].id, db))!.lessons.find((l) => l.id === lesson.id)!;
      assert.equal(after.progressNote, "Keep report"); assert.equal(after.reportedAt, input.expectedReportedAt);
      const trialPlan = (await queries.getManagedLearningProgress(admin, students[0].id, db))!;
      const nonTrial = trialPlan.lessons.find((l) => l.trialOrder === null)!;
      await assert.rejects(conn.transaction((tx) => progress.confirmStudentLesson(tx as never, sale, { ...input, studentId: students[0].id, planLessonId: nonTrial.id, expectedReportedAt: null })), /chính thức/);
      const trial = trialPlan.lessons.find((l) => l.trialOrder !== null)!;
      await conn.transaction((tx) => progress.confirmStudentTrialLesson(tx as never, sale, { ...input, studentId: students[0].id, planLessonId: trial.id, expectedReportedAt: null }));
    });
    await t.test("audit failure rolls template changes back atomically", async () => {
      const failing = await loadServerModule<typeof import("../src/server/learning-content-record")>("src/server/learning-content-record.ts", { ...common, "@/lib/learning-content": contentRules, "@/lib/schemas/learning-content": contentSchema, "@/server/audit": { audit: async () => { throw new Error("Audit unavailable"); } } });
      await assert.rejects(conn.transaction((tx) => failing.saveLessonRecord(tx as never, admin, { id: templates[0].id, phase: "foundation", title: "Must roll back", baseDays: 1, lessonNumbers: [1], active: true })), /Audit unavailable/);
      assert.equal((await conn.select().from(schema.lessons).where(orm.eq(schema.lessons.id, templates[0].id)))[0].title, "Changed template");
    });
    const actionDependencies = { ...common, "@/lib/learning-content": contentRules, "@/lib/schemas/learning-content": contentSchema, "@/server/auth/session": { requirePermission: async () => admin }, "@/server/audit": audit, "next/cache": { revalidatePath: () => undefined }, "@/server/learning-content-record": records, "@/server/student-onboarding-record": progress, "@/server/learning-storage": { removeLearningObject: async () => true, ensureLearningBucket: async () => undefined } };
    await t.test("trial resource access follows the student's snapshot after a template trial swap", async () => {
      for (const lessonId of [templates[0].id, templates[3].id]) await conn.transaction((tx) => records.saveResourceRecord(tx as never, admin, { title: `Snapshot ${lessonId}`, lessonId, audience: "trial", mode: "view", active: true, source: "youtube", youtubeUrl: "https://youtu.be/aqz-KE-bpKQ" }));
      const trialUser = { ...admin, roles: ["student"] as permissions.Role[], studentId: students[0].id };
      const visible = await studentQueries.listMyResources(trialUser, db);
      assert.ok(visible.some((r) => r.lessonId === templates[0].id));
      assert.ok(!visible.some((r) => r.lessonId === templates[3].id));
    });
    await t.test("bulk confirmation is atomic on stale reports and rejects more than 30", async () => {
      const actions = await loadServerModule<typeof import("../src/server/actions/learning-content")>("src/server/actions/learning-content.ts", { ...actionDependencies, "@/lib/runtime-mode": { USE_MOCK: false } });
      const plan = (await queries.getManagedLearningProgress(admin, students[1].id, db))!;
      const selected = plan.lessons.slice(0, 2);
      for (const row of selected) await conn.update(schema.studyPlanLessons).set({ reportedAt: new Date("2026-10-12T00:00:00Z") }).where(orm.eq(schema.studyPlanLessons.id, row.id));
      const batch = selected.map((row) => ({ planLessonId: row.id, expectedCompletedAt: null, expectedReportedAt: "2026-10-12T00:00:00.000Z" }));
      const failed = await actions.bulkConfirmLearning({ studentId: students[1].id, lessons: [batch[0], { ...batch[1], expectedReportedAt: null }] });
      assert.equal(failed.ok, false);
      assert.ok((await queries.getManagedLearningProgress(admin, students[1].id, db))!.lessons.every((l) => !l.completedAt));
      assert.equal((await actions.bulkConfirmLearning({ studentId: students[1].id, lessons: batch })).ok, true);
      assert.equal((await actions.bulkConfirmLearning({ studentId: students[1].id, lessons: Array.from({ length: 31 }, () => batch[0]) })).ok, false);
    });
    await t.test("all new mutations return the preview error without writing in mock mode", async () => {
      const actions = await loadServerModule<typeof import("../src/server/actions/learning-content")>("src/server/actions/learning-content.ts", { ...actionDependencies, "@/lib/runtime-mode": { USE_MOCK: true } });
      const before = (await conn.select().from(schema.auditLog)).length;
      const inputs = [
        actions.saveLesson({ title: "Mock", phase: "foundation", lessonNumbers: [9], baseDays: 1, active: true }),
        actions.saveResource({ title: "Mock", source: "youtube", youtubeUrl: "https://youtu.be/aqz-KE-bpKQ", lessonId: null, audience: "all", mode: "view", active: true }),
        actions.prepareResourceUpload({ filename: "a.pdf", contentType: "application/pdf", size: 1, mode: "view" }),
        actions.deleteResource({ id: resourceIds[0] }), actions.cancelResourceUpload({ id: resourceIds[0] }),
        actions.toggleLesson({ id: templates[0].id, active: true, expectedActive: false }),
        actions.toggleResource({ id: resourceIds[0], active: true, expectedActive: false }),
        actions.reorderLessons({ id: templates[0].id, direction: "up", expectedOrder: [] }),
        actions.reorderResources({ id: resourceIds[0], direction: "up", expectedOrder: [] }),
      ];
      for (const result of await Promise.all(inputs)) { assert.equal(result.ok, false); if (!result.ok) assert.match(result.error, /xem thử/); }
      assert.equal((await conn.select().from(schema.auditLog)).length, before);
    });
  } finally { await pg.close(); }
});
