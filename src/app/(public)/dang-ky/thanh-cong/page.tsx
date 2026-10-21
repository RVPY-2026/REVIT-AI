import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { cookies } from "next/headers";
import { format } from "date-fns";
import { ArrowUpRight } from "lucide-react";
import { TitleBlock } from "@/components/layout/TitleBlock";
import { Button } from "@/components/ui/button";
import { ZaloBotLinkCard } from "@/components/public/ZaloBotLinkCard";
import { ZALO_GROUPS, ZALO_REGISTRATION_CONTACT } from "@/lib/constants";
import { USE_MOCK } from "@/lib/runtime-mode";
import { SIGNUP_COOKIE, ZALO_LINK_COOKIE, getSignupZaloState } from "@/server/signup-session";

export const metadata: Metadata = {
  title: "Đăng ký học thử",
  robots: { index: false, follow: false },
};

export default function SignupSuccessPage({
  searchParams,
}: PageProps<"/dang-ky/thanh-cong">) {
  return (
    <Suspense
      fallback={
        <div className="content py-20">Đang tải thông tin đăng ký…</div>
      }
    >
      <Confirmation searchParams={searchParams} />
    </Suspense>
  );
}

async function Confirmation({
  searchParams,
}: Pick<PageProps<"/dang-ky/thanh-cong">, "searchParams">) {
  await connection(); // Session expiry and the sheet date are request-time.
  const { code, uiPreview } = await searchParams;
  const cookieStore = await cookies();
  const showZaloPreview =
    (process.env.NODE_ENV === "development" || process.env.VERCEL_ENV === "preview") && uiPreview === "zalo";
  const botState = showZaloPreview
    ? { token: "R2610008-7K4M-9Q2P", connected: false }
    : !USE_MOCK && typeof code === "string"
      ? await getSignupZaloState(cookieStore.get(SIGNUP_COOKIE)?.value, cookieStore.get(ZALO_LINK_COOKIE)?.value, code)
      : null;
  const validCode =
    typeof code === "string" && /^[A-Z]\d{2}(0[1-9]|1[0-2])\d{3}$/.test(code);
  const notes = [
    {
      label: `Kết bạn Zalo ${ZALO_REGISTRATION_CONTACT.label} (${ZALO_REGISTRATION_CONTACT.phone})`,
      href: ZALO_REGISTRATION_CONTACT.href,
      span: true,
    },
    ...ZALO_GROUPS.map((g) => ({ label: `Tham gia ${g.label}`, href: g.href, span: false })),
  ];
  return (
    <section className="content grid min-h-[calc(100svh-4.25rem)] place-items-center py-2 sm:py-4">
      {/* A drawing sheet: double border, notes with leader bubbles, title block, approval stamp.
          Two columns from md up so the whole sheet fits one screen without scrolling. */}
      <div className="relative mx-auto w-full max-w-4xl border-2 border-foreground/40 bg-card p-1.5">
        <div className="relative grid gap-x-8 gap-y-3 border border-foreground/40 p-3.5 sm:gap-y-4 sm:p-6 md:grid-cols-2 md:gap-y-3 md:p-5">
          <div className="flex items-center justify-between gap-3 md:col-span-2">
            <p className="font-mono text-[12px] tracking-[.08em] text-muted-foreground uppercase">
              Tờ 01<span className="hidden sm:inline"> · Xác nhận đăng ký</span>
            </p>
            {validCode ? (
              <span
                aria-label="Đã tiếp nhận"
                className="shrink-0 -rotate-3 border border-primary px-2 py-0.5 font-mono text-[10px] font-medium tracking-[.08em] text-primary uppercase duration-500 animate-in fade-in zoom-in-150 sm:text-[12px]"
              >
                Đã tiếp nhận
              </span>
            ) : null}
          </div>

          <div className="grid content-start gap-2">
            <h1 className="max-w-[24ch] text-[24px] leading-tight font-light sm:text-[28px]">
              {validCode ? "Cảm ơn bạn đã đăng ký!" : "Tham gia học thử cùng RVPY"}
            </h1>
            {validCode ? (
              <p className="text-[15px] text-muted-foreground">
                Kết bạn Zalo RVPY và tham gia hai nhóm cộng đồng bên cạnh để nhận
                hướng dẫn học thử.
              </p>
            ) : (
              <p className="text-[15px] text-muted-foreground">
                Bạn cần điền form đăng ký để nhận mã học viên và được RVPY liên hệ
                hướng dẫn.
              </p>
            )}
            {validCode ? (
              <TitleBlock
                className="md:mt-2"
                rows={[
                  ["Mã học viên", code],
                  ["Ngày", format(new Date(), "dd/MM/yyyy")],
                ]}
              />
            ) : null}
          </div>

          <div className="grid content-start gap-2 md:mt-0">
            <ol aria-label="Ghi chú" className="relative grid gap-2 md:grid-cols-2">
              {/* Leader line joining the note bubbles */}
              <span
                aria-hidden
                className="absolute top-4 bottom-4 left-[26px] border-l border-dashed border-foreground/30 md:hidden"
              />
              {notes.map((n, i) => (
                <li key={n.href} className={`relative ${n.span ? "md:col-span-2" : ""}`}>
                  <a
                    href={n.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group grid grid-cols-[auto_1fr_auto] items-center gap-2 border border-foreground/40 bg-card py-1.5 pr-3 pl-2 transition-colors hover:border-primary hover:bg-primary-soft focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
                  >
                    <span
                      aria-hidden
                      className="relative grid size-7 shrink-0 place-items-center rounded-full border border-primary bg-background font-mono text-[12px] text-primary"
                    >
                      {i + 1}
                    </span>
                    <span className="text-[13px] leading-snug font-medium sm:text-[14px]">
                      {n.label}
                    </span>
                    <ArrowUpRight
                      aria-hidden
                      className="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary"
                    />
                  </a>
                </li>
              ))}
            </ol>
            <p className="text-[12px] text-muted-foreground sm:text-[13px]">
              Tham gia hai nhóm, rồi gửi mã học viên cho người tư vấn.
            </p>
            {validCode && botState ? (
              <div className="grid gap-1.5">
                {showZaloPreview ? (
                  <p className="text-[11px] text-muted-foreground">
                    Xem thử giao diện · mã mẫu, không kết nối Bot thật.
                  </p>
                ) : null}
                <ZaloBotLinkCard token={botState.token} connected={botState.connected} />
              </div>
            ) : null}
            {!validCode ? (
              <Button asChild variant="ghost" className="-ml-5.5 w-fit">
                <Link href="/dang-ky">Điền form đăng ký</Link>
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
