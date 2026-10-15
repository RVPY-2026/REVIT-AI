import "server-only";
import { and, asc, count, desc, eq, exists, gte, ilike, inArray, isNull, isNotNull, lt, lte, or, sql, type SQL } from "drizzle-orm";
import { z } from "zod";
import { can, isAdmin, type SessionUser } from "@/lib/auth/permissions";
import { DEFAULT_SORT_DIR, StudentArchiveAccessError, studentFilterSchema, studentMonthRange, studentSearchPattern, type StudentDetail, type ParsedStudentFilter, type StudentFilter, type StudentList, type StudentSummary, type StudentOverview, type StudentKanban } from "@/lib/schemas/student";
import { STUDENT_STATUSES } from "@/lib/constants";
import { ACTIVE_STATUSES, FOLLOW_UP_AFTER_DAYS, businessDayStart } from "@/lib/follow-up";
import { db } from "@/server/db";
import { adSources, callNotes, studentStatusEvents, students, users, enrollments, studyPlanLessons } from "@/server/db/schema";
import { normalizePhone, NORMALIZED_PHONE_SQL } from "@/lib/phone";
import { isPhoneSearch, studentSearchText } from "@/lib/student-search";
import { canCorrectContactNote } from "@/lib/contact-note";
import { studentScope } from "@/server/auth/scope";

const managementPermission = "students.view" as const;

export async function findPhoneMatches(user: SessionUser, phone: string) {
  const { phoneMatches } = await import("@/server/phone-matches");
  return phoneMatches(db, user, phone, undefined, true);
}

function assertCanView(user: SessionUser) {
  if (!can(user, managementPermission)) throw new Error("Forbidden");
}

function assertCanExport(user: SessionUser) {
  if (!can(user, "students.export")) throw new Error("Forbidden");
}

function assertDatabaseSourceId(sourceId: string | undefined) {
  if (sourceId && !z.uuid().safeParse(sourceId).success) throw new Error("Invalid source filter");
}

/** Build all list/export predicates from validated input and an explicit caller scope. */
export function buildStudentConditions(user: SessionUser, filter: ParsedStudentFilter): SQL[] {
  const conditions: SQL[] = [studentScope(user, "management")];
  if (filter.archived && !isAdmin(user)) throw new StudentArchiveAccessError();
  conditions.push(filter.archived ? isNotNull(students.archivedAt) : isNull(students.archivedAt));

  if (filter.status) conditions.push(eq(students.status, filter.status));
  if (filter.sourceId) conditions.push(eq(students.sourceId, filter.sourceId));
  if (filter.month) {
    const { start, end } = studentMonthRange(filter.month);
    conditions.push(sql`${students.signedUpAt} >= ${start} AND ${students.signedUpAt} < ${end}`);
  }
  if (filter.followUp) conditions.push(followUpCondition(filter.followUp));
  if (filter.search) {
    // Escape LIKE metacharacters so search is a bounded, literal substring lookup.
    const pattern = studentSearchPattern(studentSearchText(filter.search));
    const phone = normalizePhone(filter.search);
    conditions.push(or(
      sql`rvpy_search_text(${students.fullName}) like ${pattern}`,
      sql`rvpy_search_text(${students.email}) like ${pattern}`,
      isPhoneSearch(filter.search) && /^[0-9]+$/.test(phone) ? sql`${sql.raw(NORMALIZED_PHONE_SQL)} like ${studentSearchPattern(phone)}` : undefined,
      ilike(students.code, pattern),
    )!);
  }

  return conditions;
}

/** Latest call note: the only recorded consultant contact. */
const lastContactSql = sql`(select max(${callNotes.createdAt}) from ${callNotes} where ${callNotes.studentId} = ${students.id})`;
const nextActionSql = sql`(select ${callNotes.nextActionAt} from ${callNotes} where ${callNotes.studentId} = ${students.id} order by ${callNotes.createdAt} desc, ${callNotes.id} desc limit 1)`;

function followUpCutoff(now = new Date()): Date {
  return new Date(businessDayStart(now).getTime() - (FOLLOW_UP_AFTER_DAYS - 1) * 86_400_000);
}

