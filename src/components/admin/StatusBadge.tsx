import { Badge } from "@/components/ui/badge";
import { STUDENT_STATUS_META, type StudentStatus } from "@/lib/constants";

/** Pipeline status pill: border + text in the status color, no fill (FRONTEND_RULES §5). */
export function StatusBadge({ status }: { status: StudentStatus }) {
  const { label, tone } = STUDENT_STATUS_META[status];
  return <Badge variant={tone}>{label}</Badge>;
}
