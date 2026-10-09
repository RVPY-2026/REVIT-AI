"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "cn";
import type { BuildingScene } from "./building-scene";
import { MEP_LEGEND, STORY_STEPS } from "./story-steps";

const STEP_COUNT = STORY_STEPS.length + 1; // + the intro

/**
 * Home hero + curriculum as one scrollytelling section: the copy scrolls on the left while a
 * sticky drawing sheet on the right assembles a building, one curriculum module at a time.
 */
export function BuildStory({ intro }: { intro: ReactNode }) {
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const labelsRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [status, setStatus] = useState<"loading" | "ready" | "failed">("loading");

  useEffect(() => {
    const section = sectionRef.current;
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    const labelLayer = labelsRef.current;
    if (!section || !stage || !canvas || !labelLayer) return;

    const steps = Array.from(section.querySelectorAll<HTMLElement>("[data-step]"));
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const desktop = window.matchMedia("(min-width: 1024px)");
    let scene: BuildingScene | null = null;
    let disposed = false;
    let lastActive = -1;

    // Story time: index of the step under the focus line + how far through it we are.
    function readProgress() {
      const vh = window.innerHeight;
      const stageH = desktop.matches ? 0 : stage!.getBoundingClientRect().height;
      const focus = stageH + (vh - stageH) * 0.5;
      let t = 0;
      for (let i = 0; i < steps.length; i++) {
        const r = steps[i].getBoundingClientRect();
        if (focus < r.top) break;
        t = focus < r.bottom ? i + (focus - r.top) / r.height : i + 1;
      }
      t = Math.min(t, STEP_COUNT);
      scene?.setProgress(t);
      if (barRef.current) barRef.current.style.transform = `scaleX(${Math.max(0, (t - 1) / (STEP_COUNT - 1))})`;
      const idx = Math.min(Math.floor(t), STEP_COUNT - 1);
      if (idx !== lastActive) {
        lastActive = idx;
        setActive(idx);
      }
    }

    const isDark = () => document.documentElement.classList.contains("dark");
    const themeObserver = new MutationObserver(() => scene?.setTheme(isDark()));
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    const resizeObserver = new ResizeObserver(([entry]) => {
      scene?.resize(entry.contentRect.width, entry.contentRect.height);
      readProgress();
    });

    const visibility = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) scene?.start();
      else scene?.stop();
    });

    // three.js is ~150 kB gzipped: load it after first paint so the hero copy is never blocked.
    import("./building-scene")
      .then(({ createBuildingScene }) => {
        if (disposed) return;
        scene = createBuildingScene(canvas, labelLayer, {
          dark: isDark(),
          reducedMotion,
        });
        const box = canvas.getBoundingClientRect();
        scene.resize(box.width, box.height);
        readProgress();
        resizeObserver.observe(canvas);
        visibility.observe(section);
        setStatus("ready");
      })
      .catch(() => setStatus("failed"));

    readProgress();
    window.addEventListener("scroll", readProgress, { passive: true });
    window.addEventListener("resize", readProgress);

    return () => {
      disposed = true;
      window.removeEventListener("scroll", readProgress);
      window.removeEventListener("resize", readProgress);
      themeObserver.disconnect();
      resizeObserver.disconnect();
      visibility.disconnect();
      scene?.dispose();
    };
  }, []);

  const stepNo = Math.max(active, 1);
  const showLegend = active === 4 || active === 5;

  return (
    <section ref={sectionRef} aria-label="Giới thiệu khoá học và lộ trình" className="relative bg-hero">
      <div className="content grid lg:grid-cols-2 lg:gap-x-8 xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] xl:gap-x-12">
        <div
          data-step="0"
          className="flex items-center py-14 lg:col-start-1 lg:row-start-1 lg:min-h-[calc(100svh-65px)] lg:py-6"
        >
          {intro}
        </div>

        {/* Drawing sheet with the 3D model. Sticky for the whole story. */}
        <div
          ref={stageRef}
          className="sticky top-0 z-10 -mx-4 h-[50svh] border-y border-border bg-background min-[521px]:-mx-6 lg:col-start-2 lg:row-span-7 lg:row-start-1 lg:top-16 lg:mx-0 lg:h-[calc(100svh-4rem)] lg:self-start lg:border-0 lg:bg-transparent lg:py-6"
        >
          <div className="relative size-full overflow-hidden bg-background lg:rounded-2xl lg:border lg:border-border lg:bg-background/80">
            <PaperGrid />
            <canvas
              ref={canvasRef}
              className={cn(
                "absolute inset-0 size-full touch-pan-y transition-opacity duration-500",
                status === "ready" ? "opacity-100" : "opacity-0",
              )}
              role="img"
              aria-label="Mô hình 3D một toà nhà 4 tầng được dựng dần theo lộ trình học: định vị, kết cấu, kiến trúc, MEP, kiểm tra va chạm và bàn giao."
            />
            <div ref={labelsRef} className="pointer-events-none absolute inset-0 overflow-hidden" />

            {status !== "ready" && (
              <p className="absolute inset-0 grid place-items-center font-mono text-[13px] text-muted-foreground">
                {status === "loading" ? "Đang dựng mô hình 3D…" : "Trình duyệt chưa hỗ trợ hiển thị 3D."}
              </p>
            )}

            {/* Sheet frame */}
            <div aria-hidden className="pointer-events-none absolute inset-3 border border-foreground/15 lg:inset-4" />

            {/* Stage progress */}
            <div
              aria-hidden
              className="pointer-events-none absolute top-6 right-6 left-6 lg:top-8 lg:right-8 lg:left-8"
            >
              <div className="flex items-center justify-between gap-4 font-mono text-[12px] text-muted-foreground">
                <span>
                  {active === 0 ? "Phối cảnh 3D" : `Bước ${String(stepNo).padStart(2, "0")} / 0${STORY_STEPS.length}`}
                  <span className="text-foreground">
                    {" "}
                    · {active === 0 ? "Toàn bộ công trình" : STORY_STEPS[stepNo - 1].stage}
                  </span>
                </span>
                <NorthArrow />
              </div>
              <div className="mt-2 h-px bg-foreground/15">
                <div ref={barRef} className="h-px origin-left scale-x-0 bg-primary" />
              </div>
              <ol className="mt-2 hidden grid-cols-6 gap-2 font-mono text-[12px] xl:grid">
                {STORY_STEPS.map((s, i) => (
                  <li
                    key={s.stage}
                    className={cn(
                      "transition-colors",
                      i + 1 <= active ? "text-foreground" : "text-muted-foreground/60",
                    )}
                  >
                    {String(i + 1).padStart(2, "0")} {s.stage}
                  </li>
                ))}
              </ol>
            </div>

            {/* MEP legend */}
            <ul
              aria-hidden
              className={cn(
                "pointer-events-none absolute bottom-6 left-6 grid gap-1 font-mono text-[12px] text-muted-foreground transition-opacity duration-300 lg:bottom-8 lg:left-8",
                showLegend ? "opacity-100" : "opacity-0",
              )}
            >
              {MEP_LEGEND.map((m) => (
                <li key={m.label} className="flex items-center gap-2">
                  <span className="h-0.5 w-5 rounded-full" style={{ backgroundColor: m.color }} />
                  {m.label}
                </li>
              ))}
            </ul>

            {/* Interaction hint */}
            <p
              aria-hidden
              className={cn(
                "pointer-events-none absolute bottom-6 left-6 hidden max-w-[24ch] font-mono text-[12px] text-muted-foreground transition-opacity duration-300 sm:block lg:bottom-8 lg:left-8",
                status === "ready" && active >= 2 && !showLegend ? "opacity-100" : "opacity-0",
              )}
            >
              Kéo để xoay mô hình · rê chuột vào cấu kiện để xem thuộc tính
            </p>

          </div>
        </div>

        {STORY_STEPS.map((step, i) => (
          <article
            key={step.stage}
            data-step={i + 1}
            className="flex min-h-[80svh] items-end pb-8 lg:col-start-1 lg:min-h-svh lg:items-center lg:pb-0"
          >
            <div
              id={i === 0 ? "lo-trinh" : undefined}
              className={cn(
                "grid w-full scroll-mt-[calc(50svh+1rem)] gap-4 rounded-2xl border border-border bg-background p-5 transition-opacity duration-300 lg:scroll-mt-20 lg:border-0 lg:bg-transparent lg:p-0",
                active === i + 1 ? "lg:opacity-100" : "lg:opacity-35",
              )}
            >
              <p className="font-mono text-[13px] tracking-[.08em] text-primary uppercase">{step.module}</p>
              <h2 className="text-[28px] font-light tracking-[-.01em] lg:text-[40px]">
                {step.title} <strong className="font-medium">{step.emphasis}</strong>
              </h2>
              <ul className="grid gap-2.5 text-muted-foreground">
                {step.points.map((p) => (
                  <li key={p} className="grid grid-cols-[16px_1fr] gap-3">
                    <span aria-hidden className="mt-[11px] h-px w-4 bg-primary" />
                    {p}
                  </li>
                ))}
              </ul>
              {step.chips && (
                <ul className="flex flex-wrap gap-2">
                  {step.chips.map((c) => (
                    <li
                      key={c}
                      className="rounded-full border border-border px-3 py-0.5 font-mono text-[12px] text-foreground"
                    >
                      {c}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function NorthArrow() {
  return (
    <svg viewBox="0 0 24 24" className="size-6 text-foreground/70" fill="none" stroke="currentColor" strokeWidth={1.25}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 4l4 13-4-3-4 3z" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** Graph-paper backdrop: 8px minor and 40px major lines, drawn in SVG so it follows the theme. */
function PaperGrid() {
  return (
    <svg aria-hidden className="absolute inset-0 size-full text-foreground">
      <defs>
        <pattern id="rvpy-paper-minor" width="8" height="8" patternUnits="userSpaceOnUse">
          <path d="M8 0H0V8" fill="none" stroke="currentColor" strokeOpacity="0.045" />
        </pattern>
        <pattern id="rvpy-paper-major" width="40" height="40" patternUnits="userSpaceOnUse">
          <rect width="40" height="40" fill="url(#rvpy-paper-minor)" />
          <path d="M40 0H0V40" fill="none" stroke="currentColor" strokeOpacity="0.09" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#rvpy-paper-major)" />
    </svg>
  );
}
