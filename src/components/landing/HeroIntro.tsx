import Link from "next/link";
import { Check, MousePointer2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/constants";

const PERKS = [
  "3 buổi học thử miễn phí",
  "Lộ trình 1 kèm 1 đầu khoá",
  "Cộng đồng Zalo giải đáp",
];

/** First step of BuildStory. Rendered on the server so the h1 is in the initial HTML. */
export function HeroIntro() {
  return (
    <div className="grid justify-items-start gap-6 lg:gap-5 hero-compact:gap-4 hero-short:gap-3">
      <Badge variant="soft">
        <span aria-hidden className="size-1.5 rounded-full bg-primary" />
        Khoá học Revit BIM cho người đã đi làm
      </Badge>
      <h1 className="text-[40px] font-extralight tracking-[-.015em] md:text-[56px] xl:text-[68px] hero-compact:text-[56px] hero-short:text-[40px]">
        Dựng cả công trình trong Revit,{" "}
        <strong className="font-medium">từ móng đến bàn giao.</strong>
      </h1>
      <p className="max-w-[48ch] text-lg text-muted-foreground hero-short:text-base">
        Lộ trình Revit BIM toàn diện cho kiến trúc sư, kỹ sư 3–5 năm kinh
        nghiệm: định vị dự án, dựng mô hình đa bộ môn, kiểm tra va chạm và bàn
        giao đúng tiêu chuẩn.
      </p>
      <div className="flex flex-wrap gap-3">
        <Button asChild size="lg">
          <Link href={ROUTES.signup}>Đăng ký 3 buổi học thử</Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href="#lo-trinh">Xem lộ trình</Link>
        </Button>
      </div>
      <ul className="flex flex-wrap gap-x-5 gap-y-2 text-[14px] text-muted-foreground">
        {PERKS.map((p) => (
          <li key={p} className="inline-flex items-center gap-1.5">
            <Check
              strokeWidth={2}
              className="size-4 text-primary"
              aria-hidden
            />
            {p}
          </li>
        ))}
      </ul>
      <p className="mt-4 hidden items-center gap-2 font-mono text-[12px] text-muted-foreground lg:mt-0 lg:inline-flex">
        <MousePointer2 strokeWidth={1.75} className="size-4" aria-hidden />
        Cuộn xuống để xem công trình được dựng theo lộ trình
      </p>
    </div>
  );
}
