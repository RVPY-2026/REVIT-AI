import { cn } from "cn";

/**
 * Short statements set like the numbered general notes on a drawing sheet: mono index,
 * hairline rules, no icons.
 */
export function NoteList({
  items,
  className,
}: {
  items: readonly string[];
  className?: string;
}) {
  return (
    <ol className={cn("border-t border-border", className)}>
      {items.map((item, i) => (
        <li
          key={item}
          className="grid grid-cols-[2.5rem_1fr] items-baseline border-b border-border py-3 text-[15px]"
        >
          <span className="font-mono text-[13px] text-primary">
            {String(i + 1).padStart(2, "0")}
          </span>
          {item}
        </li>
      ))}
    </ol>
  );
}
