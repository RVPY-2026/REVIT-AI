import assert from "node:assert/strict";
import test from "node:test";
import { config } from "dotenv";
import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import type { SessionUser } from "../src/lib/auth/permissions";

/** All fixtures and mutations are rolled back, including accounts and access grants. */
test("trial onboarding, account access, checklist and staff confirmations work on Postgres", {
  skip: process.env.RVPY_VERIFY_ONBOARDING_DB !== "1", timeout: 60000,
}, async () => {
  config({ path: ".env.local", quiet: true });
  process.env.NEXT_PUBLIC_USE_MOCK = "false";
  const { eq, and } = await import("drizzle-orm");
  const { db } = await import("../src/server/db");
  const s = await import("../src/server/db/schema");
  const records = await import("../src/server/student-onboarding-record");
  const { enrollStudent, EnrollmentError } = await import("../src/server/enrollment-record");
  const { getStudentOnboarding } = await import("../src/server/queries/student-onboarding");
  const { getMyLearning } = await import("../src/server/queries/student-area");
  const { reportPlanLesson } = await import("../src/server/student-learning-record");
  const permissions = await import("../src/lib/auth/permissions");
  const drizzle = await import("drizzle-orm");
  const { audit } = await import("../src/server/audit");
  const rollback = new Error("intentional rollback");
  try {
    await assert.rejects(db.transaction(async (tx) => {
      const conn = tx as unknown as typeof db;
      const [actor] = await tx.insert(s.users).values({ email: "onboarding-admin@example.invalid", name: "Fixture admin" }).returning({ id: s.users.id });
      const [source] = await tx.select({ id: s.adSources.id }).from(s.adSources).where(eq(s.adSources.code, "R"));
      assert.ok(source, "reference source R is configured");
      const user = (roles: SessionUser["roles"], sourceIds: string[] = [], studentId: string | null = null): SessionUser => ({
        id: actor.id, email: "onboarding-admin@example.invalid", name: "Fixture actor", avatarUrl: null, roles, sourceIds, studentId,
      });
      const admin = user(["admin"]);
      const sale = user(["sale"], [source.id]);
      const outsider = user(["sale"]);
      const createStudent = async (seq: number) => (await tx.insert(s.students).values({
        code: `W9801${String(seq).padStart(3, "0")}`, codeMonth: "9801", seq, sourceId: source.id,
        fullName: `Onboarding fixture ${seq}`, phone: "0999000111", email: "contact@example.invalid",
      }).returning({ id: s.students.id }))[0].id;
      const id = await createStudent(901);
      const otherId = await createStudent(902);
      const pendingId = await createStudent(903);
      await assert.rejects(enrollStudent(tx, outsider, id), /Không tìm thấy/);
      await assert.rejects(records.activateStudentAccount(tx, sale, { studentId: id, loginEmail: "learner@example.invalid" }), /quản trị/);
      await assert.rejects(records.activateStudentAccount(tx, admin, { studentId: pendingId, loginEmail: "learner@example.invalid" }), /mở học thử/);
      await enrollStudent(tx, sale, id);
      let state = (await getStudentOnboarding(admin, id, conn))!;
      assert.equal(state.enrollment?.kind, "trial");
      assert.deepEqual(state.lessons.map((l) => l.trialOrder), [1, 2, 3]);
      const originalLessons = state.lessons.map((l) => l.id);
      const originalStart = state.enrollment!.trialStartedAt;
      await enrollStudent(tx, sale, id);
      state = (await getStudentOnboarding(admin, id, conn))!;
      assert.deepEqual(state.lessons.map((l) => l.id), originalLessons);
      assert.equal(state.enrollment!.trialStartedAt, originalStart);
      assert.equal(await getStudentOnboarding(outsider, id, conn), null);

      // Existing signed-in public account is upgraded without losing its other roles.
      const [publicAccount] = await tx.insert(s.users).values({ email: "onboarding-learner@example.invalid", name: "Fixture learner" }).returning({ id: s.users.id });
      await tx.insert(s.userRoles).values({ userId: publicAccount.id, role: "user" });
      await records.activateStudentAccount(tx, admin, { studentId: id, loginEmail: "onboarding-learner@example.invalid" });
      state = (await getStudentOnboarding(admin, id, conn))!;
      assert.equal(state.account?.active, true);
      assert.equal(state.account?.email, "onboarding-learner@example.invalid");
      assert.equal((await getStudentOnboarding(sale, id, conn))!.account, null, "sale never sees the login identity");
      const roles = await tx.select({ role: s.userRoles.role }).from(s.userRoles).where(eq(s.userRoles.userId, publicAccount.id));
      assert.deepEqual(roles.map((r) => r.role).sort(), ["student", "user"]);
      await records.activateStudentAccount(tx, admin, { studentId: id, loginEmail: "onboarding-learner@example.invalid" });
      await assert.rejects(records.activateStudentAccount(tx, admin, { studentId: id, loginEmail: "different@example.invalid" }), /khác/);
      await enrollStudent(tx, admin, otherId);
      await assert.rejects(records.activateStudentAccount(tx, admin, { studentId: otherId, loginEmail: "onboarding-learner@example.invalid" }), /hồ sơ học viên khác/);
      await records.activateStudentAccount(tx, admin, { studentId: otherId, loginEmail: "onboarding-new@example.invalid" });
      assert.equal((await getStudentOnboarding(admin, otherId, conn))!.account?.active, true, "account can be provisioned before first sign-in");

      await assert.rejects(records.setStudentChecklist(tx, outsider, { studentId: id, field: "group1At", done: true, expectedAt: null }), /Không tìm thấy/);
      await records.setStudentChecklist(tx, sale, { studentId: id, field: "group1At", done: true, expectedAt: null });
      state = (await getStudentOnboarding(admin, id, conn))!;
      assert.ok(state.checklist.group1At);
      await assert.rejects(records.setStudentChecklist(tx, sale, { studentId: id, field: "group1At", done: false, expectedAt: null }), /người khác/);
      await records.setStudentChecklist(tx, sale, { studentId: id, field: "group1At", done: false, expectedAt: state.checklist.group1At });
      assert.equal((await getStudentOnboarding(admin, id, conn))!.checklist.group1At, null);

      const sourceCodes = new Set((await tx.select({ code: s.adSources.code }).from(s.adSources)).map((row) => row.code));
      const unusedCode = [..."ZYXWVUTSQPONMLKJIHGFEDCBA"].find((code) => !sourceCodes.has(code));
      assert.ok(unusedCode, "a fixture source code is available");
      const [ownedSource] = await tx.insert(s.adSources).values({ code: unusedCode, name: "Onboarding fixture source", ownerUserId: publicAccount.id }).returning({ id: s.adSources.id });

      // Exercise the real session resolver with a verified-claims provider double.
      // Supabase login UI is unchanged; the app's first-sign-in link and access snapshot are real SQL.
      const output = ts.transpileModule(await readFile("src/server/auth/session.ts", "utf8"), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
      }).outputText;
      const dependencies: Record<string, unknown> = {
        "server-only": {}, "drizzle-orm": drizzle, "next/headers": { cookies: async () => ({ get: () => undefined }) },
        "next/navigation": { redirect: () => { throw new Error("unexpected redirect"); } }, "react": { cache: (fn: unknown) => fn },
        "@/lib/auth/permissions": permissions, "@/lib/runtime-mode": { USE_MOCK: false, hasSupabaseConfig: () => true },
        "@/lib/supabase/server": { createClient: async () => ({ auth: { getClaims: async () => ({ data: { claims: {
          sub: "00000000-0000-4000-8000-000000000080", email: "onboarding-learner@example.invalid",
        } }, error: null }) } }) },
        "@/server/audit": { audit }, "@/server/db": { db: conn }, "@/server/db/schema": s,
      };
      const sessionModule = { exports: {} as { getCurrentUser: () => Promise<SessionUser | null> } };
      runInNewContext(output, { module: sessionModule, exports: sessionModule.exports, require: (name: string) => {
        if (!(name in dependencies)) throw new Error(`Unexpected session dependency: ${name}`);
        return dependencies[name];
      } });
      const learner = (await sessionModule.exports.getCurrentUser())!;
      assert.equal(learner.id, publicAccount.id);
      assert.equal(learner.studentId, id);
      assert.ok(learner.roles.includes("student") && learner.roles.includes("user"));
      assert.deepEqual(learner.sourceIds, [ownedSource.id], "session projections correlate to the outer account, not the nested source id");
      const [identity] = await tx.select({ authUserId: s.users.authUserId }).from(s.users).where(eq(s.users.id, publicAccount.id));
      assert.equal(identity.authUserId, "00000000-0000-4000-8000-000000000080");
      const learning = (await getMyLearning(learner, conn))!;
      assert.equal(learning.lessons.filter((l) => l.accessible).length, 3);
      const lesson = state.lessons[0];
      const confirm = { studentId: id, planLessonId: lesson.id, completed: true, expectedCompletedAt: null, expectedReportedAt: null };
      await reportPlanLesson(tx, learner, { planLessonId: lesson.id, note: "Fixture completed" });
      await assert.rejects(records.confirmStudentTrialLesson(tx, sale, confirm), /đã thay đổi/);
      state = (await getStudentOnboarding(admin, id, conn))!;
      const reportedAt = state.lessons[0].reportedAt;
      await assert.rejects(records.confirmStudentTrialLesson(tx, outsider, { ...confirm, expectedReportedAt: reportedAt }), /Không tìm thấy/);
      await assert.rejects(records.confirmStudentTrialLesson(tx, admin, { ...confirm, studentId: otherId }), /Không tìm thấy/);
      await records.confirmStudentTrialLesson(tx, sale, { ...confirm, expectedReportedAt: reportedAt });
      let after = (await getMyLearning(learner, conn))!.lessons.find((l) => l.id === lesson.id)!;
      assert.equal(after.state, "completed");
      await assert.rejects(reportPlanLesson(tx, learner, { planLessonId: lesson.id, withdraw: true }), /xác nhận/);
      await records.confirmStudentTrialLesson(tx, sale, { ...confirm, completed: false, expectedReportedAt: reportedAt, expectedCompletedAt: after.completedAt });
      after = (await getMyLearning(learner, conn))!.lessons.find((l) => l.id === lesson.id)!;
      assert.equal(after.state, "reported");
      state = (await getStudentOnboarding(admin, id, conn))!;
      for (const trial of state.lessons) {
        await records.confirmStudentTrialLesson(tx, sale, { studentId: id, planLessonId: trial.id, completed: true,
          expectedCompletedAt: trial.completedAt, expectedReportedAt: trial.reportedAt });
      }
      assert.equal((await getMyLearning(learner, conn))!.lessons.filter((l) => l.trialOrder !== null && l.state === "completed").length, 3);
      const formalOnly = learning.lessons.find((l) => l.trialOrder === null)!;
      await assert.rejects(records.confirmStudentTrialLesson(tx, admin, { ...confirm, planLessonId: formalOnly.id }), /Không tìm thấy/);

      // A failed audit must also roll back the checklist update.
      await assert.rejects(tx.transaction((nested) => records.setStudentChecklist(nested, { ...admin, id: "00000000-0000-4000-8000-000000000099" }, {
        studentId: id, field: "softwareReadyAt", done: true, expectedAt: null,
      })));
      assert.equal((await getStudentOnboarding(admin, id, conn))!.checklist.softwareReadyAt, null);
      const events = await tx.select({ action: s.auditLog.action }).from(s.auditLog).where(eq(s.auditLog.entityId, lesson.id));
      assert.ok(events.some((e) => e.action === "lesson.confirmed"));
      assert.ok(events.some((e) => e.action === "lesson.confirmation_withdrawn"));

      await tx.update(s.users).set({ disabledAt: new Date() }).where(eq(s.users.id, publicAccount.id));
      await assert.rejects(records.activateStudentAccount(tx, admin, { studentId: id, loginEmail: "onboarding-learner@example.invalid" }), /vô hiệu hóa/);
      await tx.update(s.enrollments).set({ status: "cancelled" }).where(eq(s.enrollments.studentId, id));
      await assert.rejects(records.confirmStudentTrialLesson(tx, sale, { ...confirm, expectedReportedAt: reportedAt }), /tạm dừng/);
      await enrollStudent(tx, admin, otherId, { agreedFeeVnd: 4500000 });
      await assert.rejects(enrollStudent(tx, sale, otherId), EnrollmentError);
      const [unchanged] = await tx.select({ userId: s.students.userId, email: s.students.email }).from(s.students)
        .where(and(eq(s.students.id, id), eq(s.students.userId, publicAccount.id)));
      assert.equal(unchanged.email, "contact@example.invalid", "login activation does not overwrite contact email");
      throw rollback;
    }), (error) => error === rollback);
  } finally {
    const pools = globalThis as unknown as { pgClient?: { end: (options: { timeout: number }) => Promise<void> }; pgWriteClient?: { end: (options: { timeout: number }) => Promise<void> } };
    await pools.pgClient?.end({ timeout: 1 });
    await pools.pgWriteClient?.end({ timeout: 1 });
  }
});
