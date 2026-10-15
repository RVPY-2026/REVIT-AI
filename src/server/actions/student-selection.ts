"use server";

import { studentFilterSchema } from "@/lib/schemas/student";
import { selectMatchingStudents } from "@/lib/api/students";

export async function selectStudentsByFilter(input: unknown) {
  return selectMatchingStudents(studentFilterSchema.parse(input));
}
