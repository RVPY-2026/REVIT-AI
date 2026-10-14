import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/constants";

const PERKS = [
  "3 buổi học thử miễn phí",
  "Học 1 kèm 1 đầu khoá",
  "Cộng đồng Zalo",
];

const WORD_MS = 75;

/** Headline words, each rising out of its own mask; `from` is the index of the first word for stagger. */
function Words({ text, from = 0 }: { text: string; from?: number }) {
  return text.split(" ").map((w, i) => (
    <span key={i}>
      {i > 0 && " "}
      <span className="inline-block overflow-hidden py-[.14em] align-bottom -my-[.14em]">
        <span className="hero-word" style={{ animationDelay: `${150 + (from + i) * WORD_MS}ms` }}>
          {w}
        </span>
      </span>
    </span>
  ));
}

const fade = (ms: number) => ({ animationDelay: `${ms}ms` });

/** First step of BuildStory. Rendered on the server so the h1 is in the initial HTML. */
export function HeroIntro() {
  return (
    <div className="grid justify-items-start gap-6 lg:gap-5 hero-compact:gap-4 hero-short:gap-3">
      {/* Sheet label: level tag + mono caption, like the header of a drawing sheet. */}
      <p style={fade(0)} className="hero-fade inline-flex items-center gap-2.5 border-y border-foreground/40 py-1.5 font-mono text-[12px] uppercase tracking-[.08em] text-muted-foreground">
        <svg aria-hidden width="12" height="10" viewBox="0 0 12 10" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round" className="text-primary">
          <path d="M6 9 L1 1 H11 Z" />
        </svg>
        Khoá học Revit BIM cho người đã đi làm
      </p>
      <h1 className="font-sans text-[40px] font-light tracking-[-.025em] md:text-[56px] xl:text-[68px] hero-compact:text-[56px] hero-short:text-[40px]">
        <Words text="Dựng cả công trình trong Revit," />{" "}
        <strong className="hero-select font-semibold" style={fade(1250)}>
          <Words text="từ móng đến bàn giao." from={6} />
        </strong>
      </h1>
      <p style={fade(1100)} className="hero-fade max-w-[48ch] text-lg text-muted-foreground hero-short:text-base">
        Lộ trình Revit BIM cho kiến trúc sư, kỹ sư 3–5 năm kinh nghiệm: từ
        định vị dự án đến bàn giao mô hình.
      </p>
      <div style={fade(1250)} className="hero-fade flex flex-wrap gap-3">
        <Button asChild size="lg">
          <Link href={ROUTES.signup}>Đăng ký 3 buổi học thử</Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href="#lo-trinh">Xem lộ trình</Link>
        </Button>
      </div>
      <ol style={fade(1400)} className="hero-fade flex flex-wrap gap-x-5 gap-y-2 text-[14px] text-muted-foreground">
        {PERKS.map((p, i) => (
          <li key={p} className="inline-flex items-center gap-2">
            <span aria-hidden className="inline-flex size-5 items-center justify-center rounded-full border border-primary font-mono text-[11px] text-primary">
              {i + 1}
            </span>
            {p}
          </li>
        ))}
      </ol>
      {/* Dimension line: arrow ticks at both ends, text set on the line. */}
      <p style={fade(1600)} className="hero-fade mt-4 hidden w-full max-w-[52ch] items-center gap-3 font-mono text-[12px] text-muted-foreground lg:mt-0 lg:flex whitespace-nowrap">
        <span aria-hidden className="h-2.5 w-px bg-foreground/50" />
        <span aria-hidden className="h-px flex-1 bg-foreground/30" />
        Cuộn để xem công trình được dựng
        <span aria-hidden className="h-px flex-1 bg-foreground/30" />
        <span aria-hidden className="h-2.5 w-px bg-foreground/50" />
      </p>
    </div>
  );
}
