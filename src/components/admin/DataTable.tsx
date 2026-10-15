"use client"

import { tableFeatures, useTable } from "@tanstack/react-table"
import type { ColumnDef, RowData } from "@tanstack/react-table"
import type { ReactNode } from "react"

export const dataTableFeatures = tableFeatures({})
export type DataTableColumn<TData extends RowData> = ColumnDef<typeof dataTableFeatures, TData>

export function DataTable<TData extends RowData>({
  columns,
  data,
  mobileCards,
  rowKey,
  presentation = "responsive",
  label = "Danh sách học viên",
  ariaLabel,
}: {
  columns: Array<DataTableColumn<TData>>
  data: TData[]
  mobileCards: (item: TData) => ReactNode
  rowKey?: (item: TData) => string
  /** Responsive uses cards below md; wide below lg; cards never renders a table. */
  presentation?: "responsive" | "wide" | "cards"
  label?: string
  ariaLabel?: string
}) {
  const table = useTable({ features: dataTableFeatures, columns, data })

  return (
    <>
      {presentation !== "cards" && <div role="region" aria-label={ariaLabel ?? label} tabIndex={0} className={`relative hidden max-h-[70dvh] min-w-0 overflow-auto focus-visible:ring-2 focus-visible:ring-ring rounded-2xl border border-border ${presentation === "wide" ? "lg:block" : "md:block"}`}>
        <table aria-label={ariaLabel ?? label} className="w-full border-collapse text-left text-sm">
          <thead className="sticky top-0 z-10 bg-background-2 text-xs font-semibold text-muted-foreground">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th key={header.id} scope="col" className="whitespace-nowrap px-3 py-3">
                    {header.isPlaceholder ? null : <table.FlexRender header={header} />}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-border">
            {table.getRowModel().rows.map((row) => (
              <tr key={rowKey?.(row.original) ?? row.id} className="transition-colors hover:bg-background-2/70">
                {row.getAllCells().map((cell) => (
                  <td key={cell.id} className="px-3 py-3.5 align-middle">
                    <table.FlexRender cell={cell} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>}
      <ul className={presentation === "cards" ? "grid gap-3 lg:grid-cols-2" : presentation === "wide" ? "grid gap-3 lg:hidden" : "grid gap-3 md:hidden"} aria-label={ariaLabel ?? label}>
        {data.map((item, index) => <li key={rowKey?.(item) ?? index}>{mobileCards(item)}</li>)}
      </ul>
    </>
  )
}
