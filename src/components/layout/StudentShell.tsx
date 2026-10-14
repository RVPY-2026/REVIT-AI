"use client";

import type { ReactNode } from "react";
import { BookOpen, FileText, Gift, HardDriveDownload, LayoutDashboard, LifeBuoy, ListChecks } from "lucide-react";
import { AppShell, type NavGroup } from "@/components/layout/AppShell";
import { can, type SessionUser } from "@/lib/auth/permissions";

const nav: NavGroup[] = [
  { label: "Học tập", items: [
    { href: "/hoc-vien", label: "Tổng quan", icon: LayoutDashboard, exact: true },
    { href: "/hoc-vien/khoa-hoc", label: "Bài học", icon: BookOpen },
    { href: "/hoc-vien/tai-lieu", label: "Tài liệu", icon: FileText },
    { href: "/hoc-vien/tien-do", label: "Tiến độ", icon: ListChecks },
  ] },
  { label: "Công cụ & hỗ trợ", items: [
    { href: "/hoc-vien/phan-mem", label: "Phần mềm", icon: HardDriveDownload },
    { href: "/hoc-vien/gioi-thieu-ban", label: "Giới thiệu bạn", icon: Gift },
    { href: "/hoc-vien/ho-tro", label: "Hỗ trợ", icon: LifeBuoy },
  ] },
];

export function StudentShell({ user, lessonTree, children }: { user: Pick<SessionUser, "name" | "email" | "roles">; lessonTree: ReactNode; children: ReactNode }) {
  return (
    <AppShell
      user={user}
      nav={nav}
      navLabel="Điều hướng khu học viên"
      sheetTitle="Khu học viên RVPY"
      variant="revit"
      sidebarExtra={lessonTree}
      switchArea={can(user, "admin-area.view") ? { href: "/quan-tri", label: "Chuyển sang khu quản lý" } : null}
    >
      {children}
    </AppShell>
  );
}
