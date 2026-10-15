import { SearchX } from "lucide-react";
import type { ReactNode } from "react";
export function ManagementEmpty({ children }: { children: ReactNode }) {
  return <div className="grid justify-items-center gap-4 rounded-2xl border border-dashed border-border bg-card px-5 py-12 text-center">
    <SearchX className="size-8 text-muted-foreground" strokeWidth={1.75} aria-hidden="true" />{children}</div>;
}
