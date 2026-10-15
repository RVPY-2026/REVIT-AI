import { getLearningProgress } from "@/lib/api/learning-content";
import { requirePermission } from "@/server/auth/session";
import { can } from "@/lib/auth/permissions";
import { USE_MOCK } from "@/lib/runtime-mode";
import { StudentLearningProgressPanel } from "./StudentLearningProgressPanel";

export async function StudentLearningProgress({
  studentId,
}: {
  studentId: string;
}) {
  const user = await requirePermission("students.view");
  const data = await getLearningProgress(studentId);
  return data ? (
    <StudentLearningProgressPanel
      data={data}
      editable={can(user, "students.learning.edit")}
      preview={USE_MOCK}
    />
  ) : null;
}
