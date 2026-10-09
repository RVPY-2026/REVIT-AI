import Link from "next/link";
import { Logo } from "@/components/icons/logo";
import { ROUTES, SITE, ZALO_GROUPS } from "@/lib/constants";

const COLUMNS = [
  {
    title: "Khoá học",
    links: [
      { label: "Lộ trình", href: "/#lo-trinh" },
      { label: "Hành trình học", href: "/#hanh-trinh" },
      { label: "Học thử", href: "/#hoc-thu" },
      { label: "Học phí", href: "/#hoc-phi" },
    ],
  },
  {
    title: "Học viên",
    links: [
      { label: "Đăng ký học thử", href: ROUTES.signup },
      { label: "Đăng nhập", href: ROUTES.signIn },
      { label: "Câu hỏi thường gặp", href: "/#hoi-dap" },
    ],
  },
  {
    title: "Cộng đồng",
    links: ZALO_GROUPS.map((g) => ({ label: g.label, href: g.href })),
  },
  {
    title: "Chính sách",
    links: [
      { label: "Điều khoản", href: "/chinh-sach/dieu-khoan" },
      { label: "Bảo mật", href: "/chinh-sach/bao-mat" },
      { label: "Hoàn tiền", href: "/chinh-sach/hoan-tien" },
    ],
  },
];

export function PublicFooter() {
  return (
    <footer className="border-t border-border">
      <div className="content">
        <div className="grid gap-8 py-14 sm:grid-cols-2 lg:grid-cols-[1.4fr_repeat(4,1fr)]">
          <div className="grid max-w-[34ch] content-start gap-3.5 text-[14px] text-muted-foreground">
            <Logo className="h-[22px] w-auto text-foreground" />
            <p>Khoá học Revit BIM và bộ công cụ Revit của {SITE.studio} cho kiến trúc sư, kỹ sư Việt.</p>
          </div>
          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h3 className="mb-3 font-sans text-[14px] font-semibold">{col.title}</h3>
              <ul className="grid gap-2 text-[14px] text-muted-foreground">
                {col.links.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className="transition-colors hover:text-foreground"
                      {...(l.href.startsWith("http") ? { target: "_blank", rel: "noopener" } : {})}
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap justify-between gap-2.5 border-t border-border pt-5 pb-8 text-[13px] text-muted-foreground">
          <span>© {SITE.studio}.</span>
          <span>Revit là thương hiệu của Autodesk, Inc.</span>
        </div>
      </div>
    </footer>
  );
}
