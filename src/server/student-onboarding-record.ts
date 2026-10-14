import "server-only";
import { and, eq, isNull } from "drizzle-orm";
import type { z } from "zod";
import { can, type SessionUser } from "@/lib/auth/permissions";
import { activateStudentSchema, checklistSchema, confirmTrialLessonSchema } from "@/lib/schemas/student-onboarding";
import type { Db } from "@/server/db";
import { students, users, userRoles, enrollments, studyPlanLessons, zaloBotOutbox } from "@/server/db/schema";
import { studentScope } from "@/server/auth/scope";
import { audit } from "@/server/audit";

type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
export class OnboardingError extends Error {}
const iso = (value: Date | null) => value?.toISOString() ?? null;

async function lockStudent(tx: Tx, user: SessionUser, studentId: string) {
  const [student] = await tx.select({ id: students.id, userId: students.userId, fullName: students.fullName })
    .from(students).where(and(eq(students.id, studentId), studentScope(user, "management"), isNull(students.archivedAt))).for("update").limit(1);
  if (!student) throw new OnboardingError("Không tìm thấy học viên.");
  return student;
}

/** Pre-provision an app account; Supabase verifies this email on the first sign-in. */
export async function activateStudentAccount(tx: Tx, user: SessionUser, data: z.infer<typeof activateStudentSchema>) {
  if (!can(user, "students.activate")) throw new OnboardingError("Chỉ quản trị viên được kích hoạt tài khoản học viên.");
  const student = await lockStudent(tx, user, data.studentId);
  const [enrollment] = await tx.select({ status: enrollments.status }).from(enrollments)
    .innerJoin(students, eq(students.id, enrollments.studentId))
    .where(and(eq(students.id, student.id), studentScope(user, "management"), isNull(students.archivedAt))).for("update", { of: enrollments });
  if (enrollment?.status !== "active") throw new OnboardingError("Bạn mở học thử trước khi cấp quyền đăng nhập.");
  // Never silently replace an existing identity when the contact email is edited.
  if (student.userId) {
    const [linked] = await tx.select({ email: users.email, disabledAt: users.disabledAt }).from(users)
      .where(eq(users.id, student.userId)).for("update");
    if (!linked || linked.email !== data.loginEmail) throw new OnboardingError("Hồ sơ đã gắn với email đăng nhập khác. Tài khoản hiện tại được giữ nguyên.");
    if (linked.disabledAt) throw new OnboardingError("Tài khoản đang bị vô hiệu hóa.");
    const inserted = await tx.insert(userRoles).values({ userId: student.userId, role: "student" }).onConflictDoNothing().returning({ userId: userRoles.userId });
    if (inserted.length) await audit(tx, { actorId: user.id, action: "student.account_activated", entity: "students", entityId: student.id });
    return { id: student.id };
  }
  await tx.insert(users).values({ email: data.loginEmail, name: student.fullName }).onConflictDoNothing();
  const [account] = await tx.select({ id: users.id, disabledAt: users.disabledAt }).from(users)
    .where(eq(users.email, data.loginEmail)).for("update");
  if (!account || account.disabledAt) throw new OnboardingError("Email này thuộc tài khoản đang bị vô hiệu hóa.");
  // The account lock serializes two profiles trying to claim the same email.
  const [other] = await tx.select({ id: students.id }).from(students)
    .where(and(eq(students.userId, account.id), studentScope(user, "management"), isNull(students.archivedAt))).limit(1);
  if (other) throw new OnboardingError("Email đăng nhập này đã gắn với hồ sơ học viên khác.");
  await tx.update(students).set({ userId: account.id })
    .where(and(eq(students.id, student.id), studentScope(user, "management"), isNull(students.archivedAt)));
  await tx.insert(userRoles).values({ userId: account.id, role: "student" }).onConflictDoNothing();
  await audit(tx, { actorId: user.id, action: "student.account_activated", entity: "students", entityId: student.id, data: { accountId: account.id } });
  return { id: student.id };
}

