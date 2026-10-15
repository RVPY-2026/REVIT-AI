# Frontend Rules

Frontend-only rules: stack, design tokens, layout patterns, components, quality bar. Read all of it before writing UI code.

Project context (what the product is, pages, roles, content, business flow) lives in [CLAUDE.md](CLAUDE.md), not here.

Precedence when things conflict: the project owner's instructions > this document > the agent's own habits.

---

## 1. Tech stack (required)

| Concern | Use | Notes |
|---|---|---|
| Framework | **Next.js (App Router) + TypeScript (strict)** | Server Components by default; add `"use client"` only where interactivity needs it |
| Styling | **Tailwind CSS v4** | Tokens as CSS variables exposed through `@theme` (§3). No raw hex values in `className` |
| Components | **shadcn/ui** (Radix primitives) | Generated into `src/components/ui` and restyled with the tokens. No other UI kit (MUI, Ant Design, Chakra…) |
| Light/dark | **next-themes** | `attribute="class"`, `defaultTheme="system"`, `enableSystem` |
| Icons | **lucide-react** | The only general icon set. Brand marks (Zalo, Facebook, YouTube, TikTok) as SVGs from Simple Icons in `src/components/icons/brand.tsx` |
| Fonts | **next/font/google** | Lexend, Be Vietnam Pro, IBM Plex Mono — subsets `vietnamese` + `latin` |
| Forms | **react-hook-form + zod** | Schemas in `src/lib/schemas` |
| Tables | **TanStack Table** behind one shared `DataTable` component | Sort, filter, pagination, row selection, export |
| Client data fetching | **TanStack Query** | App areas only (not the marketing pages). *Planned: not installed yet; the CRM screens fetch on the server for now* |
| Dates | **date-fns** with locale `vi` | |
| Spreadsheet export | **exceljs**, generated on the server (BACKEND_RULES §7) | The "Xuất Excel" button downloads from `/api/export/<list>` |
| Toasts | **sonner** (via shadcn) | |
| Long-form content | MDX (`@next/mdx`) | *Planned: not installed yet (policy pages `/chinh-sach/[slug]` are not built)* |
| 3D | **three** (plain, no R3F) | Home page `landing/build-story` only. Loaded with a dynamic `import()` after first paint; drawn as an architectural line drawing in the theme colours |
| Hosting | **Vercel** | |
| Package manager | **pnpm** | |
| Lint/format | ESLint (next config); Prettier + `prettier-plugin-tailwindcss` | *Prettier is planned, not configured yet* |

Check the current docs (Context7 or the official site) before using any library API above. Do not rely on memory, especially for Tailwind v4 and the Next.js App Router.

**Component showcase:** `/ui-kit` (development only) renders every token and base component in both themes. Add new shared components there.

**Do not use:** jQuery, Bootstrap, styled-components or other runtime CSS-in-JS, Redux, heavy animation libraries for effects CSS can do.

---

## 2. Project structure

```
src/
  app/
    (public)/          # marketing pages, no sign-in
    (student)/         # signed-in student area
    (admin)/           # signed-in management area
    dang-nhap/         # sign-in page
  components/
    ui/                # shadcn components (restyled)
    layout/            # PublicHeader, PublicFooter, AppSidebar, MobileTabBar, ZaloFab…
    landing/           # marketing sections
    admin/             # DataTable, StatusBadge, KanbanBoard…
    student/
    icons/             # logo.tsx, brand.tsx (revit.tsx when the first Revit element icon is needed)
  lib/
    api/               # typed data-access functions (§7)
    schemas/           # zod schemas + inferred types
    auth/              # session helpers, permission helper `can()`
    format.ts          # currency, date, phone formatting
    constants.ts       # enums, Vietnamese labels, external links
    supabase/          # auth + storage clients (BACKEND_RULES §2)
  server/              # server-only: db, queries, actions — see BACKEND_RULES.md
  mocks/               # fake data
  proxy.ts             # session refresh (Next.js 16 name for middleware)
  app/globals.css      # tokens
```

