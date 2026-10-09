import { cn } from "cn";

/** Drawing-sheet title block: a two-column mono table of label/value rows (FRONTEND_RULES §3.7). */
export function TitleBlock({
  rows,
  decorative = false,
  className,
}: {
  rows: readonly (readonly [label: string, value: string])[];
  /** Hide from assistive tech when the values are only ornament (footer). */
  decorative?: boolean;
  className?: string;
}) {
  return (
    <dl
      aria-hidden={decorative || undefined}
      className={cn(
        "grid w-fit grid-cols-[auto_auto] border border-foreground/40 font-mono text-[12px] [&>*]:px-3 [&>*]:py-1.5 [&>dd]:border-l [&>dd]:border-border [&>dt]:text-muted-foreground [&>:nth-child(n+3)]:border-t [&>:nth-child(n+3)]:border-border",
        className,
      )}
    >
      {rows.map(([label, value]) => (
        <TitleBlockRow key={label} label={label} value={value} />
      ))}
    </dl>
  );
}

function TitleBlockRow({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt>{label}</dt>
      <dd className="text-foreground">{value}</dd>
    </>
  );
}
