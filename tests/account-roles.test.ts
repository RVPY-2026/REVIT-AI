import assert from "node:assert/strict";
import test from "node:test";
import { can, type SessionUser } from "../src/lib/auth/permissions";
import { setAccountRoleSchema } from "../src/lib/schemas/account-role";

const userId = "00000000-0000-4000-8000-000000000002";

function userWith(roles: SessionUser["roles"]): Pick<SessionUser, "roles"> {
  return { roles };
}

test("only admins may manage account roles", () => {
  assert.equal(can(userWith(["admin"]), "roles.manage"), true);
  assert.equal(can(userWith(["sale"]), "roles.manage"), false);
  assert.equal(can(userWith(["student"]), "roles.manage"), false);
  assert.equal(can(userWith(["user"]), "roles.manage"), false);
  assert.equal(can(null, "roles.manage"), false);
});

test("role changes accept only admin and sale", () => {
  assert.deepEqual(
    setAccountRoleSchema.parse({ userId, role: "admin", granted: true }),
    { userId, role: "admin", granted: true },
  );
  assert.equal(setAccountRoleSchema.safeParse({ userId, role: "sale", granted: false }).success, true);
  // student and user are not assignable from the role manager.
  assert.equal(setAccountRoleSchema.safeParse({ userId, role: "student", granted: true }).success, false);
  assert.equal(setAccountRoleSchema.safeParse({ userId, role: "user", granted: true }).success, false);
});

test("role changes reject malformed targets and extra fields", () => {
  assert.equal(setAccountRoleSchema.safeParse({ userId: "not-a-uuid", role: "sale", granted: true }).success, false);
  assert.equal(setAccountRoleSchema.safeParse({ userId, role: "sale" }).success, false);
  assert.equal(setAccountRoleSchema.safeParse({ userId, role: "sale", granted: true, extra: 1 }).success, false);
});
