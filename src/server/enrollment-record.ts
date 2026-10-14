import "server-only";
import { and, eq } from "drizzle-orm";
import { can, type SessionUser } from "@/lib/auth/permissions";
import type { Db } from "@/server/db";
import { studentScope } from "@/server/auth/scope";
import { audit } from "@/server/audit";
import { queueTrialThanks } from "@/server/zalo/outbox";
import { enrollments, lessons, students, studentStatusEvents, studyPlanLessons } from "@/server/db/schema";

type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
type Stage = typeof students.$inferSelect.status;
export class EnrollmentError extends Error {}

async function lockedStudent(tx: Tx, user: SessionUser, id: string) {
  const [row] = await tx.select({ id: students.id, status: students.status }).from(students)
    .where(and(eq(students.id, id), studentScope(user, "management"))).for("update");
  if (!row) throw new EnrollmentError("Không tìm thấy học viên.");
  return row;
}

async function setStage(tx: Tx, user: SessionUser, student: { id: string; status: Stage }, status: Stage) {
  if (student.status === status) return;
  await tx.update(students).set({ status }).where(eq(students.id, student.id));
  await tx.insert(studentStatusEvents).values({ studentId: student.id, fromStatus: student.status, toStatus: status, changedById: user.id });
}

/** The caller must wrap this entire operation in a transaction. */
export async function enrollStudent(tx: Tx, user: SessionUser, studentId: string,
  formal?: { agreedFeeVnd: number; feeNote?: string }) {
  if (!can(user, formal ? "enrollments.formal" : "enrollments.trial")) throw new EnrollmentError("Bạn không có quyền thực hiện thao tác này.");
  const student = await lockedStudent(tx, user, studentId);
  const [existing] = await tx.select({ id: enrollments.id, kind: enrollments.kind, trialStartedAt: enrollments.trialStartedAt, formalStartedAt: enrollments.formalStartedAt })
    .from(enrollments).where(eq(enrollments.studentId, studentId));
  if (!formal && existing?.kind === "formal") throw new EnrollmentError("Học viên đã học chính thức.");
  const now = new Date();
  const values = formal
    ? { kind: "formal" as const, status: "active" as const, agreedFeeVnd: formal.agreedFeeVnd, feeNote: formal.feeNote ?? null, formalStartedAt: existing?.formalStartedAt ?? now }
    : { kind: "trial" as const, status: "active" as const, trialStartedAt: existing?.trialStartedAt ?? now };
  let enrollmentId = existing?.id;
  if (enrollmentId) {
    await tx.update(enrollments).set(values).where(eq(enrollments.id, enrollmentId));
  } else {
    const templates = await tx.select({ lessonId: lessons.id, phase: lessons.phase, lessonNumbers: lessons.lessonNumbers, title: lessons.title, baseDays: lessons.baseDays, sortOrder: lessons.sortOrder, trialOrder: lessons.trialOrder })
      .from(lessons).where(eq(lessons.active, true));
    if (![1, 2, 3].every((order) => templates.some((lesson) => lesson.trialOrder === order))) {
      throw new EnrollmentError("Chưa cấu hình đủ 3 bài học thử.");
    }
    const [created] = await tx.insert(enrollments).values({ studentId, ...values }).returning({ id: enrollments.id });
    enrollmentId = created.id;
    await tx.insert(studyPlanLessons).values(templates.map((lesson) => ({ ...lesson, enrollmentId: created.id })));
  }
  await setStage(tx, user, student, formal ? "enrolled" : "trial");
  await audit(tx, { actorId: user.id, action: formal ? "enrollment.formal" : "enrollment.trial", entity: "enrollments", entityId: enrollmentId, data: formal });
  if (!formal) await queueTrialThanks(tx, studentId, existing?.trialStartedAt ?? now);
  return { id: studentId };
}

export async function changeKanbanStage(tx: Tx, user: SessionUser, studentId: string, status: "new" | "consulting" | "dropped") {
  if (!can(user, "students.edit")) throw new EnrollmentError("Bạn không có quyền thực hiện thao tác này.");
  const student = await lockedStudent(tx, user, studentId);
  const [enrollment] = await tx.select({ id: enrollments.id, kind: enrollments.kind }).from(enrollments).where(eq(enrollments.studentId, studentId));
  if (enrollment && status !== "dropped") throw new EnrollmentError("Dùng thao tác mở học thử hoặc chuyển chính thức để thay đổi học viên này.");
  if (enrollment?.kind === "formal" && !can(user, "enrollments.formal")) throw new EnrollmentError("Chỉ quản trị viên được dừng học chính thức.");
  if (enrollment) await tx.update(enrollments).set({ status: "cancelled" }).where(eq(enrollments.id, enrollment.id));
  await setStage(tx, user, student, status);
  await audit(tx, { actorId: user.id, action: "student.stage_changed", entity: "students", entityId: studentId, data: { status } });
  return { id: studentId };
}
