import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BookOpen, Download, FileText, Layers, MessageCircle, Users } from "lucide-react";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Logo } from "@/components/icons/logo";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { IconTile } from "@/components/ui/icon-tile";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { STUDENT_STATUSES } from "@/lib/constants";
import { formatDate, formatPhone, formatVnd } from "@/lib/format";

export const metadata: Metadata = { title: "UI kit", robots: { index: false } };

/** Development-only showcase of tokens and base components. Not linked anywhere. */
export default function UiKitPage() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <main className="content grid gap-14 py-12">
      <header className="flex flex-wrap items-center gap-4">
        <Logo className="h-[22px] w-auto" />
        <span className="font-heading text-[13px] font-light text-muted-foreground">Ocean Studio</span>
        <div className="ml-auto">
          <ThemeToggle />
        </div>
      </header>

      <Section title="Typography" eyebrow="Lexend · Be Vietnam Pro · IBM Plex Mono">
        <h1 className="text-[40px] font-extralight tracking-[-0.015em] md:text-[56px]">
          Học Revit để <strong className="font-medium">làm được việc</strong>
        </h1>
        <h2 className="text-[28px] font-light md:text-[40px]">
          Lộ trình <strong className="font-medium">từ cơ bản đến dự án</strong>
        </h2>
        <h3 className="text-[21px] font-medium">Buổi 2 · Dựng mô hình kết cấu</h3>
        <p className="max-w-[65ch] text-muted-foreground">
          Khoá học dành cho kiến trúc sư, kỹ sư đã đi làm 3–5 năm. Tiếng Việt có dấu phải hiển thị rõ: ấ ầ ẩ ẫ ậ ế ề ể ễ
          ệ ố ồ ổ ỗ ộ ớ ờ ở ỡ ợ ứ ừ ử ữ ự.
        </p>
        <p className="font-mono text-sm tabular-nums">
          R21 · A15 · {formatVnd(3_600_000)} · {formatDate("2026-10-09")} · {formatPhone("0901234567")}
        </p>
      </Section>

      <Section title="Buttons" eyebrow="§5">
        <div className="flex flex-wrap items-center gap-3">
          <Button>Đăng ký 3 buổi học thử</Button>
          <Button variant="outline">Xem lộ trình</Button>
          <Button variant="ghost">
            <Download /> Xuất Excel
          </Button>
          <Button size="sm">Đăng ký học thử</Button>
          <Button size="sm" variant="outline">
            Đăng nhập
          </Button>
          <Button variant="destructive" size="sm">
            Thu hồi license
          </Button>
          <Button disabled>Đang gửi…</Button>
        </div>
      </Section>

      <Section title="Badges" eyebrow="Pill · trạng thái">
        <div className="flex flex-wrap gap-2">
          <Badge variant="soft">Khai giảng tháng 11</Badge>
          {STUDENT_STATUSES.map((s) => (
            <StatusBadge key={s} status={s} />
          ))}
        </div>
      </Section>

      <Section title="Cards + icon tiles" eyebrow="Viền 1px, không đổ bóng, bo 16px">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { icon: Layers, title: "Auto Join", text: "Join cấu kiện theo thứ tự ưu tiên cho cả dự án." },
            { icon: FileText, title: "Tài liệu", text: "Cập nhật tài liệu và thư viện Revit." },
            { icon: Users, title: "Cộng đồng", text: "Kết nối việc làm giữa học viên và doanh nghiệp." },
          ].map(({ icon, title, text }) => (
            <Card key={title} className="transition-[border-color,translate] duration-200 hover:-translate-y-0.5 hover:border-primary">
              <CardHeader>
                <IconTile icon={icon} />
                <CardTitle className="mt-3 text-[19px]">{title}</CardTitle>
                <CardDescription>{text}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </Section>

      <Section title="Form" eyebrow="Nhãn trên, lỗi dưới">
        <div className="grid max-w-md gap-5">
          <div className="grid gap-2">
            <Label htmlFor="name">Họ và tên</Label>
            <Input id="name" placeholder="Nguyễn Văn An" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="phone">Số điện thoại</Label>
            <Input id="phone" aria-invalid defaultValue="09012" />
            <p className="text-sm text-destructive">Số điện thoại gồm 10 chữ số, bắt đầu bằng 0</p>
          </div>
        </div>
      </Section>

      <Section title="Loading" eyebrow="Skeleton">
        <Card className="max-w-md">
          <CardContent className="grid gap-3">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </CardContent>
        </Card>
      </Section>

      <Section title="Gradients" eyebrow="Chỉ hero, nút chính, CTA band">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="grid h-40 place-items-center rounded-2xl border bg-hero">
            <IconTile icon={BookOpen} />
          </div>
          <div className="grid h-40 place-items-center rounded-2xl bg-band p-6 text-center text-white">
            <p className="font-heading text-[21px] font-light">
              Sẵn sàng học thử <strong className="font-medium">3 buổi miễn phí?</strong>
            </p>
          </div>
        </div>
        <Button variant="outline" className="w-fit">
          <MessageCircle /> Chat Zalo
        </Button>
      </Section>
    </main>
  );
}

function Section({ title, eyebrow, children }: { title: string; eyebrow: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-5">
      <div className="grid gap-1">
        <span className="font-mono text-[12.5px] tracking-[0.08em] text-primary uppercase">{eyebrow}</span>
        <h2 className="text-[28px] font-light">{title}</h2>
      </div>
      {children}
    </section>
  );
}
