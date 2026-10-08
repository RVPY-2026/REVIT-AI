"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

/** Light/dark via the `.dark` class, following the OS by default (FRONTEND_RULES §1). */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      {children}
    </NextThemesProvider>
  );
}
