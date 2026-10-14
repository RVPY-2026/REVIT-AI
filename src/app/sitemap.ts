import type { MetadataRoute } from "next";
import { SITE } from "@/lib/constants";

// Public pages only (CLAUDE.md §4). Add /khoa-hoc, /cong-cu and /chinh-sach/* as they ship.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: SITE.url, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE.url}/dang-ky`, changeFrequency: "monthly", priority: 0.8 },
  ];
}
