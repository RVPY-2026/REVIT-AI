import type { Metadata } from "next"
import { Suspense } from "react"
import { ShieldCheck } from "lucide-react"
import { AccountRoleList } from "@/components/admin/AccountRoleList"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import type { SessionUser } from "@/lib/auth/permissions"
import { USE_MOCK } from "@/lib/runtime-mode"
import { accountSearchSchema } from "@/lib/schemas/account-role"
import { requirePermission } from "@/server/auth/session"
import { ACCOUNT_LIMIT, listManagedAccounts } from "@/server/queries/accounts"

export const metadata: Metadata = {
  title: "Phân quyền · Quản lý RVPY",
  robots: { index: false, follow: false },
}

type SearchParams = Promise<Record<string, string | string[] | undefined>>

export default function AccountRolesPage({ searchParams }: { searchParams: SearchParams }) {
  return <Suspense fallback={<RolesLoading />}><RolesContent searchParams={searchParams} /></Suspense>
}

async function RolesContent({ searchParams }: { searchParams: SearchParams }) {
  const user = await requirePermission("roles.manage")
  const params = await searchParams
  const parsed = accountSearchSchema.safeParse(typeof params.q === "string" ? params.q : "")
  const search = parsed.success ? parsed.data : ""

  return (
    <main className="content py-8 sm:py-10">
      <div>
        <p className="font-mono text-xs text-muted-foreground">QUẢN LÝ · CÀI ĐẶT</p>
        <h1 className="mt-2 font-heading text-[28px] font-light text-foreground">Phân quyền</h1>
        <p className="mt-1 max-w-prose text-sm text-muted-foreground">
          Cấp hoặc gỡ vai trò Quản trị và Sale cho các tài khoản đã đăng nhập. Thay đổi có hiệu lực ngay khi người đó tải lại trang.
        </p>
      </div>

      {USE_MOCK ? (
        <Card className="mt-6 border-dashed">
          <CardContent className="flex flex-col items-center py-12 text-center">
            <ShieldCheck aria-hidden="true" className="size-8 text-muted-foreground" strokeWidth={1.5} />
            <h2 className="mt-4 font-heading text-lg font-medium">Chế độ xem thử</h2>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">Danh sách tài khoản thật chỉ hiển thị khi đã kết nối cơ sở dữ liệu.</p>
          </CardContent>
        </Card>
      ) : (
        <AccountsSection user={user} search={search} />
      )}
    </main>
  )
}

async function AccountsSection({ user, search }: { user: SessionUser; search: string }) {
  const accounts = await listManagedAccounts(user, search)

  return (
    <>
      <form action="/quan-tri/phan-quyen" className="mt-6 flex gap-2">
        <Input name="q" defaultValue={search} placeholder="Tìm theo email hoặc tên" aria-label="Tìm tài khoản" maxLength={100} />
        <Button type="submit" variant="outline">Tìm</Button>
      </form>

      {accounts.length ? (
        <>
          <AccountRoleList accounts={accounts} currentUserId={user.id} />
          {accounts.length >= ACCOUNT_LIMIT ? (
            <p className="mt-4 text-sm text-muted-foreground">Chỉ hiển thị {ACCOUNT_LIMIT} kết quả đầu. Hãy tìm theo email để thu hẹp.</p>
          ) : null}
        </>
      ) : (
        <Card className="mt-6 border-dashed">
          <CardContent className="flex flex-col items-center py-12 text-center">
            <ShieldCheck aria-hidden="true" className="size-8 text-muted-foreground" strokeWidth={1.5} />
            <h2 className="mt-4 font-heading text-lg font-medium">Không tìm thấy tài khoản</h2>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">Người dùng cần đăng nhập một lần bằng Google hoặc email trước khi xuất hiện tại đây.</p>
          </CardContent>
        </Card>
      )}
    </>
  )
}

function RolesLoading() {
  return <main className="content py-8" aria-label="Đang tải danh sách tài khoản"><Skeleton className="h-3 w-40" /><Skeleton className="mt-3 h-9 w-60" /><Skeleton className="mt-6 h-11 w-full" /><div className="mt-6 grid gap-3">{Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-24 rounded-2xl" />)}</div></main>
}
