"use client";

import Link from "next/link";
import { Menu } from "lucide-react";
import { cn } from "cn";
import { Logo } from "@/components/icons/logo";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Sheet, SheetClose, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { HOME_NAV, ROUTES, SITE } from "@/lib/constants";
import { useHideOnScroll } from "@/lib/use-scroll-direction";

/** Glass, sticky, hides on scroll down and returns on scroll up (FRONTEND_RULES §4.1). */
export function PublicHeader() {
  const hidden = useHideOnScroll();

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
          <Button asChild variant="outline" size="sm" className="hidden lg:inline-flex">
            <Link href={ROUTES.signIn}>Đăng nhập</Link>
          </Button>
          <Button asChild size="sm" className="max-[380px]:hidden">
            <Link href={ROUTES.signup}>Đăng ký học thử</Link>
          </Button>
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
                <Button asChild>
                  <Link href={ROUTES.signup}>Đăng ký 3 buổi học thử</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href={ROUTES.signIn}>Đăng nhập</Link>
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
