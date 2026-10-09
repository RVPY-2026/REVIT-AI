"use client";

import { useEffect, useState, type ReactNode } from "react";
import { cn } from "cn";
import { Reveal } from "@/components/ui/reveal";
import { useInView } from "@/lib/use-in-view";
import { NoteList } from "./NoteList";
import { SectionHeading } from "./SectionHeading";

// Career path drawn as a building section, top floor first: each role is a storey with its
// slab elevation. The reader climbs from the ground floor up.
const LEVELS: {
  elev: string;
  role: string;
  body: string;
  work: string[];
  art: ReactNode;
}[] = [
  {
    elev: "+7.200",
    role: "BIM Manager",
    body: "Lập chiến lược BEP, xây dựng quy chuẩn cho cả công ty.",
    work: ["BEP", "Quy chuẩn công ty", "Quản lý đội ngũ"],
    art: <ManagerArt />,
  },
  {
    elev: "+3.600",
    role: "BIM Coordinator",
    body: "Điều phối đa bộ môn, chủ trì xử lý xung đột, kiểm soát chất lượng.",
    work: ["Điều phối đa bộ môn", "Xử lý xung đột", "Kiểm soát chất lượng"],
    art: <CoordinatorArt />,
  },
  {
    elev: "±0.000",
    role: "BIM Modeler",
    body: "Dựng mô hình chính xác, xuất bản vẽ 2D và bảng thống kê.",
    work: ["Mô hình 3D", "Bản vẽ 2D", "Bảng thống kê"],
    art: <ModelerArt />,
  },
];

const GROUND = LEVELS.length - 1;
const CLIMB_MS = 2200;

const VALUES = [
  "Lộ trình thực tiễn, dễ hiểu, dễ áp dụng",
  "Phối hợp hiệu quả đa bộ môn",
  "Kiểm soát chất lượng chặt chẽ",
  "Tiết kiệm thời gian và chi phí",
  "Nâng cao năng lực cạnh tranh",
];

