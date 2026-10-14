import { Button } from "@/components/ui/button";
import { selectMockRole } from "@/server/actions/mock-role";
import { ROLE_LABELS } from "@/lib/constants";
import { USE_MOCK } from "@/lib/runtime-mode";

const MOCK_IDENTITIES = [
  { value: "admin", label: ROLE_LABELS.admin },
  { value: "sale", label: ROLE_LABELS.sale },
  { value: "student", label: "Học viên (học thử)" },
  { value: "student-formal", label: "Học viên (chính thức)" },
  { value: "user", label: ROLE_LABELS.user },
] as const;

export function MockRolePicker() {
  if (process.env.NODE_ENV !== "development" || !USE_MOCK) return null;
  return <section className="mt-6 border-t border-border pt-6"><h2 className="text-base font-medium">Xem thử với dữ liệu giả</h2><p className="mt-2 text-sm text-muted-foreground">Chọn vai trò để kiểm tra giao diện trong môi trường phát triển.</p><form action={selectMockRole} className="mt-4 flex flex-wrap gap-2">{MOCK_IDENTITIES.map((identity) => <Button key={identity.value} type="submit" variant="outline" name="role" value={identity.value} size="sm">{identity.label}</Button>)}</form></section>;
}
