"use client";

import type { CSSProperties, ReactNode } from "react";
import { Check, Download, MonitorPlay, Users } from "lucide-react";
import { cn } from "cn";
import { Reveal } from "@/components/ui/reveal";
import { useScrollProgress } from "@/lib/use-in-view";
import { SectionHeading } from "./SectionHeading";

const STEPS: {
  title: string;
  body: string;
  Mock: (p: { on: boolean }) => ReactNode;
}[] = [
  {
    title: "Đăng ký",
    body: "Điền form học thử. RVPY liên hệ qua Zalo trong ngày.",
    Mock: FormMock,
  },
  {
    title: "Vào cộng đồng",
    body: "Tham gia đủ 2 nhóm Zalo để nhận tài liệu và lịch học.",
    Mock: GroupsMock,
  },
  {
    title: "Cài phần mềm",
    body: "Tải bộ cài trên trang học viên. RVPY hỗ trợ nếu máy gặp lỗi.",
    Mock: InstallMock,
  },
  {
    title: "Học 3 buổi",
    body: "Học trên dự án thật, hỏi trực tiếp giảng viên trong buổi học.",
    Mock: LessonMock,
  },
];

// Every animated part of the mock-ups shares this transition.
const T = "transition-all duration-500 ease-out motion-reduce:transition-none";

