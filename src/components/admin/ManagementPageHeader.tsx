import type { ReactNode } from "react";
export function ManagementPageHeader({ title, helper, action }: { title: string; helper: string; action?: ReactNode }) {
  return <div className="sticky top-16 z-10 flex min-w-0 flex-col gap-5 bg-background py-3 sm:flex-row sm:items-end sm:justify-between">
    <div className="min-w-0"><p className="font-mono text-xs text-muted-foreground">QUẢN LÝ · HỆ THỐNG</p>
      <h1 className="mt-2 font-heading text-[28px] font-light text-foreground">{title}</h1>
      <p className="mt-1 max-w-prose text-sm text-muted-foreground">{helper}</p></div>
    {action && <div className="shrink-0">{action}</div>}
  </div>;
}
