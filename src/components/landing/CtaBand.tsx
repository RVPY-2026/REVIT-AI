import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/ui/reveal";
import { ROUTES } from "@/lib/constants";

export function CtaBand() {
  return (
    <div className="content py-14 md:py-22">
      <Reveal className="flex flex-wrap items-center justify-between gap-6 rounded-2xl bg-band px-6 py-12 text-white md:px-14">
        <div>
          <h2 className="text-[28px] font-light md:text-[40px]">
            Bắt đầu với <strong className="font-medium">3 buổi học thử.</strong>
          </h2>
          <p className="mt-2 text-white/80">
            Điền form 2 phút, RVPY liên hệ qua Zalo trong ngày.
          </p>
        </div>
        <Button
          asChild
          size="lg"
          className="bg-white! bg-none! text-primary-deep shadow-[0_10px_30px_-12px_rgba(0,0,0,.5)]!"
        >
          <Link href={ROUTES.signup}>Đăng ký học thử</Link>
        </Button>
      </Reveal>
    </div>
  );
}
