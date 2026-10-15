"use client";
import { useId, useState, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { adSourceFormSchema, sourceFormDefaults, type AdSource, type AdSourceFormValues, type SourceOwner } from "@/lib/schemas/ad-source";
import { USE_MOCK } from "@/lib/runtime-mode";
import { createAdSource, updateAdSource } from "@/server/actions/ad-sources";

export function AdSourceDialog({ source, owners, usedCodes }: { source?: AdSource; owners: SourceOwner[]; usedCodes: string[] }) {
  const id = useId(); const router = useRouter(); const [open, setOpen] = useState(false); const [pending, start] = useTransition();
  // Draft and optimistic expectations always come from the same opening snapshot.
  const [snapshot, setSnapshot] = useState(source);
  const [search, setSearch] = useState(""); const [picker, setPicker] = useState(false); const [serverError, setServerError] = useState("");
  const schema = adSourceFormSchema.superRefine((data, ctx) => {
    if (!snapshot && data.code === "R") ctx.addIssue({ code: "custom", path: ["code"], message: "Mã R dành riêng cho RVPY. Bạn chọn mã khác." });
    if (!snapshot && usedCodes.includes(data.code)) ctx.addIssue({ code: "custom", path: ["code"], message: "Mã nguồn đã được dùng. Bạn chọn mã khác." });
    if (snapshot && data.ownerUserId !== snapshot.ownerUserId && snapshot.total > 0 && !data.confirmOwnerChange)
      ctx.addIssue({ code: "custom", path: ["confirmOwnerChange"], message: `Bạn xác nhận chuyển ${snapshot.total} hồ sơ cho người phụ trách mới.` });
  });
  const form = useForm<AdSourceFormValues>({ resolver: zodResolver(schema), mode: "onBlur", reValidateMode: "onBlur", defaultValues: sourceFormDefaults(source) });
  const owner = useWatch({ control: form.control, name: "ownerUserId" });
  const ownerName = owners.find((o) => o.id === owner)?.name ?? (owner === snapshot?.ownerUserId ? snapshot?.ownerName : null) ?? "Chưa gán";
  const changedOwner = Boolean(snapshot && owner !== snapshot.ownerUserId && snapshot.total > 0);
  const errors = form.formState.errors;
  function changeOpen(value: boolean) {
    if (pending) return;
    if (value) { setSnapshot(source); form.reset(sourceFormDefaults(source)); setServerError(""); setSearch(""); setPicker(false); }
    setOpen(value);
  }
  function chooseOwner(value: string | null) {
    form.setValue("ownerUserId", value); form.setValue("confirmOwnerChange", false); form.clearErrors("confirmOwnerChange"); setPicker(false);
  }
  const submit = form.handleSubmit((data) => {
    setServerError(""); start(async () => {
      const result = snapshot ? await updateAdSource({ ...data, id: snapshot.id,
        expectedName: snapshot.name, expectedOwnerUserId: snapshot.ownerUserId, expectedActive: snapshot.active,
        expectedLeadCount: snapshot.total }) : await createAdSource(data);
      if (!result.ok) {
        setServerError(result.error);
        for (const [key, messages] of Object.entries(result.fieldErrors ?? {})) if (key in sourceFormDefaults())
          form.setError(key as keyof AdSourceFormValues, { message: messages?.[0] ?? "Bạn kiểm tra thông tin này." }, { shouldFocus: true });
        toast.error(result.error); return;
      }
      toast.success(`Đã lưu nguồn ${data.code}`); setOpen(false); router.refresh();
    });
  });
  return <Dialog open={open} onOpenChange={changeOpen}><DialogTrigger asChild><Button className="min-h-11" variant={source ? "outline" : "default"}>{source ? "Sửa nguồn" : "Thêm nguồn"}</Button></DialogTrigger>
    <DialogContent className="[&_button[aria-label]]:min-h-11 [&_button[aria-label]]:min-w-11 max-sm:inset-0 max-sm:h-dvh max-sm:max-h-dvh max-sm:w-full max-sm:max-w-none max-sm:translate-x-0 max-sm:translate-y-0 max-sm:content-start max-sm:rounded-none">
      <DialogHeader><DialogTitle>{snapshot ? `Sửa nguồn ${snapshot.code}` : "Thêm nguồn"}</DialogTitle><DialogDescription>Mã nguồn giữ nguyên sau khi tạo. Người phụ trách chỉ xem hồ sơ thuộc nguồn được gán.</DialogDescription></DialogHeader>
      <form className="grid content-start gap-4" noValidate onSubmit={submit}>
        <div><Label htmlFor={`${id}-code`}>Mã nguồn</Label><Input {...form.register("code")} id={`${id}-code`} className="mt-2 font-mono" readOnly={Boolean(snapshot)} maxLength={1} autoCapitalize="characters"
          onChange={(event) => form.setValue("code", event.target.value.toUpperCase(), { shouldDirty: true })} aria-invalid={Boolean(errors.code)} aria-describedby={`${id}-code-error`} />
          {errors.code && <p id={`${id}-code-error`} className="mt-1 text-sm text-destructive">{errors.code.message}</p>}</div>
        <div><Label htmlFor={`${id}-name`}>Tên nguồn</Label><Input {...form.register("name")} id={`${id}-name`} className="mt-2" maxLength={120} aria-invalid={Boolean(errors.name)} aria-describedby={`${id}-name-error`} />
          {errors.name && <p id={`${id}-name-error`} className="mt-1 text-sm text-destructive">{errors.name.message}</p>}</div>
        <div><Label htmlFor={`${id}-owner`}>Người phụ trách</Label><Popover open={picker} onOpenChange={setPicker}><PopoverTrigger asChild><Button id={`${id}-owner`} variant="outline" type="button" className="mt-2 min-h-11 w-full justify-start truncate" title={ownerName} aria-describedby={`${id}-owner-error`}>{ownerName}</Button></PopoverTrigger>
          <PopoverContent aria-label="Chọn người phụ trách"><Label htmlFor={`${id}-search`}>Tìm người tư vấn</Label><Input id={`${id}-search`} className="mt-2" value={search} onChange={(e) => setSearch(e.target.value)} /><div className="mt-2 grid gap-1"><Button type="button" variant="ghost" className="min-h-11 justify-start" onClick={() => chooseOwner(null)}>Chưa gán</Button>
            {owners.filter((o) => `${o.name} ${o.email}`.toLocaleLowerCase("vi").includes(search.toLocaleLowerCase("vi"))).map((o) => <Button type="button" key={o.id} variant="ghost" className="min-h-11 h-auto flex-col items-start whitespace-normal py-2 text-left" onClick={() => chooseOwner(o.id)}><span className="break-words">{o.name}</span><span className="break-all text-xs text-muted-foreground">{o.email}</span></Button>)}</div></PopoverContent></Popover>
          {errors.ownerUserId && <p id={`${id}-owner-error`} className="mt-1 text-sm text-destructive">{errors.ownerUserId.message}</p>}</div>
        {snapshot && <p className="text-sm text-muted-foreground">Đổi người phụ trách sẽ chuyển {snapshot.total} hồ sơ hiện có sang phạm vi xem của người mới.</p>}
        {changedOwner && <div><label className="flex min-h-11 items-start gap-3 text-sm"><input {...form.register("confirmOwnerChange")} id={`${id}-confirm`} type="checkbox" className="mt-1 size-5 accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" aria-describedby={`${id}-confirm-error`} />Tôi xác nhận chuyển {snapshot!.total} hồ sơ.</label>{errors.confirmOwnerChange && <p id={`${id}-confirm-error`} className="text-sm text-destructive">{errors.confirmOwnerChange.message}</p>}</div>}
        {!snapshot && <label className="flex min-h-11 items-center gap-3 text-sm"><input {...form.register("active")} type="checkbox" className="size-5 accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" />Cho phép nguồn nhận học viên</label>}
        {USE_MOCK && <p className="text-sm text-muted-foreground">Chế độ xem thử chưa lưu thay đổi.</p>}
        {serverError && <p role="alert" className="text-sm text-destructive">{serverError}</p>}
        <Button type="submit" className="min-h-11" disabled={pending || USE_MOCK}>{pending ? "Đang lưu nguồn…" : "Lưu nguồn"}</Button>
      </form>
    </DialogContent></Dialog>;
}
