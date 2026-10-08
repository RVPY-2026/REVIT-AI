// Fixed strings, enums and Vietnamese labels (FRONTEND_RULES §6). Keep links here, not inline.

export const SITE = {
  name: "RVPY",
  studio: "Ocean Studio",
} as const;

/** The two Zalo community groups (CLAUDE.md §8). Students should join both. */
export const ZALO_GROUPS = [
  { label: "Nhóm cộng đồng RVPY 1", href: "https://zalo.me/g/zojesfhkvohvxp84kwl7" },
  { label: "Nhóm cộng đồng RVPY 2", href: "https://zalo.me/g/3l9dhtuf9gmb7vk6bpc0" },
] as const;

export const zaloChatUrl = (phone: string) => `https://zalo.me/${phone.replace(/\D/g, "")}`;

/** Referral offer during the 9-day trial (CLAUDE.md §7). Display only — the server decides tiers. */
export const REFERRAL_TIERS = [
  { feeVnd: 3_600_000, condition: "Giới thiệu 5 bạn mới tham gia 3 buổi học thử" },
  { feeVnd: 2_700_000, condition: "1 trong 5 bạn đăng ký học chính thức" },
  { feeVnd: 0, condition: "Thêm 2 bạn đăng ký chính thức — RVPY hoàn lại 2.700.000đ" },
] as const;

// --- Student pipeline (CLAUDE.md §6). Order = kanban column order. ---

export const STUDENT_STATUSES = [
  "new",
  "zalo_added",
  "groups_joined",
  "fee_sent",
  "trial",
  "paid",
  "enrolled",
  "dropped",
] as const;

export type StudentStatus = (typeof STUDENT_STATUSES)[number];

export type StatusTone = "info" | "warning" | "success" | "muted";

export const STUDENT_STATUS_META: Record<StudentStatus, { label: string; tone: StatusTone }> = {
  new: { label: "Mới đăng ký", tone: "info" },
  zalo_added: { label: "Đã kết bạn Zalo", tone: "warning" },
  groups_joined: { label: "Đã vào 2 nhóm", tone: "warning" },
  fee_sent: { label: "Đã gửi học phí", tone: "warning" },
  trial: { label: "Đang học thử", tone: "warning" },
  paid: { label: "Đã đóng tiền", tone: "success" },
  enrolled: { label: "Học chính thức", tone: "success" },
  dropped: { label: "Không tiếp tục", tone: "muted" },
};

export const ROLE_LABELS = {
  admin: "Quản trị",
  sale: "Sale",
  student: "Học viên",
} as const;
