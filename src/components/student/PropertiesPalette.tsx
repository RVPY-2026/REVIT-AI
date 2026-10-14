import type { ReactNode } from "react";

/** Revit-style Properties palette: a titled list of name/value rows beside the main view. Values are plain HTML. */
export function PropertiesPalette({ title = "Thuộc tính", rows }: { title?: string; rows: { name: string; value: ReactNode }[] }) {
  return (
    <aside aria-label={title} className="self-start rounded-[4px] border border-border bg-card">
      <h2 className="border-b border-border bg-background-2 px-3 py-1.5 text-[13px] font-medium">{title}</h2>
      <dl className="divide-y divide-border text-[13px]">
        {rows.map((row) => (
          <div key={row.name} className="grid grid-cols-[104px_1fr] gap-2 px-3 py-2">
            <dt className="text-muted-foreground">{row.name}</dt>
            <dd className="min-w-0 break-words">{row.value}</dd>
          </div>
        ))}
      </dl>
    </aside>
  );
}
