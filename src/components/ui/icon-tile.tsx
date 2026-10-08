import type { LucideIcon } from "lucide-react";
import { cn } from "cn";

/** Leading icon for feature cards and list items: accent icon on a soft tile (FRONTEND_RULES §3.4). */
export function IconTile({
  icon: Icon,
  size = "md",
  className,
}: {
  icon: LucideIcon;
  size?: "sm" | "md";
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid shrink-0 place-items-center rounded-xl bg-primary-soft text-primary",
        size === "md" ? "size-11 [&_svg]:size-6" : "size-9 [&_svg]:size-[18px]",
        className,
      )}
    >
      <Icon strokeWidth={1.75} />
    </span>
  );
}
