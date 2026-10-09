"use client";

import { useEffect, useRef, type HTMLAttributes } from "react";
import { cn } from "cn";

/**
 * Fades a block in and lifts it 16px when it scrolls into view (FRONTEND_RULES §3.5).
 * Blocks already on screen at load are never hidden; reduced motion skips the effect.
 */
export function Reveal({
  as: Tag = "div",
  className,
  delay = 0,
  style,
  ...props
}: HTMLAttributes<HTMLElement> & { delay?: number; as?: "div" | "li" }) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || el.getBoundingClientRect().top < window.innerHeight) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    el.dataset.pre = "";
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        delete el.dataset.pre;
        io.disconnect();
      },
      { rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <Tag
      ref={ref as never}
      className={cn(
        "transition-[opacity,translate] duration-600 ease-out data-pre:translate-y-4 data-pre:opacity-0",
        className,
      )}
      style={{ transitionDelay: delay ? `${delay}ms` : undefined, ...style }}
      {...props}
    />
  );
}
