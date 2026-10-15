import { ADMIN_STATUS_META, STUDENT_STATUS_META } from "@/lib/constants";
import { ARCHIVE_REASON_LABELS } from "@/lib/crm";

/** One vocabulary for filters, sentences and field details. */
export const AUDIT_ACTIONS: Record<string, { group: string; label: string }> = {
  "source.created": { group: "Nguồn", label: "đã thêm nguồn" },
  "source.updated": { group: "Nguồn", label: "đã sửa nguồn" },
  "student.signed_up": { group: "Học viên", label: "đã đăng ký học thử" },
  "student.created_manually": { group: "Học viên", label: "đã thêm học viên" },
  "student.status_edited": { group: "Học viên", label: "đã đổi trạng thái học viên" },
  "student.stage_changed": { group: "Học viên", label: "đã đổi trạng thái học viên" },
  "student.field_updated": { group: "Học viên", label: "đã sửa thông tin học viên" },
  "student.contact_updated": { group: "Học viên", label: "đã sửa liên hệ học viên" },
  "student.call_note_added": { group: "Học viên", label: "đã thêm ghi chú tư vấn" },
  "student.permanently_deleted": { group: "Học viên", label: "đã xóa vĩnh viễn hồ sơ học viên" },
  "student.checklist_changed": { group: "Học viên", label: "đã cập nhật chuẩn bị học thử" },
  "student.account_activated": { group: "Tài khoản", label: "đã mở tài khoản học viên" },
  "account.role_granted": { group: "Tài khoản", label: "đã cấp vai trò" },
  "account.role_revoked": { group: "Tài khoản", label: "đã gỡ vai trò" },
  "user.self_registered": { group: "Tài khoản", label: "đã tạo tài khoản" },
  "user.auth_linked": { group: "Tài khoản", label: "đã liên kết tài khoản" },
  "enrollment.trial": { group: "Học tập", label: "đã mở học thử" },
  "enrollment.formal": { group: "Học tập", label: "đã mở học chính thức" },
  "lesson.confirmed": { group: "Học tập", label: "đã xác nhận buổi học" },
  "lesson.confirmation_withdrawn": { group: "Học tập", label: "đã gỡ xác nhận buổi học" },
  "lesson.reported": { group: "Học tập", label: "đã báo hoàn thành buổi học" },
  "lesson.report_withdrawn": { group: "Học tập", label: "đã gỡ báo hoàn thành" },
  "feedback.submitted": { group: "Học tập", label: "đã gửi góp ý" },
  "students.sheet_imported": { group: "Dữ liệu", label: "đã nhập danh sách học viên" },
  "student.zalo_messages_retried": { group: "Zalo", label: "đã thử gửi lại tin Zalo" },
  "zalo.retried": { group: "Zalo", label: "đã thử gửi lại tin Zalo" },
};
export const AUDIT_ENTITIES: Record<string, string> = { students: "Học viên", ad_sources: "Nguồn quảng cáo", users: "Tài khoản",
  enrollments: "Ghi danh", study_plan_lessons: "Buổi học", feedback: "Góp ý", zalo_bot_outbox: "Tin Zalo" };
export const AUDIT_FIELDS: Record<string, string> = { before: "Trước", after: "Sau", from: "Trước", to: "Sau",
  name: "Tên", fullName: "Họ tên", phone: "Điện thoại", email: "Địa chỉ thư", ownerUserId: "Người phụ trách",
  active: "Hoạt động", code: "Mã", status: "Trạng thái", field: "Thông tin", count: "Số mục", role: "Vai trò",
  studentId: "Mã hồ sơ", accountId: "Mã tài khoản", done: "Đã hoàn thành",
  sourceCode: "Mã nguồn", archiveReason: "Lý do lưu trữ", signedUpAt: "Ngày đăng ký" };
export function auditActionLabel(action: string) { return Object.hasOwn(AUDIT_ACTIONS, action) ? AUDIT_ACTIONS[action].label : action; }
export function auditValue(value: unknown): string {
  if (value === null || value === undefined) return "Chưa có";
  if (typeof value === "boolean") return value ? "Có" : "Không";
  if (typeof value === "string" && Object.hasOwn(STUDENT_STATUS_META, value)) return STUDENT_STATUS_META[value as keyof typeof STUDENT_STATUS_META].label;
  if (typeof value === "string" && Object.hasOwn(ADMIN_STATUS_META, value)) return ADMIN_STATUS_META[value as keyof typeof ADMIN_STATUS_META].label;
  const roles: Record<string, string> = { ...ARCHIVE_REASON_LABELS, admin: "Quản trị", sale: "Tư vấn", student: "Học viên", user: "Tài khoản thường", formal: "Học chính thức" };
  if (typeof value === "string") return Object.hasOwn(AUDIT_FIELDS, value) ? AUDIT_FIELDS[value] : Object.hasOwn(roles, value) ? roles[value] : value;
  return String(value);
}
