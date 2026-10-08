import { Logo } from "@/components/icons/logo";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { Button } from "@/components/ui/button";

// Placeholder until the real home page (CLAUDE.md §5) lands in build step 3.
export default function HomePage() {
  return (
    <main className="grid min-h-dvh place-items-center bg-hero">
      <div className="content grid justify-items-center gap-6 text-center">
        <Logo className="h-10 w-auto" />
        <h1 className="text-[40px] font-extralight md:text-[56px]">
          Khoá học Revit <strong className="font-medium">cho người đi làm</strong>
        </h1>
        <p className="max-w-[48ch] text-lg text-muted-foreground">Trang chủ đang được xây dựng.</p>
        <div className="flex gap-3">
          <Button>Đăng ký 3 buổi học thử</Button>
          <ThemeToggle />
        </div>
      </div>
    </main>
  );
}
