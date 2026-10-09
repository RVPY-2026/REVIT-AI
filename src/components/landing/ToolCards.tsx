"use client";

import { useState, type ReactNode } from "react";
import { cn } from "cn";
import { Reveal } from "@/components/ui/reveal";
import { useInView } from "@/lib/use-in-view";
import { SectionHeading } from "./SectionHeading";

// Only Auto Join is a confirmed tool name; the other two describe what the suite does.
// Each tool is shown by what it does to a drawing, not by an icon.
const TOOLS: {
  title: string;
  body: string;
  Drawing: (p: { done: boolean }) => ReactNode;
}[] = [
  {
    title: "Auto Join",
    body: "Join cấu kiện theo thứ tự ưu tiên cho cả dự án.",
    Drawing: JoinDrawing,
  },
  {
    title: "Đánh số tự động",
    body: "Đánh số cấu kiện, phòng, bản vẽ theo quy tắc.",
    Drawing: NumberingDrawing,
  },
  {
    title: "Xuất bản vẽ hàng loạt",
    body: "Xuất PDF, DWG cả bộ sheet trong một lần.",
    Drawing: ExportDrawing,
  },
];

const T = "transition-all duration-500 ease-out motion-reduce:transition-none";

export function ToolCards() {
  const [ref, inView] = useInView<HTMLUListElement>("0px 0px -25% 0px");
  // Hovering a drawing shows it "before" the tool ran, so the change is easy to compare.
  const [peek, setPeek] = useState<number | null>(null);

  return (
    <section
      id="cong-cu"
      className="scroll-mt-16 bg-background-2 py-14 md:py-22"
    >
      <div className="content">
        <Reveal>
          <SectionHeading
            eyebrow="Công cụ đi kèm"
            title="Bộ add-in RVPY"
            emphasis="cho học viên."
          >
            Dùng trong suốt khoá học trên Revit{" "}
            <span className="font-mono text-[14px]">2025 · 2026 · 2027</span>.
          </SectionHeading>
        </Reveal>
        <ul ref={ref} className="grid gap-8 md:grid-cols-3 md:gap-6">
          {TOOLS.map(({ title, body, Drawing }, i) => {
            const done = inView && peek !== i;
            return (
              <li key={title}>
                <figure>
                  <div
                    onMouseEnter={() => setPeek(i)}
                    onMouseLeave={() => setPeek(null)}
                    className="relative aspect-[12/7] overflow-hidden rounded-2xl border border-border bg-card text-primary"
                  >
                    <Drawing done={done} />
                    <span className="absolute top-3 right-3 font-mono text-[12px] text-muted-foreground">
                      {done ? "Sau" : "Trước"}
                    </span>
                  </div>
                  <figcaption className="mt-4 max-w-[38ch] text-[15px] text-muted-foreground">
                    <strong className="font-medium text-foreground">
                      {title}.
                    </strong>{" "}
                    {body}
                  </figcaption>
                </figure>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

const svg = {
  viewBox: "0 0 240 140",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  className: "size-full",
  "aria-hidden": true,
} as const;

/** Plan of a wall T-junction: overlapping outlines → one clean joined outline. */
function JoinDrawing({ done }: { done: boolean }) {
  return (
    <svg {...svg}>
      {/* Unjoined: both walls drawn whole, lines cross inside the junction. */}
      <g className={T} style={{ opacity: done ? 0 : 1 }}>
        <rect x="30" y="62" width="150" height="16" />
        <rect x="130" y="20" width="16" height="58" />
        <circle cx="138" cy="66" r="20" strokeDasharray="4 4" />
      </g>
      {/* Joined: a single outline. */}
      <path
        className={T}
        style={{ opacity: done ? 1 : 0 }}
        d="M30 62H130V20H146V62H180V78H30Z"
        fill="var(--primary-soft)"
      />
      <g
        className="text-muted-foreground"
        stroke="currentColor"
        strokeWidth="1"
      >
        <path d="M30 96v8M180 96v8M30 100h150" opacity=".6" />
      </g>
    </svg>
  );
}

/** Floor plan whose rooms receive numbers one after another. */
function NumberingDrawing({ done }: { done: boolean }) {
  const rooms = [
    [30, 22],
    [90, 22],
    [150, 22],
    [30, 72],
    [90, 72],
    [150, 72],
  ];
  return (
    <svg {...svg}>
      <rect
        x="30"
        y="22"
        width="180"
        height="100"
        className="text-foreground/40"
        stroke="currentColor"
      />
      <path
        d="M90 22v100M150 22v100M30 72h180"
        className="text-foreground/40"
        stroke="currentColor"
      />
      {rooms.map(([x, y], i) => (
        <text
          key={i}
          x={x + 30}
          y={y + 30}
          textAnchor="middle"
          fill="currentColor"
          stroke="none"
          className={cn("font-mono text-[11px]", T)}
          style={{
            opacity: done ? 1 : 0,
            transitionDelay: done ? `${i * 120}ms` : "0ms",
          }}
        >
          P.{101 + i}
        </text>
      ))}
    </svg>
  );
}

/** A sheet set fanning out of the stack, each sheet tagged with its export format. */
function ExportDrawing({ done }: { done: boolean }) {
  const sheets = ["A-101", "A-102", "A-103", "A-104"];
  return (
    <svg {...svg}>
      {sheets.map((s, i) => (
        <g
          key={s}
          className={T}
          style={{
            transform: done
              ? `translate(${i * 44}px, ${i * 6}px)`
              : `translate(${i * 3}px, ${i * 3}px)`,
            transitionDelay: done ? `${i * 90}ms` : "0ms",
          }}
        >
          <rect
            x="24"
            y="24"
            width="64"
            height="86"
            rx="2"
            fill="var(--background)"
          />
          <rect x="62" y="92" width="22" height="14" />
          <text
            x="30"
            y="36"
            fill="currentColor"
            stroke="none"
            className="font-mono text-[9px]"
          >
            {s}
          </text>
          <text
            x="73"
            y="102"
            textAnchor="middle"
            fill="currentColor"
            stroke="none"
            className="font-mono text-[7px]"
          >
            {i % 2 ? "DWG" : "PDF"}
          </text>
        </g>
      ))}
    </svg>
  );
}
