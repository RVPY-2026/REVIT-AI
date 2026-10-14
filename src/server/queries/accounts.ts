import "server-only";
import { asc, ilike, or, sql } from "drizzle-orm";
import { can, type Role, type SessionUser } from "@/lib/auth/permissions";
import { db } from "@/server/db";
import { userRoles, users } from "@/server/db/schema";

export type ManagedAccount = {
  id: string;
  email: string;
  name: string;
  disabled: boolean;
  roles: Role[];
};

// Every signed-in person gets a `user` account, so the list is searched and capped instead of loaded whole.
export const ACCOUNT_LIMIT = 100;

export async function listManagedAccounts(user: SessionUser, search = ""): Promise<ManagedAccount[]> {
  if (!can(user, "roles.manage")) return [];
  const term = search.replace(/[\\%_]/g, (char) => `\\${char}`);
  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      disabledAt: users.disabledAt,
      roles: sql<Role[]>`coalesce((select json_agg(${userRoles.role}) from ${userRoles} where ${userRoles.userId} = ${users.id}), '[]'::json)`,
    })
    .from(users)
    .where(term ? or(ilike(users.email, `%${term}%`), ilike(users.name, `%${term}%`)) : undefined)
    .orderBy(asc(users.email))
    .limit(ACCOUNT_LIMIT);

  return rows.map((row) => ({
    id: row.id,
    email: row.email,
    name: row.name,
    disabled: row.disabledAt !== null,
    roles: row.roles,
  }));
}
