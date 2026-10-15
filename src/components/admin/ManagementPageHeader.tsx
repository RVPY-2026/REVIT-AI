"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
export function ManagementPageHeader({ title, helper, action }: { title: string; helper: string; action?: ReactNode }) {
  const actionRef = useRef<HTMLDivElement>(null);
  const [floating, setFloating] = useState(false);
  useEffect(() => {
    if (!actionRef.current) return;
    const observer = new IntersectionObserver(([entry]) => setFloating(!entry.isIntersecting));
    observer.observe(actionRef.current);
    return () => observer.disconnect();
  }, [action]);
  return <div className="flex min-w-0 flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
    <div className="min-w-0"><p className="font-mono text-xs text-muted-foreground">QUẢN LÝ · HỆ THỐNG</p>
      <h1 className="mt-2 font-heading text-[28px] font-light text-foreground">{title}</h1>
      <p className="mt-1 max-w-prose text-sm text-muted-foreground">{helper}</p></div>
    {action && <div ref={actionRef} className="shrink-0">{action}</div>}
    {action && floating && <div className="fixed right-4 bottom-24 z-30 rounded-lg border bg-background p-2 md:hidden">{action}</div>}
  </div>;
}
