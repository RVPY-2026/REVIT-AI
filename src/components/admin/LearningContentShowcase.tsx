import { LearningContentManager } from "./LearningContentManager";
import { StudentLearningProgressPanel } from "./StudentLearningProgressPanel";
import { mockManagedLessons, mockManagedResources, mockLearningProgress } from "@/mocks/learning-content";
import { LearningContentLoading } from "./LearningContentLoading";
import { LearningContentError } from "./LearningContentError";
/** Fake-data examples for every shared learning-management pattern. */
export function LearningContentShowcase() {
  return <section className="min-w-0 space-y-6"><h2 className="text-[28px] font-light">Quản lý học tập</h2><LearningContentLoading embedded /><LearningContentError embedded reset={() => toast.info("Đây là ví dụ trong chế độ xem thử.")} /><LearningContentManager domain="resources" lessons={mockManagedLessons} resources={mockManagedResources} preview showcase /><LearningContentManager domain="lessons" lessons={mockManagedLessons} resources={[]} preview showcase /><StudentLearningProgressPanel data={mockLearningProgress("62000000-0000-4000-8000-000000000001")} editable preview /></section>;
}
"use client";
import { toast } from "sonner";