/** Active leads only; "overdue" means the last note is at least FOLLOW_UP_AFTER_DAYS business days old. */
export function followUpCondition(kind: "uncontacted" | "overdue" | "due", now = new Date()): SQL {
  const active = inArray(students.status, [...ACTIVE_STATUSES]);
  const noNote = sql`${lastContactSql} is null`;
  const noSchedule = sql`${nextActionSql} is null`;
  if (kind === "uncontacted") return and(active, noSchedule, noNote, isNull(students.archivedAt))!;
  const overdue = sql`${lastContactSql} < ${followUpCutoff(now).toISOString()}::timestamptz`;
  if (kind === "overdue") return and(active, noSchedule, overdue, isNull(students.archivedAt))!;
  return and(active, isNull(students.archivedAt), or(sql`${nextActionSql} <= ${now.toISOString()}::timestamptz`, and(noSchedule, or(noNote, overdue))))!;
}

const summarySelection = {
  id: students.id,
  code: students.code,
  fullName: students.fullName,
  phone: students.phone,
  email: students.email,
  status: students.status,
  sourceId: adSources.id,
  sourceCode: adSources.code,
  sourceName: adSources.name,
  signedUpAt: students.signedUpAt,
  lastContactAt: sql<Date | string | null>`${lastContactSql}`,
  nextActionAt: sql<Date | string | null>`${nextActionSql}`,
  archivedAt: students.archivedAt,
  archiveReason: students.archiveReason,
  droppedReason: sql<StudentSummary["droppedReason"]>`(select reason from student_status_events where student_id = ${students.id} and kind = 'status' and to_status = 'dropped' order by created_at desc, id desc limit 1)`,
  droppedNote: sql<string | null>`(select note from student_status_events where student_id = ${students.id} and kind = 'status' and to_status = 'dropped' order by created_at desc, id desc limit 1)`,
};

function toSummary(row: {
  id: string; code: string; fullName: string; phone: string; email: string | null;
  status: StudentSummary["status"]; sourceId: string; sourceCode: string; sourceName: string; signedUpAt: Date;
  lastContactAt: Date | string | null;
  nextActionAt?: Date | string | null; archivedAt?: Date | null;
}): StudentSummary {
  // The raw subquery is not decoded by the column mapper, so accept a string or a Date.
  return { ...row, signedUpAt: row.signedUpAt.toISOString(), lastContactAt: row.lastContactAt ? new Date(row.lastContactAt).toISOString() : null,
    nextActionAt: row.nextActionAt ? new Date(row.nextActionAt).toISOString() : null, archivedAt: row.archivedAt?.toISOString() ?? null };
}

function orderFor(filter: ParsedStudentFilter): SQL[] {
  const dir = filter.dir ?? DEFAULT_SORT_DIR[filter.sort];
  const column = {
    signedUpAt: students.signedUpAt,
    fullName: students.fullName,
    status: students.status,
    lastContactAt: sql`${lastContactSql}`,
    nextActionAt: sql`${nextActionSql}`,
  }[filter.sort];
  // Never-contacted leads surface first when sorting by the oldest contact.
  const nulls = filter.sort === "lastContactAt" ? (dir === "asc" ? sql` nulls first` : sql` nulls last`) : sql``;
  if (filter.sort === "nextActionAt") return [sql`${nextActionSql} ${dir === "asc" ? sql`asc` : sql`desc`} nulls last`, sql`${lastContactSql} asc nulls first`, asc(students.signedUpAt), asc(students.id)];
  return [sql`${column} ${dir === "asc" ? sql`asc` : sql`desc`}${nulls}`, desc(students.signedUpAt), asc(students.id)];
}

function sourceScope(user: SessionUser) {
  if (isAdmin(user)) return undefined;
  return user.sourceIds.length ? inArray(adSources.id, user.sourceIds) : sql`false`;
}

export async function getStudentSources(user: SessionUser): Promise<StudentList["sources"]> {
  assertCanView(user);
  return db.select({ id: adSources.id, code: adSources.code, name: adSources.name, active: adSources.active })
    .from(adSources).where(sourceScope(user)).orderBy(asc(adSources.code));
}

/** One grouped query supplies chips and the due quick view with their own filter omitted. */
export async function getStudentFacets(user: SessionUser, input: StudentFilter) {
  assertCanView(user);
  const filter = studentFilterSchema.parse(input);
  const base = buildStudentConditions(user, { ...filter, status: undefined, followUp: undefined });
  const groups = await db.select({ status: students.status,
    total: sql<number>`count(*) filter (where ${filter.followUp ? followUpCondition(filter.followUp) : sql`true`})`,
    due: sql<number>`count(*) filter (where ${followUpCondition("due")} and ${filter.status ? eq(students.status, filter.status) : sql`true`})`,
  }).from(students).where(and(...base)).groupBy(students.status);
  const counts = Object.fromEntries(STUDENT_STATUSES.map(status => [status, Number(groups.find(group => group.status === status)?.total ?? 0)])) as Record<StudentSummary["status"], number>;
  return { counts, dueCount: groups.reduce((total, group) => total + Number(group.due), 0) };
}