- URLs are **Vietnamese without diacritics, hyphenated** (`/quan-tri/hoc-vien`).
- File names, variables, components and code comments are **English**.
- One component per file, PascalCase file names for components.

---

## 3. Design tokens

Direction: **"Magenta Night"** — taken from the RVPY installer splash screen: deep plum background, gradient into magenta, thin geometric logo.

**Reference:** token values live in `src/app/globals.css`; the live look of every token and component is `/ui-kit` (§10).

### 3.1 Color

Both themes must look finished. Marketing pages follow the system theme with a toggle; app areas follow the system theme with a toggle.
Theme changes transition color, background, border, and shadow values over about 240ms. Respect `prefers-reduced-motion` and keep the initial theme paint immediate.

```css
/* src/app/globals.css — names follow shadcn conventions so components work as-is */
:root {               /* LIGHT */
  --background: #fcf7fa;
  --background-2: #f6ebf1;       /* alternating section background */
  --card: #ffffff;
  --foreground: #26101d;
  --muted-foreground: #6f5565;
  --border: rgba(60, 10, 40, 0.12);
  --primary: #c2185b;            /* accent */
  --primary-deep: #a3124f;
  --primary-soft: #fbe4ee;       /* icon tiles, pills */
  --primary-foreground: #ffffff;
  --glass: rgba(255, 255, 255, 0.72);
  --ring: #c2185b;
  --success: #187347;
  --warning: #935700;
  --destructive: #c62828;
  --info: #2563eb;
}
.dark {               /* DARK */
  --background: #150a1b;
  --background-2: #1d0c24;
  --card: rgba(255, 255, 255, 0.05);
  --foreground: #f8edf3;
  --muted-foreground: #c2a5b6;
  --border: rgba(255, 255, 255, 0.12);
  --primary: #ff3d84;
  --primary-deep: #c2185b;
  --primary-soft: rgba(255, 61, 132, 0.14);
  --primary-foreground: #ffffff;
  --glass: rgba(24, 10, 30, 0.62);
  --ring: #ff3d84;
  --success: #3ecf8e;
  --warning: #f5b544;
  --destructive: #ff6b6b;
  --info: #6ea8ff;
}
```

Gradients — use **only** in these places, never scattered across the page:
- Marketing hero background (dark): `radial-gradient(55% 75% at 88% 8%, rgba(214,70,140,.50), transparent 62%), radial-gradient(65% 80% at 100% 100%, rgba(196,20,90,.62), transparent 62%), linear-gradient(120deg, #160a24 0%, #3b0d36 58%, #7d1048 100%)`
- Marketing hero background (light): same shape with opacities `.20 / .22` over `#fdf9fb → #f7e8f0`.
- Primary button: `linear-gradient(90deg, var(--primary-button-start), var(--primary-button-end))`.
- CTA band: `linear-gradient(110deg, #3b0d36, #a3124f 60%, #e0186c)`.

Primary buttons share `--primary-button-start: #a3124f` and `--primary-button-end: #c2185b` in light and dark. White button labels retain AA contrast across the gradient; `--primary` remains the brighter link/focus accent in dark mode. Light status text uses the darker success/warning values above so outlined badges meet AA on cards. These tokens are showcased at `/ui-kit`.

Status colors (`--success`, `--warning`, `--destructive`, `--info`) are for state only. Never use the accent (`--primary`) to signal state.

### 3.2 Typography

| Role | Font | Weight | Notes |
|---|---|---|---|
| Headings, secondary logo line | **Lexend** | 200 for h1 ≥ 40px, 300 for h2, 500 for h3 and emphasis | Never use 200/300 below 24px — Vietnamese diacritics blur |
| Body, forms, tables | **Be Vietnam Pro** | 400 / 500 / 600 | Body 16px, line-height 1.65 |
| Version numbers, IDs, money in tables, small labels | **IBM Plex Mono** | 400 / 500 | `tabular-nums` on numeric columns |

Type scale (px): 12 · 13 · 14 · 16 · 18 · 21 · 28 · 40 · 56 · 68. Do not invent sizes outside the scale.
Headings use `text-wrap: balance`. Running text max ~65 characters per line. No all-caps Vietnamese headings; all-caps is allowed only for labels of ≤ 3 words with `letter-spacing: .08em`.

