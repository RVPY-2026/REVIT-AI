import "server-only";
import { and, asc, eq, isNotNull, sql } from "drizzle-orm";
import { can, type SessionUser } from "@/lib/auth/permissions";
import { CHECKLIST_FIELDS, type StudentOnboarding } from "@/lib/schemas/student-onboarding";
import { trialEndsAt } from "@/lib/student-learning";
import { studentScope } from "@/server/auth/scope";
import { db, type Db } from "@/server/db";
import { students, users, userRoles, enrollments, studyPlanLessons, zaloBotConnections, zaloBotOutbox } from "@/server/db/schema";

const iso = (date: Date | null) => date?.toISOString() ?? null;
export async function getStudentOnboarding(user: SessionUser, studentId: string, conn: Db = db): Promise<StudentOnboarding | null> {
  if (!can(user, "students.view")) throw new Error("Forbidden");
  const where = and(eq(students.id, studentId), studentScope(user, "management"));
  const [student] = await conn.select({ id: students.id,
    zaloFriendAt: students.zaloFriendAt, group1At: students.group1At, group2At: students.group2At,
    feeSentAt: students.feeSentAt, softwareReadyAt: students.softwareReadyAt, officialZaloAt: students.officialZaloAt,
    enrollment: { kind: enrollments.kind, status: enrollments.status, trialStartedAt: enrollments.trialStartedAt, trialExpiresAt: enrollments.trialExpiresAt },
  }).from(students).leftJoin(enrollments, eq(students.id, enrollments.studentId)).where(where).limit(1);
  if (!student) return null;
  const [zaloConnection] = await conn.select({ chatId: zaloBotConnections.chatId }).from(zaloBotConnections)
    .where(eq(zaloBotConnections.studentId, studentId)).limit(1);
  const [zaloQueue] = await conn.select({
    failed: sql<number>`count(*) filter (where ${zaloBotOutbox.status} = 'failed')`,
    pending: sql<number>`count(*) filter (where ${zaloBotOutbox.status} = 'pending')`,
    oldest: sql<string | null>`min(${zaloBotOutbox.createdAt}) filter (where ${zaloBotOutbox.status} = 'pending')`,
  }).from(zaloBotOutbox).where(eq(zaloBotOutbox.studentId, studentId));
  const enrollment = student.enrollment;
  const lessonRows = await conn.select({ id: studyPlanLessons.id, title: studyPlanLessons.title, trialOrder: studyPlanLessons.trialOrder,
    reportedAt: studyPlanLessons.reportedAt, completedAt: studyPlanLessons.completedAt,
    progressNote: studyPlanLessons.progressNote, submissionUrl: studyPlanLessons.submissionUrl,
  }).from(studyPlanLessons).innerJoin(enrollments, eq(enrollments.id, studyPlanLessons.enrollmentId))
    .innerJoin(students, eq(students.id, enrollments.studentId))
    .where(and(where, isNotNull(studyPlanLessons.trialOrder))).orderBy(asc(studyPlanLessons.trialOrder));
  // Login identities are visible only to the admin who can grant access.
  const [account] = can(user, "students.activate") ? await conn.select({ email: users.email, disabledAt: users.disabledAt,
    studentRole: sql<boolean>`exists(select 1 from ${userRoles} where ${userRoles.userId} = ${users.id} and ${userRoles.role} = 'student')`,
  }).from(students).innerJoin(users, eq(students.userId, users.id)).where(where).limit(1) : [];
  const start = enrollment ? iso(enrollment.trialStartedAt) : null;
  return {
    studentId, zalo: { connected: Boolean(zaloConnection?.chatId), failedCount: Number(zaloQueue?.failed ?? 0),
      pendingCount: Number(zaloQueue?.pending ?? 0), oldestPendingAt: zaloQueue?.oldest ? new Date(zaloQueue.oldest).toISOString() : null },
    account: account ? { email: account.email, active: !account.disabledAt && account.studentRole } : null,
    checklist: Object.fromEntries(CHECKLIST_FIELDS.map((field) => [field, iso(student[field])])) as StudentOnboarding["checklist"],
    enrollment: enrollment ? { kind: enrollment.kind, status: enrollment.status, trialStartedAt: start, trialEndsAt: trialEndsAt(start, iso(enrollment.trialExpiresAt)) } : null,
    lessons: lessonRows.map((row) => ({ ...row, trialOrder: row.trialOrder!, reportedAt: iso(row.reportedAt), completedAt: iso(row.completedAt) })),
  };
}