/** Group only the rendered IDs for trial progress; ownership is repeated on every join. */
export async function decoratePageStudents(user: SessionUser, rows: StudentSummary[]): Promise<StudentSummary[]> {
  assertCanView(user);
  if (!rows.length) return rows;
  const ids = rows.map(row => row.id);
  const trialRows = await db.select({ id: students.id, group1At: students.group1At, group2At: students.group2At, softwareReadyAt: students.softwareReadyAt,
    enrollmentStatus: enrollments.status, trialStartedAt: enrollments.trialStartedAt, trialExpiresAt: enrollments.trialExpiresAt,
    plan: sql<number>`count(${studyPlanLessons.id}) filter (where ${studyPlanLessons.trialOrder} in (1,2,3))`,
    confirmed: sql<number>`count(${studyPlanLessons.id}) filter (where ${studyPlanLessons.trialOrder} in (1,2,3) and ${studyPlanLessons.completedAt} is not null)`,
  }).from(students).leftJoin(enrollments, eq(enrollments.studentId, students.id)).leftJoin(studyPlanLessons, eq(studyPlanLessons.enrollmentId, enrollments.id))
    .where(and(inArray(students.id, ids), inArray(students.status, ["trial", "enrolled"]), studentScope(user, "management")))
    .groupBy(students.id, enrollments.id);
  const duplicatePhones = new Set<string>();
  if (isAdmin(user)) {
    const normalized = sql<string>`${sql.raw(NORMALIZED_PHONE_SQL)}`;
    const groups = await db.select({ phone: normalized, total: count() }).from(students)
      .where(and(isNull(students.archivedAt), studentScope(user, "management"), inArray(normalized, rows.map(row => normalizePhone(row.phone)))))
      .groupBy(normalized).having(sql`count(*) > 1`);
    for (const group of groups) duplicatePhones.add(group.phone);
  }
  return rows.map(row => {
    const trial = trialRows.find(item => item.id === row.id);
    const end = trial?.trialExpiresAt ?? (trial?.trialStartedAt ? new Date(trial.trialStartedAt.getTime() + 9 * 86_400_000) : null);
    return { ...row, ...(isAdmin(user) ? { duplicatePhone: !row.archivedAt && duplicatePhones.has(normalizePhone(row.phone)) } : {}),
      trial: trial ? { daysLeft: end ? Math.max(0, Math.ceil((end.getTime() - Date.now()) / 86_400_000)) : null,
        checklist: [trial.group1At, trial.group2At, trial.softwareReadyAt].filter(Boolean).length,
        confirmed: Number(trial.confirmed), hasPlan: trial.enrollmentStatus === "active" && Number(trial.plan) === 3 } : null };
  });
}

/** A bounded, scoped selection snapshot; status changes compare each returned status again under lock. */
export async function selectMatchingStudents(user: SessionUser, input: StudentFilter) {
  assertCanView(user);
  const filter = studentFilterSchema.parse(input);
  assertDatabaseSourceId(filter.sourceId);
  return db.select({ id: students.id, status: students.status }).from(students)
    .where(and(...buildStudentConditions(user, filter))).orderBy(...orderFor(filter)).limit(100);
}

