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
  tabletCards = false,
  cardsOnly = false,
  listLabel = "Danh sách học viên",
}: {
  columns: Array<DataTableColumn<TData>>
  data: TData[]
  mobileCards: (item: TData) => ReactNode
  rowKey?: (item: TData) => string
  tabletCards?: boolean
  cardsOnly?: boolean
  listLabel?: string
}) {
  const table = useTable({ features: dataTableFeatures, columns, data })

  return (
    <>
      {!cardsOnly && <div className={tabletCards ? "hidden overflow-x-auto rounded-2xl border border-border lg:block" : "hidden overflow-x-auto rounded-2xl border border-border md:block"}>
        <table className="w-full border-collapse text-left text-sm">
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
      <ul className={cardsOnly ? "grid gap-3 lg:grid-cols-2" : tabletCards ? "grid gap-3 lg:hidden" : "grid gap-3 md:hidden"} aria-label={listLabel}>
        {data.map((item, index) => <li key={rowKey?.(item) ?? index}>{mobileCards(item)}</li>)}
      </ul>
    </>
  )
}
