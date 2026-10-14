import type { Metadata } from "next";
import { Suspense } from "react";
import { getMyLearning, getMyReferrals } from "@/lib/api/student-area";
import { ALUMNI_REFERRAL, REFERRAL_TIERS, SITE, ZALO_REGISTRATION_CONTACT } from "@/lib/constants";
import { formatVnd } from "@/lib/format";
import { ClipboardButton } from "@/components/admin/ClipboardButton";
import { NoLearningRecord } from "@/components/student/NoLearningRecord";
import { StudentPageSkeleton } from "@/components/student/StudentPageSkeleton";
import { ProgressBar } from "@/components/student/ProgressBar";
import { StudentPageHeader } from "@/components/student/StudentPageHeader";

export const metadata: Metadata = { title: "Giới thiệu bạn · Khu học viên", robots: { index: false, follow: false } };

/** The fee ladder needs 5 invited friends before the first reduction (CLAUDE.md §7). */
const INVITE_GOAL = 5;

export default function ReferralPage() {
  return <Suspense fallback={<StudentPageSkeleton />}><ReferralPageContent /></Suspense>;
}

async function ReferralPageContent() {
  const [learning, referrals] = await Promise.all([getMyLearning(), getMyReferrals()]);
  if (!learning || !referrals) return <NoLearningRecord />;

  const link = `${SITE.url}/dang-ky?ref=${referrals.code}`;
  const message = `Mình đang học Revit tại RVPY Ocean Studio. Bạn đăng ký học thử 3 buổi miễn phí qua liên kết này nhé: ${link}`;
  const { enrollment } = learning;

  return (
    <main className="content grid gap-6 py-8 sm:py-10">
      <StudentPageHeader
        eyebrow="Giới thiệu bạn"
        title="Giới thiệu bạn bè học Revit"
        description="Bạn bè đăng ký qua liên kết của bạn, RVPY ghi nhận và giảm học phí cho bạn."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <section aria-labelledby="link-heading" className="min-w-0 revit-panel">
          <h2 id="link-heading" className="text-[21px] font-medium">Liên kết của bạn</h2>
          <p className="mt-3 rounded-[10px] border border-border bg-background px-3.5 py-2.5 font-mono text-sm break-all">{link}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <ClipboardButton text={link} label="Sao chép liên kết" className="border border-border" />
            <ClipboardButton text={message} label="Sao chép tin nhắn mẫu" className="border border-border" />
          </div>
          <p className="mt-4 text-[13px] text-muted-foreground">Tin nhắn mẫu: {message}</p>
        </section>

        <section aria-labelledby="progress-heading" className="min-w-0 revit-panel">
          <h2 id="progress-heading" className="text-[21px] font-medium">Tiến độ giới thiệu</h2>
          <div className="mt-3 flex items-baseline justify-between gap-3">
            <p className="text-sm text-muted-foreground">Bạn đã mời</p>
            <p className="font-mono text-[21px] tabular-nums">{referrals.invited}/{INVITE_GOAL}</p>
          </div>
          <ProgressBar value={(Math.min(referrals.invited, INVITE_GOAL) / INVITE_GOAL) * 100} label="Số bạn đã mời" className="mt-2" />
          <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
            <div><dt className="text-muted-foreground">Đã đăng ký qua bạn</dt><dd className="font-mono text-[21px] tabular-nums">{referrals.invited}</dd></div>
            <div><dt className="text-muted-foreground">Đã học chính thức</dt><dd className="font-mono text-[21px] tabular-nums">{referrals.enrolled}</dd></div>
          </dl>
          {enrollment?.agreedFeeVnd != null ? <p className="mt-4 border-t border-border pt-4 text-sm">Học phí đã thống nhất của bạn: <span className="font-mono tabular-nums">{formatVnd(enrollment.agreedFeeVnd)}</span></p> : null}
          <p className="mt-4 text-[13px] text-muted-foreground">
            Số liệu là số bạn đã đăng ký qua liên kết. RVPY xác nhận bạn nào đủ điều kiện (tham gia đủ 3 buổi học thử, học chính thức) rồi điều chỉnh học phí cho bạn.
          </p>
        </section>
      </div>

      <section aria-labelledby="offer-heading" className="min-w-0 revit-panel">
        <h2 id="offer-heading" className="text-[21px] font-medium">Ưu đãi học phí</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[30rem] text-left text-sm">
            <caption className="sr-only">Các mức học phí theo số bạn giới thiệu</caption>
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th scope="col" className="px-2 py-3 font-medium">Mức</th>
                <th scope="col" className="px-2 py-3 font-medium">Điều kiện</th>
                <th scope="col" className="px-2 py-3 text-right font-medium">Học phí</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {REFERRAL_TIERS.map((tier, index) => (
                <tr key={tier.title}>
                  <th scope="row" className="px-2 py-3 font-mono text-[13px] font-normal text-muted-foreground">{String(index + 1).padStart(2, "0")}</th>
                  <td className="px-2 py-3"><span className="font-medium">{tier.title}</span><span className="block text-[13px] text-muted-foreground">{tier.condition}</span></td>
                  <td className="px-2 py-3 text-right font-mono whitespace-nowrap tabular-nums">{tier.feeVnd === 0 ? "Miễn phí" : formatVnd(tier.feeVnd)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">
          Tri ân học viên: từ bạn thứ {ALUMNI_REFERRAL.fromReferral} trở đi, mỗi bạn học chính thức bạn được hoàn {ALUMNI_REFERRAL.refundPercent}% học phí, không giới hạn số lượng.
          Cần hỏi về ưu đãi? <a className="text-primary underline-offset-4 hover:underline" href={ZALO_REGISTRATION_CONTACT.href} target="_blank" rel="noopener noreferrer">Nhắn Zalo cho RVPY</a>.
        </p>
      </section>
    </main>
  );
}
