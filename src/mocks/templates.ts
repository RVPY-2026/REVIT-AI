import type { SessionUser } from "@/lib/auth/permissions";
import { ZALO_GROUPS } from "@/lib/constants";
import { mockGetStudent } from "@/mocks/students";
import type { MessageTemplate } from "@/server/queries/templates";

const templates: MessageTemplate[] = [
  {
    id: "mock-template-consulting",
    title: "Mời vào 2 nhóm Zalo",
    forStatus: "consulting",
    body: "Chào {{ten}}, mời bạn tham gia 2 nhóm Zalo cộng đồng RVPY:\n{{zalo_nhom_1}}\n{{zalo_nhom_2}}",
  },
  {
    id: "mock-template-generic",
    title: "Tin nhắn chăm sóc chung",
    forStatus: null,
    body: "Chào {{ten}}, RVPY gửi bạn thông tin về khóa học Revit.",
  },
];

export function listMockMessageTemplates(user: SessionUser): MessageTemplate[] {
  void user;
  return templates.map((template) => ({ ...template }));
}

export function getMockStudentMessages(user: SessionUser, studentId: string): MessageTemplate[] {
  const student = mockGetStudent(user, studentId);
  if (!student) return [];
  return templates.filter((template) => template.forStatus === null || template.forStatus === student.status)
    .map((template) => ({
      ...template,
      body: template.body.replace(/\{\{\s*ten\s*\}\}/g, student.fullName)
        .replace(/\{\{\s*ma_hoc_vien\s*\}\}/g, student.code)
        .replace(/\{\{\s*so_dien_thoai\s*\}\}/g, student.phone)
        .replace(/\{\{\s*zalo_nhom_1\s*\}\}/g, ZALO_GROUPS[0].href)
        .replace(/\{\{\s*zalo_nhom_2\s*\}\}/g, ZALO_GROUPS[1].href),
    }));
}
