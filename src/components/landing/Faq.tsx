import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Reveal } from "@/components/ui/reveal";
import { SectionHeading } from "./SectionHeading";

const FAQ = [
  {
    q: "Học thử có mất phí không?",
    a: "Không. 3 buổi học thử trong 9 ngày trải nghiệm hoàn toàn miễn phí.",
  },
  {
    q: "Học online hay tại lớp?",
    a: "Giai đoạn đầu học 1 kèm 1, mỗi buổi 45 phút, thời gian linh hoạt. Chuỗi khoá nâng cao học online theo lịch cố định, 2 buổi mỗi tuần.",
  },
  {
    q: "Máy tính cần những gì?",
    a: "Windows 10 hoặc 11 bản 64-bit, đã cài Revit 2025, 2026 hoặc 2027. Bộ cài nặng khoảng 10 GB nên cần ổ đĩa còn trống.",
  },
  {
    q: "Ưu đãi học phí tính thế nào?",
    a: "Đăng ký trong 9 ngày trải nghiệm, học phí ưu đãi là 4.500.000đ. Giới thiệu 5 bạn tham gia học thử, học phí còn 3.600.000đ; 1 bạn học chính thức, còn 2.700.000đ; thêm 2 bạn học chính thức, RVPY hoàn lại toàn bộ.",
  },
  {
    q: "Đã học xong rồi, giới thiệu bạn có được gì không?",
    a: "Có. Từ học viên thứ 4 bạn giới thiệu, RVPY hoàn lại 30% học phí cho mỗi lần giới thiệu, không giới hạn số lần.",
  },
];

export function Faq() {
  return (
    <section
      id="hoi-dap"
      className="scroll-mt-16 bg-background-2 py-14 md:py-22"
    >
      <div className="content grid gap-x-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] lg:items-start">
        <Reveal className="lg:sticky lg:top-24">
          <SectionHeading
            eyebrow="Câu hỏi thường gặp"
            title="Hỏi trước"
            emphasis="khi đăng ký."
          >
            Chưa thấy câu bạn cần? Nhắn RVPY trong nhóm Zalo cộng đồng.
          </SectionHeading>
        </Reveal>
        <Reveal>
          <Accordion
            type="single"
            collapsible
            defaultValue="0"
            className="gap-2.5"
          >
            {FAQ.map((item, i) => (
              <AccordionItem
                key={item.q}
                value={String(i)}
                className="rounded-2xl border border-border bg-card px-5 not-last:border-b"
              >
                <AccordionTrigger className="py-4 text-base font-semibold hover:no-underline">
                  {/* Drawing-note bubble: the number is the note's tag on the sheet. */}
                  <span className="flex items-center gap-3">
                    <span
                      aria-hidden
                      className="grid size-7 shrink-0 place-items-center rounded-full border border-primary font-mono text-[12px] font-normal text-primary"
                    >
                      {i + 1}
                    </span>
                    {item.q}
                  </span>
                </AccordionTrigger>
                <AccordionContent className="max-w-[65ch] pb-4 pl-10 text-[15px] text-muted-foreground">
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Reveal>
      </div>
    </section>
  );
}
