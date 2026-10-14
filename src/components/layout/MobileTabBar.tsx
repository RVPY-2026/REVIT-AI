"use client";

import Link from "next/link";
import { ArrowUpRight, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import type { NavItem } from "@/components/layout/AppShell";

/** Bottom tab bar for phones (< 768px): the first `mobileTabs` items stay, the rest move into the "Thêm" sheet. */
export function MobileTabBar({ items, isActive, navLabel, sheetTitle, userName, mobileTabs = 4, switchArea }: {
  items: NavItem[];
  isActive: (item: NavItem) => boolean;
  navLabel: string;
  sheetTitle: string;
  userName: string;
  mobileTabs?: number;
  switchArea?: { href: string; label: string } | null;
}) {
  const tabs = items.length > mobileTabs ? items.slice(0, mobileTabs) : items;
  const more = items.slice(tabs.length);

  return (
    <nav aria-label={`${navLabel} trên điện thoại`} style={{ gridTemplateColumns: `repeat(${tabs.length + 1}, minmax(0, 1fr))` }} className="fixed inset-x-0 bottom-0 z-30 grid border-t border-border bg-background pb-[env(safe-area-inset-bottom)] md:hidden">
      {tabs.map((item) => (
        <Link key={item.href} href={item.href} aria-current={isActive(item) ? "page" : undefined} className={`flex min-h-16 flex-col items-center justify-center gap-1 px-1 text-[12px] ${isActive(item) ? "text-primary" : "text-muted-foreground"}`}>
          <item.icon aria-hidden strokeWidth={1.75} className="size-5" />{item.label}
        </Link>
      ))}
      <Sheet>
        <SheetTrigger asChild><Button variant="ghost" className="h-16 flex-col gap-1 rounded-none text-[12px]"><MoreHorizontal aria-hidden strokeWidth={1.75} />Thêm</Button></SheetTrigger>
        <SheetContent side="bottom" className="rounded-t-2xl border-border bg-card pb-8 shadow-none" showCloseButton={false}>
          <SheetHeader><SheetTitle>{sheetTitle}</SheetTitle><SheetDescription>{userName}</SheetDescription></SheetHeader>
          <div className="grid gap-2 px-4">
            {more.map((item) => (
              <SheetClose key={item.href} asChild>
                <Button asChild variant="outline" className={`justify-start ${isActive(item) ? "border-primary bg-primary-soft text-primary" : ""}`}>
                  <Link href={item.href} aria-current={isActive(item) ? "page" : undefined}><item.icon aria-hidden strokeWidth={1.75} />{item.label}</Link>
                </Button>
              </SheetClose>
            ))}
            <SheetClose asChild><Button asChild variant="outline"><Link href="/">Xem trang chủ <ArrowUpRight aria-hidden /></Link></Button></SheetClose>
            {switchArea ? <SheetClose asChild><Button asChild variant="outline"><Link href={switchArea.href}>{switchArea.label}</Link></Button></SheetClose> : null}
            <SheetClose asChild><Button variant="outline">Đóng menu</Button></SheetClose>
          </div>
        </SheetContent>
      </Sheet>
    </nav>
  );
}
