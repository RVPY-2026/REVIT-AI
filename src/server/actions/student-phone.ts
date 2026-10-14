"use server";

import { z } from "zod";
import { getPhoneMatches } from "@/lib/api/students";

export async function checkStudentPhone(input: unknown) {
  const data = z.object({ phone: z.string().max(30), excludeId: z.string().max(80).optional() }).strict().parse(input);
  const matches = await getPhoneMatches(data.phone);
  return matches.filter(match => "otherSource" in match || match.id !== data.excludeId);
}
