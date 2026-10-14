import type { MetadataRoute } from "next";
import { SITE } from "@/lib/constants";

// Only the public site is indexed; app areas and auth screens stay out of search results.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/quan-tri", "/hoc-vien", "/tai-khoan", "/dang-nhap", "/auth", "/api", "/chua-kich-hoat", "/khong-co-quyen", "/ui-kit"],
    },
    sitemap: `${SITE.url}/sitemap.xml`,
  };
}
