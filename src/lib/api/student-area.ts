import "server-only";
import { cookies } from "next/headers";
import { cache } from "react";
import { planLessonIdSchema, type MyLearning, type MyReferrals, type MyResource } from "@/lib/schemas/student-area";
import { USE_MOCK, requirePermission } from "@/server/auth/session";
import type { MockEnrollmentKind } from "@/mocks/student-area";

// Every function resolves the caller first and only ever returns that caller's own data
// (BACKEND_RULES §4). The user is never an argument, so a page cannot ask for someone else's.

async function mockKind(): Promise<MockEnrollmentKind> {
  const { MOCK_ENROLLMENT_COOKIE } = await import("@/mocks/student-area");
  return (await cookies()).get(MOCK_ENROLLMENT_COOKIE)?.value === "formal" ? "formal" : "trial";
}

function mockDelay() {
  return new Promise<void>((resolve) => setTimeout(resolve, 300));
}

/** Cached per request: the shell panels and the page both read it, so it runs once. */
export const getMyLearning = cache(async (): Promise<MyLearning | null> => {
  const user = await requirePermission("student-area.view");
  if (USE_MOCK) {
    const { mockMyLearning } = await import("@/mocks/student-area");
    await mockDelay();
    return mockMyLearning(user, await mockKind());
  }
  return (await import("@/server/queries/student-area")).getMyLearning(user);
});

export async function listMyResources(): Promise<MyResource[]> {
  const user = await requirePermission("student-area.view");
  if (USE_MOCK) {
    const { mockMyResources } = await import("@/mocks/student-area");
    await mockDelay();
    return mockMyResources(user, await mockKind());
  }
  return (await import("@/server/queries/student-area")).listMyResources(user);
}

/** Resources of one of the caller's plan lessons. Unknown or foreign ids yield an empty list. */
export async function listMyLessonResources(planLessonId: string, lessonTitle: string): Promise<MyResource[]> {
  const user = await requirePermission("student-area.view");
  if (!planLessonIdSchema.safeParse(planLessonId).success) return [];
  if (USE_MOCK) {
    const { mockLessonResources } = await import("@/mocks/student-area");
    return mockLessonResources(user, await mockKind(), lessonTitle);
  }
  const queries = await import("@/server/queries/student-area");
  const templateId = await queries.getMyPlanLessonTemplate(user, planLessonId);
  return templateId ? queries.listMyLessonResources(user, templateId) : [];
}

export async function getMyReferrals(): Promise<MyReferrals | null> {
  const user = await requirePermission("student-area.view");
  if (USE_MOCK) {
    const { mockMyReferrals } = await import("@/mocks/student-area");
    await mockDelay();
    return mockMyReferrals(user);
  }
  return (await import("@/server/queries/student-area")).getMyReferrals(user);
}
