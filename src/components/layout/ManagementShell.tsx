"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { FileUp, LayoutDashboard, Users, MessageSquare, ShieldCheck, BookOpen, FileText } from "lucide-react";
import { AppShell, type NavGroup } from "@/components/layout/AppShell";
import { Input } from "@/components/ui/input";
import { can, type SessionUser } from "@/lib/auth/permissions";

/** Grouped so the sidebar scales when payments, licenses and reports arrive. */
const navigationGroups = [
  { label: "Tư vấn", items: [
    { href: "/quan-tri", label: "Tổng quan", icon: LayoutDashboard, permission: "admin-area.view", exact: true },
    { href: "/quan-tri/hoc-vien", label: "Học viên", icon: Users, permission: "students.view" },
    { href: "/quan-tri/mau-tin-nhan", label: "Mẫu tin nhắn", icon: MessageSquare, permission: "templates.view" },
  ] },
  { label: "Dữ liệu", items: [
    { href: "/quan-tri/nhap-du-lieu", label: "Nhập dữ liệu", icon: FileUp, permission: "students.import" },
  ] },
  { label: "Hệ thống", items: [
    { href: "/quan-tri/phan-quyen", label: "Phân quyền", icon: ShieldCheck, permission: "roles.manage" },
  ] },
  { label: "Học tập", items: [
    { href: "/quan-tri/tai-lieu", label: "Tài liệu", icon: FileText, permission: "resources.manage" },
    { href: "/quan-tri/chuong-trinh", label: "Chương trình học", icon: BookOpen, permission: "lessons.manage" },
  ] },
] as const;

export function ManagementShell({ user, children }: { user: Pick<SessionUser, "name" | "email" | "roles">; children: ReactNode }) {
  const pathname = usePathname();
  const nav: NavGroup[] = navigationGroups
    .map((group) => ({ label: group.label, items: group.items.filter((item) => can(user, item.permission)) }))
    .filter((group) => group.items.length > 0);
  // The student list has its own search box; a second one in the header only competes with it.
  const hideHeaderSearch = pathname === "/quan-tri/hoc-vien";
  const search = hideHeaderSearch ? undefined : (
    <form action="/quan-tri/hoc-vien" className="min-w-0 flex-1" role="search">
      <label htmlFor="management-search" className="sr-only">Tìm tên, điện thoại, email hoặc mã học viên</label>
      <Input id="management-search" name="search" placeholder="Tìm học viên…" maxLength={100} className="max-w-md" />
    </form>
  );

  return (
    <AppShell
      user={user}
      nav={nav}
      navLabel="Điều hướng quản lý"
      sheetTitle="Khu quản lý RVPY"
      headerSlot={search}
      switchArea={can(user, "student-area.view") ? { href: "/hoc-vien", label: "Chuyển sang khu học viên" } : null}
    >
      {children}
    </AppShell>
  );
}
