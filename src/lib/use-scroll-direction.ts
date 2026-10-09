"use client";

import { useEffect, useState } from "react";

/** True while the user scrolls down past `offset` px; false on any scroll up (FRONTEND_RULES §4.1). */
export function useHideOnScroll(offset = 120) {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    let last = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      if (y > last && y > offset) setHidden(true);
      else if (y < last) setHidden(false);
      last = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [offset]);

  return hidden;
}
