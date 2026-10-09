import { PublicFooter } from "@/components/layout/PublicFooter";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { ZaloFab } from "@/components/layout/ZaloFab";

export default function PublicLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <PublicHeader />
      <main>{children}</main>
      <PublicFooter />
      <ZaloFab />
    </>
  );
}
