import { pgEnum } from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", ["admin", "sale", "student"]);

// Pipeline from CLAUDE.md §6. Order matters: it is the kanban column order.
export const studentStatusEnum = pgEnum("student_status", [
  "new", // Mới đăng ký
  "zalo_added", // Đã kết bạn Zalo
  "groups_joined", // Đã vào 2 nhóm
  "fee_sent", // Đã gửi học phí
  "trial", // Đang học thử
  "paid", // Đã đóng tiền
  "enrolled", // Học chính thức
  "dropped", // Không tiếp tục
]);

export const paymentMethodEnum = pgEnum("payment_method", ["bank_transfer", "cash", "gateway"]);

export const licenseStatusEnum = pgEnum("license_status", ["active", "expired", "revoked"]);
