import { z } from "zod";
import { DROPPED_REASONS } from "@/lib/crm";
import { studentFilterSchema } from "@/lib/schemas/student";

const statusSchema = z.enum(["new", "consulting", "trial", "enrolled", "dropped"]);

export const droppedReasonFields = {
  reason: z.enum(DROPPED_REASONS).optional(), note: z.string().trim().max(4000).optional(),
};
function requireDroppedReason(data: { status: string; reason?: string; note?: string }, ctx: z.RefinementCtx) {
  if (data.status === "dropped" && (!data.reason || (data.reason === "other" && !data.note)))
    ctx.addIssue({ code: "custom", path: ["reason"], message: "Bạn chọn lý do không tiếp tục; lý do khác cần ghi chú." });
}

export const updateStudentStatusSchema = z.object({
  studentId: z.uuid(),
  status: statusSchema,
  expectedStatus: statusSchema.optional(),
  ...droppedReasonFields,
}).strict().superRefine(requireDroppedReason);

/** Change the status of several leads at once; capped so one click cannot rewrite the whole list. */
export const bulkUpdateStudentStatusSchema = z.object({
  studentIds: z.array(z.uuid()).min(1).max(100),
  status: z.enum(["consulting", "dropped"]),
  expectedStatuses: z.record(z.uuid(), statusSchema),
  filter: studentFilterSchema.optional(),
  ...droppedReasonFields,
}).strict().superRefine(requireDroppedReason);
