"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Lock } from "lucide-react";
import type { LessonState } from "@/lib/student-learning";

export type BrowserLesson = { id: string; label: string; title: string; phase: "foundation" | "specialist"; state: LessonState; accessible: boolean };

const PHASES = [
  { key: "foundation", label: "Giai đoạn nền tảng" },
  { key: "specialist", label: "Giai đoạn chuyên đề" },
] as const;

const STATE_DOT: Record<LessonState, { className: string; text: string }> = {
  completed: { className: "bg-success", text: "Đã hoàn thành" },
  reported: { className: "bg-info", text: "Chờ xác nhận" },
  overdue: { className: "bg-destructive", text: "Quá hạn" },
  upcoming: { className: "border border-muted-foreground", text: "Chưa học" },
};

/** Lesson tree inside the student sidebar: the caller's own plan by phase, current lesson highlighted. */
export function ProjectBrowserTree({ lessons }: { lessons: BrowserLesson[] }) {
  const pathname = usePathname();
  if (lessons.length === 0) return <p className="px-3 py-2 text-[13px] text-muted-foreground">Chưa có bài học nào.</p>;
  return (
    <nav aria-label="Danh sách bài học" className="text-[13px]">
      <ul>
        {PHASES.map(({ key, label }) => {
          const group = lessons.filter((lesson) => lesson.phase === key);
          if (group.length === 0) return null;
          return (
            <li key={key}>
              <details open className="group">
                <summary className="flex cursor-pointer list-none items-center gap-1 rounded-[4px] px-2 py-1.5 font-medium select-none hover:bg-background-2 [&::-webkit-details-marker]:hidden">
                  <ChevronRight aria-hidden strokeWidth={1.75} className="size-4 shrink-0 transition-transform duration-150 group-open:rotate-90 motion-reduce:transition-none" />
                  <span className="truncate">{label}</span>
                  <span className="ml-auto font-mono text-xs text-muted-foreground tabular-nums">{group.length}</span>
                </summary>
                <ul className="ml-4 border-l border-border">
                  {group.map((lesson) => {
                    const href = `/hoc-vien/khoa-hoc/${lesson.id}`;
                    const current = pathname === href;
                    const dot = STATE_DOT[lesson.state];
                    const row = (
                      <>
                        {lesson.accessible
                          ? <span aria-hidden className={`size-2 shrink-0 rounded-[2px] ${dot.className}`} />
                          : <Lock aria-hidden strokeWidth={1.75} className="size-3 shrink-0" />}
                        <span className="w-14 shrink-0 whitespace-nowrap font-mono text-xs text-muted-foreground">{lesson.label}</span>
                        <span className="min-w-0 flex-1 truncate">{lesson.title}</span>
                        <span className="sr-only">{lesson.accessible ? dot.text : "Chưa mở"}</span>
                      </>
                    );
                    return (
                      <li key={lesson.id}>
                        {lesson.accessible ? (
                          <Link href={href} aria-current={current ? "page" : undefined} title={lesson.title} className={`flex items-center gap-2 py-1 pr-2 pl-2 ${current ? "bg-primary-soft text-primary" : "hover:bg-background-2"}`}>{row}</Link>
                        ) : (
                          <span title={`${lesson.title} — mở khi học chính thức`} className="flex items-center gap-2 py-1 pr-2 pl-2 text-muted-foreground">{row}</span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </details>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
