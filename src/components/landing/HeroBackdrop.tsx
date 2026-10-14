"use client";

import { useEffect, useRef } from "react";

const CELL = 56;
const TAIL_STEPS = 14;

interface Pulse {
  horizontal: boolean;
  line: number; // grid line index, perpendicular to the travel direction
  pos: number; // head position in px along the line
  speed: number; // px per second
  tail: number; // tail length in px
}
interface Mark {
  gx: number;
  gy: number;
  born: number;
}

/**
 * Plotter-style backdrop for the hero: a faint drafting grid with light pulses that run along the grid
 * lines and crosshair marks that blink at intersections. Pinned to the viewport (sticky) so it stays
 * put while the story scrolls. Decorative; static grid only under reduced motion.
 */
export function HeroBackdrop() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!wrap || !canvas || !ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let w = 0;
    let h = 0;
    let ink = "#fff";
    let accent = "#f0a";
    let raf = 0;
    let last = 0;
    let visible = true;
    const pulses: Pulse[] = [];
    const marks: Mark[] = [];
    let nextPulse = 0;
    let nextMark = 0;

    const readColors = () => {
      const cs = getComputedStyle(wrap);
      ink = cs.getPropertyValue("--foreground").trim() || ink;
      accent = cs.getPropertyValue("--primary").trim() || accent;
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = wrap.clientWidth;
      h = wrap.clientHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw(0);
    };

    function spawnPulse() {
      const horizontal = Math.random() < 0.55;
      const lines = Math.floor((horizontal ? h : w) / CELL);
      const len = horizontal ? w : h;
      pulses.push({
        horizontal,
        line: 1 + Math.floor(Math.random() * Math.max(lines - 1, 1)),
        pos: Math.random() < 0.5 ? -20 : Math.random() * len * 0.4,
        speed: 140 + Math.random() * 200,
        tail: 110 + Math.random() * 130,
      });
    }

    function draw(now: number) {
      ctx!.clearRect(0, 0, w, h);

      // Drafting grid
      ctx!.globalAlpha = 0.05;
      ctx!.strokeStyle = ink;
      ctx!.lineWidth = 1;
      ctx!.beginPath();
      for (let x = CELL; x < w; x += CELL) {
        ctx!.moveTo(x + 0.5, 0);
        ctx!.lineTo(x + 0.5, h);
      }
      for (let y = CELL; y < h; y += CELL) {
        ctx!.moveTo(0, y + 0.5);
        ctx!.lineTo(w, y + 0.5);
      }
      ctx!.stroke();

      // Crosshair marks at intersections: fade in, hold, fade out
      ctx!.strokeStyle = accent;
      ctx!.lineWidth = 1.25;
      for (const m of marks) {
        const age = (now - m.born) / 2800;
        const a = Math.sin(Math.min(Math.max(age, 0), 1) * Math.PI);
        const x = m.gx * CELL + 0.5;
        const y = m.gy * CELL + 0.5;
        ctx!.globalAlpha = a * 0.45;
        ctx!.beginPath();
        ctx!.moveTo(x - 7, y);
        ctx!.lineTo(x + 7, y);
        ctx!.moveTo(x, y - 7);
        ctx!.lineTo(x, y + 7);
        ctx!.stroke();
        ctx!.beginPath();
        ctx!.arc(x, y, 3 + (1 - a) * 5, 0, Math.PI * 2);
        ctx!.stroke();
      }

      // Light pulses: tail drawn as fading segments (no gradients, so no dark fringes)
      for (const p of pulses) {
        const c = p.line * CELL + 0.5;
        const seg = p.tail / TAIL_STEPS;
        ctx!.strokeStyle = accent;
        ctx!.lineWidth = 1.25;
        for (let i = 0; i < TAIL_STEPS; i++) {
          const a0 = p.pos - (i + 1) * seg;
          const a1 = p.pos - i * seg;
          ctx!.globalAlpha = (1 - i / TAIL_STEPS) * 0.4;
          ctx!.beginPath();
          if (p.horizontal) {
            ctx!.moveTo(a0, c);
            ctx!.lineTo(a1, c);
          } else {
            ctx!.moveTo(c, a0);
            ctx!.lineTo(c, a1);
          }
          ctx!.stroke();
        }
        // Glowing head
        const hx = p.horizontal ? p.pos : c;
        const hy = p.horizontal ? c : p.pos;
        ctx!.fillStyle = accent;
        ctx!.globalAlpha = 0.08;
        ctx!.beginPath();
        ctx!.arc(hx, hy, 5, 0, Math.PI * 2);
        ctx!.fill();
        ctx!.globalAlpha = 0.6;
        ctx!.beginPath();
        ctx!.arc(hx, hy, 1.75, 0, Math.PI * 2);
        ctx!.fill();
      }
      ctx!.globalAlpha = 1;
    }

    function frame(now: number) {
      raf = requestAnimationFrame(frame);
      if (!visible) return;
      const dt = last ? Math.min((now - last) / 1000, 0.1) : 0;
      last = now;

      for (const p of pulses) p.pos += p.speed * dt;
      for (let i = pulses.length - 1; i >= 0; i--) {
        const p = pulses[i];
        if (p.pos - p.tail > (p.horizontal ? w : h)) pulses.splice(i, 1);
      }
      for (let i = marks.length - 1; i >= 0; i--) if (now - marks[i].born > 2800) marks.splice(i, 1);

      if (now > nextPulse && pulses.length < 4) {
        spawnPulse();
        nextPulse = now + 1400 + Math.random() * 1800;
      }
      if (now > nextMark && marks.length < 3) {
        marks.push({
          gx: 1 + Math.floor(Math.random() * Math.max(Math.floor(w / CELL) - 1, 1)),
          gy: 1 + Math.floor(Math.random() * Math.max(Math.floor(h / CELL) - 1, 1)),
          born: now,
        });
        nextMark = now + 1500 + Math.random() * 1500;
      }
      draw(now);
    }

    readColors();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(wrap);
    const themeObserver = new MutationObserver(() => {
      readColors();
      draw(performance.now());
    });
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
    io.observe(wrap);
    resize();
    if (!reduced) raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      themeObserver.disconnect();
      io.disconnect();
    };
  }, []);

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-clip">
      <div
        ref={wrapRef}
        className="sticky top-0 h-svh opacity-40 [mask-image:linear-gradient(to_right,transparent_0%,rgb(0_0_0/.12)_30%,#000_62%)] lg:opacity-100"
      >
        {/* Absolute so the canvas buffer size never feeds back into layout (it would grow each resize). */}
        <canvas ref={canvasRef} className="absolute inset-0 size-full" />
      </div>
    </div>
  );
}
