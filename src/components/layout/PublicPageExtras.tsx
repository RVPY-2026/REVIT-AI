"use client";

import { usePathname } from "next/navigation";
import { PublicFooter } from "@/components/layout/PublicFooter";
import { ZaloFab } from "@/components/layout/ZaloFab";

const MINIMAL_PUBLIC_PATHS = new Set(["/dang-ky/thanh-cong"]);

export function PublicPageExtras() {
  const pathname = usePathname();

  if (MINIMAL_PUBLIC_PATHS.has(pathname)) return null;

  return (
    <>
      <PublicFooter />
      <ZaloFab />
    </>
  );
}
