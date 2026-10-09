// Fixed strings, enums and Vietnamese labels (FRONTEND_RULES §6). Keep links here, not inline.

export const SITE = {
  name: "RVPY",
  studio: "Ocean Studio",
} as const;

/** The two Zalo community groups (CLAUDE.md §8). Students should join both. */
export const ZALO_GROUPS = [
  {
    label: "Nhóm cộng đồng RVPY 1",
    href: "https://zalo.me/g/zojesfhkvohvxp84kwl7",
  },
  {
    label: "Nhóm cộng đồng RVPY 2",
    href: "https://zalo.me/g/3l9dhtuf9gmb7vk6bpc0",
  },
] as const;

export const zaloChatUrl = (phone: string) => `https://zalo.me/${phone.replace(/\D/g, "")}`;

/**
 * Fee offer during the 9-day trial (CLAUDE.md §7, client poster "Ưu đãi học phí trong 09 ngày").
 * Display only — the server decides which tier a student is on.
 */
export const REFERRAL_TIERS = [
  {
    feeVnd: 4_500_000,
    label: "Học phí ưu đãi",
    title: "Đăng ký",
    condition: "Đăng ký học trong 9 ngày trải nghiệm",
  },
  {
    feeVnd: 3_600_000,
    label: "Học phí giảm còn",
    title: "Giới thiệu 5 bạn",
    condition: "5 bạn mới tham gia 3 buổi học thử",
  },
  {
    feeVnd: 2_700_000,
    label: "Học phí chỉ còn",
    title: "1 bạn học chính thức",
    condition: "1 trong 5 bạn đăng ký học chính thức",
  },
  {
    feeVnd: 0,
    label: "Hoàn lại 2.700.000đ",
    title: "Thêm 2 bạn học chính thức",
    condition: "2 bạn tiếp theo đăng ký học chính thức",
  },
] as const;

/** Thank-you offer for enrolled students (client poster "Tri ân học viên"). */
export const ALUMNI_REFERRAL = {
  refundPercent: 30,
  fromReferral: 4,
} as const;

/** Public header / footer anchors on the home page. */
export const HOME_NAV = [
  { label: "Lộ trình", href: "/#lo-trinh" },
  { label: "Hành trình học", href: "/#hanh-trinh" },
  { label: "Học thử", href: "/#hoc-thu" },
  { label: "Học phí", href: "/#hoc-phi" },
  { label: "Cộng đồng", href: "/#cong-dong" },
] as const;

export const ROUTES = {
  signup: "/dang-ky",
  signIn: "/dang-nhap",
} as const;

// --- Student pipeline (CLAUDE.md §6). Order = kanban column order. ---

export const STUDENT_STATUSES = ["new", "consulting", "trial", "enrolled", "dropped"] as const;

export type StudentStatus = (typeof STUDENT_STATUSES)[number];

export type StatusTone = "info" | "warning" | "success" | "muted";

export const STUDENT_STATUS_META: Record<StudentStatus, { label: string; tone: StatusTone }> = {
  new: { label: "Mới đăng ký", tone: "info" },
  consulting: { label: "Đang tư vấn", tone: "warning" },
  trial: { label: "Đang học thử", tone: "warning" },
  enrolled: { label: "Học chính thức", tone: "success" },
  dropped: { label: "Không tiếp tục", tone: "muted" },
};

export const ROLE_LABELS = {
  admin: "Quản trị",
  sale: "Sale",
  student: "Học viên",
} as const;
