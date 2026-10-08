import "server-only";
import { eq, or } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { can, type Permission, type Role, type SessionUser } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/server/db";
import { adSources, students, userRoles, users } from "@/server/db/schema";

export const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";
export const MOCK_ROLE_COOKIE = "rvpy-mock-role";

/**
 * The signed-in user with roles and scope, or null.
 * Deduplicated per request with React `cache`. Never wrap in `use cache`.
 */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  if (USE_MOCK) return getMockUser();

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub || typeof claims.email !== "string") return null;

  const email = claims.email.toLowerCase();
  const [row] = await db
    .select()
    .from(users)
    .where(or(eq(users.authUserId, claims.sub), eq(users.email, email)))
    .limit(1);
  if (!row || row.disabledAt) return null;

  // First sign-in: link the Supabase auth user to the pre-created row.
  if (!row.authUserId) {
    await db.update(users).set({ authUserId: claims.sub }).where(eq(users.id, row.id));
  }

  const [roleRows, sourceRows, studentRows] = await Promise.all([
    db.select({ role: userRoles.role }).from(userRoles).where(eq(userRoles.userId, row.id)),
    db.select({ id: adSources.id }).from(adSources).where(eq(adSources.ownerUserId, row.id)),
    db.select({ id: students.id }).from(students).where(eq(students.userId, row.id)).limit(1),
  ]);

  return {
    id: row.id,
    email: row.email,
    name: row.name,
    avatarUrl: row.avatarUrl,
    roles: roleRows.map((r) => r.role),
    sourceIds: sourceRows.map((s) => s.id),
    studentId: studentRows[0]?.id ?? null,
  };
});

/** Use at the top of every protected page, layout, action and route handler. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/dang-nhap");
  return user;
}

export async function requirePermission(permission: Permission): Promise<SessionUser> {
  const user = await requireUser();
  if (!can(user, permission)) redirect(user.roles.length ? "/khong-co-quyen" : "/chua-kich-hoat");
  return user;
}

// --- development-only mock auth (FRONTEND_RULES §7) ---

async function getMockUser(): Promise<SessionUser | null> {
  if (process.env.NODE_ENV === "production") return null;
  const role = (await cookies()).get(MOCK_ROLE_COOKIE)?.value as Role | "none" | undefined;
  if (!role || role === "none") return null;
  return {
    id: `mock-${role}`,
    email: `${role}@example.com`,
    name: { admin: "Quản trị (mock)", sale: "Sale A (mock)", student: "Học viên (mock)" }[role],
    avatarUrl: null,
    roles: [role],
    sourceIds: role === "sale" ? ["mock-source-a"] : [],
    studentId: role === "student" ? "mock-student-1" : null,
  };
}
