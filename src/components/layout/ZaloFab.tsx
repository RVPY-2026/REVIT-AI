import Link from "next/link";
import { MessageCircle } from "lucide-react";

/** Floating contact button, bottom-right, above the iOS home indicator (FRONTEND_RULES §4.1). */
export function ZaloFab() {
  return (
    <Link
      href="/#cong-dong"
      aria-label="Liên hệ qua Zalo"
      className="fixed right-5 bottom-[calc(20px+env(safe-area-inset-bottom,0px))] z-30 inline-flex items-center gap-2 rounded-full bg-primary-gradient px-4 py-3 text-[14px] font-semibold text-primary-foreground shadow-primary transition-[filter] hover:brightness-108"
    >
      <MessageCircle strokeWidth={1.75} className="size-5" />
      <span className="max-[520px]:hidden">Chat Zalo</span>
    </Link>
  );
}