export function CareerLevels() {
  const [ref, inView] = useInView<HTMLDivElement>("0px 0px -30% 0px");
  const [active, setActive] = useState(GROUND);
  const [touched, setTouched] = useState(false);

  // Climb one storey at a time once the drawing is on screen, until the reader takes over.
  useEffect(() => {
    if (!inView || touched || active === 0) return;
    const id = setTimeout(() => setActive((a) => a - 1), CLIMB_MS);
    return () => clearTimeout(id);
  }, [inView, touched, active]);

  return (
    <section className="py-14 md:py-22">
      <div className="content grid gap-12 lg:grid-cols-2 lg:items-center">
        <Reveal>
          <SectionHeading
            eyebrow="Đầu ra"
            title="Học đúng trọng tâm,"
            emphasis="lên từng cao độ nghề nghiệp."
          >
            Làm đúng tiêu chuẩn, bàn giao chuyên nghiệp: từ dựng mô hình đến
            điều phối và quản lý BIM.
          </SectionHeading>
          <NoteList items={VALUES} />
        </Reveal>

        <Reveal delay={120}>
          <div ref={ref} className="relative pl-[76px]">
            {/* Pitched roof: makes the stack read as a house at a glance. */}
            <svg
              aria-hidden
              viewBox="0 0 100 40"
              preserveAspectRatio="none"
              className="-mx-2 -mb-px block h-12 w-[calc(100%+1rem)] text-foreground/40"
            >
              <path
                d="M0 39.5 50 1 100 39.5Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
            <ol aria-label="Lộ trình nghề nghiệp BIM">
              {LEVELS.map((l, i) => {
                const on = i === active;
                const reached = i >= active;
                return (
                  <li key={l.role} className="relative">
                    <button
                      type="button"
                      aria-expanded={on}
                      onClick={() => {
                        setTouched(true);
                        setActive(i);
                      }}
                      className={cn(
                        "grid w-full gap-1 border-x border-b-2 px-5 py-4 text-left transition-colors duration-300 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none",
                        on
                          ? "border-x-primary border-b-primary bg-primary-soft"
                          : "cursor-pointer border-x-foreground/40 border-b-foreground/40 hover:bg-foreground/[.04]",
                      )}
                    >
                      <span className="flex items-baseline justify-between gap-3">
                        <span
                          className={cn(
                            "text-[21px] font-medium",
                            !reached && "text-muted-foreground",
                          )}
                        >
                          {l.role}
                        </span>
                        <span className="font-mono text-[12px] text-muted-foreground">
                          L{LEVELS.length - i}
                        </span>
                      </span>
                      <span
                        className={cn(
                          "grid transition-[grid-template-rows] duration-300 ease-out",
                          on ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
                        )}
                      >
                        <span className="grid min-h-0 grid-cols-[1fr_auto] items-center gap-4 overflow-hidden">
                          <span className="grid gap-3 pt-1">
                            <span className="text-[15px] text-muted-foreground">
                              {l.body}
                            </span>
                            <span className="flex flex-wrap gap-1.5">
                              {l.work.map((w) => (
                                <span
                                  key={w}
                                  className="rounded-full border border-primary/50 bg-card px-2.5 py-0.5 text-[12px] font-medium text-primary"
                                >
                                  {w}
                                </span>
                              ))}
                            </span>
                          </span>
                          <span
                            aria-hidden
                            className="hidden w-[104px] text-primary sm:block"
                          >
                            {l.art}
                          </span>
                        </span>
                      </span>
                    </button>
                    {/* Slab elevation tag: a triangle sitting on this storey's floor line. */}
                    <span
                      aria-hidden
                      className={cn(
                        "absolute bottom-0 -left-[76px] flex w-[70px] translate-y-1/2 items-center gap-1.5 font-mono text-[12px] transition-colors duration-300",
                        reached ? "text-primary" : "text-muted-foreground",
                      )}
                    >
                      {l.elev}
                      <span className="size-0 border-x-[5px] border-t-[7px] border-x-transparent border-t-current" />
                    </span>
                  </li>
                );
              })}
            </ol>
            {/* Ground with section hatching */}
            <svg
              aria-hidden
              className="mt-0 h-4 w-full text-foreground/30"
              preserveAspectRatio="none"
            >
              <defs>
                <pattern
                  id="career-ground"
                  width="8"
                  height="8"
                  patternUnits="userSpaceOnUse"
                  patternTransform="rotate(45)"
                >
                  <line
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="8"
                    stroke="currentColor"
                    strokeWidth="1"
                  />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#career-ground)" />
            </svg>
            <p className="mt-3 font-mono text-[12px] text-muted-foreground">
              Mặt cắt nghề nghiệp · bấm vào từng tầng để xem
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

// Line drawings for each storey, 1.75 stroke like the icon set.
const art = {
  viewBox: "0 0 104 80",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinejoin: "round" as const,
  strokeLinecap: "round" as const,
  className: "h-auto w-full",
};

/** Isometric block with storeys: the model. */
function ModelerArt() {
  return (
    <svg {...art}>
      <path d="M52 8 88 26 52 44 16 26Z" />
      <path d="M16 26v28l36 18V44M88 26v28L52 72" />
      <path d="M16 40l36 18 36-18" opacity=".5" />
      <path d="M34 35v28M70 35v28" opacity=".5" />
    </svg>
  );
}

/** A duct crossing a beam, ringed: a clash. */
function CoordinatorArt() {
  return (
    <svg {...art}>
      <rect x="8" y="30" width="88" height="14" rx="2" />
      <rect x="44" y="6" width="14" height="68" rx="2" opacity=".55" />
      <circle cx="51" cy="37" r="20" strokeDasharray="4 4" />
      <path d="M78 12l8-8M86 12l-8-8" />
    </svg>
  );
}

/** A standards document with checked items: the BEP. */
function ManagerArt() {
  return (
    <svg {...art}>
      <path d="M26 4h40l14 14v58H26Z" />
      <path d="M66 4v14h14" />
      <path d="M34 32l4 4 7-7M34 46l4 4 7-7M34 60l4 4 7-7" />
      <path d="M52 34h20M52 48h20M52 62h14" opacity=".55" />
    </svg>
  );
}
