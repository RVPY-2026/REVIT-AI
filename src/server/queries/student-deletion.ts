import "server-only";
import { and, eq } from "drizzle-orm";
import { can, type SessionUser } from "@/lib/auth/permissions";
import { studentScope } from "@/server/auth/scope";
import { db } from "@/server/db";
import { students } from "@/server/db/schema";
import { studentDeletionBlockers } from "@/server/student-deletion";
import type { StudentDeletionCheck } from "@/lib/student-deletion";

export async function getStudentDeletionCheck(user: SessionUser, id: string): Promise<StudentDeletionCheck> {
  if (!can(user, "students.delete")) throw new Error("Forbidden");
  const [row] = await db.select({ id: students.id, archivedAt: students.archivedAt, userId: students.userId }).from(students)
    .where(and(eq(students.id, id), studentScope(user, "management"))).limit(1);
  if (!row) return { blockers: ["Không tìm thấy học viên."] };
  try { return { blockers: await studentDeletionBlockers(db, user, row) }; }
  catch { return { blockers: ["Chưa kiểm tra được điều kiện xóa. Bạn tải lại trang trước khi tiếp tục nhé."] }; }
}
