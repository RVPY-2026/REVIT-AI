import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { ZALO_CONSULT_PHONE, zaloChatUrl } from "@/lib/constants";

const FAB =
  "fixed right-5 bottom-[calc(20px+env(safe-area-inset-bottom,0px))] z-30 inline-flex items-center gap-2 rounded-full bg-primary-gradient px-4 py-3 text-[14px] font-semibold text-primary-foreground shadow-primary transition-[filter] hover:brightness-108";

/**
 * Floating contact button, bottom-right, above the iOS home indicator (FRONTEND_RULES §4.1).
 * Opens a 1-on-1 chat with the consulting account; without its number, points to the groups.
 */
export function ZaloFab() {
  const content = (label: string) => (
    <>
      <MessageCircle strokeWidth={1.75} className="size-5" />
      <span className="max-[520px]:hidden">{label}</span>
    </>
  );

  if (ZALO_CONSULT_PHONE) {
    return (
      <a href={zaloChatUrl(ZALO_CONSULT_PHONE)} target="_blank" rel="noopener" aria-label="Chat Zalo với tư vấn RVPY" className={FAB}>
        {content("Chat Zalo")}
      </a>
    );
  }

  return (
    <Link href="/#cong-dong" aria-label="Tham gia nhóm Zalo RVPY" className={FAB}>
      {content("Nhóm Zalo")}
    </Link>
  );
}
