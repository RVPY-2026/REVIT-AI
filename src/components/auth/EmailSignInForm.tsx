"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { MailCheck } from "lucide-react";
import { useState } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  emailSignInSchema,
  type EmailSignInInput,
} from "@/lib/schemas/email-sign-in";
import { createClient } from "@/lib/supabase/client";

export function EmailSignInForm({ next }: { next?: string }) {
  const [sentTo, setSentTo] = useState<string>();
  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState<string>();
  const [resendError, setResendError] = useState<string>();
  const {
    register,
    handleSubmit,
    setError,
    clearErrors,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<EmailSignInInput, unknown, z.output<typeof emailSignInSchema>>({
    resolver: zodResolver(emailSignInSchema),
    defaultValues: { email: "" },
  });

  const onSubmit: SubmitHandler<z.output<typeof emailSignInSchema>> = async ({
    email,
  }) => {
    clearErrors("root");
    try {
      await sendLink(email);
      setSentTo(email);
    } catch {
      setError("root", {
        message:
          "Chưa gửi được link đăng nhập. Bạn kiểm tra email rồi thử lại sau nhé.",
      });
    }
  };

  async function sendLink(email: string) {
    const callback = new URL("/auth/callback", window.location.origin);
    if (next) callback.searchParams.set("next", next);
    const { error } = await createClient().auth.signInWithOtp({
      email,
      options: { emailRedirectTo: callback.href },
    });
    if (error) throw error;
  }

  async function resendLink() {
    if (!sentTo) return;
    setResending(true);
    setResendMessage(undefined);
    setResendError(undefined);
    try {
      await sendLink(sentTo);
      setResendMessage("Link mới đã được gửi. Bạn kiểm tra hộp thư nhé.");
    } catch {
      setResendError(
        "Chưa gửi lại được link. Bạn đợi một chút rồi thử lại nhé.",
      );
    } finally {
      setResending(false);
    }
  }

  if (sentTo) {
    return (
      <section className="grid gap-5 text-center" aria-live="polite">
        <div className="mx-auto grid size-14 place-items-center rounded-xl bg-primary-soft text-primary">
          <MailCheck aria-hidden="true" className="size-7" strokeWidth={1.75} />
        </div>
        <div className="grid gap-2">
          <h2 className="font-heading text-[21px] font-medium">
            Kiểm tra email của bạn
          </h2>
          <p className="text-sm text-muted-foreground">
            Link đăng nhập đã được gửi tới
          </p>
          <p className="break-all font-medium">{sentTo}</p>
        </div>
        <p className="text-sm text-muted-foreground">
          Mở email và bấm vào link để tiếp tục. Nếu chưa thấy thư, hãy kiểm tra
          mục thư rác.
        </p>
        {resendMessage ? (
          <p role="status" className="text-sm text-success">
            {resendMessage}
          </p>
        ) : null}
        {resendError ? (
          <p role="alert" className="text-sm text-destructive">
            {resendError}
          </p>
        ) : null}
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={resendLink}
          disabled={resending}
          aria-busy={resending}
        >
          {resending ? "Đang gửi lại link…" : "Gửi lại link"}
        </Button>
        <button
          type="button"
          className="justify-self-center text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
          onClick={() => {
            setValue("email", sentTo);
            setSentTo(undefined);
            setResendMessage(undefined);
            setResendError(undefined);
          }}
        >
          Đổi email
        </button>
      </section>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-3">
      <div className="grid gap-2">
        <Label htmlFor="sign-in-email">Email</Label>
        <Input
          id="sign-in-email"
          type="email"
          autoComplete="email"
          inputMode="email"
          maxLength={254}
          placeholder="ban@gmail.com"
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? "sign-in-email-error" : undefined}
          disabled={isSubmitting}
          {...register("email")}
        />
        {errors.email ? (
          <p id="sign-in-email-error" role="alert" className="text-sm text-destructive">
            {errors.email.message}
          </p>
        ) : null}
      </div>
      {errors.root?.message ? (
        <p role="alert" className="text-sm text-destructive">
          {errors.root.message}
        </p>
      ) : null}
      <Button
        type="submit"
        variant="outline"
        className="w-full"
        disabled={isSubmitting}
        aria-busy={isSubmitting}
      >
        {isSubmitting ? "Đang gửi link…" : "Gửi link đăng nhập qua email"}
      </Button>
    </form>
  );
}
