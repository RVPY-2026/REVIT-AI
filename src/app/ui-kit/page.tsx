import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { ArrowUpRight, Check, Download, MessageCircle } from "lucide-react";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Logo } from "@/components/icons/logo";
import { NoteList } from "@/components/landing/NoteList";
import { SectionHeading } from "@/components/landing/SectionHeading";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { TitleBlock } from "@/components/layout/TitleBlock";
import { CrmComponentShowcase } from "@/components/layout/CrmComponentShowcase";
import { StudentComponentShowcase } from "@/components/layout/StudentComponentShowcase";
import { SignupProtectionShowcase } from "@/components/public/SignupProtectionShowcase";
import { AdminSourcesAuditShowcase } from "@/components/admin/AdminSourcesAuditShowcase";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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

      <Suspense><AdminSourcesAuditShowcase /></Suspense>
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

      <Section title="Quản lý học viên" eyebrow="Bảng · sao chép · xác nhận">
        <Suspense fallback={<Skeleton className="h-64 rounded-2xl" />}><CrmComponentShowcase /></Suspense>
      </Section>

      <Section title="Xác minh đăng ký" eyebrow="Đăng ký · kết nối Zalo">
        <SignupProtectionShowcase />
      </Section>

      <Section eyebrow="Khu học viên" title="Thành phần khu học viên">
        <StudentComponentShowcase />
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
          <div className="grid h-40 place-items-center rounded-2xl border bg-hero p-6 text-center">
            <p className="font-heading text-[28px] font-extralight">
              Dựng cả công trình, <strong className="font-medium">từ móng đến bàn giao.</strong>
            </p>
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

      <Section title="Landing patterns" eyebrow="Cách trang công khai trình bày nội dung">
        <p className="max-w-[65ch] text-[15px] text-muted-foreground">
          Trang công khai không dùng lưới thẻ giống nhau. Mỗi ý được thể hiện bằng một hình vẽ kèm chú
          thích, một danh sách ghi chú đánh số, hoặc một khung duy nhất cho hành động chính.
        </p>

        <div className="grid gap-10 lg:grid-cols-2">
          {/* Heading block used at the top of every section. */}
          <div>
            <SectionHeading eyebrow="Eyebrow mono" title="Tiêu đề nhẹ," emphasis="nhấn đậm ở cuối.">
              Một dòng mô tả ngắn, màu muted.
            </SectionHeading>
            <ul className="flex flex-wrap gap-x-5 gap-y-2 text-[14px] text-muted-foreground">
              {["Dòng lợi ích có dấu tick", "Chỉ dùng cạnh nút chính"].map((p) => (
                <li key={p} className="inline-flex items-center gap-1.5">
                  <Check strokeWidth={2} className="size-4 text-primary" aria-hidden />
                  {p}
                </li>
              ))}
            </ul>
          </div>

          {/* A feature is shown by a drawing of what it does, with a one-line caption. */}
          <figure>
            <div className="relative aspect-[12/7] overflow-hidden rounded-2xl border border-border bg-card text-primary">
              <svg viewBox="0 0 240 140" fill="none" stroke="currentColor" strokeWidth="1.5" className="size-full" aria-hidden>
                <path d="M30 62H130V20H146V62H180V78H30Z" fill="var(--primary-soft)" />
                <path d="M30 96v8M180 96v8M30 100h150" className="text-muted-foreground" opacity=".6" strokeWidth="1" />
              </svg>
              <span className="absolute top-3 right-3 font-mono text-[12px] text-muted-foreground">Sau</span>
            </div>
            <figcaption className="mt-4 max-w-[38ch] text-[15px] text-muted-foreground">
              <strong className="font-medium text-foreground">Tên tính năng.</strong> Một câu nói nó làm gì với bản vẽ.
            </figcaption>
          </figure>
        </div>

        {/* The one framed panel per section: used for the main action, never repeated in a grid. */}
        <div className="grid max-w-md gap-3 rounded-2xl border border-border bg-card p-6">
          <h3 className="text-[18px] font-medium">Khung hành động chính</h3>
          <p className="text-[14px] text-muted-foreground">Viền 1px, bo 16px, không đổ bóng, không icon tile.</p>
          <Button className="justify-between">
            Nút chính <ArrowUpRight strokeWidth={1.75} />
          </Button>
          <Button variant="outline" className="justify-between">
            Nút phụ <ArrowUpRight strokeWidth={1.75} />
          </Button>
        </div>
      </Section>

      <Section title="Drawing language" eyebrow="FRONTEND_RULES §3.7 · chỉ trang công khai">
        <p className="max-w-[65ch] text-[15px] text-muted-foreground">
          Gõ <code className="font-mono">blueprint</code> để xem các mẫu này trên giấy xanh. Không dùng
          trong khu học viên và quản trị.
        </p>
        <div className="grid gap-8 md:grid-cols-2">
          <div className="grid content-start gap-6">
            <NoteList items={["Lộ trình thực tiễn, dễ áp dụng", "Kiểm soát chất lượng chặt chẽ"]} />
            <div className="flex items-center gap-3">
              <span className="grid size-7 place-items-center rounded-full border border-primary font-mono text-[12px] text-primary">
                1
              </span>
              <span className="text-[15px] font-medium">Bong bóng ghi chú</span>
            </div>
            <div className="flex items-center gap-3 font-mono text-[12px]">
              <span className="text-primary">+3.600</span>
              <span className="size-0 border-x-[5px] border-t-[7px] border-x-transparent border-t-primary" />
              <span className="text-muted-foreground">Cao độ tầng</span>
            </div>
            <div className="w-fit -rotate-6 border-2 border-primary px-3 py-1 font-mono text-[18px] font-medium tracking-[.08em] text-primary uppercase">
              Đã tiếp nhận
            </div>
          </div>
          <div className="grid content-start gap-6">
            <table className="w-full border-collapse border border-foreground/40 bg-card text-left">
              <caption className="mb-2 text-left font-mono text-[12px] text-muted-foreground">
                Bảng thống kê (Schedule)
              </caption>
              <thead>
                <tr className="border-b border-foreground/40 bg-foreground/[.04] font-mono text-[12px] text-muted-foreground">
                  <th scope="col" className="border-r border-border px-3 py-2 font-normal">Hạng mục</th>
                  <th scope="col" className="px-3 py-2 text-right font-normal">Học phí</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border bg-primary-soft">
                  <td className="border-r border-border px-3 py-3 text-[15px] font-medium">Hàng đang chọn</td>
                  <td className="px-3 py-3 text-right font-mono text-[13px] font-medium text-primary tabular-nums">
                    {formatVnd(3600000)}
                  </td>
                </tr>
                <tr className="border-b border-border">
                  <td className="border-r border-border px-3 py-3 text-[15px] text-muted-foreground">Hàng thường</td>
                  <td className="px-3 py-3 text-right font-mono text-[13px] text-muted-foreground tabular-nums">
                    {formatVnd(2700000)}
                  </td>
                </tr>
              </tbody>
            </table>
            <TitleBlock
              className="justify-self-end"
              rows={[
                ["Dự án", "Ocean Studio · RVPY"],
                ["Tờ", "01 / 01"],
                ["Cao độ", "±0.000"],
              ]}
            />
          </div>
        </div>
      </Section>
    </main>
  );
}

function Section({ title, eyebrow, children }: { title: string; eyebrow: string; children: React.ReactNode }) {
  return (
    <section className="grid min-w-0 gap-5">
      <div className="grid gap-1">
        <span className="font-mono text-[12.5px] tracking-[0.08em] text-primary uppercase">{eyebrow}</span>
        <h2 className="text-[28px] font-light">{title}</h2>
      </div>
      {children}
    </section>
  );
}
