import "server-only";
import { connection } from "next/server";
import { studentFilterSchema, studentIdSchema, type StudentDetail, type StudentFilter, type StudentList, type StudentSummary, type StudentOverview, type StudentKanban } from "@/lib/schemas/student";
import { STUDENT_STATUSES } from "@/lib/constants";
import { USE_MOCK, requirePermission } from "@/server/auth/session";

export async function getPhoneMatches(phone: string) {
  const user = await requirePermission("students.view");
  if (USE_MOCK) return (await import("@/mocks/students")).mockPhoneMatches(user, phone);
  return (await import("@/server/queries/students")).findPhoneMatches(user, phone);
}

export async function getStudentSources(): Promise<StudentList["sources"]> {
  const user = await requirePermission("students.view");
  if (USE_MOCK) return (await import("@/mocks/students")).mockStudentSources(user);
  return (await import("@/server/queries/students")).getStudentSources(user);
}

export async function getStudentFacets(input: StudentFilter) {
  const user = await requirePermission("students.view");
  // Facet clocks are request-time values, including during partial prefetch validation.
  await connection();
  if (USE_MOCK) return (await import("@/mocks/students")).mockStudentFacets(user, input);
  return (await import("@/server/queries/students")).getStudentFacets(user, input);
}

export async function selectMatchingStudents(input: StudentFilter) {
  const user = await requirePermission("students.edit");
  if (USE_MOCK) return (await import("@/mocks/students")).mockExportStudents(user, input).slice(0, 100).map(({ id, status }) => ({ id, status }));
  return (await import("@/server/queries/students")).selectMatchingStudents(user, input);
}

export async function getStudentOverview(): Promise<StudentOverview> {
  const user = await requirePermission("students.view");
  if (USE_MOCK) {
    const { mockStudentOverview } = await import("@/mocks/students");
    await mockDelay();
    return mockStudentOverview(user);
  }
  return (await import("@/server/queries/students")).getStudentOverview(user);
}

export async function getStudentKanban(input: StudentFilter): Promise<StudentKanban> {
  const user = await requirePermission("students.view");
  const filter = studentFilterSchema.parse(input);
  if (USE_MOCK) {
    const { mockExportStudents } = await import("@/mocks/students");
    await mockDelay();
    const rows = mockExportStudents(user, filter);
    return { columns: STUDENT_STATUSES.map((status) => {
      const matching = rows.filter((row) => row.status === status);
      return { status, count: matching.length, rows: matching.slice(0, 100) };
    }) };
  }
  return (await import("@/server/queries/students")).getStudentKanban(user, filter);
}

export async function listStudents(input: StudentFilter): Promise<StudentList> {
  const filter = studentFilterSchema.parse(input);
  const user = await requirePermission("students.view");
  if (USE_MOCK) {
    const { mockListStudents } = await import("@/mocks/students");
    await mockDelay();
    return mockListStudents(user, filter);
  }
  const { listStudents: query } = await import("@/server/queries/students");
  return query(user, filter);
}

export async function getStudent(id: string): Promise<StudentDetail | null> {
  const user = await requirePermission("students.view");
  if (!studentIdSchema.safeParse(id).success) return null;
  if (USE_MOCK) {
    const { mockGetStudent } = await import("@/mocks/students");
    await mockDelay();
    return mockGetStudent(user, id);
  }
  const { getStudent: query } = await import("@/server/queries/students");
  return query(user, id);
}

export async function exportStudents(input: StudentFilter): Promise<StudentSummary[]> {
  const filter = studentFilterSchema.parse(input);
  const user = await requirePermission("students.export");
  if (USE_MOCK) {
    const { mockExportStudents } = await import("@/mocks/students");
    await mockDelay();
    return mockExportStudents(user, filter);
  }
  const { exportStudents: query } = await import("@/server/queries/students");
  return query(user, filter);
}

function mockDelay() {
  return new Promise<void>((resolve) => setTimeout(resolve, 300));
}
