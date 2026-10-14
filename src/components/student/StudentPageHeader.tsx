import type { ReactNode } from "react";

/** Page title block of the student area: mono eyebrow, h1 (Lexend 300, 28px), one line of context. */
export function StudentPageHeader({ eyebrow, title, description, action }: {
  eyebrow: string; title: string; description?: ReactNode; action?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <p className="font-mono text-xs text-muted-foreground uppercase">{eyebrow}</p>
        <h1 className="mt-2 font-heading text-[28px] font-light text-balance">{title}</h1>
        {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {action ? <div className="flex flex-wrap gap-2">{action}</div> : null}
    </header>
  );
}
