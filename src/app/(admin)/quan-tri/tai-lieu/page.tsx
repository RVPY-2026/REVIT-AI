import { Suspense } from "react";
import { LearningContentManager } from "@/components/admin/LearningContentManager";
import { LearningContentLoading } from "@/components/admin/LearningContentLoading";
import { getLearningContent } from "@/lib/api/learning-content";
import { USE_MOCK } from "@/lib/runtime-mode";
export const metadata = { title: "Tài liệu · Quản lý RVPY", robots: { index: false, follow: false } };
export default function ResourcesPage({ searchParams }: { searchParams: Promise<{ state?: string }> }) { return <Suspense fallback={<LearningContentLoading />}><ResourcesContent searchParams={searchParams} /></Suspense>; }
async function ResourcesContent({ searchParams }: { searchParams: Promise<{ state?: string }> }) {
  let data = await getLearningContent("resources");
  const { state } = await searchParams;
  if (USE_MOCK) {
    if (state === "error") throw new Error("Mock resource query failure");
    if (state === "loading") return <LearningContentLoading />;
    data = (await import("@/mocks/learning-content")).mockContentState(state);
  }
  return <LearningContentManager domain="resources" {...data} preview={USE_MOCK} />;
}
