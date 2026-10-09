import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CheckCircle2, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ZALO_GROUPS } from "@/lib/constants";

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
  const validCode =
    typeof code === "string" && /^[A-Z]\d{2}(0[1-9]|1[0-2])\d{3}$/.test(code);
  return (
    <section className="content py-12 md:py-20">
      <div className="mx-auto max-w-2xl rounded-2xl border border-border bg-card p-6 sm:p-10">
        {validCode ? (
          <CheckCircle2
            aria-hidden
            className="mb-5 size-10 text-success"
            strokeWidth={1.75}
          />
        ) : null}
        <h1 className="text-[28px] font-light sm:text-[40px]">
          {validCode ? "Cảm ơn bạn đã đăng ký!" : "Tham gia học thử cùng RVPY"}
        </h1>
        {validCode ? (
          <>
            <p className="mt-4 text-muted-foreground">
              Mã học viên của bạn:{" "}
              <strong className="font-mono font-medium text-foreground">
                {code}
              </strong>
            </p>
            <p className="mt-3 text-muted-foreground">
              RVPY sẽ liên hệ qua Zalo để tư vấn và hướng dẫn chuẩn bị phần mềm.
              Bạn hãy tham gia đủ hai nhóm bên dưới để nhận thông tin học thử.
            </p>
          </>
        ) : (
          <p className="mt-4 text-muted-foreground">
            Bạn cần điền form đăng ký để nhận mã học viên và được RVPY liên hệ
            hướng dẫn.
          </p>
        )}
        <div className="mt-8 grid gap-3">
          {ZALO_GROUPS.map((group) => (
            <Button
              key={group.href}
              variant="outline"
              asChild
              className="h-auto min-h-12 justify-between whitespace-normal py-3 text-left"
            >
              <a href={group.href} target="_blank" rel="noopener noreferrer">
                Tham gia {group.label}
                <ArrowUpRight aria-hidden className="size-5 shrink-0" />
              </a>
            </Button>
          ))}
        </div>
        <p className="mt-5 text-sm text-muted-foreground">
          Vào nhóm xong, bạn nhắn mã học viên cho người tư vấn để RVPY hỗ trợ
          bước tiếp theo.
        </p>
        <Button asChild variant="ghost" className="mt-6">
          <Link href={validCode ? "/" : "/dang-ky"}>
            {validCode ? "Về trang chủ" : "Điền form đăng ký"}
          </Link>
        </Button>
      </div>
    </section>
  );
}
