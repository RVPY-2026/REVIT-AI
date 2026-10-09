import { z } from "zod";

export const staffBootstrapSchema = z
  .object({
    staff: z
      .array(
        z.object({
          email: z
            .email()
            .transform((value) => value.toLowerCase())
            .refine((value) => value.endsWith("@gmail.com")),
          name: z.string().trim().min(1).max(200),
          roles: z.array(z.enum(["admin", "sale"])).min(1),
        }),
      )
      .min(1),
    sources: z
      .array(
        z.object({
          code: z.string().regex(/^[A-Z]$/),
          name: z.string().trim().min(1).max(200),
          ownerEmail: z.email().transform((value) => value.toLowerCase()),
        }),
      )
      .default([]),
  })
  .superRefine((value, ctx) => {
    if (!value.staff.some((user) => user.roles.includes("admin")))
      ctx.addIssue({
        code: "custom",
        message: "At least one admin is required",
        path: ["staff"],
      });
    if (
      new Set(value.staff.map((user) => user.email)).size !== value.staff.length
    )
      ctx.addIssue({
        code: "custom",
        message: "Duplicate staff email",
        path: ["staff"],
      });
    if (
      new Set(value.sources.map((source) => source.code)).size !==
      value.sources.length
    )
      ctx.addIssue({
        code: "custom",
        message: "Duplicate source code",
        path: ["sources"],
      });
    value.sources.forEach((source, index) => {
      if (
        !value.staff.some(
          (user) =>
            user.email === source.ownerEmail && user.roles.includes("sale"),
        )
      )
        ctx.addIssue({
          code: "custom",
          message: "Source owner must be listed with the sale role",
          path: ["sources", index, "ownerEmail"],
        });
    });
  });
