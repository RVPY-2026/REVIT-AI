import { cn } from "cn";

/** Determinate progress, 0–100. The label is read by screen readers; the number beside it is up to the caller. */
export function ProgressBar({ value, label, className }: { value: number; label: string; className?: string }) {
  const percent = Math.min(100, Math.max(0, Math.round(value)));
  return (
    <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} className={cn("h-2 w-full overflow-hidden rounded-full bg-muted", className)}>
      <div className="h-full rounded-full bg-primary transition-[width] duration-300 ease-out motion-reduce:transition-none" style={{ width: `${percent}%` }} />
    </div>
  );
}
