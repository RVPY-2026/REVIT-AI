"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

/** Flips between light and dark. Icons swap via the `.dark` class, so there is no hydration flash. */
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <Button
      variant="outline"
      size="icon-sm"
      aria-label="Đổi giao diện sáng / tối"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
    >
      <Moon strokeWidth={1.75} className="dark:hidden" />
      <Sun strokeWidth={1.75} className="hidden dark:block" />
    </Button>
  );
}
