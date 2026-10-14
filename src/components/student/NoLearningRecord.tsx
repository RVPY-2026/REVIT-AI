import { Button } from "@/components/ui/button";
import { ZALO_REGISTRATION_CONTACT } from "@/lib/constants";

/**
 * Shown when the signed-in account has no linked student record (for example an admin previewing
 * the area). Nothing from another person's record is ever substituted.
 */
export function NoLearningRecord() {
  return (
    <main className="content py-12 sm:py-16">
      <div className="mx-auto max-w-md rounded-[4px] border border-border bg-card p-6 text-center">
        <h1 className="font-heading text-xl font-medium">Tài khoản chưa gắn với hồ sơ học viên</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Khi RVPY kích hoạt hồ sơ học viên cho Gmail này, bài học, tài liệu và tiến độ của bạn sẽ hiện ở đây. Nếu bạn đã đăng ký, hãy nhắn Zalo để RVPY kiểm tra giúp.
        </p>
        <Button asChild className="mt-5">
          <a href={ZALO_REGISTRATION_CONTACT.href} target="_blank" rel="noopener noreferrer">Nhắn Zalo cho RVPY</a>
        </Button>
      </div>
    </main>
  );
}
