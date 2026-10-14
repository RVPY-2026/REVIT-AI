// Fixed strings, enums and Vietnamese labels (FRONTEND_RULES §6). Keep links here, not inline.

export const SITE = {
  name: "RVPY",
  studio: "Ocean Studio",
  /** Absolute origin for metadata, OG images, sitemap. Set NEXT_PUBLIC_SITE_URL once the domain exists. */
  url:
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "http://localhost:3000"),
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

/** Registration contact shown after a trial signup, copied from the current Google Form. */
export const ZALO_REGISTRATION_CONTACT = {
  label: "RVPY Ocean Studio Admin",
  phone: "0969071561",
  href: "https://zalo.me/0969071561",
} as const;

export const LEAD_CHANNEL_OPTIONS = [
  "Tự tìm hiểu",
  "Cộng đồng Zalo",
  "TikTok",
  "YouTube",
  "Trang Facebook RVPY Ocean Studio",
  "Bài viết Facebook",
  "Tin nhắn quảng cáo Facebook",
  "Được người khác giới thiệu",
  "Khác",
] as const;

export const OCCUPATION_OPTIONS = ["Sinh viên", "Đang đi làm"] as const;

export const zaloChatUrl = (phone: string) => `https://zalo.me/${phone.replace(/\D/g, "")}`;

/**
 * Phone of the consulting Zalo account (CLAUDE.md §2: not the official account students add after
 * paying). Set NEXT_PUBLIC_ZALO_CONSULT_PHONE per environment; when empty the floating button
 * falls back to the community groups.
 */
export const ZALO_CONSULT_PHONE = process.env.NEXT_PUBLIC_ZALO_CONSULT_PHONE ?? "";

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
  account: "/tai-khoan",
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
  user: "Tài khoản thường",
} as const;

/** Display names for `licenses.product`; unknown products fall back to the raw key. */
export const LICENSE_PRODUCT_LABELS: Record<string, string> = {
  suite: "Bộ add-in RVPY (tất cả công cụ)",
  "auto-join": "Auto Join",
};
