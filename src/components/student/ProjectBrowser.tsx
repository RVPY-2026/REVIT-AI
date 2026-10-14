import { getMyLearning } from "@/lib/api/student-area";
import { lessonLabel } from "@/lib/student-learning";
import { ProjectBrowserTree } from "@/components/student/ProjectBrowserTree";
import { Skeleton } from "@/components/ui/skeleton";

export function ProjectBrowserFallback() {
  return (
    <div className="grid gap-2 px-3 py-2" aria-label="Đang tải">
      {Array.from({ length: 5 }, (_, index) => <Skeleton key={index} className="h-5 w-full" />)}
    </div>
  );
}

/** Lesson tree for the sidebar. Same single-student query the pages use (cached per request). */
export async function ProjectBrowser() {
  const learning = await getMyLearning();
  if (!learning) return null;
  const lessons = learning.lessons.map((lesson) => ({
    id: lesson.id, label: lessonLabel(lesson.lessonNumbers), title: lesson.title, phase: lesson.phase, state: lesson.state, accessible: lesson.accessible,
  }));
  return <ProjectBrowserTree lessons={lessons} />;
}
