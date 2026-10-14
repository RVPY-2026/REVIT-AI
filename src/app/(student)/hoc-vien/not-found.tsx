import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function StudentNotFound() {
  return (
    <main className="content py-16">
      <div className="mx-auto max-w-md rounded-[4px] border border-border bg-card p-6 text-center">
        <h1 className="font-heading text-xl font-medium">Không tìm thấy trang này</h1>
        <p className="mt-2 text-sm text-muted-foreground">Bài học có thể không thuộc lộ trình của bạn hoặc đường dẫn đã thay đổi.</p>
        <Button asChild variant="outline" className="mt-5"><Link href="/hoc-vien">Về tổng quan</Link></Button>
      </div>
    </main>
  );
}
