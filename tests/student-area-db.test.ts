import assert from "node:assert/strict";
import test from "node:test";
import { config } from "dotenv";

/**
 * Opt-in check against the configured Postgres (RVPY_VERIFY_STUDENT_AREA_DB=1). Everything runs
 * inside one transaction that is rolled back at the end, so no application record is kept.
 */
test("student area queries and actions stay scoped on the real database", {
  skip: process.env.RVPY_VERIFY_STUDENT_AREA_DB !== "1",
}, async () => {
  config({ path: ".env.local", quiet: true });
  process.env.NEXT_PUBLIC_USE_MOCK = "false";
  const { eq } = await import("drizzle-orm");
  const { db } = await import("../src/server/db");
  type Db = typeof db;
  const schema = await import("../src/server/db/schema");
  const queries = await import("../src/server/queries/student-area");
  const records = await import("../src/server/student-learning-record");
  const { FEEDBACK_DAILY_LIMIT } = await import("../src/lib/schemas/student-area");
  const rollback = new Error("intentional rollback");

  await assert.rejects(db.transaction(async (tx) => {
    const conn = tx as unknown as Db;
    const [source] = await tx.select({ id: schema.adSources.id }).from(schema.adSources).where(eq(schema.adSources.code, "R"));
    const person = (code: string, seq: number, name: string, extra: Partial<typeof schema.students.$inferInsert> = {}) =>
      tx.insert(schema.students).values({ code, codeMonth: "9901", sourceId: source.id, seq, fullName: name, phone: `09990000${seq}`, ...extra }).returning({ id: schema.students.id });
    const [{ id: aId }] = await person("Z9901001", 1, "Fixture A");
    const [{ id: bId }] = await person("Z9901002", 2, "Fixture B");
    // Two people referred by A, one of them enrolled; a third referred by B must not count for A.
    await person("Z9901003", 3, "Fixture R1", { referredById: aId });
    await person("Z9901004", 4, "Fixture R2", { referredById: aId, status: "enrolled" });
    await person("Z9901005", 5, "Fixture R3", { referredById: bId });

    const templates = await tx.select().from(schema.lessons);
    const enroll = async (studentId: string, kind: "trial" | "formal") => {
      const [row] = await tx.insert(schema.enrollments).values({
        studentId, kind, startDate: kind === "formal" ? "2026-10-01" : null, trialStartedAt: new Date(),
      }).returning({ id: schema.enrollments.id });
      await tx.insert(schema.studyPlanLessons).values(templates.map((lesson) => ({
        enrollmentId: row.id, lessonId: lesson.id, phase: lesson.phase, lessonNumbers: lesson.lessonNumbers,
        title: lesson.title, baseDays: lesson.baseDays, sortOrder: lesson.sortOrder, trialOrder: lesson.trialOrder,
      })));
      return row.id;
    };
    await enroll(aId, "trial");
    await enroll(bId, "formal");

    const trialLesson = templates.find((lesson) => lesson.trialOrder === 1)!;
    const lockedLesson = templates.find((lesson) => lesson.trialOrder === null)!;
    const resource = async (title: string, audience: "all" | "trial" | "formal", lessonId: string | null = null, mode: "view" | "download" = "view") =>
      (await tx.insert(schema.learningResources).values({ title, audience, lessonId, mode, bucket: "learning", objectPath: `fixtures/${title}.pdf` }).returning({ id: schema.learningResources.id }))[0].id;
    const openForAll = await resource("all-open", "all");
    const trialOnLesson = await resource("trial-lesson", "trial", trialLesson.id);
    const formalOnly = await resource("formal-only", "formal");
    const allOnLockedLesson = await resource("all-on-locked-lesson", "all", lockedLesson.id);

    await tx.insert(schema.licenses).values([
      { studentId: aId, email: "a@example.com", product: "suite", expiresAt: new Date(Date.now() - 86_400_000) },
      { studentId: bId, email: "b@example.com", product: "suite" },
    ]);

    const [{ id: actorId }] = await tx.insert(schema.users).values({ email: "fixture-actor@example.invalid", name: "Fixture actor" }).returning({ id: schema.users.id });
    const asStudent = (studentId: string | null, roles: ("student" | "admin" | "sale")[] = ["student"]) =>
      ({ id: actorId, email: "x@example.com", name: "x", avatarUrl: null, roles, sourceIds: [], studentId });
    const a = asStudent(aId);
    const b = asStudent(bId);

    // --- reads: A sees only A ---
    const learningA = (await queries.getMyLearning(a, conn))!;
    assert.equal(learningA.student.id, aId);
    assert.equal(learningA.enrollment?.kind, "trial");
    assert.equal(learningA.lessons.length, templates.length);
    assert.deepEqual(learningA.lessons.filter((l) => l.accessible).map((l) => l.trialOrder).sort(), [1, 2, 3]);
    assert.ok(learningA.lessons.every((l) => l.dueDate === null), "trial has no start date, so no due dates");
    assert.equal(learningA.licenses.length, 1);
    assert.equal(learningA.licenses[0].status, "expired", "an active licence past its expiry reads as expired");

    const learningB = (await queries.getMyLearning(b, conn))!;
    assert.equal(learningB.enrollment?.kind, "formal");
    assert.ok(learningB.lessons.every((l) => l.accessible && l.dueDate !== null));
    const idsA = new Set(learningA.lessons.map((l) => l.id));
    assert.ok(learningB.lessons.every((l) => !idsA.has(l.id)), "no plan row is shared between students");

    // Staff without a linked student, and a student id that does not exist, see nothing.
    assert.equal(await queries.getMyLearning(asStudent(null, ["admin"]), conn), null);
    assert.equal(await queries.getMyLearning(asStudent("00000000-0000-0000-0000-0000000000ff"), conn), null);
    assert.deepEqual(await queries.listMyResources(asStudent(null, ["admin"]), conn), []);
    assert.equal(await queries.getMyReferrals(asStudent(null, ["sale"]), conn), null);

    // --- resources follow audience and lesson access ---
    const idsFor = async (user: ReturnType<typeof asStudent>) => new Set((await queries.listMyResources(user, conn)).map((r) => r.id));
    const seenA = await idsFor(a);
    assert.ok(seenA.has(openForAll) && seenA.has(trialOnLesson));
    assert.ok(!seenA.has(formalOnly), "trial student must not see a formal-only file");
    assert.ok(!seenA.has(allOnLockedLesson), "a file on a locked lesson stays locked for a trial student");
    const seenB = await idsFor(b);
    assert.ok([openForAll, trialOnLesson, formalOnly, allOnLockedLesson].every((id) => seenB.has(id)));
    assert.equal(await queries.getMyResourceFile(a, formalOnly, conn), null);
    assert.equal((await queries.getMyResourceFile(b, formalOnly, conn))?.objectPath, "fixtures/formal-only.pdf");
    assert.equal(await queries.getMyResourceFile(asStudent(null, ["admin"]), openForAll, conn), null);
    assert.deepEqual((await queries.listMyLessonResources(a, trialLesson.id, conn)).map((r) => r.id), [trialOnLesson]);
    assert.deepEqual(await queries.listMyLessonResources(a, lockedLesson.id, conn), []);

    // A paused enrollment keeps only lesson-free public material.
    await tx.update(schema.enrollments).set({ status: "paused" }).where(eq(schema.enrollments.studentId, bId));
    assert.deepEqual([...(await idsFor(b))], [openForAll]);
    assert.ok((await queries.getMyLearning(b, conn))!.lessons.every((l) => !l.accessible));
    await tx.update(schema.enrollments).set({ status: "active" }).where(eq(schema.enrollments.studentId, bId));

    // --- referrals count only the caller's own invitations ---
    assert.deepEqual(await queries.getMyReferrals(a, conn), { code: "Z9901001", invited: 2, enrolled: 1 });
    assert.deepEqual(await queries.getMyReferrals(b, conn), { code: "Z9901002", invited: 1, enrolled: 0 });

    // --- plan lesson ownership ---
    const ownLesson = learningA.lessons.find((l) => l.trialOrder === 1)!;
    const lockedOwn = learningA.lessons.find((l) => !l.accessible)!;
    const foreign = learningB.lessons[0];
    assert.equal(await queries.getMyPlanLessonTemplate(a, foreign.id, conn), null);
    assert.equal(await queries.getMyPlanLessonTemplate(a, ownLesson.id, conn), trialLesson.id);

    // --- report actions' core ---
    await assert.rejects(records.reportPlanLesson(tx, a, { planLessonId: foreign.id }), records.StudentAreaError);
    await assert.rejects(records.reportPlanLesson(tx, a, { planLessonId: lockedOwn.id }), /chính thức/);
    const reported = await records.reportPlanLesson(tx, a, { planLessonId: ownLesson.id, note: "xong", submissionUrl: "https://example.com/x" });
    assert.equal(reported.reported, true);
    let after = (await queries.getMyLearning(a, conn))!.lessons.find((l) => l.id === ownLesson.id)!;
    assert.equal(after.state, "reported");
    assert.equal(after.progressNote, "xong");
    assert.equal(after.submissionUrl, "https://example.com/x");
    assert.equal((await records.reportPlanLesson(tx, a, { planLessonId: ownLesson.id, withdraw: true })).reported, false);
    after = (await queries.getMyLearning(a, conn))!.lessons.find((l) => l.id === ownLesson.id)!;
    assert.equal(after.state, "upcoming");
    // Staff confirmation (set directly here) locks the lesson against further student reports.
    await tx.update(schema.studyPlanLessons).set({ completedAt: new Date() }).where(eq(schema.studyPlanLessons.id, ownLesson.id));
    await assert.rejects(records.reportPlanLesson(tx, a, { planLessonId: ownLesson.id }), /xác nhận hoàn thành/);
    const audited = await tx.select({ action: schema.auditLog.action }).from(schema.auditLog).where(eq(schema.auditLog.entityId, ownLesson.id));
    assert.deepEqual(audited.map((row) => row.action).sort(), ["lesson.report_withdrawn", "lesson.reported"]);

    // --- feedback: attached to the caller and capped per day ---
    for (let index = 0; index < FEEDBACK_DAILY_LIMIT; index++) {
      await records.insertFeedback(tx, a, { kind: "course", body: `Góp ý số ${index} của học viên`, score: 8 });
    }
    await assert.rejects(records.insertFeedback(tx, a, { kind: "addin", body: "Góp ý vượt giới hạn trong ngày" }), /ngày mai/);
    await assert.rejects(records.insertFeedback(tx, asStudent(null, ["admin"]), { kind: "course", body: "Không có hồ sơ học viên" }), records.StudentAreaError);
    const stored = await tx.select().from(schema.feedback).where(eq(schema.feedback.studentId, aId));
    assert.equal(stored.length, FEEDBACK_DAILY_LIMIT);
    assert.ok(stored.every((row) => row.respondentName === "Fixture A" && row.teachingScore === 8 && row.addinScore === null));

    throw rollback;
  }), (error) => error === rollback);
});
