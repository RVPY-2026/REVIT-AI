import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Logo } from "@/components/icons/logo";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { EmailSignInForm } from "@/components/auth/EmailSignInForm";
import { safeAreaPath } from "@/lib/auth/redirect";
import { USE_MOCK, hasSupabaseConfig } from "@/lib/runtime-mode";
import { getCurrentUser } from "@/server/auth/session";

export const metadata: Metadata = {
  title: "Đăng nhập",
  robots: { index: false, follow: false },
};

export default function SignInPage({ searchParams }: PageProps<"/dang-nhap">) {
  return (
    <main className="content grid min-h-dvh place-items-center py-12">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 sm:p-8">
        <Link href="/" aria-label="Về trang chủ RVPY">
          <Logo className="mb-8 h-10 w-auto text-primary" />
        </Link>
        <h1 className="text-[28px] font-light">Đăng nhập RVPY</h1>
        <p className="mt-3 mb-8 text-muted-foreground">
          Dùng Gmail đã được RVPY kích hoạt để vào khu học viên hoặc quản lý.
        </p>
        <Suspense fallback={<p>Đang kiểm tra đăng nhập…</p>}>
          <SignInContent searchParams={searchParams} />
        </Suspense>
        <Link
          href="/"
          className="mt-6 inline-block text-sm text-muted-foreground underline underline-offset-4"
        >
          Về trang chủ
        </Link>
      </div>
    </main>
  );
}

async function SignInContent({
  searchParams,
}: Pick<PageProps<"/dang-nhap">, "searchParams">) {
  const params = await searchParams;
  const user = await getCurrentUser();
  if (user?.roles.length) redirect(safeAreaPath(user, params.next));
  if (USE_MOCK || !hasSupabaseConfig())
    return (
      <p className="text-sm text-muted-foreground">
        Đăng nhập Google chưa được mở trong môi trường này.
      </p>
    );
  return (
    <>
      <GoogleSignInButton
        next={
          typeof params.next === "string"
            ? params.next.slice(0, 1000)
            : undefined
        }
      />
      <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        <span>HOẶC</span>
        <span className="h-px flex-1 bg-border" />
      </div>
      <EmailSignInForm
        next={
          typeof params.next === "string"
            ? params.next.slice(0, 1000)
            : undefined
        }
      />
      {params.error ? (
        <p role="alert" className="mt-4 text-sm text-destructive">
          Đăng nhập chưa hoàn tất. Bạn thử lại bằng Google hoặc email nhé.
        </p>
      ) : null}
    </>
  );
}
