import "server-only";
import { and, eq, isNull, or } from "drizzle-orm";
import type { StudentStatus } from "@/lib/constants";
import { ZALO_GROUPS } from "@/lib/constants";
import { can, type SessionUser } from "@/lib/auth/permissions";
import { studentScope } from "@/server/auth/scope";
import { db } from "@/server/db";
import { messageTemplates, students } from "@/server/db/schema";
import { z } from "zod";

export type MessageTemplate = {
  id: string;
  title: string;
  forStatus: StudentStatus | null;
  body: string;
};

type TemplateStudent = { id: string; fullName: string; code: string; phone: string };

/** Values intentionally come only from fields safe to show to management staff. */
export const MESSAGE_PLACEHOLDERS = {
  ten: (student: TemplateStudent) => student.fullName,
  ma_hoc_vien: (student: TemplateStudent) => student.code,
  so_dien_thoai: (student: TemplateStudent) => student.phone,
  zalo_nhom_1: () => ZALO_GROUPS[0].href,
  zalo_nhom_2: () => ZALO_GROUPS[1].href,
  link_gioi_thieu: () => "{{link_gioi_thieu}}",
  hoc_phi: () => "{{hoc_phi}}",
} as const;

export function renderMessageTemplate(body: string, student: TemplateStudent): string {
  return body.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (token, key: string) => {
    if (!Object.hasOwn(MESSAGE_PLACEHOLDERS, key)) return token;
    return MESSAGE_PLACEHOLDERS[key as keyof typeof MESSAGE_PLACEHOLDERS](student);
  });
}

export async function listMessageTemplates(user: SessionUser): Promise<MessageTemplate[]> {
  if (!can(user, "templates.view")) throw new Error("Forbidden");
  return db.select({
    id: messageTemplates.id,
    title: messageTemplates.title,
    forStatus: messageTemplates.forStatus,
    body: messageTemplates.body,
  }).from(messageTemplates).orderBy(messageTemplates.sortOrder, messageTemplates.title);
}

export async function getStudentMessages(user: SessionUser, studentId: string): Promise<MessageTemplate[]> {
  if (!can(user, "templates.view")) throw new Error("Forbidden");
  if (!z.uuid().safeParse(studentId).success) return [];
  const rows = await db.select({
    id: messageTemplates.id,
    title: messageTemplates.title,
    forStatus: messageTemplates.forStatus,
    body: messageTemplates.body,
    studentId: students.id,
    fullName: students.fullName,
    code: students.code,
    phone: students.phone,
  }).from(students)
    .innerJoin(messageTemplates, or(eq(messageTemplates.forStatus, students.status), isNull(messageTemplates.forStatus)))
    .where(and(eq(students.id, studentId), studentScope(user, "management")))
    .orderBy(messageTemplates.sortOrder, messageTemplates.title);

  return rows.map((row) => ({
    id: row.id, title: row.title, forStatus: row.forStatus,
    body: renderMessageTemplate(row.body, { id: row.studentId, fullName: row.fullName, code: row.code, phone: row.phone }),
  }));
}
