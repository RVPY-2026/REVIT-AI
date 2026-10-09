import "server-only";
import { inArray, sql, type SQL } from "drizzle-orm";
import { isAdmin, type SessionUser } from "@/lib/auth/permissions";
import { students } from "@/server/db/schema";

/**
 * Row filter for the `students` table. Add it to EVERY students query
 * (and to joins that reach students) — this is what keeps sale A out of sale B's leads.
 */
export function studentScope(user: SessionUser, area: "management" | "student"): SQL {
  // The area comes from server code, never from a request parameter. A dual-role
  // user's sales sources must not widen their personal student-area scope.
  if (area === "student") {
    if ((user.roles.includes("student") || isAdmin(user)) && user.studentId) {
      return sql`${students.id} = ${user.studentId}`;
    }
    return sql`false`;
  }
  if (isAdmin(user)) return sql`true`;
  if (user.roles.includes("sale") && user.sourceIds.length > 0) {
    return inArray(students.sourceId, user.sourceIds);
  }
  return sql`false`;
}
