import { z } from "zod";
const date = z.union([z.literal(""), z.iso.date()]).optional();
const viewerFields = {
  from: date, to: date, actor: z.string().trim().max(100).optional(), action: z.string().max(100).optional(),
  entity: z.string().max(100).optional(), search: z.string().trim().max(100).optional(),
  status: z.enum(["", "pending", "sent", "failed"]).optional(),
};
const validDates = (v: { from?: string; to?: string }) => !v.from || !v.to || v.from <= v.to;
const dateError = { message: "Ngày kết thúc cần sau ngày bắt đầu.", path: ["to"] };
export const viewerFormSchema = z.object(viewerFields).refine(validDates, dateError);
export type ViewerFormValues = z.infer<typeof viewerFormSchema>;
export const viewerFilterSchema = z.object({ page: z.coerce.number().int().min(1).max(100000).default(1), ...viewerFields }).refine(validDates, dateError);
export type ViewerFilter = z.infer<typeof viewerFilterSchema>;
export type AuditRow = { id: string; createdAt: string; actor: string; action: string; entity: string; entityId: string | null; entityLabel?: string; data: unknown };
export type ZaloRow = { id: string; studentId: string; studentCode: string; studentName: string;
  createdAt: string; kind: string; status: string; attempts: number; availableAt: string; lastError: string | null };
export type QueueSummary = { pendingCount: number; failedCount: number; oldestPendingAt: string | null };
export function viewerDates(filter: ViewerFilter) {
  return { start: filter.from ? new Date(`${filter.from}T00:00:00+07:00`) : null,
    end: filter.to ? new Date(new Date(`${filter.to}T00:00:00+07:00`).getTime() + 86400000) : null };
}
export function literalPattern(value: string) { return `%${value.replace(/[\\%_]/g, "\\$&")}%`; }
export const retryQueueSchema = z.object({ id: z.uuid().optional(), all: z.boolean().default(false), confirmed: z.boolean().default(false) })
  .refine((v) => v.all ? v.confirmed && !v.id : Boolean(v.id), "Bạn xác nhận các mục cần thử lại.");
