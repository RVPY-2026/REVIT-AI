import type { ReactNode } from "react";
import { cn } from "cn";

/** Mono eyebrow + h2 (Lexend 300 with a 500 emphasis) + one muted line (FRONTEND_RULES §4.1). */
export function SectionHeading({
  eyebrow,
  title,
  emphasis,
  children,
  className,
}: {
  eyebrow: string;
  title: ReactNode;
  emphasis: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-10 grid max-w-[640px] gap-2.5", className)}>
      <p className="font-mono text-[13px] tracking-[.08em] text-primary uppercase">
        {eyebrow}
      </p>
      <h2 className="text-[28px] font-light tracking-[-.01em] md:text-[40px]">
        {title} <strong className="font-medium">{emphasis}</strong>
      </h2>
      {children && <p className="text-muted-foreground">{children}</p>}
    </div>
  );
}
