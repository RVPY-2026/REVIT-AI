import type { LearningProgress, ManagedLesson, ManagedResource } from "@/lib/schemas/learning-content";
import { FOUNDATION_LESSONS } from "@/server/db/seed/lessons";

export const mockManagedLessons: ManagedLesson[] = FOUNDATION_LESSONS.map((l, i) => ({ ...l, id: `60000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`, active: true, resourceCount: i % 3, planCount: 12 + i }));
mockManagedLessons.push({ id: "60000000-0000-4000-8000-000000001000", phase: "specialist", lessonNumbers: [1], title: "Phối hợp mô hình chuyên đề", baseDays: 3, trialOrder: null, sortOrder: 0, active: true, resourceCount: 1, planCount: 8 });
export const mockManagedResources: ManagedResource[] = [
  { id: "61000000-0000-4000-8000-000000000001", lessonId: mockManagedLessons[1].id, title: "Tài liệu CAD trong Revit", audience: "trial", mode: "view", active: true, sortOrder: 0, format: "pdf", filename: "cad-trong-revit.pdf", size: 2400000, youtubeUrl: null },
  { id: "61000000-0000-4000-8000-000000000002", lessonId: mockManagedLessons[1].id, title: "Hướng dẫn dựng mô hình", audience: "all", mode: "view", active: true, sortOrder: 1, format: "youtube", filename: null, size: null, youtubeUrl: "https://www.youtube-nocookie.com/embed/aqz-KE-bpKQ" },
  { id: "61000000-0000-4000-8000-000000000003", lessonId: null, title: "Bộ cài Auto Join", audience: "formal", mode: "download", active: false, sortOrder: 0, format: "file", filename: "auto-join.zip", size: 42000000, youtubeUrl: null },
];
export function mockLearningProgress(studentId: string, kind: "trial" | "formal" | null = "formal"): LearningProgress {
  return { studentId, kind, active: kind !== null, lessons: kind === null ? [] : mockManagedLessons.map((l, i) => ({ id: l.id, phase: l.phase, title: l.title, trialOrder: l.trialOrder, dueDate: kind === "formal" ? "2026-10-20" : null, completedAt: i === 0 ? "2026-10-12T01:00:00.000Z" : null, reportedAt: i < 3 ? "2026-10-11T01:00:00.000Z" : null, progressNote: i === 1 ? "Em đã dựng xong mô hình, nhờ thầy xem giúp." : null, submissionUrl: i === 1 ? "https://example.com/bai-nop" : null })) };
}

/** Development-only reproducible fixtures for visual acceptance checks. */
export function mockContentState(state: string | undefined) {
  if (state === "empty") return { lessons: [], resources: [] };
  if (state === "one") return { lessons: mockManagedLessons.slice(0, 1), resources: mockManagedResources.slice(0, 1) };
  if (state === "many") return {
    lessons: Array.from({ length: 120 }, (_, i) => ({ ...mockManagedLessons[i % mockManagedLessons.length], id: `63000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`, sortOrder: i, title: i === 0 ? "Tên bài học dài dùng để kiểm tra cách xuống dòng trên điện thoại khi học viên và nhân viên theo dõi chương trình học Revit" : `Bài học mẫu ${i + 1}` })),
    resources: Array.from({ length: 120 }, (_, i) => ({ ...mockManagedResources[i % 3], id: `64000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`, sortOrder: i, title: i === 0 ? "Tài liệu có tên dài dùng để kiểm tra cách xuống dòng trên điện thoại và khi mở trong hộp thoại sửa tài liệu học Revit" : `Tài liệu mẫu ${i + 1}` })),
  };
  return { lessons: mockManagedLessons, resources: mockManagedResources };
}
