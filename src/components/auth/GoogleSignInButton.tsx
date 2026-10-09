"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

export function GoogleSignInButton({ next }: { next?: string }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  async function signIn() {
    setPending(true);
    setError(undefined);
    try {
      const callback = new URL("/auth/callback", window.location.origin);
      if (next) callback.searchParams.set("next", next);
      const { error } = await createClient().auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: callback.href },
      });
      if (error) throw error;
    } catch {
      setError("Chưa thể đăng nhập bằng Google. Bạn thử lại sau nhé.");
      setPending(false);
    }
  }
  return (
    <div className="grid gap-3">
      <Button
        onClick={signIn}
        disabled={pending}
        aria-busy={pending}
        className="w-full"
      >
        {pending ? "Đang mở Google…" : "Đăng nhập bằng Google"}
      </Button>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
