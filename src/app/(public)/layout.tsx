import { Suspense } from "react";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { PublicHeaderWithSession } from "@/components/layout/PublicHeaderWithSession";
import { PublicPageExtras } from "@/components/layout/PublicPageExtras";

export default function PublicLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <Suspense fallback={<PublicHeader authPending />}>
        <PublicHeaderWithSession />
      </Suspense>
      <main>{children}</main>
      <PublicPageExtras />
    </>
  );
}
