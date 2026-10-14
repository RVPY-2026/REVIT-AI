"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { ROLE_LABELS } from "@/lib/constants"
import { MANAGED_ROLES } from "@/lib/schemas/account-role"
import { setAccountRole } from "@/server/actions/account-roles"
import type { ManagedAccount } from "@/server/queries/accounts"

export function AccountRoleList({ accounts, currentUserId }: { accounts: ManagedAccount[]; currentUserId: string }) {
  return (
    <ul className="mt-6 grid gap-3">
      {accounts.map((account) => (
        <AccountRow key={account.id} account={account} isSelf={account.id === currentUserId} />
      ))}
    </ul>
  )
}

function AccountRow({ account, isSelf }: { account: ManagedAccount; isSelf: boolean }) {
  const otherRoles = account.roles.filter((role) => !(MANAGED_ROLES as readonly string[]).includes(role))

  return (
    <li className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="grid min-w-0 gap-1">
        <p className="flex flex-wrap items-center gap-2 font-medium text-foreground">
          <span className="truncate">{account.name}</span>
          {isSelf ? <Badge variant="soft">Bạn</Badge> : null}
          {account.disabled ? <Badge variant="destructive">Đã vô hiệu hóa</Badge> : null}
        </p>
        <p className="truncate text-sm text-muted-foreground">{account.email}</p>
        {otherRoles.length ? (
          <div className="flex flex-wrap gap-1.5">
            {otherRoles.map((role) => <Badge key={role} variant="outline">{ROLE_LABELS[role]}</Badge>)}
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label={`Vai trò của ${account.email}`}>
        {MANAGED_ROLES.map((role) => (
          <RoleToggle
            key={role}
            userId={account.id}
            email={account.email}
            role={role}
            active={account.roles.includes(role)}
            // Own roles are never editable here. Disabled accounts can lose a role but not gain one.
            disabled={isSelf || (account.disabled && !account.roles.includes(role))}
          />
        ))}
      </div>
    </li>
  )
}

function RoleToggle({ userId, email, role, active, disabled }: {
  userId: string
  email: string
  role: (typeof MANAGED_ROLES)[number]
  active: boolean
  disabled: boolean
}) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const granted = !active

  function confirm() {
    startTransition(async () => {
      const result = await setAccountRole({ userId, role, granted })
      setOpen(false)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      if (!result.data.changed) toast.message("Tài khoản đã có trạng thái này")
      else toast.success(granted ? `Đã cấp quyền ${ROLE_LABELS[role]}` : `Đã gỡ quyền ${ROLE_LABELS[role]}`)
    })
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          type="button"
          variant={active ? "default" : "outline"}
          aria-pressed={active}
          disabled={disabled || pending}
        >
          {active ? "✓ " : ""}{ROLE_LABELS[role]}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{granted ? `Cấp quyền ${ROLE_LABELS[role]}?` : `Gỡ quyền ${ROLE_LABELS[role]}?`}</AlertDialogTitle>
          <AlertDialogDescription>
            {granted
              ? `${email} sẽ có quyền ${ROLE_LABELS[role]} và truy cập khu quản trị theo quyền đó ngay lần tải trang tiếp theo.`
              : `${email} sẽ mất quyền ${ROLE_LABELS[role]} ngay lần tải trang tiếp theo.`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Hủy</AlertDialogCancel>
          <AlertDialogAction
            disabled={pending}
            onClick={(event) => {
              event.preventDefault()
              confirm()
            }}
          >
            {granted ? "Xác nhận cấp quyền" : "Xác nhận gỡ quyền"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
