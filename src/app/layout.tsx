import type { Metadata, Viewport } from "next";
import { Be_Vietnam_Pro, IBM_Plex_Mono, Lexend } from "next/font/google";
import { ThemeProvider } from "@/components/layout/ThemeProvider";
import { SITE } from "@/lib/constants";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

// FRONTEND_RULES §3.2 — three families, Vietnamese + Latin subsets only.
const lexend = Lexend({
  variable: "--font-lexend",
  subsets: ["vietnamese", "latin"],
  weight: ["200", "300", "400", "500"],
});

const beVietnamPro = Be_Vietnam_Pro({
  variable: "--font-be-vietnam-pro",
  subsets: ["vietnamese", "latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["vietnamese", "latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: "RVPY · Khoá học Revit cho người đi làm",
    template: "%s · RVPY",
  },
  description:
    "Khoá học Revit thực chiến cho kiến trúc sư, kỹ sư đã đi làm. Học thử 3 buổi miễn phí, kèm bộ công cụ RVPY.",
  applicationName: "RVPY",
  openGraph: {
    type: "website",
    locale: "vi_VN",
    siteName: "RVPY · Ocean Studio",
    title: "Khoá học Revit BIM cho người đã đi làm",
    description: "Dựng cả công trình trong Revit, từ móng đến bàn giao. Học thử 3 buổi miễn phí.",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fcf7fa" },
    { media: "(prefers-color-scheme: dark)", color: "#150a1b" },
  ],
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="vi"
      data-scroll-behavior="smooth"
      suppressHydrationWarning
      className={`${lexend.variable} ${beVietnamPro.variable} ${plexMono.variable}`}
    >
      <body className="min-h-dvh">
        <ThemeProvider>
          <TooltipProvider>
            {children}
            <Toaster position="top-center" />
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
