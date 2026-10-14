"use client";

import { useState, useTransition } from "react";
import { ArrowUpRight, Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { renewZaloSignupCode } from "@/server/actions/signup-zalo";

export function ZaloBotLinkCard({ token: initialToken, connected: initialConnected = false }: { token: string | null; connected?: boolean }) {
  const [token, setToken] = useState(initialToken);
  const [connected, setConnected] = useState(initialConnected);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  async function copyToken() {
    if (!token) return;
    try {
      await navigator.clipboard.writeText(token);
      setCopied(true);
      setCopyFailed(false);
    } catch {
      setCopied(false);
      setCopyFailed(true);
    }
  }
  const botUrl = process.env.NEXT_PUBLIC_ZALO_BOT_URL;
  function renew() {
    startTransition(async () => {
      try {
        const result = await renewZaloSignupCode();
        if (!result.ok) { setError(result.error); return; }
        setToken(result.data.token); setConnected(result.data.connected); setCopied(false); setCopyFailed(false); setError(null);
      } catch { setError("Chưa thể lấy mã mới. Bạn thử lại sau nhé."); }
    });
  }

  if (connected) return <p role="status" className="border border-primary/30 bg-primary-soft p-2.5 text-sm">Đã kết nối Bot RVPY. Hướng dẫn sẽ được gửi trong cuộc trò chuyện này.</p>;

  return (
    <div className="grid gap-1.5 border border-primary/30 bg-primary-soft p-2.5 sm:p-3">
      <div className="grid gap-0.5">
        <p className="text-[13px] font-medium">Nhận hướng dẫn tự động trên Zalo</p>
        <p className="text-xs text-muted-foreground">
          Mở Bot, dán mã đã sao chép vào ô chat rồi gửi.
        </p>
      </div>
      {token && botUrl ? (
        <Button asChild size="sm" className="w-full sm:w-fit">
          <a href={botUrl} target="_blank" rel="noopener noreferrer" onClick={() => void copyToken()}>
            {copied ? <Check aria-hidden className="size-4" /> : <Copy aria-hidden className="size-4" />}
            {copied ? "Đã sao chép · Mở Bot RVPY" : "Sao chép mã và mở Bot RVPY"}
            <ArrowUpRight aria-hidden className="size-4" />
          </a>
        </Button>
      ) : token ? (
        <Button type="button" className="w-full sm:w-fit" onClick={() => void copyToken()}>
          <Copy aria-hidden className="size-4" />
          {copied ? "Đã sao chép mã" : "Sao chép mã kết nối"}
        </Button>
      ) : <p className="text-xs text-muted-foreground">Mã đã hết hạn hoặc không còn trên trình duyệt.</p>}
      {copied ? (
        <p role="status" className="text-[11px] text-muted-foreground">Đã sao chép. Dán vào Zalo rồi gửi.</p>
      ) : null}
      {copyFailed ? (
        <p role="status" className="text-[11px] text-destructive">Không sao chép được? Mở phần mã dự phòng bên dưới.</p>
      ) : null}
      {token && <details className="text-xs text-muted-foreground">
        <summary className="w-fit cursor-pointer underline underline-offset-4">Không sao chép được? Xem mã gửi Bot</summary>
        <div className="mt-1.5 grid gap-1.5">
          <code className="max-w-full break-all rounded border border-border bg-background px-2 py-1 font-mono">{token}</code>
          <Button type="button" size="sm" variant="outline" className="w-fit" onClick={() => void copyToken()}>
            <Copy aria-hidden className="size-4" />
            Sao chép mã dự phòng
          </Button>
        </div>
      </details>}
      {!token ? (
        <Button type="button" size="sm" variant="outline" className="w-fit" disabled={pending} onClick={renew}>
          {pending ? "Đang lấy mã…" : "Lấy mã kết nối mới"}
        </Button>
      ) : null}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <p className="text-[11px] text-muted-foreground">Mã dùng một lần · hết hạn sau 30 phút.</p>
    </div>
  );
}
