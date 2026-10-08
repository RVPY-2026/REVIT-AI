"use server";

import { and, eq, inArray, sql } from "drizzle-orm";
import { leadSignupSchema, type LeadSignupInput } from "@/lib/schemas/lead";
import { audit } from "@/server/audit";
import { db } from "@/server/db";
import { adSources, studentStatusEvents, students } from "@/server/db/schema";
import type { ActionResult } from "@/server/result";

const DEFAULT_SOURCE = "R";

/**
 * Public trial sign-up (CLAUDE.md §5, step 2). Anonymous caller, so: validate,
 * never trust the source code blindly, and return only the new student code.
 */
export async function submitLeadSignup(input: LeadSignupInput): Promise<ActionResult<{ code: string }>> {
  const parsed = leadSignupSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Thông tin chưa hợp lệ", fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const { sourceCode, referrerCode, answers, ...lead } = parsed.data;

  const code = await db.transaction(async (tx) => {
    // Use the link's source if it exists and is active, otherwise fall back to R.
    const candidates = await tx
      .select()
      .from(adSources)
      .where(and(inArray(adSources.code, [sourceCode ?? DEFAULT_SOURCE, DEFAULT_SOURCE]), eq(adSources.active, true)));
    const source = candidates.find((s) => s.code === sourceCode) ?? candidates.find((s) => s.code === DEFAULT_SOURCE);
    if (!source) throw new Error(`Ad source ${DEFAULT_SOURCE} is missing — run the seed`);

    // Atomic counter: concurrent sign-ups can never get the same code.
    const [{ seq }] = await tx
      .update(adSources)
      .set({ nextSeq: sql`${adSources.nextSeq} + 1` })
      .where(eq(adSources.id, source.id))
      .returning({ seq: sql<number>`${adSources.nextSeq} - 1` });

    const [referrer] = referrerCode
      ? await tx.select({ id: students.id }).from(students).where(eq(students.code, referrerCode)).limit(1)
      : [];

    const [row] = await tx
      .insert(students)
      .values({
        ...lead,
        code: `${source.code}${seq}`,
        sourceId: source.id,
        seq,
        signupAnswers: answers,
        referredById: referrer?.id ?? null,
      })
      .returning({ id: students.id, code: students.code });

    await tx.insert(studentStatusEvents).values({ studentId: row.id, toStatus: "new" });
    await audit(tx, { actorId: null, action: "student.signed_up", entity: "students", entityId: row.id });
    return row.code;
  });

  return { ok: true, data: { code } };
}
