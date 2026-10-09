"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useBlueprint } from "@/components/layout/ThemeProvider";
import { Button } from "@/components/ui/button";

/** Flips between light and dark; while the hidden blueprint theme is on it just leaves it. Icons swap via the `.dark` class, so there is no hydration flash. */
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const blueprint = useBlueprint();

  return (
    <Button
      variant="outline"
      size="icon-sm"
      aria-label="Đổi giao diện sáng / tối"
      onClick={() => {
        if (blueprint.on) blueprint.set(false);
        else setTheme(resolvedTheme === "light" ? "dark" : "light");
      }}
    >
      <Moon strokeWidth={1.75} className="dark:hidden" />
      <Sun strokeWidth={1.75} className="hidden dark:block" />
    </Button>
  );
}
