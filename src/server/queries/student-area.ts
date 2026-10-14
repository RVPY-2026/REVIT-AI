import "server-only";
import { and, asc, eq, inArray, isNull, or, sql, type SQL } from "drizzle-orm";
import type { SessionUser } from "@/lib/auth/permissions";
import {
  allowedAudiences, canOpenLesson, hasLearningAccess, lessonState, resourceFormat, trialEndsAt,
} from "@/lib/student-learning";
import { commitmentDates } from "@/lib/study-plan";
import type { MyEnrollment, MyLearning, MyLicense, MyPlanLesson, MyReferrals, MyResource } from "@/lib/schemas/student-area";
import { studentScope } from "@/server/auth/scope";
import { db, type Db } from "@/server/db";
import { enrollments, learningResources, lessons, licenses, studyPlanLessons, students } from "@/server/db/schema";

// Every query here starts from `students` filtered by studentScope(user, "student"), or joins to it,
// so a student can only ever reach their own rows (BACKEND_RULES §4). The optional `conn` lets
// tests run the same queries inside a transaction they roll back.

const own = (user: SessionUser) => studentScope(user, "student");
const iso = (value: Date | null) => (value ? value.toISOString() : null);

export async function getMyLearning(user: SessionUser, conn: Db = db, now = new Date()): Promise<MyLearning | null> {
  const [student] = await conn.select({
    id: students.id, code: students.code, fullName: students.fullName, status: students.status,
    group1At: students.group1At, group2At: students.group2At,
    softwareReadyAt: students.softwareReadyAt, officialZaloAt: students.officialZaloAt,
  }).from(students).where(own(user)).limit(1);
  if (!student) return null;

  const [enrollmentRows, planRows, licenseRows] = await Promise.all([
    conn.select({
      id: enrollments.id, kind: enrollments.kind, status: enrollments.status, startDate: enrollments.startDate,
      durationMultiplier: enrollments.durationMultiplier, trialStartedAt: enrollments.trialStartedAt,
      trialExpiresAt: enrollments.trialExpiresAt, formalStartedAt: enrollments.formalStartedAt,
      agreedFeeVnd: enrollments.agreedFeeVnd,
    }).from(enrollments).innerJoin(students, eq(enrollments.studentId, students.id)).where(own(user)).limit(1),
    conn.select({
      id: studyPlanLessons.id, phase: studyPlanLessons.phase, lessonNumbers: studyPlanLessons.lessonNumbers,
      title: studyPlanLessons.title, baseDays: studyPlanLessons.baseDays, sortOrder: studyPlanLessons.sortOrder,
      trialOrder: studyPlanLessons.trialOrder, priority: studyPlanLessons.priority,
      dueDateOverride: studyPlanLessons.dueDateOverride, progressNote: studyPlanLessons.progressNote,
      submissionUrl: studyPlanLessons.submissionUrl, reportedAt: studyPlanLessons.reportedAt,
      completedAt: studyPlanLessons.completedAt,
    }).from(studyPlanLessons)
      .innerJoin(enrollments, eq(studyPlanLessons.enrollmentId, enrollments.id))
      .innerJoin(students, eq(enrollments.studentId, students.id))
      .where(own(user))
      .orderBy(asc(studyPlanLessons.phase), asc(studyPlanLessons.sortOrder)),
    conn.select({
      id: licenses.id, product: licenses.product, status: licenses.status,
      startsAt: licenses.startsAt, expiresAt: licenses.expiresAt,
    }).from(licenses).innerJoin(students, eq(licenses.studentId, students.id)).where(own(user))
      .orderBy(asc(licenses.startsAt)),
  ]);

  const enrollmentRow = enrollmentRows[0];
  const enrollment: MyEnrollment | null = enrollmentRow ? {
    kind: enrollmentRow.kind,
    status: enrollmentRow.status,
    startDate: enrollmentRow.startDate,
    trialStartedAt: iso(enrollmentRow.trialStartedAt),
    trialEndsAt: enrollmentRow.kind === "trial"
      ? trialEndsAt(iso(enrollmentRow.trialStartedAt), iso(enrollmentRow.trialExpiresAt)) : null,
    formalStartedAt: iso(enrollmentRow.formalStartedAt),
    agreedFeeVnd: enrollmentRow.agreedFeeVnd,
  } : null;

  // Each phase is scheduled on its own: the rows are already in plan order within a phase.
  const dueDates = new Map<string, string | null>();
  for (const phase of ["foundation", "specialist"] as const) {
    const phaseRows = planRows.filter((row) => row.phase === phase);
    if (!enrollmentRow || !phaseRows.length) continue;
    const dates = commitmentDates(enrollmentRow.startDate, enrollmentRow.durationMultiplier, phaseRows);
    phaseRows.forEach((row, index) => dueDates.set(row.id, dates[index]));
  }

  const plan: MyPlanLesson[] = planRows.map((row) => {
    const dueDate = dueDates.get(row.id) ?? null;
    const reportedAt = iso(row.reportedAt);
    const completedAt = iso(row.completedAt);
    return {
      id: row.id, phase: row.phase, lessonNumbers: row.lessonNumbers, title: row.title,
      sortOrder: row.sortOrder, trialOrder: row.trialOrder, priority: row.priority, dueDate,
      progressNote: row.progressNote, submissionUrl: row.submissionUrl, reportedAt, completedAt,
      state: lessonState({ completedAt, reportedAt, dueDate }, now),
      accessible: canOpenLesson(enrollment, row.trialOrder),
    };
  });

  const licenseList: MyLicense[] = licenseRows.map((row) => ({
    id: row.id, product: row.product, startsAt: row.startsAt.toISOString(), expiresAt: iso(row.expiresAt),
    status: row.status === "active" && row.expiresAt && row.expiresAt < now ? "expired" : row.status,
  }));

  return {
    student: {
      id: student.id, code: student.code, fullName: student.fullName, status: student.status,
      group1At: iso(student.group1At), group2At: iso(student.group2At),
      softwareReadyAt: iso(student.softwareReadyAt), officialZaloAt: iso(student.officialZaloAt),
    },
    enrollment,
    lessons: plan,
    licenses: licenseList,
  };
}

