import { z } from "zod";

const statusSchema = z.enum(["new", "consulting", "trial", "enrolled", "dropped"]);

export const updateStudentStatusSchema = z.object({
  studentId: z.uuid(),
  status: statusSchema,
  expectedStatus: statusSchema.optional(),
}).strict();

/** Change the status of several leads at once; capped so one click cannot rewrite the whole list. */
export const bulkUpdateStudentStatusSchema = z.object({
  studentIds: z.array(z.uuid()).min(1).max(100),
  status: statusSchema,
}).strict();
