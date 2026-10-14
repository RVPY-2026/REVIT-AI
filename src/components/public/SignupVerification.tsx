"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";

type Turnstile = {
  render: (container: HTMLElement, options: { sitekey: string; action: string; size: string; theme: string;
    callback: (token: string) => void; "expired-callback": () => void; "error-callback": () => void }) => string;
  remove: (id: string) => void;
};

export function SignupVerification({ onToken, resetKey, preview = false }: {
  onToken: (token: string) => void; resetKey: number; preview?: boolean;
}) {
  const container = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const sitekey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  useEffect(() => {
    const api = (window as typeof window & { turnstile?: Turnstile }).turnstile;
    if (!ready || !container.current || !api || !sitekey || preview) return;
    const id = api.render(container.current, { sitekey, action: "lead-signup", size: "flexible", theme: "auto",
      callback: (token) => { setFailed(false); onToken(token); },
      "expired-callback": () => onToken(""), "error-callback": () => { onToken(""); setFailed(true); },
    });
    return () => { api.remove(id); };
  }, [ready, sitekey, onToken, resetKey, preview]);

  if (preview) return <p className="rounded-lg border border-border p-3 text-sm text-muted-foreground">Xác minh đăng ký · Khu vực kiểm tra trước khi gửi.</p>;
  if (!sitekey) return process.env.NODE_ENV === "production"
    ? <p role="status" className="text-sm text-muted-foreground">Đăng ký trực tuyến chưa sẵn sàng. Bạn liên hệ RVPY qua Zalo nhé.</p> : null;
  return <div className="grid min-w-0 gap-2">
    <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" strategy="afterInteractive"
      onReady={() => setReady(true)} onError={() => { onToken(""); setFailed(true); }} />
    <div ref={container} aria-label="Xác minh đăng ký" />
    {failed && <p role="alert" className="text-sm text-destructive">Chưa tải được xác minh. Bạn tải lại trang hoặc liên hệ RVPY qua Zalo nhé.</p>}
  </div>;
}
