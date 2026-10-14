import Link from "next/link";
import { Logo } from "@/components/icons/logo";
import { TitleBlock } from "@/components/layout/TitleBlock";
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

// Grid-line letters, one per column (A is the brand column).
const GRID_LETTERS = ["A", "B", "C", "D", "E"];

const TITLE_BLOCK_ROWS = [
  ["Dự án", "RVPY"],
  ["Đơn vị", SITE.studio],
  ["Cao độ", "±0.000"],
] as const;

/** Revit-style bubble: a circled grid label, same as the axis heads on a plan. */
function GridBubble({ letter, className = "" }: { letter: string; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-flex size-7 shrink-0 items-center justify-center rounded-full border border-foreground/60 bg-background font-mono text-[12px] font-medium text-foreground ${className}`}
    >
      {letter}
    </span>
  );
}

export function PublicFooter() {
  return (
    <footer className="border-t border-foreground/40">
      <div className="content">
        {/* Plan view: every column sits on a dashed grid line that ends in a bubble (A–E). Desktop draws the
            lines; mobile keeps the bubble inline with the heading. */}
        <div className="grid gap-9 pt-12 pb-10 sm:grid-cols-2 lg:grid-cols-[1.5fr_repeat(4,1fr)] lg:gap-0 lg:pt-14">
          <div className="relative grid content-start gap-4 lg:border-l lg:border-dashed lg:border-foreground/30 lg:pr-8 lg:pl-6">
            <GridBubble letter="A" className="absolute -top-[22px] -left-3.5 hidden lg:inline-flex" />
            <Logo className="h-7 w-auto text-foreground" />
            <p className="max-w-[34ch] text-[15px] leading-relaxed text-muted-foreground">
              Khoá học Revit BIM và bộ công cụ Revit của {SITE.studio} cho kiến trúc sư, kỹ sư Việt.
            </p>
          </div>
          {COLUMNS.map((col, index) => (
            <div
              key={col.title}
              className="relative border-t border-dashed border-border pt-6 lg:border-t-0 lg:border-l lg:border-foreground/30 lg:px-6 lg:pt-0"
            >
              <GridBubble letter={GRID_LETTERS[index + 1]} className="absolute -top-[22px] -left-3.5 hidden lg:inline-flex" />
              <h3 className="mb-4 flex items-center gap-2.5 font-sans text-[15px] font-semibold">
                <GridBubble letter={GRID_LETTERS[index + 1]} className="lg:hidden" />
                {col.title}
              </h3>
              <ul className="grid gap-2.5 text-[15px] text-muted-foreground">
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

        {/* Bottom edge of the sheet: legal line left, title block right. */}
        <div className="flex flex-wrap items-end justify-between gap-6 border-t border-foreground/40 py-6 pb-24 text-[13px] text-muted-foreground">
          <div className="grid gap-1">
            <span>© {SITE.studio}.</span>
            <span>Revit là thương hiệu của Autodesk, Inc.</span>
          </div>
          <TitleBlock rows={TITLE_BLOCK_ROWS} decorative />
        </div>
      </div>
    </footer>
  );
}