/** The 9-day trial as four small screens that play through as the reader scrolls. */
export function TrialSteps() {
  const [ref, p] = useScrollProgress<HTMLOListElement>(0.8, 0.25);
  const reached = Math.floor(p * STEPS.length + 0.35);

  return (
    <section
      id="hoc-thu"
      className="scroll-mt-6 bg-background-2 py-14 md:-scroll-mt-2 md:py-22"
    >
      <div className="content">
        <Reveal>
          <SectionHeading
            eyebrow="9 ngày trải nghiệm"
            title="Học thử 3 buổi"
            emphasis="trước khi quyết định."
          >
            Không mất phí học thử. Học xong thấy hợp thì mới đăng ký chính thức.
          </SectionHeading>
        </Reveal>
        {/* Programme ruler: nine days like a Gantt scale; the bar fills as the steps play. */}
        <div aria-hidden className="mb-8 hidden lg:block">
          <div className="relative h-2 border border-foreground/40">
            <span
              className="absolute inset-y-0 left-0 origin-left bg-primary transition-transform duration-500 ease-out motion-reduce:transition-none"
              style={{ width: "100%", transform: `scaleX(${p})` }}
            />
          </div>
          <div className="grid grid-cols-9 font-mono text-[12px] text-muted-foreground">
            {Array.from({ length: 9 }, (_, d) => (
              <span
                key={d}
                className="border-l border-foreground/40 pt-1 pl-1.5 last:border-r"
              >
                {d + 1}
              </span>
            ))}
          </div>
          <p className="mt-1 text-right font-mono text-[12px] text-muted-foreground">
            Ngày trải nghiệm
          </p>
        </div>
        <ol
          ref={ref}
          className="grid gap-x-5 gap-y-10 sm:grid-cols-2 lg:grid-cols-4"
        >
          {STEPS.map(({ title, body, Mock }, i) => {
            const on = i < reached;
            return (
              <li key={title} className="grid content-start gap-2.5">
                <div className="relative mb-3 h-[156px] overflow-hidden rounded-2xl border border-border bg-card p-4">
                  <Mock on={on} />
                </div>
                {/* Progress rail: fills step by step. */}
                <div className="relative h-0.5 bg-border">
                  <span
                    className={cn("absolute inset-0 origin-left bg-primary", T)}
                    style={{ transform: `scaleX(${on ? 1 : 0})` }}
                  />
                </div>
                <h3 className="mt-2 text-[18px] font-medium">
                  <span className="mr-2 font-mono text-[13px] font-normal text-primary">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  {title}
                </h3>
                <p className="text-[15px] text-muted-foreground">{body}</p>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

/** Text placeholder bar inside a mock-up. */
function Bar({
  className,
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <span
      className={cn("block h-2 rounded-full bg-foreground/12", className)}
      style={style}
    />
  );
}

function FormMock({ on }: { on: boolean }) {
  const fields = [70, 55];
  return (
    <div aria-hidden className="grid gap-2.5">
      {fields.map((w, i) => (
        <div key={i} className="grid gap-1">
          <Bar className="w-12" />
          <div className="h-6 rounded-lg border border-border px-2 py-2">
            <Bar
              className={cn("bg-foreground/35", T)}
              style={{
                width: on ? `${w}%` : "0%",
                transitionDelay: `${i * 250}ms`,
              }}
            />
          </div>
        </div>
      ))}
      <span
        className={cn(
          "h-5 w-20 justify-self-end rounded-lg border",
          T,
          on ? "border-primary bg-primary" : "border-border bg-transparent",
        )}
        style={{ transitionDelay: "800ms" }}
      />
    </div>
  );
}

function GroupsMock({ on }: { on: boolean }) {
  return (
    <div aria-hidden className="grid h-full content-center gap-3">
      {["Nhóm Zalo 1", "Nhóm Zalo 2"].map((g, i) => (
        <div
          key={g}
          className="flex items-center gap-3 rounded-xl border border-border p-2.5"
        >
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary-soft text-primary">
            <Users strokeWidth={1.75} className="size-4" />
          </span>
          <span className="grid flex-1 gap-1.5">
            <span className="text-[13px] font-medium">{g}</span>
            <Bar className="w-3/4" />
          </span>
          <span
            className={cn(
              "grid size-6 place-items-center rounded-full border",
              T,
              on
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border text-transparent",
            )}
            style={{ transitionDelay: `${300 + i * 350}ms` }}
          >
            <Check strokeWidth={2.5} className="size-3.5" />
          </span>
        </div>
      ))}
    </div>
  );
}

function InstallMock({ on }: { on: boolean }) {
  return (
    <div aria-hidden className="grid h-full content-center gap-3">
      <div className="flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-xl bg-primary-soft text-primary">
          <Download strokeWidth={1.75} className="size-5" />
        </span>
        <span className="grid gap-1">
          <span className="font-mono text-[13px]">RVPY Add-in</span>
          <span className="font-mono text-[12px] text-muted-foreground">
            Bộ cài cho Revit
          </span>
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-foreground/10">
        <span
          className={cn(
            "block h-full origin-left bg-primary transition-transform duration-[1400ms] ease-in-out",
          )}
          style={{ transform: `scaleX(${on ? 1 : 0.04})` }}
        />
      </div>
      <span
        className={cn(
          "inline-flex items-center gap-1.5 text-[13px] text-primary",
          T,
          on ? "opacity-100" : "opacity-0",
        )}
        style={{ transitionDelay: "1300ms" }}
      >
        <Check strokeWidth={2} className="size-4" />
        Đã cài xong
      </span>
    </div>
  );
}

function LessonMock({ on }: { on: boolean }) {
  return (
    <div aria-hidden className="grid h-full grid-rows-[1fr_auto] gap-3">
      <div className="relative grid place-items-center rounded-xl border border-border bg-foreground/[.04]">
        <MonitorPlay strokeWidth={1.5} className="size-8 text-primary" />
        <span className="absolute top-2 left-2 inline-flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
          <span
            className={cn(
              "size-1.5 rounded-full",
              on ? "animate-pulse bg-primary" : "bg-foreground/25",
            )}
          />
          Trực tiếp
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {[1, 2, 3].map((n) => (
          <span
            key={n}
            className="grid gap-1 text-center font-mono text-[11px] text-muted-foreground"
          >
            <span className="h-1.5 overflow-hidden rounded-full bg-foreground/10">
              <span
                className={cn("block h-full origin-left bg-primary", T)}
                style={{
                  transform: `scaleX(${on ? 1 : 0})`,
                  transitionDelay: `${(n - 1) * 450}ms`,
                }}
              />
            </span>
            Buổi {n}
          </span>
        ))}
      </div>
    </div>
  );
}
