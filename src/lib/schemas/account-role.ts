import { z } from "zod";

/** Only staff roles are managed in the UI. `student` comes from activation, `user` from first sign-in. */
export const MANAGED_ROLES = ["admin", "sale"] as const;

export const setAccountRoleSchema = z.object({
  userId: z.uuid(),
  role: z.enum(MANAGED_ROLES),
  granted: z.boolean(),
}).strict();

export const accountSearchSchema = z.string().trim().max(100);