Desktop hero (width ≥ 1024px) also responds to viewport height: at width ≥ 1280px, h1 is 56px at 700–849px height, and 40px below 700px (body 16px). At 1024–1279px width and height below 850px, use the 40px heading and 16px body. Use 16px / 12px content gaps for the 56px / 40px compact layouts, 24px vertical padding, and no extra top margin on the scroll hint. Columns are equal with a 32px gap at 1024–1279px; wider screens use the 5:7 split and 48px gap. Keep the entire intro, both CTAs and all three benefits visible below the 65px header on standard laptop viewports; taller screens retain the width-based 56px / 68px heading scale. Mobile retains its stacked layout.

### 3.3 Shape and spacing

| Property | Value |
|---|---|
| Radius — buttons, inputs | **10px** |
| Radius — cards, dialogs, image frames | **16px** |
| Radius — pills, badges | 999px |
| Border | 1px `var(--border)`; hover/selected switches to `var(--primary)` |
| Shadow | Only the primary button (`0 8px 24px -10px` in the accent color) and product image frames. Regular cards have **no** shadow |
| Glass (backdrop-blur) | **Only** the public header and the hero image panel. Never on cards, tables or dialogs |
| Content width | `max-width: 1280px`, side gutter 24px (16px at ≤ 520px) |
| Marketing section spacing | 88px vertical (56px on mobile) |
| Spacing grid | multiples of 4px |

### 3.4 Icons

- `lucide-react`, `strokeWidth={1.75}`, sizes 16 (inline), 20 (buttons), 24 (cards).
- **An icon must carry information the text next to it does not.** Use icons for actions (buttons, external-link arrow, copy, +/−), for status, and in the dense app areas (sidebar, toolbars, table rows). Do **not** put an icon in front of every item of a marketing list or every feature card — an icon that just restates its label ("Tiết kiệm thời gian" → clock, "Chất lượng" → shield) is the template look the owner rejected.
- Never reuse one icon for different meanings on the same page.
- Marketing pages show things with **drawings, screenshots or numbers**, in the site's technical-drawing language (§3.7: section marks, elevations, dimension strings, sheets): lists of short statements become numbered notes (`landing/NoteList`: mono `01`, hairline rules); a tool or feature is shown by a drawing or screenshot of what it does, with a one-line caption under it, not as "icon + heading + small text" cards.
- **The landing page uses no icon tiles and no grids of identical cards** (see `landing/ToolCards`, `landing/ZaloCommunity`). Where an icon does lead an item, it is in the dense app areas, set in an **icon tile** (`ui/IconTile`): `primary-soft` background, 12px radius, icon in `--primary`.
- **One framed panel per section at most** (`rounded-2xl border bg-card p-6`) for the main action or interactive widget (Zalo join panel, fee calculator). Content that is a list becomes `NoteList`; content that is a feature becomes a drawing with a caption.
- Domain icons that Lucide lacks (Revit elements: foundation, slab, beam, column, wall, roof) are drawn in-house with the same rules — 24px grid, 1.75 stroke — in `components/icons/revit.tsx`.
- Icon-only buttons require a Vietnamese `aria-label`.
- No emoji as UI icons.

Course journey imagery is additive: keep the existing animated timeline, both phase cards, knowledge ring and all copy. The timeline follows the section heading directly. Add three independent 4:3 images inside the three knowledge items: `journey-structure-v1.webp`, `journey-coordination-v1.webp` and `journey-mentoring-v1.webp` in `public/images/landing/`. Preserve the warm light backgrounds in both themes, with 16px frame radius and token borders. Images follow the existing three-column knowledge grid on desktop and stack with their text on mobile. No panorama before the timeline or swipe gallery. Use `next/image`, responsive sizes and lazy loading; captions stay HTML text.

### 3.5 Motion

