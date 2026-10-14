import { z } from "zod";
import { STUDENT_STATUSES, type StudentStatus } from "@/lib/constants";
import type { ARCHIVE_REASONS, DROPPED_REASONS, CONTACT_CHANNELS, CONTACT_OUTCOMES } from "@/lib/crm";

const monthSchema = z.string().regex(/^(?:1[0-9]{3}|[2-9][0-9]{3})-(0[1-9]|1[0-2])$/, "Tháng chưa hợp lệ");
const mockSourceIdSchema = z.string().regex(/^mock-source-[a-z]$/);
const mockStudentIdSchema = z.string().regex(/^mock-student-[1-9][0-9]*$/);

/** "uncontacted": no call note yet. "overdue": last note older than the follow-up window. */
export const STUDENT_FOLLOW_UPS = ["uncontacted", "overdue", "due"] as const;
export const STUDENT_SORTS = ["signedUpAt", "fullName", "status", "lastContactAt", "nextActionAt"] as const;
export type StudentFollowUp = (typeof STUDENT_FOLLOW_UPS)[number];
export type StudentSort = (typeof STUDENT_SORTS)[number];

/** Filters shared by the management table and its Excel export. */
export const studentFilterSchema = z.object({
  search: z.string().trim().max(100).optional().transform((value) => value || undefined),
  status: z.enum(STUDENT_STATUSES).optional(),
  sourceId: z.union([z.uuid(), mockSourceIdSchema]).optional(),
  month: z.preprocess((value) => value === "" ? undefined : value, monthSchema.optional()),
  page: z.coerce.number().int().min(1).max(1_000_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  followUp: z.enum(STUDENT_FOLLOW_UPS).optional(),
  archived: z.enum(["true"]).optional(),
  quickView: z.enum(["all"]).optional(),
  sort: z.enum(STUDENT_SORTS).default("signedUpAt"),
  dir: z.enum(["asc", "desc"]).optional(),
}).strict();

export type StudentFilter = {
  search?: string;
  status?: StudentStatus;
  sourceId?: string;
  month?: string;
  page?: number;
  pageSize?: number;
  followUp?: StudentFollowUp;
  archived?: "true";
  quickView?: "all";
  sort?: StudentSort;
  dir?: "asc" | "desc";
};

export type ParsedStudentFilter = z.output<typeof studentFilterSchema>;

export const studentIdSchema = z.union([z.uuid(), mockStudentIdSchema]);

/** Escape SQL LIKE metacharacters and wrap a bounded search as a literal substring. */
export function studentSearchPattern(search: string): string {
  return `%${search.replace(/[\\%_]/g, "\\$&")}%`;
}

/** Convert a business month in Asia/Ho_Chi_Minh to its UTC interval. */
export function studentMonthRange(month: string): { start: Date; end: Date } {
  const [year, monthNumber] = month.split("-").map(Number);
  const utcOffsetMs = 7 * 60 * 60 * 1000;
  return {
    start: new Date(Date.UTC(year, monthNumber - 1, 1) - utcOffsetMs),
    end: new Date(Date.UTC(year, monthNumber, 1) - utcOffsetMs),
  };
}

export type StudentSummary = {
  id: string;
  code: string;
  fullName: string;
  phone: string;
  email: string | null;
  status: StudentStatus;
  sourceId: string;
  sourceCode: string;
  sourceName: string;
  signedUpAt: string;
  /** Latest call note, the only recorded consultant contact. */
  lastContactAt: string | null;
  nextActionAt?: string | null;
  archivedAt?: string | null;
  archiveReason?: typeof ARCHIVE_REASONS[number] | null;
  duplicatePhone?: boolean;
  droppedReason?: typeof DROPPED_REASONS[number] | null;
  droppedNote?: string | null;
  trial?: { daysLeft: number | null; checklist: number; confirmed: number; hasPlan: boolean } | null;
};

export type StudentList = {
  rows: StudentSummary[];
  total: number;
  page: number;
  pageSize: number;
  sources: { id: string; code: string; name: string; active?: boolean }[];
  counts?: Record<StudentStatus, number>;
  dueCount?: number;
};

export type StudentOverview = {
  counts: Record<StudentStatus, number>;
  total: number;
  rows: StudentSummary[];
  /** Sign-ups today, in the last 7 days, and the 7 days before that. */
  signups: { today: number; week: number; previousWeek: number };
  sources: { id: string; code: string; name: string; total: number; enrolled: number }[];
  uncontacted: { count: number; rows: StudentSummary[] };
  overdue: { count: number; rows: StudentSummary[] };
};

export const DEFAULT_SORT_DIR: Record<StudentSort, "asc" | "desc"> = {
  signedUpAt: "desc", fullName: "asc", status: "asc", lastContactAt: "asc",
  nextActionAt: "asc",
};

export type StudentKanban = {
  columns: { status: StudentStatus; count: number; rows: StudentSummary[] }[];
};

export type StudentDetail = StudentSummary & {
  occupation: string | null;
  birthYear: number | null;
  specialty: string | null;
  hometown: string | null;
  organization: string | null;
  zaloName: string | null;
  signupAnswers: Record<string, string>;
  timeline: {
    id: string;
    fromStatus: StudentStatus | null;
    toStatus: StudentStatus;
    note: string | null;
    reason?: typeof DROPPED_REASONS[number] | null;
    kind?: "status" | "archive" | "restore" | "source_transfer";
    data?: Record<string, string> | null;
    createdAt: string;
  }[];
  notes: {
    id: string;
    body: string;
    authorName: string | null;
    createdAt: string;
    channel?: typeof CONTACT_CHANNELS[number];
    outcome?: typeof CONTACT_OUTCOMES[number] | null;
    nextActionAt?: string | null;
    editedAt?: string | null;
    canEdit?: boolean;
  }[];
};

export { STUDENT_STATUSES };
