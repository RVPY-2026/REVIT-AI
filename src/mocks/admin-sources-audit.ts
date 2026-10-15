import type { AdSource, SourceOwner } from "@/lib/schemas/ad-source";
import type { AuditRow, ZaloRow } from "@/lib/schemas/admin-viewers";
export const mockSourceOwners: SourceOwner[] = [{ id: "00000000-0000-4000-8000-000000000001", name: "Nguyễn Minh An", email: "an@example.invalid" },
  { id: "00000000-0000-4000-8000-000000000002", name: "Trần Thanh Bình", email: "binh@example.invalid" }];
export const mockAdSources: AdSource[] = ["A", "B", "C", "R"].map((code, i) => ({
  id: `00000000-0000-4000-8000-00000000001${i}`, code, name: code === "R" ? "RVPY" : `Nguồn ${code}`,
  ownerUserId: i < 2 ? mockSourceOwners[i].id : null, ownerName: i < 2 ? mockSourceOwners[i].name : null,
  ownerEmail: i < 2 ? mockSourceOwners[i].email : null, active: i !== 2, monthLeads: i === 2 ? 0 : 8,
  total: i === 2 ? 0 : 38, enrolled: i === 2 ? 0 : 10, conversion: i === 2 ? null : 10 / 38,
  months: ["2026-05", "2026-06", "2026-07", "2026-08", "2026-09", "2026-10"].map((month, n) => ({ month, leads: i === 2 ? 0 : n + 3,
    total: i === 2 ? 0 : 5 + (n + 1) * (n + 6) / 2, enrolled: i === 2 ? 0 : 4 + Array.from({ length: n + 1 }, (_, j) => j % 3).reduce((sum, v) => sum + v, 0) })),
}));
export const mockAuditRows: AuditRow[] = Array.from({ length: 113 }, (_, i) => ({
  id: `10000000-0000-4000-8000-${String(i).padStart(12, "0")}`, createdAt: new Date(Date.UTC(2026, 9, 14, 3) - i * 3600000).toISOString(),
  actor: i % 2 ? "Nguyễn Minh An" : "Quản trị RVPY", action: i % 3 ? "student.status_edited" : "source.updated",
  entity: i % 3 ? "students" : "ad_sources", entityId: mockAdSources[i % 4].id,
  data: i % 3 ? { from: "new", to: "consulting", code: "A2610007", phone: "0901 *** 567", email: "a***@example.invalid" } : { before: { name: "Nguồn A" }, after: { name: "Nguồn kiến trúc" } },
}));
export const mockZaloRows: ZaloRow[] = Array.from({ length: 103 }, (_, i) => ({
  id: `20000000-0000-4000-8000-${String(i).padStart(12, "0")}`, studentId: "mock-student-1", studentCode: "A2610001",
  studentName: "Nguyễn Minh Anh", createdAt: new Date(Date.UTC(2026, 9, 14, 3) - i * 3600000).toISOString(),
  kind: i % 2 ? "text" : "photo", status: ["pending", "sent", "failed"][i % 3], attempts: i % 3 === 2 ? 6 : i % 3,
  availableAt: "2026-10-14T04:00:00.000Z", lastError: i % 3 === 2 ? "Chưa gửi được tin Zalo. Bạn kiểm tra kết nối rồi thử lại." : null,
}));

export const mockLongAdSources = mockAdSources.map((source, i) => i ? source : { ...source,
  name: "Nguồn quảng cáo dành cho kiến trúc sư và kỹ sư thiết kế công trình dân dụng tại thành phố Hồ Chí Minh",
  ownerName: "Nguyễn Thanh Minh Anh Hoàng Quốc Bảo Trần Thanh Bình Nguyễn Hoàng Phương", ownerEmail: "nguoi.phu.trach.nguon.quang.cao@example.invalid" });
export const mockLongAuditRows = mockAuditRows.map((row, i) => i ? row : { ...row, actor: "Nguyễn Thanh Minh Anh Hoàng Quốc Bảo Trần Thanh Bình Nguyễn Hoàng Phương", action: "future.action_with_no_translation", data: { before: "Một tên nguồn dài để kiểm tra cách xuống dòng trên điện thoại", after: "Tên nguồn mới dành cho nhóm kiến trúc và kỹ thuật công trình dân dụng" } });
export const mockLongZaloRows = mockZaloRows.map((row, i) => i ? row : { ...row, studentName: "Nguyễn Thanh Minh Anh Hoàng Quốc Bảo Trần Thanh Bình Nguyễn Hoàng Phương" });
