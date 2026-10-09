import type { Metadata } from "next";
import { Suspense } from "react";
import { LeadSignupForm } from "@/components/public/LeadSignupForm";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = {
  title: "Đăng ký học thử Revit",
  description: "Đăng ký 3 buổi học thử Revit miễn phí cùng RVPY Ocean Studio.",
};

export default function SignupPage({ searchParams }: PageProps<"/dang-ky">) {
  return (
    <section className="content grid gap-10 py-12 md:grid-cols-[0.8fr_1.2fr] md:gap-16 md:py-20">
      <div>
        <p className="mb-4 font-mono text-xs tracking-widest text-primary">
          HỌC THỬ REVIT
        </p>
        <h1 className="text-[40px] font-light">
          Bắt đầu từ
          <br />
          <span className="font-medium">3 buổi học thử.</span>
        </h1>
        <p className="mt-6 max-w-prose text-muted-foreground">
          Trải nghiệm cách học Revit gắn với công việc của bạn trong 9 ngày.
          RVPY sẽ liên hệ để tư vấn và hướng dẫn chuẩn bị phần mềm.
        </p>
        <ol className="mt-8 divide-y divide-border">
          {[
            "Điền thông tin đăng ký",
            "Tham gia đủ 2 nhóm Zalo",
            "Chuẩn bị phần mềm cùng RVPY",
            "Học thử 3 buổi miễn phí",
          ].map((label, index) => (
            <li key={label} className="flex gap-4 py-4">
              <span className="font-mono text-sm text-primary">
                0{index + 1}
              </span>
              {label}
            </li>
          ))}
        </ol>
      </div>
      <div className="min-w-0 rounded-2xl border border-border bg-card p-5 sm:p-8">
        <Suspense fallback={<Skeleton className="h-96 w-full" />}>
          <SignupFields searchParams={searchParams} />
        </Suspense>
      </div>
    </section>
  );
}

async function SignupFields({
  searchParams,
}: Pick<PageProps<"/dang-ky">, "searchParams">) {
  const params = await searchParams;
  const sourceCode =
    typeof params.src === "string" && /^[A-Za-z]$/.test(params.src)
      ? params.src.toUpperCase()
      : undefined;
  const referrerCode =
    typeof params.ref === "string" &&
    /^[A-Za-z]\d{2}(0[1-9]|1[0-2])\d{3}$/.test(params.ref)
      ? params.ref.toUpperCase()
      : undefined;
  return <LeadSignupForm sourceCode={sourceCode} referrerCode={referrerCode} />;
}
