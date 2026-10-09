import { can, homePathFor, type SessionUser } from "./permissions";

/** Return paths stay inside an area the caller can access. */
export function safeAreaPath(
  user: Pick<SessionUser, "roles">,
  next: unknown,
): string {
  if (
    typeof next !== "string" ||
    next.length > 1000 ||
    !next.startsWith("/") ||
    next.startsWith("//") ||
    /[\\\u0000-\u0020]/.test(next)
  )
    return homePathFor(user);
  const url = new URL(next, "https://rvpy.invalid");
  const path = url.pathname;
  const target = path + url.search + url.hash;
  if (
    (path === "/quan-tri" || path.startsWith("/quan-tri/")) &&
    can(user, "admin-area.view")
  )
    return target;
  if (
    (path === "/hoc-vien" || path.startsWith("/hoc-vien/")) &&
    can(user, "student-area.view")
  )
    return target;
  return homePathFor(user);
}
