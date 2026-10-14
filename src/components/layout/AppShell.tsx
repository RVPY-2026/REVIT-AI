"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { ChevronRight, PanelLeftClose, PanelLeftOpen, type LucideIcon } from "lucide-react";
import { UserAccountMenu } from "@/components/auth/UserAccountMenu";
import { Logo } from "@/components/icons/logo";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { Button } from "@/components/ui/button";
import { MobileTabBar } from "@/components/layout/MobileTabBar";
import type { SessionUser } from "@/lib/auth/permissions";

export type NavItem = { href: string; label: string; icon: LucideIcon; /** Match the path exactly (area home). */ exact?: boolean };
export type NavGroup = { label: string; items: NavItem[] };

/**
 * Signed-in app frame (FRONTEND_RULES §4.2): sidebar on desktop, bottom tab bar on phones.
 * The first `mobileTabs` items stay in the bar; the rest move into the "Thêm" sheet.
 */
export function AppShell({ user, nav, navLabel, sheetTitle, mobileTabs = 4, headerSlot, switchArea, variant = "default", sidebarExtra, children }: {
  user: Pick<SessionUser, "name" | "email" | "roles">;
  nav: NavGroup[];
  navLabel: string;
  sheetTitle: string;
  mobileTabs?: number;
  /** Search or other controls shown at the left of the top bar. */
  headerSlot?: ReactNode;
  switchArea?: { href: string; label: string } | null;
  /** "revit": the expanded sidebar is drawn as a Revit Project Browser tree (student area). */
  variant?: "default" | "revit";
  /** Extra tree under the navigation while the sidebar is expanded (revit variant only). */
  sidebarExtra?: ReactNode;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const items = nav.flatMap((group) => group.items);
  const active = (item: NavItem) => item.exact ? pathname === item.href : pathname.startsWith(item.href);

  return (
    <div className="min-h-dvh bg-background">
      <aside className={`fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-border bg-card transition-[width] duration-200 ease-out motion-reduce:transition-none md:flex ${collapsed ? "w-[72px]" : "w-[248px]"}`}>
        <Link href="/" aria-label="RVPY trang chủ" className="flex h-16 items-center justify-center border-b border-border px-4">
          <Logo className={`text-primary transition-[height,width] duration-200 ease-out motion-reduce:transition-none ${collapsed ? "h-5 w-full" : "h-7 w-auto"}`} aria-hidden />
        </Link>
        {variant === "revit" && !collapsed ? (
          <div className="min-h-0 flex-1 overflow-y-auto">
            <p className="border-b border-border bg-background-2 px-3 py-1.5 font-mono text-xs text-muted-foreground">Trình duyệt dự án</p>
            <nav aria-label={navLabel} className="p-2 text-[13px]">
              {nav.map((group) => (
                <details key={group.label} open className="group">
                  <summary className="flex cursor-pointer list-none items-center gap-1 rounded-[4px] px-2 py-1.5 font-medium select-none hover:bg-background-2 [&::-webkit-details-marker]:hidden">
                    <ChevronRight aria-hidden strokeWidth={1.75} className="size-4 shrink-0 transition-transform duration-150 group-open:rotate-90 motion-reduce:transition-none" />
                    {group.label}
                  </summary>
                  <div className="ml-4 grid border-l border-border">
                    {group.items.map((item) => (
                      <Link key={item.href} href={item.href} aria-current={active(item) ? "page" : undefined} className={`flex min-h-9 items-center gap-2 border-l-2 px-2 ${active(item) ? "border-primary bg-primary-soft text-primary" : "border-transparent text-muted-foreground hover:bg-background-2 hover:text-foreground"}`}>
                        <item.icon aria-hidden strokeWidth={1.75} className="size-4 shrink-0" />
                        {item.label}
                      </Link>
                    ))}
                  </div>
                </details>
              ))}
            </nav>
            {sidebarExtra ? (
              <div className="border-t border-border">
                <p className="border-b border-border bg-background-2 px-3 py-1.5 font-mono text-xs text-muted-foreground">Bài học của bạn</p>
                <div className="p-2">{sidebarExtra}</div>
              </div>
            ) : null}
          </div>
        ) : null}
        <nav aria-label={navLabel} className={variant === "revit" && !collapsed ? "hidden" : "grid gap-4 p-3"}>
          {nav.map((group) => (
            <div key={group.label} className="grid gap-1.5">
              <p className={`overflow-hidden whitespace-nowrap px-3 font-mono text-[11px] tracking-wide text-muted-foreground uppercase transition-[height,opacity] duration-200 ease-out motion-reduce:transition-none ${collapsed ? "h-0 opacity-0" : "h-4 opacity-100"}`}>{group.label}</p>
              {group.items.map((item) => (
                <Link key={item.href} href={item.href} aria-current={active(item) ? "page" : undefined} title={collapsed ? item.label : undefined} className={`flex min-h-11 items-center gap-3 rounded-[10px] border px-3 text-sm ${active(item) ? "border-primary bg-primary-soft text-primary" : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"}`}>
                  <item.icon aria-hidden strokeWidth={1.75} className="size-5 shrink-0" />
                  <span className={`overflow-hidden whitespace-nowrap transition-[max-width,opacity] duration-200 ease-out motion-reduce:transition-none ${collapsed ? "max-w-0 opacity-0" : "max-w-[180px] opacity-100"}`}>{item.label}</span>
                </Link>
              ))}
            </div>
          ))}
        </nav>
        <div className="mt-auto border-t border-border p-3">
          <Button variant="ghost" size="sm" className="w-full" onClick={() => setCollapsed(!collapsed)} aria-label={collapsed ? "Mở rộng điều hướng" : "Thu gọn điều hướng"}>
            {collapsed ? <PanelLeftOpen aria-hidden strokeWidth={1.75} /> : <><PanelLeftClose aria-hidden strokeWidth={1.75} /> Thu gọn</>}
          </Button>
        </div>
      </aside>
      <div className={`min-w-0 pb-24 transition-[padding] duration-200 ease-out motion-reduce:transition-none md:pb-0 ${collapsed ? "md:pl-[72px]" : "md:pl-[248px]"}`}>
        <header className="sticky top-0 z-20 border-b border-border bg-background">
          <div className="flex min-h-16 items-center gap-3 px-4 md:px-6">
            {headerSlot ?? <div className="flex-1" />}
            <ThemeToggle />
            <UserAccountMenu user={user} />
          </div>
        </header>
        {children}
      </div>
      <MobileTabBar items={items} isActive={active} navLabel={navLabel} sheetTitle={sheetTitle} userName={user.name} mobileTabs={mobileTabs} switchArea={switchArea} />
    </div>
  );
}
