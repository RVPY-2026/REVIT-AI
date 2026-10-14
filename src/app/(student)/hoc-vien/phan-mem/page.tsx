import type { Metadata } from "next";
import { Suspense } from "react";
import { ExternalLink } from "lucide-react";
import { getMyLearning, listMyResources } from "@/lib/api/student-area";
import { LICENSE_PRODUCT_LABELS, ZALO_REGISTRATION_CONTACT } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import { NoLearningRecord } from "@/components/student/NoLearningRecord";
import { StudentPageSkeleton } from "@/components/student/StudentPageSkeleton";
import { ResourceViewer } from "@/components/student/ResourceViewer";
import { StudentPageHeader } from "@/components/student/StudentPageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Phần mềm · Khu học viên", robots: { index: false, follow: false } };

const LICENSE_STATUS = {
  active: { label: "Đang hiệu lực", variant: "success" },
  expired: { label: "Đã hết hạn", variant: "warning" },
  revoked: { label: "Đã thu hồi", variant: "destructive" },
} as const;

/** Generic steps for a Revit add-in installer; the exact installer flow is confirmed with RVPY (CLAUDE.md §10). */
const INSTALL_STEPS = [
  { title: "Đóng Revit", body: "Lưu công việc đang làm và đóng hoàn toàn Revit trước khi cài." },
  { title: "Tải bộ cài ở trên", body: "Chọn đúng bộ cài cho phiên bản Revit bạn dùng. Tệp tải về chỉ dùng cho tài khoản của bạn." },
  { title: "Chạy bộ cài", body: "Nhấp đúp tệp vừa tải, chọn Yes nếu Windows hỏi quyền, rồi làm theo màn hình cho đến khi báo cài xong." },
  { title: "Mở Revit và kiểm tra", body: "Mở Revit, tìm thẻ RVPY trên thanh công cụ. Nếu thấy thẻ này là add-in đã được cài." },
  { title: "Đăng nhập bằng Gmail đã đăng ký", body: "Lần đầu dùng, add-in sẽ yêu cầu đăng nhập Google. Bạn dùng đúng Gmail đã đăng ký với RVPY để giấy phép được nhận diện." },
] as const;

export default function SoftwarePage() {
  return <Suspense fallback={<StudentPageSkeleton />}><SoftwarePageContent /></Suspense>;
}

async function SoftwarePageContent() {
  const learning = await getMyLearning();
  if (!learning) return <NoLearningRecord />;
  const downloads = (await listMyResources()).filter((resource) => resource.mode === "download");
  const { licenses, student } = learning;

  return (
    <main className="content grid gap-6 py-8 sm:py-10">
      <StudentPageHeader
        eyebrow="Phần mềm"
        title="Add-in Revit của RVPY"
        description="Tải bộ cài, cài đặt và kiểm tra giấy phép của bạn."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <section aria-labelledby="license-heading" className="min-w-0 revit-panel">
          <h2 id="license-heading" className="text-[21px] font-medium">Giấy phép</h2>
          {licenses.length ? (
            <ul className="mt-3 divide-y divide-border">
              {licenses.map((license) => (
                <li key={license.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="font-medium">{LICENSE_PRODUCT_LABELS[license.product] ?? license.product}</p>
                    <p className="mt-0.5 text-[13px] text-muted-foreground">
                      Từ {formatDate(license.startsAt)}{license.expiresAt ? ` đến ${formatDate(license.expiresAt)}` : " · không giới hạn thời gian"}
                    </p>
                  </div>
                  <Badge variant={LICENSE_STATUS[license.status].variant}>{LICENSE_STATUS[license.status].label}</Badge>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">Bạn chưa có giấy phép. RVPY cấp giấy phép theo Gmail của bạn; nhắn Zalo khi cần kích hoạt.</p>
          )}
          <p className="mt-4 text-[13px] text-muted-foreground">
            {student.softwareReadyAt ? `RVPY ghi nhận bạn cài xong ngày ${formatDate(student.softwareReadyAt)}.` : "Cài xong, bạn nhắn Zalo để RVPY kiểm tra giúp."}
          </p>
        </section>

        <section aria-labelledby="download-heading" className="min-w-0 revit-panel">
          <h2 id="download-heading" className="text-[21px] font-medium">Tải bộ cài</h2>
          {downloads.length ? (
            <div className="mt-3 grid gap-2">{downloads.map((resource) => <ResourceViewer key={resource.id} resource={resource} />)}</div>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">Bộ cài sẽ hiện ở đây khi RVPY mở quyền tải cho bạn. Nếu bạn đã học chính thức mà chưa thấy, hãy nhắn Zalo.</p>
          )}
        </section>
      </div>

      <section aria-labelledby="guide-heading" className="min-w-0 revit-panel">
        <h2 id="guide-heading" className="text-[21px] font-medium">Hướng dẫn cài đặt</h2>
        <ol className="mt-3 divide-y divide-border">
          {INSTALL_STEPS.map((step, index) => (
            <li key={step.title} className="flex gap-4 py-3.5">
              <span aria-hidden className="grid size-8 shrink-0 place-items-center rounded-full border border-border font-mono text-[13px] tabular-nums">{String(index + 1).padStart(2, "0")}</span>
              <div className="min-w-0">
                <h3 className="font-medium">{step.title}</h3>
                <p className="mt-0.5 text-sm text-muted-foreground">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
        <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-border pt-4">
          <p className="text-sm text-muted-foreground">Gặp lỗi khi cài hoặc cần hỗ trợ từ xa?</p>
          <Button asChild variant="outline" size="sm"><a href={ZALO_REGISTRATION_CONTACT.href} target="_blank" rel="noopener noreferrer">Nhắn Zalo cho RVPY <ExternalLink aria-hidden strokeWidth={1.75} /></a></Button>
        </div>
      </section>
    </main>
  );
}
