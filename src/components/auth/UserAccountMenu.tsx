"use client";

import Link from "next/link";
import { useTransition } from "react";
import { BriefcaseBusiness, ChevronDown, CircleUserRound, GraduationCap, LogOut } from "lucide-react";
import { signOut } from "@/server/actions/auth";
import { can, type SessionUser } from "@/lib/auth/permissions";
import { ROLE_LABELS, ROUTES } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type AccountIdentity = Pick<SessionUser, "name" | "email" | "roles">;

export function UserAccountMenu({ user }: { user: AccountIdentity }) {
  const [pending, startTransition] = useTransition();
  const canManage = can(user, "admin-area.view");
  const canStudy = can(user, "student-area.view");

  function handleSignOut() {
    startTransition(async () => {
      await signOut();
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="group h-10 rounded-full border-border bg-card px-2 text-foreground"
          aria-label={`Mở menu tài khoản của ${user.name}`}
        >
          <span className="grid size-7 place-items-center rounded-full bg-primary-soft text-xs font-semibold text-primary">
            {getInitials(user.name)}
          </span>
          <ChevronDown aria-hidden="true" className="size-4 text-muted-foreground transition-transform duration-200 ease-out group-data-[state=open]:rotate-180" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 data-open:duration-200 data-closed:duration-150 data-open:ease-out data-closed:ease-in">
        <DropdownMenuLabel className="grid gap-1 px-2 py-2 font-normal">
          <span className="truncate text-sm font-medium text-foreground">
            {user.name}
          </span>
          <span className="break-all text-xs text-muted-foreground">
            {user.email}
          </span>
          <span className="pt-1 text-xs text-muted-foreground">
            {user.roles.map((role) => ROLE_LABELS[role]).join(" · ")}
          </span>
        </DropdownMenuLabel>
        {(canManage || canStudy) && <DropdownMenuSeparator />}
        {canManage ? (
          <DropdownMenuItem asChild>
            <Link href="/quan-tri">
              <BriefcaseBusiness aria-hidden="true" />
              Khu quản lý
            </Link>
          </DropdownMenuItem>
        ) : null}
        {canStudy ? (
          <DropdownMenuItem asChild>
            <Link href="/hoc-vien">
              <GraduationCap aria-hidden="true" />
              Khu học viên
            </Link>
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href={ROUTES.account}>
            <CircleUserRound aria-hidden="true" />
            Thông tin tài khoản
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={pending}
          onSelect={handleSignOut}
          variant="destructive"
        >
          <LogOut aria-hidden="true" />
          {pending ? "Đang đăng xuất…" : "Đăng xuất"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts
    .slice(-2)
    .map((part) => Array.from(part)[0])
    .join("")
    .toLocaleUpperCase("vi-VN") || "RV";
}
