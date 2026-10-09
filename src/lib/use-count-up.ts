"use client";

import { useEffect, useRef, useState } from "react";

/** Eases a displayed number towards `target` (ease-out, `duration` ms). Reduced motion jumps. */
export function useCountUp(target: number, duration = 500) {
  const [value, setValue] = useState(target);
  const from = useRef(target);

  useEffect(() => {
    const start = from.current;
    if (start === target) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      from.current = target;
      setValue(target);
      return;
    }
    const t0 = performance.now();
    let frame = requestAnimationFrame(function tick(now) {
      const t = Math.min(1, (now - t0) / duration);
      const v = start + (target - start) * (1 - (1 - t) ** 3);
      from.current = v;
      setValue(v);
      if (t < 1) frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);

  return value;
}
