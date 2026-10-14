"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { USE_MOCK } from "@/lib/runtime-mode";
import { homePathFor, type Role } from "@/lib/auth/permissions";
import { MOCK_ENROLLMENT_COOKIE } from "@/mocks/student-area";

/** Development-only fake identities never grant a real account any permissions. */
export async function selectMockRole(formData: FormData) {
  if (process.env.NODE_ENV !== "development" || !USE_MOCK) throw new Error("Mock identities are disabled");
  const value = formData.get("role");
  // "student-formal" is the same mock student with a full (formal) enrollment instead of the trial one.
  if (value !== "admin" && value !== "sale" && value !== "student" && value !== "student-formal" && value !== "user") throw new Error("Invalid mock identity");
  const role: Role = value === "student-formal" ? "student" : value;
  const jar = await cookies();
  const options = { httpOnly: true, sameSite: "lax", path: "/", secure: process.env.NODE_ENV !== "development", maxAge: 3600 } as const;
  jar.set("rvpy-mock-role", role, options);
  jar.set(MOCK_ENROLLMENT_COOKIE, value === "student-formal" ? "formal" : "trial", options);
  redirect(homePathFor({ roles: [role] }));
}
