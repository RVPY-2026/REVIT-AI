import { Badge } from "@/components/ui/badge";
import { ADMIN_STATUS_META, STUDENT_STATUS_META, type StudentStatus } from "@/lib/constants";

/** Pipeline status pill: border + text in the status color, no fill (FRONTEND_RULES §5). */
export function StatusBadge({ status }: { status: StudentStatus | "active" | "inactive" | "pending" | "sent" | "failed" }) {
  const { label, tone } = Object.hasOwn(ADMIN_STATUS_META, status) ? ADMIN_STATUS_META[status as keyof typeof ADMIN_STATUS_META] : STUDENT_STATUS_META[status as StudentStatus];
  return <Badge variant={tone}>{label}</Badge>;
}