Light: buttons brighten on hover (`brightness(1.08)`); interactive blocks answer hover with a border or tint change (`hover:border-primary`, `hover:bg-primary-soft`), **never a lift or shadow**; blocks below the fold fade in + rise 16px when scrolled into view. Durations 150–300ms, max 600ms. Respect `prefers-reduced-motion`. Content above the fold on load must never start at `opacity: 0`.

Interactive popups (profile menus, dropdowns, popovers and dialogs) must animate on open and close instead of appearing abruptly. Use the shared Radix/shadcn primitives and state-based motion: open in about 180–220ms with ease-out, close in about 120–160ms with ease-in, combining a subtle fade with a small scale or 4–8px directional slide. Keep the animation origin anchored to the trigger where supported, and preserve the global reduced-motion behavior. Avoid native `<select>` when its option popup needs this motion, since browser/OS menus cannot be animated consistently; use an accessible custom select or dropdown primitive instead.

### 3.6 Logo

The "RVPY" logo is four thin geometric letters (SVG, `stroke="currentColor"`, viewBox `0 0 160 50`). The SVG lives in `components/icons/logo.tsx`. The "Ocean Studio" line uses Lexend 300. Favicons are generated from the logo (svg + png 32 + apple-touch 180).

### 3.7 Drawing language (Revit / technical-drawing UI)

The audience reads drawings for a living, so marketing pages borrow the vocabulary of a Revit sheet instead of generic SaaS cards. It is a **seasoning, not a skin**: use it where the content has the same shape as the drawing element, never to decorate.

**Where it applies**

| Area | Use the drawing language? |
|---|---|
| Public marketing pages (`/` today; `/khoa-hoc` and `/cong-cu` when built) | Yes, as the default way to show structure, sequence, price and notes |
| Post-submit pages (`/dang-ky/thanh-cong`) | Yes: the "sheet" pattern below |
| Sign-in, policies, forms | No: plain cards and fields. Clarity beats theme |
| Student area | **No.** Same sidebar frame as the management area (§4.2). The only Revit cue is the Properties palette (`student/PropertiesPalette`, name/value rows beside a lesson, owner decision); no stamps, bubbles or axes |
| Management area | **No.** Dense data UI (`DataTable`, `Kanban`, forms) stays neutral; do not use frames, stamps, bubbles or axes there. At most a mono ID or elevation-style label |

**Pick the pattern by the content's shape**

| Content shape | Pattern | Component / example | Rules |
|---|---|---|---|
| Levels, ranks, stages stacked in order | **Section with elevations** (storeys, level tags `±0.000`, `+3.600`, pitched roof, hatched ground) | `landing/CareerLevels` | One building per page section. The roof is required, otherwise it does not read as a house. Clickable storeys use `aria-expanded` |
| A sequence over time (days, phases) | **Programme ruler / Gantt bar** | `landing/TrialSteps` ruler | Mono tick numbers, bar fills with scroll; hidden below `lg` |
| Prices, tiers, comparisons, specs | **Schedule (real `<table>`)**: header band, hairline grid, current row tinted, total row | `landing/FeeCalculator` | Must be a semantic table with `<caption>`, `<th scope>`. Numbers right-aligned in mono, `tabular-nums` |
| Short statements, FAQ, caveats | **Numbered notes / callout bubbles** (circle + mono number) | `landing/NoteList`, `landing/Faq` | The number is the tag; the text stays HTML. Never an icon that restates its label (§3.4) |
| A confirmation or document the user keeps | **Sheet**: double border, mono sheet label, approval stamp, title block | `/dang-ky/thanh-cong` | Stamp only on a *valid* success state, never on empty or error states. Links become numbered note boxes with the bubble **inside** the box (`pl-2.5`), leader line through the bubble centres |
| Ownership, version, date, ID of a page | **Title block** (2-column mono table, bottom right) | `layout/PublicFooter`, thank-you sheet | `aria-hidden` when decorative; real data (student ID) stays readable text |
| Page-wide navigation | **Grid axes** A–F in the margin | `landing/GridAxis` | `xl` and up (compact bubbles at `xl` to fit the 24px gutter, full size from `2xl`), anchors to real section ids, lit by `IntersectionObserver` |
| A 3D or spatial explanation | **Line drawing** (three.js, `landing/build-story`) | `BuildStory` | Only on the home page; palette per theme (`light` / `dark` / `blueprint`) |

