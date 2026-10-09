"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { toast } from "sonner";

const SECRET = "blueprint";

const BlueprintContext = createContext<{ on: boolean; set: (on: boolean) => void }>({
  on: false,
  set: () => {},
});

/** Whether the hidden blueprint theme is on, and a way to leave it (used by the theme toggle). */
export const useBlueprint = () => useContext(BlueprintContext);

/**
 * Light/dark via the `.dark` class, following the OS by default (FRONTEND_RULES §1), plus the
 * hidden `.blueprint` theme (§3.7). Blueprint is forced for the current page view only: it is
 * never written to storage, so a reload returns to the reader's own light/dark choice.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [blueprint, setBlueprint] = useState(false);

  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      themes={["light", "dark", "blueprint"]}
      forcedTheme={blueprint ? "blueprint" : undefined}
    >
      <BlueprintContext.Provider value={{ on: blueprint, set: setBlueprint }}>
        <BlueprintEasterEgg />
        {children}
      </BlueprintContext.Provider>
    </NextThemesProvider>
  );
}

/** Typing "blueprint" anywhere (outside form fields) switches the cyanotype theme on and off. */
function BlueprintEasterEgg() {
  const { on, set } = useBlueprint();
  const typed = useRef("");
  // Read the latest state from the key handler without re-subscribing on every change.
  const current = useRef(on);
  useEffect(() => {
    current.current = on;
  }, [on]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.key.length !== 1) return;
      const el = e.target;
      if (
        el instanceof Element &&
        el.closest("input, textarea, select, [contenteditable='true']")
      )
        return;
      typed.current = (typed.current + e.key.toLowerCase()).slice(-SECRET.length);
      if (typed.current !== SECRET) return;
      typed.current = "";
      const next = !current.current;
      set(next);
      toast(
        next
          ? "Bản vẽ Blueprint đã mở. Gõ lại “blueprint” để quay về."
          : "Đã đóng bản vẽ, quay về giao diện thường.",
      );
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [set]);

  return null;
}
