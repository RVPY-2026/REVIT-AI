import "server-only";
import { and, eq, isNull, or, sql } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { can, type Permission, type Role, type SessionUser } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { USE_MOCK, hasSupabaseConfig } from "@/lib/runtime-mode";
import { audit } from "@/server/audit";
import { db } from "@/server/db";
import { adSources, students, userRoles, users } from "@/server/db/schema";

export { USE_MOCK };
export const MOCK_ROLE_COOKIE = "rvpy-mock-role";

// Correlated projections return one authorization snapshot without three extra round trips.
// Drizzle unqualifies Column nodes in a single-table SELECT projection. Keep the
// outer identity as explicit identifiers so a nested table's `id` cannot shadow it.
const outerAccountId = sql`${sql.identifier("users")}.${sql.identifier("id")}`;
const accountAccess = {
  roles: sql<Role[]>`coalesce((select json_agg(${userRoles.role}) from ${userRoles} where ${userRoles.userId} = ${outerAccountId}), '[]'::json)`,
  sourceIds: sql<string[]>`coalesce((select json_agg(${adSources.id}) from ${adSources} where ${adSources.ownerUserId} = ${outerAccountId}), '[]'::json)`,
  studentId: sql<string | null>`(select ${students.id} from ${students} where ${students.userId} = ${outerAccountId} limit 1)`,
};
type AccountIdentity = Pick<typeof users.$inferSelect, "id" | "email" | "name" | "avatarUrl" | "authUserId" | "disabledAt">;

/**
 * The signed-in user with roles and scope, or null.
 * Deduplicated per request with React `cache`. Never wrap in `use cache`.
 */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  if (USE_MOCK) return getMockUser();

  const claims = await getAuthClaims();
  if (!claims?.sub || typeof claims.email !== "string") return null;

  const email = claims.email.toLowerCase();
  const [account] = await db
    .select({ id: users.id, email: users.email, name: users.name, avatarUrl: users.avatarUrl, authUserId: users.authUserId, disabledAt: users.disabledAt, ...accountAccess })
    .from(users)
    .where(or(eq(users.authUserId, claims.sub), eq(users.email, email)))
    .orderBy(sql`CASE WHEN ${users.authUserId} = ${claims.sub} THEN 0 ELSE 1 END`)
    .limit(1);
  let row: AccountIdentity | undefined = account;

  // Public accounts are provisioned on the first successful Supabase sign-in.
  // The role comes from this server-side transaction, never from auth metadata.
  if (!row) {
    const name = getProfileName(claims, email);
    row = await db.transaction(async (tx) => {
      const [created] = await tx.insert(users)
        .values({ email, authUserId: claims.sub, name })
        .onConflictDoNothing()
        .returning({ id: users.id, email: users.email, name: users.name, avatarUrl: users.avatarUrl, authUserId: users.authUserId, disabledAt: users.disabledAt });

      if (created) {
        await tx.insert(userRoles).values({ userId: created.id, role: "user" });
        await audit(tx, { actorId: created.id, action: "user.self_registered", entity: "users", entityId: created.id });
        return created;
      }

      // Another request may have created or linked this identity concurrently.
      const [concurrent] = await tx.select({ id: users.id, email: users.email, name: users.name, avatarUrl: users.avatarUrl, authUserId: users.authUserId, disabledAt: users.disabledAt })
        .from(users)
        .where(or(eq(users.authUserId, claims.sub), eq(users.email, email)))
        .orderBy(sql`CASE WHEN ${users.authUserId} = ${claims.sub} THEN 0 ELSE 1 END`)
        .limit(1);
      return concurrent;
    });
  }

  if (!row || row.disabledAt || (row.authUserId && row.authUserId !== claims.sub)) return null;

  // First sign-in: link the Supabase auth user to the pre-created row.
  if (!row.authUserId) {
    const linked = await db.transaction(async (tx) => {
      const [updated] = await tx.update(users).set({ authUserId: claims.sub })
        .where(and(eq(users.id, row.id), isNull(users.authUserId), isNull(users.disabledAt))).returning({ id: users.id });
      if (updated) await audit(tx, { actorId: row.id, action: "user.auth_linked", entity: "users", entityId: row.id });
      return updated;
    });
    if (!linked) {
      const [alreadyLinked] = await db.select({ id: users.id }).from(users)
        .where(and(eq(users.id, row.id), eq(users.authUserId, claims.sub), isNull(users.disabledAt))).limit(1);
      if (!alreadyLinked) return null;
    }
  }

  // Existing accounts already carry their access snapshot. A newly provisioned
  // account is read after its role transaction commits.
  const access = account ?? (await db.select(accountAccess).from(users).where(eq(users.id, row.id)).limit(1))[0];
  if (!access) return null;

  return {
    id: row.id,
    email: row.email,
    name: row.name,
    avatarUrl: row.avatarUrl,
    roles: access.roles,
    sourceIds: access.sourceIds,
    studentId: access.studentId,
  };
});

/** Use at the top of every protected page, layout, action and route handler. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect(await getAuthClaims() ? "/chua-kich-hoat" : "/dang-nhap");
  return user;
}

export async function requirePermission(permission: Permission): Promise<SessionUser> {
  const user = await requireUser();
  if (!can(user, permission)) redirect(user.roles.length ? "/khong-co-quyen" : "/chua-kich-hoat");
  return user;
}

const getAuthClaims = cache(async () => {
  if (USE_MOCK || !hasSupabaseConfig()) return null;
  const { data, error } = await (await createClient()).auth.getClaims();
  return error ? null : data?.claims ?? null;
});

// --- development-only mock auth (FRONTEND_RULES §7) ---

async function getMockUser(): Promise<SessionUser | null> {
  if (process.env.NODE_ENV === "production") return null;
  const role = (await cookies()).get(MOCK_ROLE_COOKIE)?.value as Role | "none" | undefined;
  if (role !== "admin" && role !== "sale" && role !== "student" && role !== "user") return null;
  return {
    id: `mock-${role}`,
    email: `${role}@example.com`,
    name: { admin: "Quản trị (mock)", sale: "Sale A (mock)", student: "Học viên (mock)", user: "Tài khoản thường (mock)" }[role],
    avatarUrl: null,
    roles: [role],
    sourceIds: role === "sale" ? ["mock-source-a"] : [],
    studentId: role === "student" ? "mock-student-1" : null,
  };
}

function getProfileName(claims: Record<string, unknown>, email: string): string {
  const metadata = claims.user_metadata;
  if (metadata && typeof metadata === "object") {
    const profile = metadata as Record<string, unknown>;
    for (const value of [profile.full_name, profile.name]) {
      if (typeof value === "string" && value.trim()) return value.trim().slice(0, 100);
    }
  }
  return email.split("@")[0]?.slice(0, 100) || "RVPY User";
}
