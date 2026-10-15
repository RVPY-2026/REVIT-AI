"use client";
import { LearningPrimaryButton } from "./LearningPrimaryButton";
export function LearningContentError({ reset, embedded = false }: { reset: () => void; embedded?: boolean }) {
  const Container = embedded ? "div" : "main";
  const Heading = embedded ? "h3" : "h1";
  return <Container className="content py-8"><div className="rounded-2xl border bg-card p-6"><Heading className="font-heading text-[28px] font-light">Chưa tải được nội dung học</Heading><p className="mt-2 text-sm text-muted-foreground">Bạn kiểm tra kết nối rồi thử tải lại.</p><LearningPrimaryButton className="mt-5" onClick={reset}>Thử tải lại</LearningPrimaryButton></div></Container>;
}