**Rules for every drawing element**

1. **One or two motifs per section.** A section with a ruler, bubbles, a title block and a stamp is a costume, not a design.
2. **Legibility first.** Body copy keeps §3.2 sizes; mono is for labels, numbers and IDs only. Hairlines use `foreground/40` (outer frames) or `--border` (inner grid); no heavier than 2px.
3. **No new tokens.** Colors come from §3.1 only; stamp and accents use `--primary`. Status colors keep meaning state (§3.1).
4. **Accessible.** Purely decorative parts are `aria-hidden`; anything that carries data is real HTML (table, list, link) with a Vietnamese label. Respect `prefers-reduced-motion` (stamp and ruler animations use the shared reduced-motion rule).
5. **Works in both themes and at 375px.** Frames shrink padding (`p-5` → `sm:p-8`), tables may scroll inside their own `overflow-x-auto`, and wide-only extras (ruler, axes) are hidden, not squeezed.
6. **Text is Vietnamese, labels are the drawing's own** (Tờ, Cao độ, Ghi chú, Bảng thống kê, Mặt cắt). Do not invent Revit jargon the reader would not recognise.

**Blueprint theme (easter egg, not a product theme)**

- A third theme class `.blueprint` (cyanotype blue paper, white ink, cyan accent, drafting grid on `body`). Typing `blueprint` anywhere outside form fields toggles it; there is **no button for it** and it is not part of the Magenta Night tokens.
- It is a dark-family theme: the `dark:` variant also matches `.blueprint`. The 3D scene has its own `blueprint` palette.
- Every new component must still look right in light and dark; checking Blueprint is a courtesy, not a requirement. Do not add Blueprint-only layouts.
- It is forced for the current page view only (`forcedTheme`) and **never stored**: a reload returns to the reader's own light/dark choice. The theme toggle just leaves Blueprint (`useBlueprint()` in `layout/ThemeProvider`).
- The drawing patterns are shown in `/ui-kit` → "Drawing language"; add new ones there.

---

## 4. Layout patterns

### 4.1 Public pages

- **Header:** glass background, sticky, **hides on scroll down, reappears on scroll up**. Left: logo. Right: nav links, theme toggle, secondary "sign in" button, primary CTA button. On mobile the links collapse into a `Sheet` behind a menu button.
- **Hero:** the home page hero is the first step of the scroll-driven `landing/build-story` (copy left, sticky 3D drawing right, stacks on mobile). Other pages: text left, visual right. One primary + one secondary button.
- **Sections:** alternate `--background` and `--background-2`. Each section starts with a mono eyebrow label, an h2 (Lexend 300 with a 500-weight emphasis), and one line of muted description.
- **CTA band** with the band gradient near the bottom; **multi-column footer**; **floating Zalo button** bottom-right (respect `safe-area-inset-bottom`).

### 4.2 App shell (signed-in areas)

- Desktop: left sidebar 248px (collapsible to 72px, icons only) + top bar (search, theme toggle, avatar menu).
- Mobile (< 768px): sidebar becomes a **bottom tab bar** with 4–5 main items + a "More" button opening a `Sheet`.
- Flat `--background`, no gradients, no glass. Gradient survives only on the primary button and the logo.
- Both areas use the one `layout/AppShell` (sidebar, bottom tab bar, "Thêm" sheet); `ManagementShell` and `StudentShell` only declare their navigation. The first four items stay in the tab bar, the rest move into the sheet.
- Page header: h1 Lexend 300 at 28px, a one-line description, and an action area on the right.

### 4.3 Sign-in page

Single centered card with the Google sign-in button and an email field that sends a passwordless sign-in link, separated by a short "hoặc" divider. After sending, replace the form with a confirmation state showing the recipient, a resend action and a way to change the email. Put the logo above and a short note below. A separate "account not activated" state has a contact button.

---

## 5. Components and patterns

