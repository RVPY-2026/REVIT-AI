import "server-only";
import { and, asc, eq, sql } from "drizzle-orm";
import { can, type SessionUser } from "@/lib/auth/permissions";
import type { LearningProgress, ManagedLesson, ManagedResource } from "@/lib/schemas/learning-content";
import { resourceFormat } from "@/lib/student-learning";
import { commitmentDates } from "@/lib/study-plan";
import { db, type Db } from "@/server/db";
import { lessons, learningResources, learningUploads, studyPlanLessons, students, enrollments } from "@/server/db/schema";
import { studentScope } from "@/server/auth/scope";

export async function listManagedLessons(user: SessionUser, conn: Db = db): Promise<ManagedLesson[]> {
  if (!can(user, "lessons.manage") && !can(user, "resources.manage")) throw new Error("Forbidden");
  return conn.select({ id: lessons.id, phase: lessons.phase, lessonNumbers: lessons.lessonNumbers, title: lessons.title, baseDays: lessons.baseDays, sortOrder: lessons.sortOrder, trialOrder: lessons.trialOrder, active: lessons.active,
    resourceCount: sql<number>`(select count(*)::int from ${learningResources} where ${learningResources.lessonId} = ${lessons.id})`,
    // Plan counts touch students and must carry management scope, even for admin.
    planCount: sql<number>`(select count(*)::int from ${studyPlanLessons} join ${enrollments} on ${enrollments.id} = ${studyPlanLessons.enrollmentId} join ${students} on ${students.id} = ${enrollments.studentId} where ${studyPlanLessons.lessonId} = ${lessons.id} and ${studentScope(user, "management")})`,
  }).from(lessons).orderBy(asc(lessons.phase), asc(lessons.sortOrder), asc(lessons.id));
}
export async function listManagedResources(user: SessionUser, conn: Db = db): Promise<ManagedResource[]> {
  if (!can(user, "resources.manage")) throw new Error("Forbidden");
  const rows = await conn.select({ id: learningResources.id, lessonId: learningResources.lessonId, title: learningResources.title, audience: learningResources.audience, mode: learningResources.mode, active: learningResources.active, sortOrder: learningResources.sortOrder,
    objectPath: learningResources.objectPath, externalUrl: learningResources.externalUrl, size: learningUploads.size,
  }).from(learningResources).leftJoin(learningUploads, eq(learningUploads.objectPath, learningResources.objectPath)).orderBy(asc(learningResources.sortOrder), asc(learningResources.id));
  return rows.map(({ objectPath, externalUrl, ...row }) => ({ ...row, format: resourceFormat({ objectPath, externalUrl }), filename: objectPath?.split("/").pop() ?? null, youtubeUrl: externalUrl }));
}
export async function getManagedLearningProgress(user: SessionUser, studentId: string, conn: Db = db): Promise<LearningProgress | null> {
  if (!can(user, "students.view")) throw new Error("Forbidden");
  const scope = and(eq(students.id, studentId), studentScope(user, "management"));
  const [row] = await conn.select({ id: students.id, kind: enrollments.kind, status: enrollments.status, startDate: enrollments.startDate, multiplier: enrollments.durationMultiplier }).from(students).leftJoin(enrollments, eq(enrollments.studentId, students.id)).where(scope).limit(1);
  if (!row) return null;
  const plan = await conn.select({ id: studyPlanLessons.id, phase: studyPlanLessons.phase, title: studyPlanLessons.title, baseDays: studyPlanLessons.baseDays, dueDateOverride: studyPlanLessons.dueDateOverride, trialOrder: studyPlanLessons.trialOrder, reportedAt: studyPlanLessons.reportedAt, completedAt: studyPlanLessons.completedAt, progressNote: studyPlanLessons.progressNote, submissionUrl: studyPlanLessons.submissionUrl }).from(studyPlanLessons).innerJoin(enrollments, eq(enrollments.id, studyPlanLessons.enrollmentId)).innerJoin(students, eq(students.id, enrollments.studentId)).where(scope).orderBy(asc(studyPlanLessons.phase), asc(studyPlanLessons.sortOrder));
  const dueDates = new Map<string, string | null>();
  for (const phase of ["foundation", "specialist"] as const) {
    const group = plan.filter((l) => l.phase === phase);
    const dates = commitmentDates(row.startDate, row.multiplier ?? 1, group);
    group.forEach((l, i) => dueDates.set(l.id, dates[i]));
  }
  return { studentId, kind: row.kind, active: row.status === "active", lessons: plan.map((l) => ({ id: l.id, phase: l.phase, title: l.title, trialOrder: l.trialOrder, progressNote: l.progressNote, submissionUrl: l.submissionUrl, dueDate: dueDates.get(l.id) ?? null, reportedAt: l.reportedAt?.toISOString() ?? null, completedAt: l.completedAt?.toISOString() ?? null })) };
}
