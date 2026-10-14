import "server-only";
import { and, count, eq, gt } from "drizzle-orm";
import type { SessionUser } from "@/lib/auth/permissions";
import { FEEDBACK_DAILY_LIMIT, type FeedbackData, type ReportLessonInput } from "@/lib/schemas/student-area";
import { canOpenLesson } from "@/lib/student-learning";
import { studentScope } from "@/server/auth/scope";
import { audit } from "@/server/audit";
import type { Db } from "@/server/db";
import { enrollments, feedback, studyPlanLessons, students } from "@/server/db/schema";

type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
export class StudentAreaError extends Error {}

/**
 * A student reports one of their own lessons as done, or withdraws that report. Staff confirm
 * completion separately, so this never touches `completedAt`. The caller wraps it in a transaction.
 */
export async function reportPlanLesson(tx: Tx, user: SessionUser, data: ReportLessonInput) {
  const [row] = await tx.select({
    id: studyPlanLessons.id, trialOrder: studyPlanLessons.trialOrder,
    reportedAt: studyPlanLessons.reportedAt, completedAt: studyPlanLessons.completedAt,
    kind: enrollments.kind, status: enrollments.status,
  }).from(studyPlanLessons)
    .innerJoin(enrollments, eq(studyPlanLessons.enrollmentId, enrollments.id))
    .innerJoin(students, eq(enrollments.studentId, students.id))
    .where(and(eq(studyPlanLessons.id, data.planLessonId), studentScope(user, "student")))
    .for("update", { of: studyPlanLessons })
    .limit(1);
  if (!row) throw new StudentAreaError("Không tìm thấy bài học này trong lộ trình của bạn.");
  if (!canOpenLesson({ kind: row.kind, status: row.status }, row.trialOrder)) {
    throw new StudentAreaError("Bài học này mở khi bạn học chính thức.");
  }
  if (row.completedAt) throw new StudentAreaError("Bài học này đã được RVPY xác nhận hoàn thành.");

  if (data.withdraw) {
    if (row.reportedAt) {
      await tx.update(studyPlanLessons).set({ reportedAt: null }).where(eq(studyPlanLessons.id, row.id));
      await audit(tx, { actorId: user.id, action: "lesson.report_withdrawn", entity: "study_plan_lessons", entityId: row.id });
    }
    return { id: row.id, reported: false };
  }

  await tx.update(studyPlanLessons).set({
    reportedAt: new Date(), progressNote: data.note ?? null, submissionUrl: data.submissionUrl ?? null,
  }).where(eq(studyPlanLessons.id, row.id));
  await audit(tx, {
    actorId: user.id, action: "lesson.reported", entity: "study_plan_lessons", entityId: row.id,
    data: { hasNote: Boolean(data.note), hasLink: Boolean(data.submissionUrl) },
  });
  return { id: row.id, reported: true };
}

/** One student's feedback row, capped per day so the form cannot be used to flood the table. */
export async function insertFeedback(tx: Tx, user: SessionUser, data: FeedbackData) {
  const [student] = await tx.select({ id: students.id, fullName: students.fullName }).from(students)
    .where(studentScope(user, "student")).for("update").limit(1);
  if (!student) throw new StudentAreaError("Tài khoản của bạn chưa gắn với hồ sơ học viên.");

  const since = new Date(Date.now() - 24 * 3_600_000);
  const [recent] = await tx.select({ value: count() }).from(feedback)
    .where(and(eq(feedback.studentId, student.id), gt(feedback.submittedAt, since)));
  if (Number(recent?.value ?? 0) >= FEEDBACK_DAILY_LIMIT) {
    throw new StudentAreaError("Bạn đã gửi nhiều góp ý trong hôm nay. Bạn quay lại vào ngày mai nhé.");
  }

  const scoreColumn = data.kind === "course" ? { teachingScore: data.score ?? null } : { addinScore: data.score ?? null };
  const [created] = await tx.insert(feedback).values({
    kind: data.kind, studentId: student.id, respondentName: student.fullName, body: data.body, ...scoreColumn,
  }).returning({ id: feedback.id });
  await audit(tx, { actorId: user.id, action: "feedback.submitted", entity: "feedback", entityId: created.id, data: { kind: data.kind } });
  return { id: created.id };
}