/** A few scoped aggregate queries instead of loading every lead. */
export async function getStudentOverview(user: SessionUser): Promise<StudentOverview> {
  assertCanView(user);
  const scope = and(studentScope(user, "management"), isNull(students.archivedAt));
  const now = new Date();
  const today = businessDayStart(now);
  const weekStart = new Date(today.getTime() - 6 * 86_400_000);
  const previousWeekStart = new Date(weekStart.getTime() - 7 * 86_400_000);
  const base = () => db.select(summarySelection).from(students).innerJoin(adSources, eq(students.sourceId, adSources.id));
  const [groups, rows, signupRows, sourceRows, uncontactedCount, overdueCount, uncontactedRows, overdueRows] = await Promise.all([
    db.select({ status: students.status, total: count() }).from(students).where(scope).groupBy(students.status),
    base().where(scope).orderBy(desc(students.signedUpAt), asc(students.id)).limit(5),
    db.select({
      today: sql<number>`count(*) filter (where ${gte(students.signedUpAt, today)})`,
      week: sql<number>`count(*) filter (where ${gte(students.signedUpAt, weekStart)})`,
      previousWeek: sql<number>`count(*) filter (where ${gte(students.signedUpAt, previousWeekStart)} and ${lt(students.signedUpAt, weekStart)})`,
    }).from(students).where(scope),
    db.select({
      id: adSources.id, code: adSources.code, name: adSources.name, total: count(),
      enrolled: sql<number>`count(*) filter (where ${eq(students.status, "enrolled")})`,
    }).from(students).innerJoin(adSources, eq(students.sourceId, adSources.id)).where(scope)
      .groupBy(adSources.id, adSources.code, adSources.name).orderBy(asc(adSources.code)),
    db.select({ value: count() }).from(students).where(and(scope, followUpCondition("uncontacted"))),
    db.select({ value: count() }).from(students).where(and(scope, followUpCondition("overdue"))),
    base().where(and(scope, followUpCondition("uncontacted"))).orderBy(asc(students.signedUpAt), asc(students.id)).limit(5),
    base().where(and(scope, followUpCondition("overdue"))).orderBy(sql`${lastContactSql} asc`, asc(students.id)).limit(5),
  ]);
  const counts = Object.fromEntries(STUDENT_STATUSES.map((status) => [status, 0])) as StudentOverview["counts"];
  for (const group of groups) counts[group.status] = Number(group.total);
  const signups = signupRows[0];
  return {
    counts,
    total: Object.values(counts).reduce((sum, value) => sum + value, 0),
    rows: rows.map(toSummary),
    signups: { today: Number(signups?.today ?? 0), week: Number(signups?.week ?? 0), previousWeek: Number(signups?.previousWeek ?? 0) },
    sources: sourceRows.map((row) => ({ ...row, total: Number(row.total), enrolled: Number(row.enrolled) })),
    uncontacted: { count: Number(uncontactedCount[0]?.value ?? 0), rows: uncontactedRows.map(toSummary) },
    overdue: { count: Number(overdueCount[0]?.value ?? 0), rows: overdueRows.map(toSummary) },
  };
}

/** Apply scope before ranking so another source cannot influence the visible cards. */
export async function getStudentKanban(user: SessionUser, input: StudentFilter): Promise<StudentKanban> {
  assertCanView(user);
  const filter = studentFilterSchema.parse(input);
  assertDatabaseSourceId(filter.sourceId);
  const where = and(...buildStudentConditions(user, filter));
  const ranked = db.select({
    ...summarySelection,
    sourceId: sql<string>`${adSources.id}`.as("source_id"),
    sourceCode: sql<string>`${adSources.code}`.as("source_code"),
    sourceName: sql<string>`${adSources.name}`.as("source_name"),
    lastContactAt: sql<Date | string | null>`${lastContactSql}`.as("last_contact_at"),
    nextActionAt: sql<Date | string | null>`${nextActionSql}`.as("next_action_at"),
    droppedReason: summarySelection.droppedReason.as("dropped_reason"),
    droppedNote: summarySelection.droppedNote.as("dropped_note"),
    rank: sql<number>`row_number() over (partition by ${students.status} order by ${students.signedUpAt} desc, ${students.id} asc)`.as("status_rank"),
  }).from(students).innerJoin(adSources, eq(students.sourceId, adSources.id)).where(where).as("ranked_students");
  const [groups, rows] = await Promise.all([
    db.select({ status: students.status, total: count() }).from(students).where(where).groupBy(students.status),
    db.select({ id: ranked.id, code: ranked.code, fullName: ranked.fullName, phone: ranked.phone, email: ranked.email,
      status: ranked.status, sourceId: ranked.sourceId, sourceCode: ranked.sourceCode, sourceName: ranked.sourceName, signedUpAt: ranked.signedUpAt, lastContactAt: ranked.lastContactAt,
      nextActionAt: ranked.nextActionAt, archivedAt: ranked.archivedAt, archiveReason: ranked.archiveReason, droppedReason: ranked.droppedReason, droppedNote: ranked.droppedNote })
      .from(ranked).where(lte(ranked.rank, 100)).orderBy(desc(ranked.signedUpAt), asc(ranked.id)),
  ]);
  const summaries = await decoratePageStudents(user, rows.map(toSummary));
  return { columns: STUDENT_STATUSES.map((status) => ({
    status,
    count: Number(groups.find((group) => group.status === status)?.total ?? 0),
    rows: summaries.filter((row) => row.status === status),
  })) };
}

