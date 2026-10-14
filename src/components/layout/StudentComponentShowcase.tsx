import { LessonStateBadge } from "@/components/student/LessonStateBadge";
import { PropertiesPalette } from "@/components/student/PropertiesPalette";
import { ProgressBar } from "@/components/student/ProgressBar";
import { ResourceViewer } from "@/components/student/ResourceViewer";
import { StudentPageHeader } from "@/components/student/StudentPageHeader";
import { Button } from "@/components/ui/button";
import type { LessonState } from "@/lib/student-learning";

const STATES: LessonState[] = ["completed", "reported", "overdue", "upcoming"];

/** UI kit block for the student area (FRONTEND_RULES §10). Revit-style Properties palette; the frame is the shared AppShell (§4.2). */
export function StudentComponentShowcase() {
  return (
    <div className="grid gap-6">
      <div className="rounded-2xl border border-border bg-card p-4 md:p-6">
        <StudentPageHeader
          eyebrow="Tiến độ"
          title="Tiêu đề trang học viên"
          description="Mono eyebrow, h1 Lexend 300 cỡ 28px, một dòng mô tả."
          action={<Button variant="outline" size="sm">Hành động</Button>}
        />
      </div>

      <div className="max-w-xs">
        <PropertiesPalette rows={[{ name: "Mã bài", value: <span className="font-mono">Bài 1</span> }, { name: "Giai đoạn", value: "Nền tảng" }, { name: "Trạng thái", value: <LessonStateBadge state="reported" /> }]} />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="grid gap-4 rounded-2xl border border-border bg-card p-4 md:p-6">
          <p className="font-mono text-xs text-muted-foreground uppercase">ProgressBar</p>
          {[0, 33, 100].map((value) => (
            <div key={value} className="flex items-center gap-3">
              <ProgressBar value={value} label={`Tiến độ ${value}%`} />
              <span className="w-12 text-right font-mono text-sm tabular-nums">{value}%</span>
            </div>
          ))}
        </div>

        <div className="grid gap-4 rounded-2xl border border-border bg-card p-4 md:p-6">
          <p className="font-mono text-xs text-muted-foreground uppercase">LessonStateBadge</p>
          <div className="flex flex-wrap gap-2">
            {STATES.map((state) => <LessonStateBadge key={state} state={state} />)}
            <LessonStateBadge state="upcoming" locked />
          </div>
          <p className="font-mono text-xs text-muted-foreground uppercase">ResourceViewer</p>
          <div className="grid gap-2">
            <ResourceViewer resource={{ id: "ui-kit-installer", title: "Bộ cài Auto Join", lessonId: null, lessonTitle: null, mode: "download", format: "file", embedUrl: null }} />
            <ResourceViewer resource={{ id: "ui-kit-unknown", title: "Tệp chưa xem được", lessonId: null, lessonTitle: null, mode: "view", format: "file", embedUrl: null }} />
          </div>
        </div>
      </div>
    </div>
  );
}
