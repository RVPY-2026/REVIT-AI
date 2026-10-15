/** Every incoming student FK must have an explicit retention decision. */
export const STUDENT_DELETION_REFERENCES = [
  { table: "call_notes", column: "student_id", decision: "delete" },
  { table: "student_status_events", column: "student_id", decision: "delete" },
  { table: "lead_signup_sessions", column: "student_id", decision: "delete" },
  { table: "enrollments", column: "student_id", decision: "block", message: "Hồ sơ đã có ghi danh hoặc kế hoạch học." },
  { table: "payments", column: "student_id", decision: "block", message: "Hồ sơ đã có giao dịch thanh toán." },
  { table: "licenses", column: "student_id", decision: "block", message: "Hồ sơ đã có giấy phép phần mềm." },
  { table: "students", column: "referred_by_id", decision: "block", message: "Hồ sơ đang là người giới thiệu của học viên khác." },
  { table: "zalo_bot_connections", column: "student_id", decision: "block", message: "Hồ sơ đã có mã kết nối hoặc kết nối Zalo." },
  { table: "zalo_bot_outbox", column: "student_id", decision: "block", message: "Hồ sơ đã có dữ liệu hàng đợi Zalo, kể cả tin đã gửi." },
  { table: "feedback", column: "student_id", decision: "block", message: "Hồ sơ đã có phản hồi học viên cần được giữ lại." },
] as const;

export type StudentDeletionCheck = { blockers: string[] };
export const STUDENT_DELETE_RETENTION_MS = 30 * 86_400_000;

export function studentDeletionStateBlockers(row: { archivedAt: Date | null; userId: string | null; retentionReady?: boolean }, now = new Date()): string[] {
  const blockers: string[] = [];
  if (!row.archivedAt) blockers.push("Bạn cần lưu trữ hồ sơ trước khi xóa vĩnh viễn.");
  else if (!(row.retentionReady ?? row.archivedAt.getTime() <= now.getTime() - STUDENT_DELETE_RETENTION_MS))
    blockers.push("Hồ sơ phải được lưu trữ ít nhất 30 ngày trước khi xóa vĩnh viễn.");
  if (row.userId) blockers.push("Hồ sơ đã liên kết tài khoản đăng nhập.");
  return blockers;
}
