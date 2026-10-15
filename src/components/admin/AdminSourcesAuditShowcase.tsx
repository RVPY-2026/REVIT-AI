"use client";
import { useState } from "react";
import { ManagementPageHeader } from "@/components/admin/ManagementPageHeader";
import { ManagementEmpty } from "@/components/admin/ManagementEmpty";
import { ManagementLoading } from "@/components/admin/ManagementLoading";
import { ManagementRefreshButton } from "@/components/admin/ManagementRefreshButton";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { AdSourceDialog } from "@/components/admin/AdSourceDialog";
import { ViewerFilters } from "@/components/admin/ViewerFilters";
import { ViewerPagination } from "@/components/admin/ViewerPagination";
import { mockAdSources, mockSourceOwners } from "@/mocks/admin-sources-audit";
import { Button } from "@/components/ui/button";
export function AdminSourcesAuditShowcase() {
  const [source, setSource] = useState(mockAdSources[0]);
  return <section className="space-y-6"><ManagementPageHeader title="Quản lý hệ thống" helper="Nguồn quảng cáo, nhật ký và hàng đợi tin nhắn."
    action={<AdSourceDialog owners={mockSourceOwners} usedCodes={mockAdSources.map((s) => s.code)} />} />
    <div className="flex flex-wrap gap-2">{["active", "inactive", "pending", "sent", "failed"].map((s) => <StatusBadge key={s} status={s as "active" | "inactive" | "pending" | "sent" | "failed"} />)}</div>
    <ViewerFilters filter={{ page: 1 }} audit /><ViewerPagination page={1} total={113} />
    <section aria-label="Phân trang nhật ký giới hạn"><ViewerPagination page={200} total={10000} totalCapped hasNext={false} /></section>
    <ManagementRefreshButton label="Tải lại nhật ký" />
    <div id="source-refresh-showcase" className="space-y-3 rounded-2xl border p-4"><h2 className="font-heading text-lg">Sửa nguồn sau khi tải lại</h2>
      <p className="text-sm text-muted-foreground">Đổi dữ liệu minh họa rồi mở lại hộp thoại để xem thông tin mới.</p>
      <div className="flex flex-wrap gap-2"><AdSourceDialog source={source} owners={mockSourceOwners} usedCodes={[source.code]} />
        <Button variant="outline" onClick={() => setSource({ ...mockAdSources[0], name: "Nguồn đã cập nhật", active: false, ownerUserId: mockSourceOwners[1].id,
          ownerName: mockSourceOwners[1].name, ownerEmail: mockSourceOwners[1].email })}>Mô phỏng cập nhật nguồn</Button></div></div>
    <ManagementEmpty><p>Chưa có hoạt động khớp bộ lọc. Bạn mở rộng khoảng ngày để tìm thêm.</p></ManagementEmpty>
    <ManagementLoading embedded /></section>;
}
