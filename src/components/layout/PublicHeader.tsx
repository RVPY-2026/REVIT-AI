"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Menu } from "lucide-react";
import { cn } from "cn";
import { UserAccountMenu } from "@/components/auth/UserAccountMenu";
import { Logo } from "@/components/icons/logo";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Sheet, SheetClose, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { HOME_NAV, ROUTES, SITE } from "@/lib/constants";
import { can, type SessionUser } from "@/lib/auth/permissions";
import { useHideOnScroll } from "@/lib/use-scroll-direction";

type AccountIdentity = Pick<SessionUser, "name" | "email" | "roles">;

/** Glass, sticky, hides on scroll down and returns on scroll up (FRONTEND_RULES §4.1). */
export function PublicHeader({
  user = null,
  authPending = false,
}: {
  user?: AccountIdentity | null;
  authPending?: boolean;
}) {
  const hidden = useHideOnScroll();
  // Sticky elements below the header (the home 3D sheet) read this to take its place when it hides.
  useEffect(() => {
    document.documentElement.toggleAttribute("data-header-hidden", hidden);
    return () => document.documentElement.removeAttribute("data-header-hidden");
  }, [hidden]);
  const canManage = user ? can(user, "admin-area.view") : false;
  const canStudy = user ? can(user, "student-area.view") : false;
  const areaPath = canManage ? "/quan-tri" : canStudy ? "/hoc-vien" : null;
  const areaLabel = canManage ? "Vào khu quản lý" : canStudy ? "Vào khu học viên" : null;

  return (
    <header
      className={cn(
        "glass sticky top-0 z-40 border-b border-border transition-transform duration-300",
        hidden && "-translate-y-[110%]",
      )}
    >
      <div className="content flex h-16 items-center gap-6">
        <Link href="/" className="flex items-center gap-3" aria-label="RVPY trang chủ">
          <Logo className="h-[22px] w-auto" aria-hidden />
          <span className="font-heading text-[13px] font-light whitespace-nowrap text-muted-foreground max-[520px]:hidden">
            {SITE.studio}
          </span>
        </Link>

        <nav aria-label="Menu chính" className="ml-auto hidden gap-6 text-[15px] text-muted-foreground lg:flex">
          {HOME_NAV.map((item) => (
            <Link key={item.href} href={item.href} className="transition-colors hover:text-foreground">
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-3 lg:ml-0">
          <ThemeToggle />
          {authPending ? (
            <span
              aria-label="Đang tải tài khoản"
              role="status"
              className="size-10 animate-pulse rounded-full border border-border bg-card"
            />
          ) : user ? (
            <>
              <UserAccountMenu user={user} />
              {areaPath && areaLabel ? (
                <Button asChild size="sm" className="max-[520px]:hidden">
                  <Link href={areaPath}>{areaLabel}</Link>
                </Button>
              ) : null}
            </>
          ) : (
            <>
              <Button asChild variant="outline" size="sm" className="hidden lg:inline-flex">
                <Link href={ROUTES.signIn}>Đăng nhập</Link>
              </Button>
            </>
          )}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon-sm" aria-label="Mở menu" className="lg:hidden">
                <Menu strokeWidth={1.75} />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="gap-0 p-6 pt-14">
              <SheetTitle className="sr-only">Menu</SheetTitle>
              <nav aria-label="Menu di động" className="grid">
                {HOME_NAV.map((item) => (
                  <SheetClose asChild key={item.href}>
                    <Link href={item.href} className="border-b border-border py-3.5 text-base">
                      {item.label}
                    </Link>
                  </SheetClose>
                ))}
              </nav>
              <div className="mt-6 grid gap-3">
                {user && areaPath && areaLabel ? (
                  <SheetClose asChild>
                    <Button asChild>
                      <Link href={areaPath}>{areaLabel}</Link>
                    </Button>
                  </SheetClose>
                ) : !user ? (
                  <SheetClose asChild>
                    <Button asChild variant="outline">
                      <Link href={ROUTES.signIn}>Đăng nhập</Link>
                    </Button>
                  </SheetClose>
                ) : null}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
