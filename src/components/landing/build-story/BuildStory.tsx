"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { RotateCcw } from "lucide-react";
import { cn } from "cn";
import { HeroBackdrop } from "../HeroBackdrop";
import type { BuildingScene, SceneTheme } from "./building-scene";
import { MEP_LEGEND, STORY_STEPS } from "./story-steps";

const STEP_COUNT = STORY_STEPS.length + 1; // + the intro

// Opening sequence: the model builds itself once on load (scene time 0 → INTRO_END), holds on the
// finished building, then rewinds to the ghost so scrolling picks up where the story starts.
const INTRO_END = 6.3;
const INTRO_BUILD_MS = 18000;
const INTRO_HOLD_MS = 2000;
const INTRO_REWIND_MS = 4500;

const clamp01 = (x: number) => Math.min(Math.max(x, 0), 1);
const smoothstep = (a: number, b: number, x: number) => {
  const k = clamp01((x - a) / (b - a));
  return k * k * (3 - 2 * k);
};

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
  const elementsRef = useRef<HTMLSpanElement>(null);
  const clashRef = useRef<HTMLSpanElement>(null);
  const replayRef = useRef<() => void>(() => {});
  const [playing, setPlaying] = useState(false);
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
    let intro: number | null = null; // rAF id while the opening sequence owns the scene time

    // Single entry point for scene time: scene, progress bar, active step and the status bar.
    function drive(t: number) {
      scene?.setProgress(t);
      if (barRef.current) barRef.current.style.transform = `scaleX(${Math.max(0, (t - 1) / (STEP_COUNT - 1))})`;
      const idx = Math.min(Math.floor(t), STEP_COUNT - 1);
      if (idx !== lastActive) {
        lastActive = idx;
        setActive(idx);
      }
      if (elementsRef.current) {
        elementsRef.current.textContent = Math.round(smoothstep(0.8, 6, t) * 2480).toLocaleString("vi-VN");
      }
      const clash = clashRef.current;
      if (clash) {
        const flagged = t > 5.15 && t <= 5.75;
        const solved = t > 5.75 && t < 6.05;
        clash.textContent = flagged ? "1" : solved ? "0" : "—";
        clash.style.color = flagged ? "#ff4d5e" : solved ? "#2fbf87" : "";
      }
    }

    function stopIntro() {
      if (intro !== null) cancelAnimationFrame(intro);
      intro = null;
      setPlaying(false);
    }

    function playIntro() {
      stopIntro();
      setPlaying(true);
      const start = performance.now();
      const tick = (now: number) => {
        const e = now - start;
        let t: number;
        if (e < INTRO_BUILD_MS) t = (e / INTRO_BUILD_MS) * INTRO_END;
        else if (e < INTRO_BUILD_MS + INTRO_HOLD_MS) t = INTRO_END;
        else {
          const k = clamp01((e - INTRO_BUILD_MS - INTRO_HOLD_MS) / INTRO_REWIND_MS);
          t = INTRO_END * (1 - k * k * (3 - 2 * k));
          if (k >= 1) {
            intro = null;
            setPlaying(false);
            readProgress();
            return;
          }
        }
        drive(t);
        intro = requestAnimationFrame(tick);
      };
      intro = requestAnimationFrame(tick);
    }
    replayRef.current = () => {
      if (window.scrollY < 40 && scene) playIntro();
    };

    // Story time: index of the step under the focus line + how far through it we are.
    function readProgress() {
      if (intro !== null) {
        if (window.scrollY > 40) {
          stopIntro();
        } else return;
      }
      const vh = window.innerHeight;
      const stageH = desktop.matches ? 0 : stage!.getBoundingClientRect().height;
      const focus = stageH + (vh - stageH) * 0.5;
      let t = 0;
      for (let i = 0; i < steps.length; i++) {
        const r = steps[i].getBoundingClientRect();
        if (focus < r.top) break;
        t = focus < r.bottom ? i + (focus - r.top) / r.height : i + 1;
      }
      drive(Math.min(t, STEP_COUNT));
    }

    const sceneTheme = (): SceneTheme => {
      const cl = document.documentElement.classList;
      return cl.contains("blueprint") ? "blueprint" : cl.contains("dark") ? "dark" : "light";
    };
    const themeObserver = new MutationObserver(() => scene?.setTheme(sceneTheme()));
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
          theme: sceneTheme(),
          reducedMotion,
        });
        const box = canvas.getBoundingClientRect();
        scene.resize(box.width, box.height);
        readProgress();
        resizeObserver.observe(canvas);
        visibility.observe(section);
        setStatus("ready");
        if (!reducedMotion && window.scrollY < 40) playIntro();
      })
      .catch(() => setStatus("failed"));

    readProgress();
    window.addEventListener("scroll", readProgress, { passive: true });
    window.addEventListener("resize", readProgress);

    return () => {
      disposed = true;
      if (intro !== null) cancelAnimationFrame(intro);
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
    <section ref={sectionRef} aria-label="Giới thiệu khoá học và lộ trình" className="relative isolate bg-hero">
      <HeroBackdrop />
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
          className="sticky top-16 z-10 -mx-4 transition-[top] duration-300 max-lg:[html[data-header-hidden]_&]:top-0 h-[50svh] border-y border-border bg-background min-[521px]:-mx-6 lg:col-start-2 lg:row-span-7 lg:row-start-1 lg:top-16 lg:mx-0 lg:-mr-[clamp(0px,calc((100vw-1280px)/2-8px),160px)] lg:h-[calc(100svh-4rem)] lg:self-start lg:border-0 lg:bg-transparent lg:py-6"
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
                <ViewCube />
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

            {/* Status bar, like the strip along the bottom of the Revit window. */}
            <div
              aria-hidden
              className="absolute inset-x-3 bottom-3 flex h-8 items-center gap-4 border-t border-foreground/15 bg-background/70 font-mono text-[12px] text-muted-foreground backdrop-blur-sm lg:inset-x-4 lg:bottom-4"
            >
              <span className="hidden sm:inline">Tỷ lệ 1 : 100</span>
              <span>
                Cấu kiện <span ref={elementsRef} className="text-foreground tabular-nums">0</span>
              </span>
              <span>
                Va chạm{" "}
                <span ref={clashRef} className="tabular-nums text-foreground">
                  —
                </span>
              </span>
              <button
                type="button"
                onClick={() => replayRef.current()}
                disabled={playing || status !== "ready"}
                tabIndex={-1}
                className="pointer-events-auto ml-auto inline-flex items-center gap-1.5 text-foreground transition-opacity enabled:hover:text-primary disabled:opacity-0"
              >
                <RotateCcw className="size-3" strokeWidth={1.75} />
                Phát lại
              </button>
            </div>

            {/* MEP legend */}
            <ul
              aria-hidden
              className={cn(
                "pointer-events-none absolute bottom-14 left-6 grid gap-1 font-mono text-[12px] text-muted-foreground transition-opacity duration-300 lg:bottom-16 lg:left-8",
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
                "pointer-events-none absolute bottom-14 left-6 hidden max-w-[24ch] font-mono text-[12px] text-muted-foreground transition-opacity duration-300 sm:block lg:bottom-16 lg:left-8",
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
            className="relative flex min-h-[80svh] items-end pb-8 lg:col-start-1 lg:min-h-svh lg:items-center lg:pb-0 lg:pl-10 xl:pl-12"
          >
            {/* Timeline rail: one continuous line down the copy column, lit on the active step. */}
            <span aria-hidden className="absolute inset-y-0 left-0 hidden w-px bg-foreground/10 lg:block" />
            <span
              aria-hidden
              className={cn(
                "absolute inset-y-0 left-0 hidden w-px origin-top bg-primary transition-transform duration-500 lg:block",
                active >= i + 1 ? "scale-y-100" : "scale-y-0",
              )}
            />
            <span
              aria-hidden
              className={cn(
                "absolute top-1/2 left-0 hidden size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border transition-colors duration-300 lg:block",
                active === i + 1 ? "border-primary bg-primary" : "border-foreground/30 bg-background",
              )}
            />
            <div
              id={i === 0 ? "lo-trinh" : undefined}
              className={cn(
                "grid w-full scroll-mt-[calc(50svh+1rem)] gap-4 rounded-2xl border border-border bg-background p-5 transition-opacity duration-300 lg:scroll-mt-20 lg:border-0 lg:bg-transparent lg:p-0",
                active === i + 1 ? "lg:opacity-100" : "lg:opacity-35",
              )}
            >
              <span
                aria-hidden
                className="-mb-2 hidden font-mono text-[128px] leading-[.85] font-medium tracking-[-.04em] text-transparent select-none [-webkit-text-stroke:1px_var(--color-primary)] lg:block xl:text-[160px]"
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <p className="font-mono text-[13px] tracking-[.08em] text-primary uppercase">{step.module}</p>
              <h2 className="text-[28px] font-light tracking-[-.01em] lg:text-[40px]">
                {step.title} <strong className="font-medium">{step.emphasis}</strong>
              </h2>
              <ul className="grid gap-2.5 text-muted-foreground lg:text-[17px]">
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

/** Revit ViewCube inside a compass ring. Decorative. */
function ViewCube() {
  return (
    <svg viewBox="0 0 32 32" className="size-8 text-foreground/70" fill="none" stroke="currentColor" strokeWidth={1.1} strokeLinejoin="round">
      <circle cx="16" cy="16" r="14.5" strokeDasharray="2 2.4" strokeOpacity=".6" />
      <path d="M16 7 L23.5 11.5 V20.5 L16 25 L8.5 20.5 V11.5 Z" />
      <path d="M8.5 11.5 L16 16 L23.5 11.5 M16 16 V25" />
      <path d="M8.5 11.5 L16 7 L23.5 11.5 L16 16 Z" fill="currentColor" fillOpacity=".14" />
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
