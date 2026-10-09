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
| Client data fetching | **TanStack Query** | App areas only (not the marketing pages) |
| Dates | **date-fns** with locale `vi` | |
| Spreadsheet export | **exceljs**, generated on the server (BACKEND_RULES §7) | The "Xuất Excel" button downloads from `/api/export/<list>` |
| Toasts | **sonner** (via shadcn) | |
| Long-form content | MDX (`@next/mdx`) | |
| 3D | **three** (plain, no R3F) | Home page `landing/build-story` only. Loaded with a dynamic `import()` after first paint; drawn as an architectural line drawing in the theme colours |
| Hosting | **Vercel** | |
| Package manager | **pnpm** | |
| Lint/format | ESLint (next config) + Prettier + `prettier-plugin-tailwindcss` | |

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
    icons/             # logo.tsx, brand.tsx, revit.tsx
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

**Reference code:** [`design/reference/rvpy-landing.html`](design/reference/rvpy-landing.html). Open it in a browser. Every value in this section is applied there; when unsure about a border, radius or color, look at that file. How to use it: §10.

### 3.1 Color

Both themes must look finished. Marketing pages follow the system theme with a toggle; app areas follow the system theme with a toggle.

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
  --success: #1f8a5b;
  --warning: #b26a00;
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
- Primary button: `linear-gradient(90deg, var(--primary-deep), var(--primary))`.
- CTA band: `linear-gradient(110deg, #3b0d36, #a3124f 60%, #e0186c)`.

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
- Marketing pages show things with **drawings, screenshots or numbers**, in the site's technical-drawing language (section marks, elevations, dimension strings, sheets): lists of short statements become numbered notes (`landing/NoteList`: mono `01`, hairline rules); a tool or feature is shown by a drawing or screenshot of what it does, with a one-line caption under it, not as "icon + heading + small text" cards.
- Where an icon does belong as the lead of an item (mainly app areas), it sits in an **icon tile** (`ui/IconTile`): `primary-soft` background, 12px radius, icon in `--primary`.
- Domain icons that Lucide lacks (Revit elements: foundation, slab, beam, column, wall, roof) are drawn in-house with the same rules — 24px grid, 1.75 stroke — in `components/icons/revit.tsx`.
- Icon-only buttons require a Vietnamese `aria-label`.
- No emoji as UI icons.

Course journey imagery is additive: keep the existing animated timeline, both phase cards, knowledge ring and all copy. The timeline follows the section heading directly. Add three independent 4:3 images inside the three knowledge items: `journey-structure-v1.webp`, `journey-coordination-v1.webp` and `journey-mentoring-v1.webp` in `public/images/landing/`. Preserve the warm light backgrounds in both themes, with 16px frame radius and token borders. Images follow the existing three-column knowledge grid on desktop and stack with their text on mobile. No panorama before the timeline or swipe gallery. Use `next/image`, responsive sizes and lazy loading; captions stay HTML text.

### 3.5 Motion

Light: buttons brighten on hover (`brightness(1.08)`), cards lift 2px, blocks below the fold fade in + rise 16px when scrolled into view. Durations 150–300ms, max 600ms. Respect `prefers-reduced-motion`. Content above the fold on load must never start at `opacity: 0`.

### 3.6 Logo

The "RVPY" logo is four thin geometric letters (SVG, `stroke="currentColor"`, viewBox `0 0 160 50`). Take the SVG from the reference file into `components/icons/logo.tsx`. The "Ocean Studio" line uses Lexend 300. Favicons are generated from the logo (svg + png 32 + apple-touch 180).

---

## 4. Layout patterns

### 4.1 Public pages

- **Header:** glass background, sticky, **hides on scroll down, reappears on scroll up**. Left: logo. Right: nav links, theme toggle, secondary "sign in" button, primary CTA button. On mobile the links collapse into a `Sheet` behind a menu button.
- **Hero:** text left, visual right (stacks on mobile). One primary + one secondary button.
- **Sections:** alternate `--background` and `--background-2`. Each section starts with a mono eyebrow label, an h2 (Lexend 300 with a 500-weight emphasis), and one line of muted description.
- **CTA band** with the band gradient near the bottom; **multi-column footer**; **floating Zalo button** bottom-right (respect `safe-area-inset-bottom`).

### 4.2 App shell (signed-in areas)

