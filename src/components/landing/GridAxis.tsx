"use client";

import { useEffect, useState } from "react";
import { cn } from "cn";

// Structural grid axes: one lettered bubble per home-page section, lit while that section is on screen.
const AXES = [
  { id: "hanh-trinh", label: "Hành trình học" },
  { id: "hoc-thu", label: "Học thử" },
  { id: "hoc-phi", label: "Học phí" },
  { id: "cong-cu", label: "Công cụ" },
  { id: "cong-dong", label: "Cộng đồng" },
  { id: "hoi-dap", label: "Hỏi đáp" },
] as const;

/** Fixed rail in the left margin of wide screens. Decorative navigation: hidden below xl; compact at xl so it fits the 24px gutter. */
export function GridAxis() {
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    const els = AXES.map((a) => document.getElementById(a.id)).filter(
      (el): el is HTMLElement => !!el,
    );
    // A section counts as current while it crosses the middle of the viewport.
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setActive(e.target.id);
          else setActive((cur) => (cur === e.target.id ? null : cur));
        }
      },
      { rootMargin: "-45% 0px -50% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <nav
      aria-label="Các mục trên trang"
      className="pointer-events-none fixed top-1/2 left-0.5 z-30 hidden -translate-y-1/2 xl:block 2xl:left-5"
    >
      <div className="relative grid gap-4 2xl:gap-5">
        <span
          aria-hidden
          className="absolute inset-y-[-24px] left-1/2 w-px -translate-x-1/2 bg-foreground/15"
        />
        {AXES.map((a, i) => (
          <a
            key={a.id}
            href={`#${a.id}`}
            aria-label={a.label}
            title={a.label}
            className={cn(
              "pointer-events-auto relative grid size-5 place-items-center rounded-full border bg-background font-mono text-[10px] 2xl:size-7 2xl:text-[12px] transition-colors duration-300 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none",
              active === a.id
                ? "border-primary bg-primary text-primary-foreground"
                : "border-foreground/30 text-muted-foreground hover:border-primary hover:text-primary",
            )}
          >
            {String.fromCharCode(65 + i)}
          </a>
        ))}
      </div>
    </nav>
  );
}
