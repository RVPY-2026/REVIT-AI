import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/ui/reveal";
import { ALUMNI_REFERRAL, ROUTES } from "@/lib/constants";
import { FeeCalculator } from "./FeeCalculator";
import { SectionHeading } from "./SectionHeading";

/** 9-day fee offer as a try-it-yourself calculator, plus the alumni thank-you offer. */
export function FeeTiers() {
  return (
    <section id="hoc-phi" className="scroll-mt-6 py-14 md:-scroll-mt-2 md:py-22">
      <div className="content">
        <Reveal>
          <SectionHeading
            eyebrow="Học phí và ưu đãi"
            title="Giới thiệu bạn bè,"
            emphasis="học phí giảm từng bậc."
          >
            Ưu đãi chỉ áp dụng trong 9 ngày trải nghiệm, tính từ ngày bạn bắt
            đầu tham gia.
          </SectionHeading>
        </Reveal>

        <Reveal>
          <FeeCalculator />
        </Reveal>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
          <p className="text-[14px] text-muted-foreground">
            Theo dõi số bạn đã giới thiệu trong trang học viên, mục Giới thiệu
            bạn.
          </p>
          <Button asChild>
            <Link href={ROUTES.signup}>Đăng ký học thử</Link>
          </Button>
        </div>

        <Reveal className="mt-14 grid items-center gap-6 border-y border-border py-8 md:grid-cols-[auto_1fr] md:gap-10">
          <p className="font-heading text-[68px] leading-none font-extralight text-primary tabular-nums">
            {ALUMNI_REFERRAL.refundPercent}
            <span className="text-[40px]">%</span>
          </p>
          <div className="grid max-w-[60ch] gap-2">
            <h3 className="text-[21px] font-medium">
              Tri ân học viên: hoàn lại 30% học phí cho mỗi bạn giới thiệu
            </h3>
            <p className="text-muted-foreground">
              Sau khi học chính thức, từ bạn thứ {ALUMNI_REFERRAL.fromReferral}{" "}
              bạn giới thiệu trở đi, mỗi bạn đăng ký học, RVPY hoàn lại cho bạn{" "}
              {ALUMNI_REFERRAL.refundPercent}% học phí. Không giới hạn số lần.
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
