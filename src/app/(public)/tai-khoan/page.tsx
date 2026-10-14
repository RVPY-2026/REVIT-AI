import type { Metadata } from "next";
import { Suspense } from "react";
import { ROLE_LABELS } from "@/lib/constants";
import { requireUser } from "@/server/auth/session";

export const metadata: Metadata = {
  title: "Thông tin tài khoản",
  robots: { index: false, follow: false },
};

export default function AccountPage() {
  return (
    <main className="content py-12 sm:py-16">
      <Suspense fallback={<AccountLoading />}>
        <AccountDetails />
      </Suspense>
    </main>
  );
}

async function AccountDetails() {
  const user = await requireUser();

  return (
    <section className="mx-auto max-w-2xl rounded-2xl border border-border bg-card p-6 sm:p-8">
      <p className="font-mono text-xs tracking-[0.08em] text-muted-foreground">TÀI KHOẢN</p>
      <h1 className="mt-3 text-3xl font-light">Thông tin tài khoản</h1>
      <p className="mt-3 text-muted-foreground">
        Thông tin nhận diện của bạn khi sử dụng RVPY.
      </p>

      <dl className="mt-8 divide-y divide-border rounded-xl border border-border">
        <AccountField label="Họ tên" value={user.name} />
        <AccountField label="Email đăng nhập" value={user.email} />
        <AccountField
          label="Quyền truy cập"
          value={user.roles.map((role) => ROLE_LABELS[role]).join(" · ") || "Chưa xác định"}
        />
      </dl>

    </section>
  );
}

function AccountField({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 px-4 py-3 sm:grid-cols-[180px_1fr] sm:items-center sm:gap-4">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="break-all text-sm font-medium text-foreground">{value}</dd>
    </div>
  );
}

function AccountLoading() {
  return (
    <div className="mx-auto max-w-2xl animate-pulse rounded-2xl border border-border bg-card p-8" aria-busy="true">
      <div className="h-7 w-48 rounded bg-muted" />
      <div className="mt-8 h-24 rounded-xl bg-muted" />
    </div>
  );
}
