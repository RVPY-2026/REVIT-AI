import type { StudentStatus } from "@/lib/constants";

/** A lead with no call note for this many days is overdue for a follow-up. */
export const FOLLOW_UP_AFTER_DAYS = 2;

const DAY_MS = 86_400_000;
const VN_OFFSET_MS = 7 * 60 * 60 * 1000;

/** Statuses where the consultant still owes the student a conversation. */
export const ACTIVE_STATUSES = ["new", "consulting", "trial"] as const satisfies readonly StudentStatus[];

export function isActiveStatus(status: StudentStatus): boolean {
  return (ACTIVE_STATUSES as readonly StudentStatus[]).includes(status);
}

/** Midnight in Asia/Ho_Chi_Minh for the day containing `now`, as a UTC instant. */
export function businessDayStart(now: Date): Date {
  return new Date(Math.floor((now.getTime() + VN_OFFSET_MS) / DAY_MS) * DAY_MS - VN_OFFSET_MS);
}

export type FollowUp =
  | { kind: "none" }
  | { kind: "uncontacted"; label: string }
  | { kind: "overdue"; label: string; days: number }
  | { kind: "ok"; label: string };

/** Whole business days between two instants (Asia/Ho_Chi_Minh calendar days). */
export function businessDaysBetween(from: Date, to: Date): number {
  return Math.round((businessDayStart(to).getTime() - businessDayStart(from).getTime()) / DAY_MS);
}

export function relativeDayLabel(days: number): string {
  if (days <= 0) return "Hôm nay";
  if (days === 1) return "Hôm qua";
  return `${days} ngày trước`;
}

/** Derive the next-action state from the latest call note; no extra stored field. */
export function followUpState(student: { status: StudentStatus; lastContactAt: string | null }, now = new Date()): FollowUp {
  if (!isActiveStatus(student.status)) return { kind: "none" };
  if (!student.lastContactAt) return { kind: "uncontacted", label: "Chưa liên hệ" };
  const days = businessDaysBetween(new Date(student.lastContactAt), now);
  if (days >= FOLLOW_UP_AFTER_DAYS) return { kind: "overdue", label: `Quá hạn ${days} ngày`, days };
  return { kind: "ok", label: relativeDayLabel(days) };
}
