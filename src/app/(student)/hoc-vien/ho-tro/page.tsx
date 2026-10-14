import type { Metadata } from "next";
import { Suspense } from "react";
import { ExternalLink } from "lucide-react";
import { getMyLearning } from "@/lib/api/student-area";
import { ZALO_GROUPS, ZALO_REGISTRATION_CONTACT } from "@/lib/constants";
import { FeedbackForm } from "@/components/student/FeedbackForm";
import { NoLearningRecord } from "@/components/student/NoLearningRecord";
import { StudentPageSkeleton } from "@/components/student/StudentPageSkeleton";
import { StudentPageHeader } from "@/components/student/StudentPageHeader";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Hỗ trợ · Khu học viên", robots: { index: false, follow: false } };

export default function SupportPage() {
  return <Suspense fallback={<StudentPageSkeleton />}><SupportPageContent /></Suspense>;
}

async function SupportPageContent() {
  const learning = await getMyLearning();
  if (!learning) return <NoLearningRecord />;

  return (
    <main className="content grid gap-6 py-8 sm:py-10">
      <StudentPageHeader
        eyebrow="Hỗ trợ"
        title="Cần hỗ trợ?"
        description="Nhắn Zalo để được trả lời nhanh, hoặc gửi góp ý cho RVPY."
      />

      <div className="grid gap-4 lg:grid-cols-[2fr_3fr]">
        <section aria-labelledby="contact-heading" className="min-w-0 revit-panel">
          <h2 id="contact-heading" className="text-[21px] font-medium">Liên hệ RVPY</h2>
          <p className="mt-2 text-sm text-muted-foreground">Hỏi lịch học, giấy phép add-in, lỗi cài đặt hoặc học phí.</p>
          <Button asChild className="mt-4 h-auto min-h-11 py-2 whitespace-normal"><a href={ZALO_REGISTRATION_CONTACT.href} target="_blank" rel="noopener noreferrer">Nhắn Zalo cho RVPY <ExternalLink aria-hidden strokeWidth={1.75} /></a></Button>
          <h3 className="mt-6 text-base font-medium">Cộng đồng học viên</h3>
          <p className="mt-1 text-sm text-muted-foreground">Hỏi đáp cùng các bạn đang học.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {ZALO_GROUPS.map((group) => (
              <Button key={group.href} asChild variant="outline" size="sm"><a href={group.href} target="_blank" rel="noopener noreferrer">{group.label} <ExternalLink aria-hidden strokeWidth={1.75} /></a></Button>
            ))}
          </div>
        </section>

        <section aria-labelledby="feedback-heading" className="min-w-0 revit-panel">
          <h2 id="feedback-heading" className="text-[21px] font-medium">Gửi góp ý</h2>
          <p className="mt-1 mb-4 text-sm text-muted-foreground">Góp ý được gắn với tài khoản của bạn để RVPY phản hồi khi cần.</p>
          <FeedbackForm />
        </section>
      </div>
    </main>
  );
}