- Desktop: left sidebar 248px (collapsible to 72px, icons only) + top bar (search, theme toggle, avatar menu).
- Mobile (< 768px): sidebar becomes a **bottom tab bar** with 4–5 main items + a "More" button opening a `Sheet`.
- Flat `--background`, no gradients, no glass. Gradient survives only on the primary button and the logo.
- Page header: h1 Lexend 300 at 28px, a one-line description, and an action area on the right.

### 4.3 Sign-in page

Single centered card with the Google sign-in button and an email field that sends a passwordless sign-in link, separated by a short "hoặc" divider. Put the logo above and a short note below. A separate "account not activated" state has a contact button.

---

## 5. Components and patterns

- **Buttons:** `default` = gradient + shadow (one per view section), `outline` = 1px border, `ghost` for toolbar actions. Labels state the action.
- **StatusBadge:** pill with 1px border in the status color, text in the same color, no fill. One mapping table in `lib/constants.ts`.
- **IconTile:** Lucide icon inside a `primary-soft` tile (§3.4).
- **DataTable:** sticky header; numeric columns right-aligned in mono; toolbar with search, filters and an **"Xuất Excel"** button that exports exactly the filtered rows (file name `rvpy-<list>-<yyyyMMdd>.xlsx`); row actions in a dropdown; becomes a **card list on mobile**.
- **Kanban view:** columns = statuses, cards draggable, column header shows count.
- **Destructive or important changes** (status changes, money, access): confirmation `AlertDialog`, then a toast with the result.
- **Copy-to-clipboard:** button with icon + label, toast "Đã sao chép". Fallback to selecting the text if the clipboard API fails.
- **Forms:** label above field, helper text below, inline error under the field in `--destructive`, submit disabled while pending.
- **Every data view has four states:** loading (skeleton), data, empty (illustration + how to add the first item), error (message + retry).
- **Documents shown to students are view-only:** no download button, no direct link to the source file.

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
- Copy CSS/JS from the reference file verbatim (§10).

---

## 10. Reference code — `design/reference/rvpy-landing.html`

A static HTML build of the marketing home page using the agreed tokens. It is a **design spec written as code**, not production code.

**Take from it:**
- Token values for light/dark, gradients, button shadow — the `:root` block at the top. Variable names **match** §3.1 (`--background`, `--primary`, `--primary-soft`…), so values copy straight into `globals.css`.
- How the rules look in practice: primary vs outline buttons, cards with a 1px border and no shadow, icon tiles, status badges, section spacing, heading sizes.
- The logo SVG (`<svg viewBox="0 0 160 50">` in the header) → `components/icons/logo.tsx`.
- Section order and copy of the home page.

**Do not copy:**
- The plain CSS → rewrite with Tailwind utilities and shadcn components.
- The `<script>` at the end → replace with `next-themes`, a `useScrollDirection` hook, and a `<Reveal>` component.
- The `data-mode` attribute on `<html>` → the project uses the `.dark` class set by next-themes. The reference file has dark on `:root`; the project has light on `:root` and dark on `.dark`, as in §3.1.

**Class → component map:**

| Reference class | Project component |
|---|---|
| `.btn` | `<Button>` variant `default` (gradient + shadow) |
| `.ghost` | `<Button variant="outline">` |
| `.btn.sm`, `.ghost.sm` | `size="sm"` |
| `.nav` | `layout/PublicHeader` |
| `.pill` | `<Badge variant="soft">` |
| `.badge.ok / .wait / .info` | `admin/StatusBadge` |
| `.ic` | `ui/IconTile` (app areas; see §3.4) |
| `.panel` | `landing/HeroPanel` |
| `.path`, `.steps` | `landing/CourseOutline`, `landing/TrialSteps` |
| `.tiers` / `.tier.hot` | `landing/FeeTiers` + `landing/FeeCalculator` |
| `.tool` | `landing/ToolCards` (drawing + caption) |
| `.benefits` | `landing/NoteList` |
| `.community`, `.join` | `landing/ZaloCommunity` |
| `.faq details` | shadcn `<Accordion>` |
| `.band` | `landing/CtaBand` |
| `.foot` | `layout/PublicFooter` |
| `.fab` | `layout/ZaloFab` |
| `.rv` | `<Reveal>` |

Text with class `.ph` (dashed underline) is **placeholder copy awaiting confirmation** — never ship it to production.

When the design changes, update **both** the reference file and §3 of this document so they stay in sync.
