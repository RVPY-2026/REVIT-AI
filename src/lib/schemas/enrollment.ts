import { z } from "zod";

export const trialEnrollmentSchema = z.object({ studentId: z.uuid() });
export const formalEnrollmentSchema = trialEnrollmentSchema.extend({
  agreedFeeVnd: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
  feeNote: z.string().trim().max(2000).optional(),
});
export const availabilitySchema = z.union([
  z.array(z.never()).length(0),
  z.array(z.array(z.boolean()).length(10)).length(7),
]);