- **Buttons:** `default` = gradient + shadow (one per view section), `outline` = 1px border, `ghost` for toolbar actions. Labels state the action. CRM controls use `compact` / `icon-compact`: 44px on mobile/coarse pointers, 36px on desktop fine pointers. Set size on the component; never override all descendant buttons from a page.
- **StatusBadge:** pill with 1px border in the status color, text in the same color, no fill. One mapping table in `lib/constants.ts`.
- **IconTile:** Lucide icon inside a `primary-soft` tile (§3.4). App areas only; not used on marketing pages.
- **DataTable:** sticky header; numeric columns right-aligned in mono; toolbar with search, filters and an **"Xuất Excel"** button that exports exactly the filtered rows (file name `rvpy-<list>-<yyyyMMdd>.xlsx`); row actions in a dropdown; becomes a **card list on mobile**.
- **Kanban view:** columns = statuses, cards draggable, column header shows count.
- **Destructive or important changes** (money, access): confirmation `AlertDialog`, then a toast with the result. CRM classification applies immediately with an eight-second Undo toast; only dropped opens the required-reason dialog. Archive/restore/source transfer keep their reason/confirmation dialogs.
- **Copy-to-clipboard:** phone numbers use an icon-only copy button immediately to their right, with a Vietnamese accessible label; other copy actions use icon + label, toast "Đã sao chép". Fallback to selecting the text if the clipboard API fails.
- **Inline student editing:** click the value or pencil to edit in place; Save commits one field, Cancel/Escape discards the draft, and errors stay beside that field. Status uses a dropdown in its cell. Preserve immutable student codes and signup dates. Source transfer is an admin-only profile action with an active target, reason and expected-source snapshot.
- **Signup verification:** the public signup uses the shared `SignupVerification` widget. Zalo code renewal stays on the original confirmation page and shows the connected state when appropriate. Both patterns appear in `/ui-kit`. Contact dialogs retain drafts on conflicts and submit their initial field values for optimistic checks.
- **Forms:** label above field, helper text below, inline error under the field in `--destructive`, submit disabled while pending.
- **Every data view has four states:** loading (skeleton), data, empty (illustration + how to add the first item), error (message + retry).
- **Documents shown to students are view-only:** no download button, no direct link to the source file.

**Management viewer patterns:** reuse `ManagementPageHeader` (mono eyebrow, h1, helper and one action instance, sticky below the shell toolbar), `ManagementEmpty` (icon, explanation and corrective action), and `ManagementLoading` (matching source/audit/queue/learning skeletons). Use `ViewerFilters` for labelled date/search controls behind one mobile filter button and `ViewerPagination` for filter-preserving previous/next navigation. Audit pagination displays a bounded `10.000+` total and asks the reader to narrow filters beyond the 10,000 newest matches. Learning lists pass a domain eyebrow, controlled filter fields and a one-based `onPageChange` callback; URL-backed viewers retain their filter-preserving navigation. These components and both pagination modes are demonstrated in `/ui-kit`; do not clone the header action or its dialog state for mobile.

---

## 6. Content and formatting

- All UI copy is **Vietnamese**. Address the reader as **"bạn"**.
- Buttons name the action ("Đăng ký học thử", "Sao chép tin nhắn", "Xuất Excel"), never "OK" or "Submit".
- Error messages say what went wrong and how to fix it.
- Money: `3.600.000đ` via `Intl.NumberFormat("vi-VN")`, "đ" attached.
- Dates `dd/MM/yyyy`, 24-hour time. Phone `0901 234 567`.
- IDs and version numbers in IBM Plex Mono.
- External links and other fixed strings live in `lib/constants.ts`, not inline in components.

---

## 7. Data access (frontend side)

