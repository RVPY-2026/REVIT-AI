"use client";

import { useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { FEEDBACK_KINDS, FEEDBACK_KIND_LABELS, feedbackSchema, type FeedbackInput } from "@/lib/schemas/student-area";
import { submitFeedback } from "@/server/actions/student-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

/** Course or add-in feedback; the server attaches it to the signed-in student. */
export function FeedbackForm() {
  const [pending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const form = useForm<FeedbackInput>({
    resolver: zodResolver(feedbackSchema),
    defaultValues: { kind: "course", body: "", score: undefined },
  });
  const errors = form.formState.errors;

  function submit(values: FeedbackInput) {
    setServerError(null);
    startTransition(async () => {
      try {
        const result = await submitFeedback(values);
        if (!result.ok) {
          setServerError(result.error);
          toast.error(result.error);
          return;
        }
        form.reset({ kind: values.kind, body: "", score: undefined });
        toast.success("Đã gửi góp ý. Cảm ơn bạn!");
      } catch {
        const message = "Chưa thể gửi góp ý. Bạn thử lại sau nhé.";
        setServerError(message);
        toast.error(message);
      }
    });
  }

  return (
    <form className="grid gap-4" onSubmit={form.handleSubmit(submit)}>
      <fieldset className="grid gap-2">
        <legend className="mb-1 text-sm font-medium">Góp ý về</legend>
        <div className="flex flex-wrap gap-2">
          {FEEDBACK_KINDS.map((kind) => (
            <label key={kind} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-[10px] border border-border px-4 text-sm has-checked:border-primary has-checked:bg-primary-soft has-focus-visible:ring-3 has-focus-visible:ring-ring/40">
              <input type="radio" value={kind} className="accent-primary" {...form.register("kind")} />
              {FEEDBACK_KIND_LABELS[kind]}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="grid gap-2">
        <Label htmlFor="feedback-body">Nội dung góp ý</Label>
        <Textarea id="feedback-body" rows={5} maxLength={2000} placeholder="Điều bạn thấy tốt, điều cần cải thiện hoặc lỗi bạn gặp…"
          aria-invalid={Boolean(errors.body)} aria-describedby={errors.body ? "feedback-body-error" : undefined} {...form.register("body")} />
        {errors.body ? <p id="feedback-body-error" className="text-sm text-destructive">{errors.body.message}</p> : null}
      </div>
      <div className="grid max-w-40 gap-2">
        <Label htmlFor="feedback-score">Điểm hài lòng (1–10)</Label>
        <Input id="feedback-score" type="number" inputMode="numeric" min={1} max={10} step={1} className="font-mono tabular-nums"
          aria-invalid={Boolean(errors.score)} {...form.register("score", { setValueAs: (value) => value === "" || value == null ? undefined : Number(value) })} />
        {errors.score ? <p className="text-sm text-destructive">{errors.score.message}</p> : null}
      </div>
      {serverError ? <p className="text-sm text-destructive">{serverError}</p> : null}
      <div>
        <Button type="submit" disabled={pending}>{pending ? "Đang gửi…" : "Gửi góp ý"}</Button>
      </div>
    </form>
  );
}
