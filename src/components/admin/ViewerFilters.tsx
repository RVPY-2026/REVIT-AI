"use client";
import { useId, useState, useTransition, type ReactNode } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from "@/components/ui/sheet";
import { AUDIT_ACTIONS, AUDIT_ENTITIES } from "@/lib/audit-labels";
import { viewerFormSchema, type ViewerFilter, type ViewerFormValues } from "@/lib/schemas/admin-viewers";
type ViewerFiltersProps =
  | { filter: ViewerFilter; audit?: boolean; children?: never }
  | { children: (prefix: string) => ReactNode; count: number; title: string; description: string; filter?: never };

/** URL-backed viewer filters or controlled domain fields with the same mobile shell. */
export function ViewerFilters(props: ViewerFiltersProps) {
  if (props.children) return <ControlledViewerFilters {...props} />;
  return <ViewerFilterForm key={JSON.stringify(props.filter)} filter={props.filter} audit={props.audit ?? false} />;
}

function ControlledViewerFilters({ children, count, title, description }: Extract<ViewerFiltersProps, { children: unknown }>) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <>
      <div className="hidden gap-4 md:col-span-2 md:grid md:grid-cols-2">
        {children(`${id}-desktop`)}
      </div>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button type="button" variant="outline" className="min-h-11 md:hidden">
            Bộ lọc ({count})
          </Button>
        </SheetTrigger>
        <SheetContent side="bottom">
          <SheetHeader>
            <SheetTitle>{title}</SheetTitle>
            <SheetDescription>{description}</SheetDescription>
          </SheetHeader>
          <div className="grid gap-4 p-4">
            {children(`${id}-mobile`)}
            <Button variant="outline" onClick={() => setOpen(false)}>
              Xem kết quả
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
function ViewerFilterForm({ filter, audit }: { filter: ViewerFilter; audit: boolean }) {
  const [open, setOpen] = useState(false); const [pending, start] = useTransition();
  const form = useForm<ViewerFormValues>({ resolver: zodResolver(viewerFormSchema), mode: "onBlur", reValidateMode: "onBlur",
    defaultValues: { actor: filter.actor ?? "", search: filter.search ?? "", action: filter.action ?? "", entity: filter.entity ?? "", status: filter.status ?? "", from: filter.from ?? "", to: filter.to ?? "" } });
  const { action = "", status = "", entity = "" } = useWatch({ control: form.control });
  const setAction = (value: string) => form.setValue("action", value);
  const setStatus = (value: ViewerFormValues["status"]) => form.setValue("status", value);
  const setEntity = (value: string) => form.setValue("entity", value);
  const error = form.formState.errors.to?.message;
  const router = useRouter(); const path = usePathname();
  const count = Object.entries(filter).filter(([k, v]) => k !== "page" && v).length;
  function quick(days: number) {
    const today = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Ho_Chi_Minh" }).format(new Date());
    form.setValue("to", today); form.setValue("from", new Date(new Date(`${today}T12:00:00+07:00`).getTime() - (days - 1) * 86400000).toISOString().slice(0, 10));
  }
  const content = <form className="grid gap-4" noValidate onSubmit={form.handleSubmit((data) => {
    const p = new URLSearchParams(); for (const [k, v] of Object.entries(data)) if (v) p.set(k, String(v));
    start(() => router.push(`${path}?${p}`, { scroll: false })); setOpen(false);
  })}>
    {audit && <><div><Label htmlFor="actor">Người thực hiện</Label><Input {...form.register("actor")} id="actor" maxLength={100} className="mt-2" /></div>
      <div><Label>Hành động</Label><Popover><PopoverTrigger asChild><Button type="button" variant="outline" className="mt-2 min-h-11 w-full justify-start truncate">{AUDIT_ACTIONS[action]?.label ?? (action || "Tất cả hành động")}</Button></PopoverTrigger>
        <PopoverContent aria-label="Chọn hành động"><div className="grid gap-1"><Button type="button" variant="ghost" onClick={() => setAction("")}>Tất cả hành động</Button>{Array.from(new Set(Object.values(AUDIT_ACTIONS).map((v) => v.group))).map((group) => <div key={group}><p className="px-3 py-2 text-xs text-muted-foreground">{group}</p>{Object.entries(AUDIT_ACTIONS).filter(([, v]) => v.group === group).map(([key, v]) => <Button key={key} variant={action === key ? "outline" : "ghost"} className="min-h-11 w-full justify-start whitespace-normal text-left" onClick={() => setAction(key)}>{v.label}</Button>)}</div>)}</div></PopoverContent></Popover></div>
      <div><Label htmlFor="entity">Loại hồ sơ</Label><Popover><PopoverTrigger asChild><Button type="button" id="entity" variant="outline" className="mt-2 min-h-11 w-full justify-start">{Object.hasOwn(AUDIT_ENTITIES, entity) ? AUDIT_ENTITIES[entity] : (entity || "Tất cả hồ sơ")}</Button></PopoverTrigger><PopoverContent aria-label="Chọn loại hồ sơ"><div className="grid gap-1"><Button type="button" variant="ghost" onClick={() => setEntity("")}>Tất cả hồ sơ</Button>{Object.entries(AUDIT_ENTITIES).map(([value, text]) => <Button type="button" key={value} variant="ghost" className="min-h-11 justify-start" onClick={() => setEntity(value)}>{text}</Button>)}</div></PopoverContent></Popover></div>
      <div><Label htmlFor="search">Tìm mã hồ sơ</Label><Input {...form.register("search")} id="search" maxLength={100} className="mt-2" /></div></>}
    {!audit && <div><Label>Trạng thái</Label><Popover><PopoverTrigger asChild><Button type="button" variant="outline" className="mt-2 min-h-11 w-full justify-start">{{ "": "Tất cả trạng thái", pending: "Chờ gửi", sent: "Đã gửi", failed: "Lỗi" }[status]}</Button></PopoverTrigger><PopoverContent aria-label="Chọn trạng thái"><div className="grid gap-1">{[["", "Tất cả trạng thái"], ["pending", "Chờ gửi"], ["sent", "Đã gửi"], ["failed", "Lỗi"]].map(([value, text]) => <Button key={value} variant="ghost" className="min-h-11 justify-start" onClick={() => setStatus(value as typeof status)}>{text}</Button>)}</div></PopoverContent></Popover></div>}
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><div><Label htmlFor="from">Từ ngày</Label><Input {...form.register("from")} id="from" type="date" className="mt-2 min-w-0" /></div>
      <div><Label htmlFor="to">Đến ngày</Label><Input {...form.register("to")} id="to" type="date" className="mt-2 min-w-0" aria-invalid={Boolean(error)} aria-describedby="viewer-date-error" />{error && <p id="viewer-date-error" role="alert" className="mt-1 text-sm text-destructive">{error}</p>}</div></div>
    <div className="flex flex-wrap gap-2">{[[1, "Hôm nay"], [7, "7 ngày"], [30, "30 ngày"]].map(([days, label]) => <Button key={days} type="button" variant="ghost" className="min-h-11" onClick={() => quick(Number(days))}>{label}</Button>)}</div>
    <div className="flex flex-wrap gap-2"><Button variant="outline" type="submit" disabled={pending} className="min-h-11">{pending ? "Đang lọc…" : "Lọc danh sách"}</Button><Button type="button" variant="ghost" onClick={() => { form.reset({ actor: "", search: "", action: "", entity: "", status: "", from: "", to: "" }); start(() => router.push(path, { scroll: false })); setOpen(false); }}>Xóa bộ lọc</Button></div>
  </form>;
  return <div className="mt-6"><Button type="button" variant="outline" className="min-h-11" onClick={() => setOpen(!open)} aria-expanded={open}>Bộ lọc ({count})</Button>{open && <div className="mt-3 max-w-xl rounded-2xl border bg-card p-4">{content}</div>}</div>;
}
