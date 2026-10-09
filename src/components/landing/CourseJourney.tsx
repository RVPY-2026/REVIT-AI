"use client";

import { cn } from "cn";
import Image from "next/image";
import { Reveal } from "@/components/ui/reveal";
import { useCountUp } from "@/lib/use-count-up";
import { useInView, useScrollProgress } from "@/lib/use-in-view";
import { SectionHeading } from "./SectionHeading";

const PHASES = [
  {
    share: "1/4",
    name: "Giai đoạn bắt đầu",
    tag: "1 kèm 1",
    focus: "Xây nền tảng, định hướng cá nhân",
    facts: [
      "Tối thiểu 45 ngày",
      "Thời gian linh hoạt",
      "45 phút mỗi buổi 1 kèm 1",
    ],
  },
  {
    share: "3/4",
    name: "Giai đoạn tăng cường",
    tag: "Chuỗi khoá nâng cao",
    focus: "Phát triển kỹ năng, làm dự án, ứng dụng thực tiễn",
    facts: [
      "Khoá 2 · Khoá 3 · Khoá 4",
      "Tổ chức thường niên, lịch cố định",
      "Học online 2 buổi mỗi tuần",
    ],
  },
];

// One track, four equal quarters: the 1-on-1 phase, then advanced courses 2–4.
const SEGMENTS = ["Kèm 1-1", "Khoá 2", "Khoá 3", "Khoá 4"];

const KNOWLEDGE = [
  {
    title: "Giai đoạn 1 kèm 1",
    body: "Nền tảng tư duy, định hướng lộ trình và kỹ năng cốt lõi.",
    image: "/images/landing/journey-structure-v1.webp",
    alt: "Mô hình kết cấu bê tông với móng, cột, dầm và sàn.",
  },
  {
    title: "Chuỗi khoá nâng cao",
    body: "Kỹ năng chuyên sâu, thực hành dự án và ứng dụng thực tế.",
    image: "/images/landing/journey-coordination-v1.webp",
    alt: "Mô hình công trình cắt mở, thể hiện phối hợp kết cấu, kiến trúc và hệ thống MEP.",
  },
  {
    title: "Kinh nghiệm từ giảng viên",
    body: "Quản lý đội ngũ, phối hợp bộ môn, xử lý tình huống và những lỗi không nên mắc.",
    image: "/images/landing/journey-mentoring-v1.webp",
    alt: "Bàn làm việc với mô hình kiến trúc và bàn tay rà soát chi tiết trên bản vẽ.",
  },
];

const ARC_DELAY = 450; // ms between the three knowledge arcs

/** "Timeline 1 lần đăng ký khoá học": a dimensioned track that fills as the reader scrolls. */
export function CourseJourney() {
  return (
    <section
      id="hanh-trinh"
      className="scroll-mt-6 bg-background-2 py-14 md:-scroll-mt-2 md:py-22"
    >
      <div className="content">
        <Reveal>
          <SectionHeading
            eyebrow="Hành trình học"
            title="Một lần đăng ký,"
            emphasis="học trọn hành trình."
          >
            Bắt đầu kèm riêng để có nền chắc, sau đó học cùng lớp nâng cao đến
            khi hoàn thành khoá.
          </SectionHeading>
        </Reveal>

        <JourneyTrack />
        <KnowledgeSplit />
      </div>
    </section>
  );
}

