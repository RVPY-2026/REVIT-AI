"use client";

import { DataTable, type DataTableColumn } from "@/components/admin/DataTable";
import { ClipboardButton } from "@/components/admin/ClipboardButton";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { StatusCell } from "@/components/admin/StatusCell";
import { FollowUpBadge } from "@/components/admin/FollowUpBadge";
import { ViewSwitch } from "@/components/admin/ViewSwitch";
import { StudentFilterToolbar } from "@/components/admin/StudentFilterToolbar";
import { ManualStudentDialog } from "@/components/admin/ManualStudentDialog";
import { InlineStudentField } from "@/components/admin/InlineStudentField";
import { StudentTable } from "@/components/admin/StudentTable";
import { StudentOnboardingPanel } from "@/components/admin/StudentOnboardingPanel";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";

type ExampleRow = { id: string; name: string; code: string };
const rows: ExampleRow[] = [{ id: "00000000-0000-4000-8000-000000000001", name: "Học viên mẫu", code: "R2610001" }];
const columns: DataTableColumn<ExampleRow>[] = [
  { accessorKey: "name", header: "Học viên" },
  { accessorKey: "code", header: "Mã học viên", cell: ({ row }) => <span className="font-mono">{row.original.code}</span> },
];

/** Fake records keep the development showcase independent of database access. */
export function CrmComponentShowcase() {
  return <div className="grid min-w-0 gap-4">
    <StudentOnboardingPanel preview canOpenTrial canActivate canEdit contactEmail="hocvien@example.com" data={{
      studentId: "00000000-0000-4000-8000-000000000001", account: null, zalo: { connected: true, failedCount: 1, pendingCount: 1, oldestPendingAt: "2026-10-10T00:00:00.000Z" },
      checklist: { zaloFriendAt: "2026-10-09T00:00:00.000Z", group1At: null, group2At: null, feeSentAt: null, softwareReadyAt: null, officialZaloAt: null },
      enrollment: { kind: "trial", status: "active", trialStartedAt: "2026-10-09T00:00:00.000Z", trialEndsAt: "2026-10-18T00:00:00.000Z" },
      lessons: [1, 2, 3].map((order) => ({ id: `mock-trial-${order}`, title: `Bài học thử ${order}`, trialOrder: order, reportedAt: order === 1 ? "2026-10-10T00:00:00.000Z" : null, completedAt: null, progressNote: order === 1 ? "Em đã hoàn thành bài tập." : null, submissionUrl: null })),
    }} />
    <StudentFilterToolbar filter={{}} sources={[{ id: "mock-source-r", code: "R", name: "RVPY" }, { id: "mock-source-a", code: "A", name: "Nguồn mẫu A" }]} />
    <StudentTable editable rows={[{ id: "mock-student-1", code: "R2610001", fullName: "Học viên mẫu", phone: "0901234567", email: "hocvien@example.com", status: "new", sourceId: "mock-source-r", sourceCode: "R", sourceName: "RVPY", signedUpAt: "2026-10-09T00:00:00Z", lastContactAt: null }]} preview />
    <div className="flex flex-wrap items-center gap-4">
      <ViewSwitch filter={{}} view="table" />
      <StatusCell preview editable studentId="mock-student-1" fullName="Học viên mẫu" status="consulting" />
      <FollowUpBadge student={{ status: "new", lastContactAt: null }} />
      <FollowUpBadge student={{ status: "consulting", lastContactAt: "2020-01-01T00:00:00Z" }} />
      <FollowUpBadge student={{ status: "enrolled", lastContactAt: null }} />
    </div>
    <dl className="grid gap-3"><div><dt>Nghề nghiệp</dt><dd><InlineStudentField preview editable studentId="mock-student-1" field="occupation" value="Kiến trúc sư" label="Nghề nghiệp" /></dd></div><div><dt>Mục tiêu học Revit</dt><dd><InlineStudentField preview editable multiline studentId="mock-student-1" field="signupAnswer" answerKey="learningGoal" value="Học để làm dự án" label="Mục tiêu học Revit" /></dd></div></dl>
    <DataTable columns={columns} data={rows} mobileCards={(row) => <div className="rounded-2xl border border-border bg-card p-4"><p>{row.name}</p><p className="font-mono text-sm">{row.code}</p></div>} />
    <div className="flex flex-wrap gap-2"><ManualStudentDialog preview sources={[{ id: "mock-source-r", code: "R", name: "RVPY" }, { id: "mock-source-a", code: "A", name: "Nguồn mẫu A" }]} /></div>
    <div className="flex flex-wrap items-start gap-3"><StatusBadge status="consulting" /><span className="inline-flex items-center gap-1 font-mono text-sm">0901 234 567<ClipboardButton text="0901234567" label="Sao chép số điện thoại" iconOnly /></span><ClipboardButton text="R2610001" label="Sao chép mã mẫu" /><AlertDialog><AlertDialogTrigger asChild><Button variant="outline" size="sm">Xem hộp xác nhận mẫu</Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Xác nhận đổi trạng thái</AlertDialogTitle><AlertDialogDescription>Hộp thoại mẫu dùng để kiểm tra giao diện và bàn phím.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Giữ nguyên</AlertDialogCancel><AlertDialogAction>Đóng bản mẫu</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></div>
  </div>;
}
