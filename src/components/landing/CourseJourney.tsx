"use client";

import { cn } from "cn";
import Image from "next/image";
import { Reveal } from "@/components/ui/reveal";
import { useCountUp } from "@/lib/use-count-up";
import { useInView, useScrollProgress } from "@/lib/use-in-view";
import { SectionHeading } from "./SectionHeading";

// Each phase is a column of a schedule hung under the track, as wide as its share of it.
const PHASES = [
  {
    name: "Giai đoạn bắt đầu",
    focus: "Xây nền tảng, định hướng cá nhân.",
    facts: [
      ["Hình thức", "1 kèm 1"],
      ["Thời lượng", "Tối thiểu 45 ngày"],
      ["Mỗi buổi", "45 phút"],
      ["Lịch học", "Linh hoạt"],
    ],
  },
  {
    name: "Giai đoạn tăng cường",
    focus: "Phát triển kỹ năng, làm dự án, ứng dụng thực tiễn.",
    facts: [
      ["Gồm", "Khoá 2 · Khoá 3 · Khoá 4"],
      ["Hình thức", "Học online"],
      ["Lịch học", "Cố định, 2 buổi mỗi tuần"],
      ["Tổ chức", "Thường niên"],
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

      {/* Phase schedule: columns start on the track's 1/4 tick, like extension lines. */}
      <div className="mt-6 mr-7 grid border-t border-foreground/40 md:grid-cols-[1fr_3fr]">
        {PHASES.map((ph, i) => {
          return (
            <article
              key={ph.name}
              className={cn(
                "relative grid content-start gap-4 py-6 md:px-6 md:first:pl-0",
                i > 0 && "border-t border-border md:border-t-0 md:border-l md:border-l-foreground/40",
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "absolute inset-x-0 -top-px h-0.5 origin-left bg-primary transition-transform duration-500",
                  done || i <= phase ? "scale-x-100" : "scale-x-0",
                )}
              />
              <header className="grid gap-1">
                <p className="font-mono text-[13px] text-primary">
                  {String(i + 1).padStart(2, "0")} · {i === 0 ? "1/4" : "3/4"} hành trình
                </p>
                <h3 className="text-[21px] font-medium">{ph.name}</h3>
                <p className="text-muted-foreground">{ph.focus}</p>
              </header>
              {/* Phase facts as a Revit schedule: header band, hairline grid (FRONTEND_RULES §3.7). */}
              <table className="w-full border-collapse border border-foreground/40 bg-card text-left text-[14px]">
                <caption className="sr-only">Thông số {ph.name}</caption>
                <thead>
                  <tr className="border-b border-foreground/40 bg-foreground/[.04] font-mono text-[12px] text-muted-foreground">
                    <th scope="col" className="w-[7.5rem] border-r border-border px-3 py-2 font-normal">
                      Thông số
                    </th>
                    <th scope="col" className="px-3 py-2 font-normal">
                      Chi tiết
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {ph.facts.map(([k, v]) => (
                    <tr key={k} className="border-b border-border last:border-b-0">
                      <th
                        scope="row"
                        className="border-r border-border px-3 py-2.5 align-baseline font-mono text-[12px] font-normal text-muted-foreground"
                      >
                        {k}
                      </th>
                      <td className="px-3 py-2.5 align-baseline">{v}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
