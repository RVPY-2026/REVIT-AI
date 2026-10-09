"use client";

import { zodResolver } from "@hookform/resolvers/zod";
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
  const {
    register,
    handleSubmit,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<EmailSignInInput, unknown, z.output<typeof emailSignInSchema>>({
    resolver: zodResolver(emailSignInSchema),
    defaultValues: { email: "" },
  });

  const onSubmit: SubmitHandler<z.output<typeof emailSignInSchema>> = async ({
    email,
  }) => {
    setSentTo(undefined);
    clearErrors("root");
    try {
      const callback = new URL("/auth/callback", window.location.origin);
      if (next) callback.searchParams.set("next", next);
      const { error } = await createClient().auth.signInWithOtp({
        email,
        options: { emailRedirectTo: callback.href },
      });
      if (error) throw error;
      setSentTo(email);
    } catch {
      setError("root", {
        message:
          "Chưa gửi được link đăng nhập. Bạn kiểm tra email rồi thử lại sau nhé.",
      });
    }
  };

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
      {sentTo ? (
        <p role="status" className="text-sm text-success">
          Nếu email này có thể đăng nhập, link đã được gửi đến {sentTo}. Hãy
          kiểm tra hộp thư và thư rác.
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
