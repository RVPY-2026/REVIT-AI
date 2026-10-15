import { Badge } from "@/components/ui/badge";
import { STUDENT_STATUS_META, type StudentStatus } from "@/lib/constants";
import { LEARNING_STATUS_FOREGROUND } from "@/lib/learning-content";

/** Pipeline status pill: border + text in the status color, no fill (FRONTEND_RULES §5). */
const LEARNING_STATUS_META = {
  active: { label: "Đang dùng", tone: "success" }, inactive: { label: "Đã ngừng", tone: "muted" },
  reported: { label: "Đã báo", tone: "warning" }, confirmed: { label: "Đã xác nhận", tone: "success" },
  upcoming: { label: "Chưa báo", tone: "muted" }, formal: { label: "Chính thức", tone: "info" }, all: { label: "Tất cả", tone: "muted" },
  "trial-audience": { label: "Học thử", tone: "warning" },
  unconfirmed: { label: "Chưa xác nhận", tone: "muted" },
} as const;
export function StatusBadge({ status }: { status: StudentStatus | keyof typeof LEARNING_STATUS_META }) {
  const { label, tone } = status in LEARNING_STATUS_META ? LEARNING_STATUS_META[status as keyof typeof LEARNING_STATUS_META] : STUDENT_STATUS_META[status as StudentStatus];
  const learning = status in LEARNING_STATUS_META;
  return <Badge variant={tone} data-learning-status={learning || undefined} style={learning ? { color: LEARNING_STATUS_FOREGROUND, borderColor: `var(--${tone === "muted" ? "muted-foreground" : tone})` } : undefined}>{label}</Badge>;
}