- Components never fetch directly. All data goes through typed functions in `src/lib/api/*` (e.g. `listStudents(filter)`, `getStudent(id)`).
- For now those functions return data from `src/mocks` with a fake 300ms delay so loading states are visible. Toggle with `NEXT_PUBLIC_USE_MOCK=true`.
- Types come from zod schemas in `src/lib/schemas`.
- With the mock flag off, the same functions call `src/server/queries/*` (BACKEND_RULES §2). Mutations are Server Actions from `src/server/actions/*` returning `ActionResult`.
- In mock mode, `getCurrentUser()` reads the `rvpy-mock-role` cookie. A **role switcher visible only in development** sets it so you can test every role.
- Route groups guard access in their `layout.tsx`. Navigation items and buttons are hidden with `can(user, "<permission>")`; permissions are declared once in `lib/auth/permissions.ts`. Hiding in the UI is for tidiness only — the server enforces the same permissions (BACKEND_RULES §4).

---

## 8. Quality bar

- **Responsive:** check 375, 768 and 1280px. No horizontal page scroll (tables scroll inside their own `overflow-x-auto` container).
- **Themes:** check every screen in light and dark. No color that only works in one theme.
- **Contrast:** body text ≥ 4.5:1, large text ≥ 3:1.
- **Keyboard:** everything reachable with Tab/Enter, visible focus ring (`--ring`, 2px offset).
- **Images:** `next/image`, WebP/AVIF, Vietnamese `alt`. Videos MP4/WebM, `muted playsInline`, with poster.
- **SEO (public pages):** Vietnamese `metadata` per page, OG image 1200×630, `sitemap.ts`, `robots.ts`. Signed-in areas are `noindex`.
- **Performance:** Lighthouse ≥ 90 for Performance, Accessibility and SEO on public pages. No unused fonts or libraries.

---

## 9. Don't

- Add UI kits, icon sets or fonts outside §1.
- Use gradients or glass outside the places listed in §3.
- Change tokens (color, font, radius) without asking the project owner.
- Use emoji as UI icons.
- Paste markup or CSS between pages instead of reusing the shared components and tokens (§10).
- Use the drawing language (§3.7) in the management area, or in the student area beyond the Properties palette, stack more than two drawing motifs in one section, or put a stamp on a non-success state.

---

## 10. Reference: the UI kit (`/ui-kit`)

The live reference for the design is the **UI kit page**, `src/app/ui-kit/page.tsx` (served at `/ui-kit`, development only, not linked anywhere). It replaces the old static HTML mock-up. Open it next to the page you are building; it renders in light, dark and (by typing `blueprint`) the hidden Blueprint theme.

**It shows:** type scale and fonts, color tokens, buttons, inputs, badges, status badges, skeletons, gradients (hero, CTA band), the CRM components, the landing patterns (section heading, drawing + caption figure, single framed panel, perk list), and the drawing-language patterns of §3.7 (numbered notes, callout bubble, level mark, approval stamp, Schedule table, title block).

**Sources of truth, in order:** `src/app/globals.css` (token values) → §3 of this document (rules and rationale) → `/ui-kit` (how it looks). When they disagree, fix the one that is wrong; do not work around it.

**Keep it alive:**
- A new shared component or pattern (`components/ui`, `components/layout`, a reusable `landing/` piece) gets a block in the UI kit in the same change.
- A token change updates `globals.css`, §3.1 and the UI kit together, and needs the project owner's approval (§9).
- The UI kit is a showcase, not a spec to copy: take values from tokens and reuse the components, never paste markup between pages.

**Landing section → component**

| Section | Component |
|---|---|
| Hero + curriculum | `landing/build-story` (`BuildStory`, `HeroIntro`) |
| Course journey | `landing/CourseJourney` |
| Career levels | `landing/CareerLevels` |
| 9-day trial | `landing/TrialSteps` |
| Fees and referral | `landing/FeeTiers` + `landing/FeeCalculator` |
| Tools | `landing/ToolCards` (drawing + caption) |
| Zalo community | `landing/ZaloCommunity` |
| FAQ | `landing/Faq` (shadcn `Accordion`) |
| CTA band | `landing/CtaBand` |
| Header / footer / Zalo button | `layout/PublicHeader`, `layout/PublicFooter`, `layout/ZaloFab` |
| Numbered notes / title block | `landing/NoteList`, `layout/TitleBlock` |
| Scroll reveal | `ui/reveal` |

Copy that still awaits client confirmation is listed in CLAUDE.md §10; do not mark it in the UI.
