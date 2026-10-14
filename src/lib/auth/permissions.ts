// Single source of truth for who may do what. Pure TS: imported by the UI (to
// hide buttons) and by src/server (to enforce). Only the server check is security.

export type Role = "admin" | "sale" | "student" | "user";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  roles: Role[];
  /** ad_sources.id values this user owns (role `sale`). */
  sourceIds: string[];
  /** students.id linked to this account (role `student`). */
  studentId: string | null;
};

const PERMISSIONS = {
  "admin-area.view": ["admin", "sale"],
  "students.view": ["admin", "sale"], // sale: own sources only (scoped in queries)
  "students.edit": ["admin", "sale"],
  "students.create": ["admin", "sale"], // sale: active sources they own only
  "enrollments.trial": ["admin", "sale"],
  "students.activate": ["admin"],
  "students.learning.edit": ["admin", "sale"],
  "enrollments.formal": ["admin"],
  "students.export": ["admin", "sale"],
  "students.import": ["admin"], // one-off and recurring sheet imports touch every source
  "templates.view": ["admin", "sale"],
  "templates.edit": ["admin"],
  "payments.view": ["admin"],
  "payments.edit": ["admin"],
  "licenses.manage": ["admin"],
  "sources.manage": ["admin"],
  "reports.view": ["admin", "sale"], // sale: own sources only
  "settings.manage": ["admin"],
  "roles.manage": ["admin"], // grant/revoke admin and sale on other accounts (roles-manager.ts)
  "student-area.view": ["admin", "student"],
} as const satisfies Record<string, readonly Role[]>;

export type Permission = keyof typeof PERMISSIONS;

export function can(user: Pick<SessionUser, "roles"> | null, permission: Permission): boolean {
  if (!user) return false;
  const allowed: readonly Role[] = PERMISSIONS[permission];
  return user.roles.some((r) => allowed.includes(r));
}

export function isAdmin(user: Pick<SessionUser, "roles">): boolean {
  return user.roles.includes("admin");
}

/** Where to send a user right after sign-in (CLAUDE.md §3). */
export function homePathFor(user: Pick<SessionUser, "roles">): string {
  if (can(user, "admin-area.view")) return "/quan-tri";
  if (can(user, "student-area.view")) return "/hoc-vien";
  if (user.roles.includes("user")) return "/";
  return "/chua-kich-hoat";
}