export async function listStudents(user: SessionUser, input: StudentFilter): Promise<StudentList> {
  assertCanView(user);
  const filter = studentFilterSchema.parse(input);
  assertDatabaseSourceId(filter.sourceId);
  const conditions = buildStudentConditions(user, filter);
  const where = and(...conditions);
  const offset = (filter.page - 1) * filter.pageSize;

  const [rows, totalRows, sources, facets] = await Promise.all([
    db.select(summarySelection).from(students)
      .innerJoin(adSources, eq(students.sourceId, adSources.id))
      .where(where)
      .orderBy(...orderFor(filter))
      .limit(filter.pageSize).offset(offset),
    db.select({ value: count() }).from(students)
      .where(where),
    getStudentSources(user),
    getStudentFacets(user, filter),
  ]);

  return {
    rows: await decoratePageStudents(user, rows.map(toSummary)),
    total: Number(totalRows[0]?.value ?? 0),
    page: filter.page,
    pageSize: filter.pageSize,
    sources,
    ...facets,
  };
}

export async function exportStudents(user: SessionUser, input: StudentFilter): Promise<StudentSummary[]> {
  assertCanExport(user);
  const filter = studentFilterSchema.parse(input);
  assertDatabaseSourceId(filter.sourceId);
  const rows = await db.select(summarySelection).from(students)
    .innerJoin(adSources, eq(students.sourceId, adSources.id))
    .where(and(...buildStudentConditions(user, filter)))
    .orderBy(desc(students.signedUpAt), asc(students.id));
  return rows.map(toSummary);
}

export async function getStudent(user: SessionUser, id: string): Promise<StudentDetail | null> {
  assertCanView(user);
  if (!z.uuid().safeParse(id).success) return null;
  const [row] = await db.select({
    ...summarySelection,
    occupation: students.occupation,
    birthYear: students.birthYear,
    specialty: students.specialty,
    hometown: students.hometown,
    organization: students.organization,
    zaloName: students.zaloName,
    signupAnswers: students.signupAnswers,
  }).from(students)
    .innerJoin(adSources, eq(students.sourceId, adSources.id))
    .where(and(eq(students.id, id), studentScope(user, "management")))
    .limit(1);

  if (!row) return null;

  // History tables are constrained through an EXISTS that repeats the management scope.
  const visibleStudent = exists(db.select({ id: students.id }).from(students)
    .where(and(eq(students.id, id), studentScope(user, "management"))));
  const [timeline, notes] = await Promise.all([
    db.select({
      id: studentStatusEvents.id,
      fromStatus: studentStatusEvents.fromStatus,
      toStatus: studentStatusEvents.toStatus,
      note: studentStatusEvents.note,
      reason: studentStatusEvents.reason, kind: studentStatusEvents.kind, data: studentStatusEvents.data,
      createdAt: studentStatusEvents.createdAt,
    }).from(studentStatusEvents)
      .where(and(eq(studentStatusEvents.studentId, id), visibleStudent))
      .orderBy(asc(studentStatusEvents.createdAt), asc(studentStatusEvents.id)),
    db.select({
      id: callNotes.id,
      body: callNotes.body,
      authorName: users.name,
      createdAt: callNotes.createdAt,
      channel: callNotes.channel, outcome: callNotes.outcome, nextActionAt: callNotes.nextActionAt,
      editedAt: callNotes.editedAt, authorId: callNotes.authorId,
    }).from(callNotes)
      .leftJoin(users, eq(callNotes.authorId, users.id))
      .where(and(eq(callNotes.studentId, id), visibleStudent))
      .orderBy(desc(callNotes.createdAt), desc(callNotes.id)),
  ]);

  return {
    ...toSummary(row),
    occupation: row.occupation,
    birthYear: row.birthYear,
    specialty: row.specialty,
    hometown: row.hometown,
    organization: row.organization,
    zaloName: row.zaloName,
    signupAnswers: row.signupAnswers,
    timeline: timeline.map((event) => ({ ...event, createdAt: event.createdAt.toISOString() })),
    notes: notes.map(({ authorId, ...note }) => ({ ...note, createdAt: note.createdAt.toISOString(),
      nextActionAt: note.nextActionAt?.toISOString() ?? null, editedAt: note.editedAt?.toISOString() ?? null,
      canEdit: !row.archivedAt && canCorrectContactNote(note.createdAt, authorId, user.id) })),
  };
}
