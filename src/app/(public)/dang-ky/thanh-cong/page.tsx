import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { format } from "date-fns";
import { ArrowUpRight } from "lucide-react";
import { TitleBlock } from "@/components/layout/TitleBlock";
import { Button } from "@/components/ui/button";
import { ZALO_GROUPS, ZALO_REGISTRATION_CONTACT } from "@/lib/constants";

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
  const { code } = await searchParams;
  await connection(); // the sheet date is request-time
  const validCode =
    typeof code === "string" && /^[A-Z]\d{2}(0[1-9]|1[0-2])\d{3}$/.test(code);
  const notes = [
    {
      label: `Kết bạn Zalo ${ZALO_REGISTRATION_CONTACT.label} (${ZALO_REGISTRATION_CONTACT.phone})`,
      href: ZALO_REGISTRATION_CONTACT.href,
    },
    ...ZALO_GROUPS.map((g) => ({ label: `Tham gia ${g.label}`, href: g.href })),
  ];
  return (
    <section className="content grid min-h-[calc(100svh-4.25rem)] place-items-center py-2 sm:py-6">
      {/* A drawing sheet: double border, notes with leader bubbles, title block, approval stamp.
          Two columns from md up so the whole sheet fits one screen without scrolling. */}
      <div className="relative mx-auto w-full max-w-4xl border-2 border-foreground/40 bg-card p-1.5">
        <div className="relative grid gap-x-10 gap-y-3 border border-foreground/40 p-3.5 sm:gap-y-4 sm:p-6 md:grid-cols-2 md:p-8">
          <p className="font-mono text-[12px] tracking-[.08em] text-muted-foreground uppercase md:col-span-2">
            Tờ 01<span className="hidden sm:inline"> · Xác nhận đăng ký</span>
          </p>
          {validCode ? (
            <div
              aria-label="Đã tiếp nhận"
              className="absolute top-3 right-3 -rotate-6 border-2 border-primary px-2.5 py-0.5 font-mono text-[13px] font-medium tracking-[.08em] text-primary uppercase duration-500 animate-in fade-in zoom-in-150 sm:top-5 sm:right-6 sm:px-3 sm:py-1 sm:text-[18px]"
            >
              Đã tiếp nhận
            </div>
          ) : null}

          <div className="grid content-start gap-2.5 sm:gap-3">
            <h1 className="max-w-[16ch] text-[24px] leading-tight font-light sm:text-[40px]">
              {validCode ? "Cảm ơn bạn đã đăng ký!" : "Tham gia học thử cùng RVPY"}
            </h1>
            {validCode ? (
              <p className="text-[15px] text-muted-foreground">
                Để nhận hướng dẫn học thử, bạn hãy kết bạn với Zalo RVPY Ocean Studio
                rồi tham gia hai nhóm cộng đồng bên cạnh.
                <span className="hidden sm:inline">
                  {" "}Đây là các bước hướng dẫn sau đăng ký, bạn không cần xác nhận
                  trước khi gửi form.
                </span>
              </p>
            ) : (
              <p className="text-[15px] text-muted-foreground">
                Bạn cần điền form đăng ký để nhận mã học viên và được RVPY liên hệ
                hướng dẫn.
              </p>
            )}
            {validCode ? (
              <TitleBlock
                className="md:mt-6"
                rows={[
                  ["Mã học viên", code],
                  ["Ngày", format(new Date(), "dd/MM/yyyy")],
                ]}
              />
            ) : null}
          </div>

          <div className="grid content-start gap-2.5 md:mt-10">
            <ol aria-label="Ghi chú" className="relative grid gap-2">
              {/* Leader line joining the note bubbles */}
              <span
                aria-hidden
                className="absolute top-4 bottom-4 left-[26px] border-l border-dashed border-foreground/30"
              />
              {notes.map((n, i) => (
                <li key={n.href} className="relative">
                  <a
                    href={n.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group grid grid-cols-[auto_1fr_auto] items-center gap-3 border border-foreground/40 bg-card py-2 pr-4 pl-2.5 transition-colors hover:border-primary hover:bg-primary-soft focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
                  >
                    <span
                      aria-hidden
                      className="relative grid size-8 shrink-0 place-items-center rounded-full border border-primary bg-background font-mono text-[13px] text-primary"
                    >
                      {i + 1}
                    </span>
                    <span className="text-[14px] leading-snug font-medium sm:text-[15px]">
                      {n.label}
                    </span>
                    <ArrowUpRight
                      aria-hidden
                      className="size-5 shrink-0 text-muted-foreground transition-colors group-hover:text-primary"
                    />
                  </a>
                </li>
              ))}
            </ol>
            <p className="text-[13px] text-muted-foreground sm:text-sm">
              Vào nhóm xong, bạn nhắn mã học viên cho người tư vấn để RVPY hỗ trợ
              bước tiếp theo.
            </p>
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
