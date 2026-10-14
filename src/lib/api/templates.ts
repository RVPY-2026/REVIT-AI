import "server-only";

import { USE_MOCK } from "@/lib/runtime-mode";
import { z } from "zod";
import { requirePermission } from "@/server/auth/session";
import type { MessageTemplate } from "@/server/queries/templates";
import { getMockStudentMessages, listMockMessageTemplates } from "@/mocks/templates";

export type { MessageTemplate };

export async function listMessageTemplates(): Promise<MessageTemplate[]> {
  const user = await requirePermission("templates.view");
  if (USE_MOCK) return listMockMessageTemplates(user);
  const { listMessageTemplates: query } = await import("@/server/queries/templates");
  return query(user);
}

export async function getStudentMessages(studentId: string): Promise<MessageTemplate[]> {
  const user = await requirePermission("templates.view");
  if (USE_MOCK) return getMockStudentMessages(user, studentId);
  if (!z.uuid().safeParse(studentId).success) return [];
  const { getStudentMessages: query } = await import("@/server/queries/templates");
  return query(user, studentId);
}