/**
 * Resource rows the caller's enrollment allows. Audience and lesson access are filtered in SQL,
 * never in the page: a file attached to a lesson follows that lesson's access.
 */
async function visibleResources(user: SessionUser, conn: Db, extra?: SQL) {
  const [row] = await conn.select({ kind: enrollments.kind, status: enrollments.status })
    .from(students)
    .leftJoin(enrollments, eq(enrollments.studentId, students.id))
    .where(own(user)).limit(1);
  // No student row at all: nothing is visible.
  if (!row) return [];
  const enrollment = row.kind && row.status ? { kind: row.kind, status: row.status } : null;
  const lessonAccess = !enrollment || !hasLearningAccess(enrollment) ? isNull(learningResources.lessonId)
    : enrollment.kind === "trial" ? or(isNull(learningResources.lessonId), sql`exists (
      select 1 from ${studyPlanLessons}
      join ${enrollments} on ${enrollments.id} = ${studyPlanLessons.enrollmentId}
      join ${students} on ${students.id} = ${enrollments.studentId}
      where ${studyPlanLessons.lessonId} = ${learningResources.lessonId}
        and ${studyPlanLessons.trialOrder} is not null and ${own(user)}
    )`)
    : undefined;
  return conn.select({
    id: learningResources.id, title: learningResources.title, lessonId: learningResources.lessonId,
    lessonTitle: lessons.title, mode: learningResources.mode, bucket: learningResources.bucket,
    objectPath: learningResources.objectPath, externalUrl: learningResources.externalUrl,
  }).from(learningResources)
    .leftJoin(lessons, eq(learningResources.lessonId, lessons.id))
    .where(and(
      eq(learningResources.active, true),
      inArray(learningResources.audience, allowedAudiences(enrollment)),
      lessonAccess, extra,
    ))
    .orderBy(asc(lessons.sortOrder), asc(learningResources.sortOrder), asc(learningResources.title));
}

function toResource(row: Awaited<ReturnType<typeof visibleResources>>[number]): MyResource {
  return {
    id: row.id, title: row.title, lessonId: row.lessonId, lessonTitle: row.lessonTitle, mode: row.mode,
    format: resourceFormat(row), embedUrl: row.externalUrl,
  };
}

export async function listMyResources(user: SessionUser, conn: Db = db): Promise<MyResource[]> {
  return (await visibleResources(user, conn)).map(toResource);
}

/** Resources attached to one curriculum lesson, by its template id. */
export async function listMyLessonResources(user: SessionUser, templateLessonId: string, conn: Db = db): Promise<MyResource[]> {
  return (await visibleResources(user, conn, eq(learningResources.lessonId, templateLessonId))).map(toResource);
}

/** The template lesson behind one of the caller's plan rows, or null when it is not theirs. */
export async function getMyPlanLessonTemplate(user: SessionUser, planLessonId: string, conn: Db = db): Promise<string | null> {
  const [row] = await conn.select({ lessonId: studyPlanLessons.lessonId }).from(studyPlanLessons)
    .innerJoin(enrollments, eq(studyPlanLessons.enrollmentId, enrollments.id))
    .innerJoin(students, eq(enrollments.studentId, students.id))
    .where(and(eq(studyPlanLessons.id, planLessonId), own(user))).limit(1);
  return row?.lessonId ?? null;
}

/** Storage location of one file the caller may open; used only by the file route. */
export async function getMyResourceFile(user: SessionUser, id: string, conn: Db = db) {
  const [row] = await visibleResources(user, conn, eq(learningResources.id, id));
  if (!row || !row.bucket || !row.objectPath) return null;
  return { id: row.id, title: row.title, mode: row.mode, bucket: row.bucket, objectPath: row.objectPath };
}

/** Counts only: no profile of a referred person ever reaches the student. */
export async function getMyReferrals(user: SessionUser, conn: Db = db): Promise<MyReferrals | null> {
  // Written out in full: Drizzle drops table qualifiers in a single-table select, which would make
  // the correlated "id" resolve to the inner table. The outer row is still limited by studentScope.
  const [row] = await conn.select({
    code: students.code,
    invited: sql<number>`(select count(*) from "students" "referred" where "referred"."referred_by_id" = "students"."id")`,
    enrolled: sql<number>`(select count(*) from "students" "referred" where "referred"."referred_by_id" = "students"."id" and "referred"."status" = 'enrolled')`,
  }).from(students).where(own(user)).limit(1);
  return row ? { code: row.code, invited: Number(row.invited), enrolled: Number(row.enrolled) } : null;
}