export async function setStudentChecklist(tx: Tx, user: SessionUser, data: z.infer<typeof checklistSchema>) {
  if (!can(user, "students.learning.edit")) throw new OnboardingError("Bạn không có quyền cập nhật học thử.");
  await lockStudent(tx, user, data.studentId);
  const [row] = await tx.select({ at: students[data.field] }).from(students)
    .where(and(eq(students.id, data.studentId), studentScope(user, "management"), isNull(students.archivedAt)));
  if (iso(row.at) !== data.expectedAt) throw new OnboardingError("Checklist đã được người khác cập nhật. Bạn tải lại hồ sơ nhé.");
  if (Boolean(row.at) === data.done) return { id: data.studentId };
  await tx.update(students).set({ [data.field]: data.done ? new Date() : null })
    .where(and(eq(students.id, data.studentId), studentScope(user, "management"), isNull(students.archivedAt)));
  await audit(tx, { actorId: user.id, action: "student.checklist_changed", entity: "students", entityId: data.studentId, data: { field: data.field, done: data.done } });
  return { id: data.studentId };
}

export async function confirmStudentTrialLesson(tx: Tx, user: SessionUser, data: z.infer<typeof confirmTrialLessonSchema>) {
  if (!can(user, "students.learning.edit")) throw new OnboardingError("Bạn không có quyền xác nhận bài học.");
  await lockStudent(tx, user, data.studentId);
  const [row] = await tx.select({ id: studyPlanLessons.id, trialOrder: studyPlanLessons.trialOrder, status: enrollments.status,
    completedAt: studyPlanLessons.completedAt, reportedAt: studyPlanLessons.reportedAt })
    .from(studyPlanLessons).innerJoin(enrollments, eq(enrollments.id, studyPlanLessons.enrollmentId))
    .innerJoin(students, eq(students.id, enrollments.studentId))
    .where(and(eq(students.id, data.studentId), eq(studyPlanLessons.id, data.planLessonId), studentScope(user, "management"), isNull(students.archivedAt)))
    .for("update", { of: studyPlanLessons });
  if (!row || row.trialOrder === null) throw new OnboardingError("Không tìm thấy bài học thử của học viên này.");
  if (row.status !== "active") throw new OnboardingError("Lượt học đang tạm dừng hoặc đã hủy.");
  if (iso(row.completedAt) !== data.expectedCompletedAt || iso(row.reportedAt) !== data.expectedReportedAt)
    throw new OnboardingError("Tiến độ bài học đã thay đổi. Bạn tải lại hồ sơ để kiểm tra nhé.");
  if (Boolean(row.completedAt) === data.completed) return { id: data.studentId };
  await tx.update(studyPlanLessons).set({ completedAt: data.completed ? new Date() : null }).where(eq(studyPlanLessons.id, row.id));
  await audit(tx, { actorId: user.id, action: data.completed ? "lesson.confirmed" : "lesson.confirmation_withdrawn", entity: "study_plan_lessons", entityId: row.id, data: { studentId: data.studentId } });
  return { id: data.studentId };
}

export async function retryStudentZaloMessages(tx: Tx, user: SessionUser, studentId: string) {
  if (!can(user, "students.learning.edit")) throw new OnboardingError("Bạn không có quyền gửi lại tin Zalo.");
  const [student] = await tx.select({ id: students.id }).from(students)
    .where(and(eq(students.id, studentId), studentScope(user, "management"), isNull(students.archivedAt))).for("update").limit(1);
  if (!student) throw new OnboardingError("Không tìm thấy học viên.");
  const retried = await tx.update(zaloBotOutbox).set({
    status: "pending", attempts: 0, availableAt: new Date(), lastError: null,
  }).where(and(eq(zaloBotOutbox.studentId, studentId), eq(zaloBotOutbox.status, "failed")))
    .returning({ id: zaloBotOutbox.id });
  if (retried.length) await audit(tx, {
    actorId: user.id, action: "student.zalo_messages_retried", entity: "students",
    entityId: studentId, data: { count: retried.length },
  });
  return { id: studentId };
}