function JourneyTrack() {
  const [ref, p] = useScrollProgress<HTMLDivElement>(0.9, 0.2);
  const segment = Math.min(
    SEGMENTS.length - 1,
    Math.floor(p * SEGMENTS.length),
  );
  const done = p >= 1;
  const phase = segment === 0 ? 0 : 1;

  return (
    <div ref={ref} className="mb-14">
      <div className="mr-7">
        {/* Dimension string: 1/4 + 3/4, oblique ticks like a drawing. */}
        <div aria-hidden className="relative h-8">
          <div className="absolute inset-x-0 top-4 h-px bg-foreground/40" />
          {[0, 25, 100].map((left) => (
            <span
              key={left}
              className="absolute top-4 h-4 w-px -translate-y-1/2 rotate-45 bg-foreground/60"
              style={{ left: `${left}%` }}
            />
          ))}
          <span className="absolute top-0 left-[12.5%] -translate-x-1/2 bg-background-2 px-2 font-mono text-[13px] text-primary">
            1/4
          </span>
          <span className="absolute top-0 left-[62.5%] -translate-x-1/2 bg-background-2 px-2 font-mono text-[13px] text-primary">
            3/4
          </span>
        </div>

        {/* The track itself. */}
        <div className="relative mt-3">
          <div className="relative h-3 overflow-hidden rounded-full bg-foreground/10">
            <div
              className="absolute inset-y-0 left-0 bg-primary"
              style={{ width: `${p * 100}%` }}
            />
            {[25, 50, 75].map((left) => (
              <span
                key={left}
                className="absolute inset-y-0 w-0.5 bg-background-2"
                style={{ left: `${left}%` }}
              />
            ))}
          </div>
          <span
            aria-hidden
            className="absolute top-1.5 size-5 -translate-1/2 rounded-full border-[3px] border-primary bg-card"
            style={{ left: `${p * 100}%` }}
          />
          {/* End of the dimension string: course completed. */}
          <span
            aria-hidden
            className={cn(
              "absolute top-1.5 -right-7 size-3.5 -translate-y-1/2 rounded-full border-2 border-primary transition-colors duration-300",
              done ? "bg-primary" : "bg-background-2",
            )}
          />
          <ol className="mt-3 grid grid-cols-4 text-center font-mono text-[12px] sm:text-[13px]">
            {SEGMENTS.map((s, i) => (
              <li
                key={s}
                className={cn(
                  "transition-colors duration-300",
                  i === segment && !done
                    ? "font-medium text-foreground"
                    : "text-muted-foreground",
                  i < segment || done ? "text-primary" : "",
                )}
              >
                {s}
              </li>
            ))}
          </ol>
        </div>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-[1fr_3fr]">
        {PHASES.map((ph, i) => {
          const state =
            done || i < phase ? "done" : i === phase ? "active" : "next";
          return (
            <article
              key={ph.name}
              className={cn(
                "grid content-start gap-3 rounded-2xl border bg-card p-6 transition-colors duration-300",
                state === "active" ? "border-primary" : "border-border",
              )}
            >
              <div className="flex items-baseline justify-between gap-3 font-mono text-[13px]">
                <span className="text-primary">
                  {ph.share} · {ph.tag}
                </span>
                {state === "done" && (
                  <span className="text-muted-foreground">Đã xong</span>
                )}
              </div>
              <h3 className="text-[21px] font-medium">{ph.name}</h3>
              <p className="text-muted-foreground">{ph.focus}</p>
              <p className="border-t border-border pt-3 text-[14px]">
                {ph.facts.join(" · ")}
              </p>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function KnowledgeSplit() {
  const [ref, inView] = useInView<HTMLDivElement>();
  return (
    <div ref={ref} className="grid items-center gap-8 lg:grid-cols-[260px_1fr]">
      <KnowledgeRing drawn={inView} />
      {/* Legend for the ring: each rule fills with the same tone as its arc. */}
      <ul className="grid gap-6 md:grid-cols-3">
        {KNOWLEDGE.map((k, i) => (
          <li key={k.title} className="relative grid content-start gap-2 pt-4">
            <span
              aria-hidden
              className="absolute inset-x-0 top-0 h-0.5 bg-border"
            />
            <span
              aria-hidden
              className="absolute inset-x-0 top-0 h-0.5 origin-left bg-primary transition-transform duration-500 ease-out"
              style={{
                transform: `scaleX(${inView ? 1 : 0})`,
                transitionDelay: `${i * ARC_DELAY}ms`,
                opacity: [1, 0.7, 0.45][i],
              }}
            />
            <div className="mb-2 overflow-hidden rounded-2xl border border-border">
              <Image
                src={k.image}
                width={960}
                height={720}
                sizes="(min-width: 1280px) 288px, (min-width: 1024px) 24vw, (min-width: 768px) 30vw, calc(100vw - 32px)"
                alt={k.alt}
                className="aspect-[4/3] h-auto w-full object-cover"
              />
            </div>
            <h3 className="text-[18px] font-medium">
              <span className="mr-2 font-mono text-[13px] font-normal text-primary">
                1/3
              </span>
              {k.title}
            </h3>
            <p className="text-[15px] text-muted-foreground">{k.body}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Three equal arcs = "100% kiến thức toàn diện", drawn one after another. */
function KnowledgeRing({ drawn }: { drawn: boolean }) {
  const r = 70;
  const c = 2 * Math.PI * r;
  const seg = c / 3;
  const percent = Math.round(useCountUp(drawn ? 100 : 0, ARC_DELAY * 3 + 200));
  return (
    <figure className="relative mx-auto size-[220px]">
      <svg viewBox="0 0 180 180" className="size-full -rotate-90" aria-hidden>
        <circle
          cx="90"
          cy="90"
          r={r}
          fill="none"
          stroke="var(--border)"
          strokeWidth="18"
        />
        {[1, 0.7, 0.45].map((o, i) => (
          <circle
            key={i}
            cx="90"
            cy="90"
            r={r}
            fill="none"
            stroke="var(--primary)"
            strokeOpacity={o}
            strokeWidth="18"
            strokeDasharray={drawn ? `${seg - 4} ${c - seg + 4}` : `0 ${c}`}
            strokeDashoffset={-i * seg}
            style={{
              transition: "stroke-dasharray 500ms ease-out",
              transitionDelay: `${i * ARC_DELAY}ms`,
            }}
          />
        ))}
      </svg>
      <figcaption className="absolute inset-0 grid place-content-center text-center">
        <span className="font-heading text-[28px] font-medium tabular-nums">
          {drawn ? `${percent}%` : "100%"}
        </span>
        <span className="text-[13px] text-muted-foreground">
          kiến thức toàn diện
        </span>
      </figcaption>
    </figure>
  );
}
