import { ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/ui/reveal";
import { ZALO_GROUPS } from "@/lib/constants";
import { NoteList } from "./NoteList";
import { SectionHeading } from "./SectionHeading";

const BENEFITS = [
  "Cập nhật tài liệu và thư viện Revit",
  "Kết nối việc làm giữa học viên và doanh nghiệp",
  "Trao đổi, giải đáp trong quá trình học",
  "Thông báo chuyên đề và sự kiện mới",
];

export function ZaloCommunity() {
  return (
    <section id="cong-dong" className="scroll-mt-6 py-14 md:-scroll-mt-2 md:py-22">
      <div className="content grid items-center gap-10 lg:grid-cols-[1.2fr_1fr]">
        <Reveal>
          <SectionHeading
            eyebrow="Cộng đồng"
            title="Học cùng nhau"
            emphasis="trên Zalo."
          />
          <NoteList items={BENEFITS} />
        </Reveal>
        <Reveal
          delay={120}
          className="grid gap-3 rounded-2xl border border-border bg-card p-6"
        >
          <h3 className="text-[18px] font-medium">Tham gia đủ 2 cộng đồng</h3>
          <p className="text-[14px] text-muted-foreground">
            Nhóm 1 để nhận tài liệu, nhóm 2 để trao đổi và nhận thông báo.
          </p>
          {ZALO_GROUPS.map((g, i) => (
            <Button
              key={g.href}
              asChild
              variant={i === 0 ? "default" : "outline"}
              className="justify-between"
            >
              <a href={g.href} target="_blank" rel="noopener">
                {g.label}
                <ArrowUpRight strokeWidth={1.75} />
              </a>
            </Button>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
