# RVPY Web — Agent Guide

## How to work in this repo

1. **Frontend work:** read [FRONTEND_RULES.md](FRONTEND_RULES.md) in full first. Take token values from `src/app/globals.css` and see how things look in the UI kit at `/ui-kit` (FRONTEND_RULES §10).
2. **Backend work** (`src/server`, `src/proxy.ts`, `src/app/api`, auth, database): read [BACKEND_RULES.md](BACKEND_RULES.md) in full first. §4 (authorization) is non-negotiable.
3. Check current library docs (Context7, or the bundled Next.js docs in `node_modules/next/dist/docs/`) before using an API — especially Next.js 16 App Router (`proxy.ts`, Cache Components), Tailwind v4, shadcn/ui, Supabase SSR, Drizzle.
4. **Stack:** one Next.js app = frontend + backend, Supabase (Postgres + Google sign-in + Storage), Drizzle ORM, zod, Vercel. pnpm. Run `pnpm typecheck && pnpm lint` before committing.
5. UI work can run without a database: `NEXT_PUBLIC_USE_MOCK=true` serves `src/mocks` through `src/lib/api` (FRONTEND_RULES §7).
6. Never commit real student data, the client's Google Sheet links, or secrets. Mocks use fake names.
7. If the design changes, update `globals.css`, FRONTEND_RULES §3 **and** the UI kit (`/ui-kit`). New shared components or patterns go into the UI kit too.
8. All code, comments and docs in English. All UI copy in Vietnamese.

---

## 1. What the product is

RVPY (Ocean Studio) runs a **Revit training course** for working architects and engineers (3–5 years of experience) and ships a **Revit add-in suite** (Auto Join and others) to its students.

Today everything is run by hand in Google Sheets + Zalo: copying student IDs, duplicating a per-student tracking sheet, sharing file permissions, sending scripted Zalo messages, recording payments, granting add-in licenses by email. This website replaces that workflow.

Three areas:

| Area | Who | Purpose |
|---|---|---|
| **Public site** | Anyone | Advertise the **course** (main focus) and the tools (minor), trial sign-up form, invite to the Zalo communities |
| **Student area** | role `student` | Course materials, lessons, software download + install guide, learning progress, license status, referral progress, support |
| **Management area** | roles `admin`, `sale` | Lead/student pipeline, payments, licenses, Zalo message templates, reports and exports |

## 2. What the client cares about (from the discovery call)

- **Fear of losing data** → every management list must be exportable to Excel; a monthly report export exists.
- **Fear of leaking data** → student documents are view-only; each role sees only what it must.
- **Must manage from a phone** → the management area must work well at 375px.
- **Sales calls stay human.** The site does not message students on Zalo. It helps with scripted message templates (pre-filled with the student's data) and a copy button.
- **Several ad runners (A, B, C…)** bring leads. Each sees only their own leads. Overall payment data is admin-only.
- Later goal: students install the add-in by themselves instead of the owner remoting in for an hour. Not in scope yet.
- **Transition from Google Sheets:** the owner keeps the sheets until they trust the site. v1 imports sheet exports once and exports Excel back out; there is no live two-way sync (BACKEND_RULES §7).
- After payment, the student is asked to add the company's **official Zalo** account (different from the consulting account) — this is one more message template, not an automation.

## 3. Roles

| Role | Can see |
|---|---|
| `admin` | Everything in the management area; can also view the student area |
| `sale` (ad runner A/B/C) | Only leads whose source is theirs, message templates, their own report. **Not**: overall payments, licenses, ad-source management, settings |
| `student` | Only the student area and their own data |
| `user` | Public website only; assigned automatically on first successful sign-in |

Sign-in supports **Google and a passwordless email link**. Anyone who completes sign-in gets a public `user` account automatically; it grants no access to management or student data. Approved `admin`/`sale` accounts route to `/quan-tri`, and `student` accounts route to `/hoc-vien`. Disabled or inconsistent app accounts see a support page with a Zalo contact button. Users with more than one role get a "switch area" item in the avatar menu (the client described this as "click the logo, choose Admin or Student").

## 4. Page map

```
(public)
  /                         home (course-focused, see §5)
  /khoa-hoc                 course details
  /cong-cu                  add-in suite (minor page)
  /dang-ky                  trial sign-up form
  /dang-ky/thanh-cong       thank-you + 2 Zalo community links
  /chinh-sach/[slug]        terms, privacy, refunds
/dang-nhap                  Google or passwordless email sign-in
/tai-khoan                  signed-in account details
(student) /hoc-vien
  /                         overview
  /tai-lieu                 materials (view-only)
  /khoa-hoc/[lesson]        lessons
  /phan-mem                 download + install guide
  /tien-do                  learning progress (replaces the per-student tracking sheet)
  /gioi-thieu-ban           referral link + progress
  /ho-tro                   support / feedback
(admin) /quan-tri
  /                         dashboard
  /hoc-vien                 leads & students (table + kanban)
  /hoc-vien/[id]            student profile
  /thanh-toan               payments (admin only)
  /license                  add-in licenses (admin only)
  /mau-tin-nhan             Zalo message templates
  /nguon-quang-cao          ad runners A/B/C (admin only)
  /bao-cao                  monthly reports + export
  /cai-dat                  settings (admin only)
```

## 5. Public home page — section order

The course is the focus; the tools are one small section.

1. **Hero + curriculum (one scroll-driven section, `landing/build-story`)** — hero copy with primary "Đăng ký 3 buổi học thử", secondary "Xem lộ trình"; then the 4 curriculum modules (client sheet "Lộ trình học Revit BIM toàn diện") scroll past a sticky 3D "drawing sheet" where a sample 4-storey building assembles step by step: grids/levels → structure → architecture → MEP → clash detection → exploded handover.
2. **Course journey** — "1 lần đăng ký": 1-on-1 phase (1/4, min 45 days) → advanced courses 2–4 (3/4, online 2 sessions/week); knowledge split 1/3 · 1/3 · 1/3. Then career levels BIM Modeler → Coordinator → Manager.
3. **9-day trial** — 4 steps: sign up → join Zalo groups → install software → attend 3 lessons.
4. **Fees & referral offer** — 4 tiers (§7) + the alumni 30% offer.
5. **Tools** — 3 small cards (Auto Join…), "included for students".
6. **Zalo community** — 4 benefits + 2 join buttons (§8).
7. **FAQ**.
8. **CTA band**, multi-column footer, floating Zalo button.

The landing page (`src/app/(public)/page.tsx`) implements this order.

## 6. Student pipeline (draft — confirm with client)

`Mới đăng ký` → `Đang tư vấn` (legacy `CHỜ CHỐT SALE`) → `Đang học thử` → `Học chính thức`, plus side branch `Không tiếp tục`. Contact, group membership, fee sent, software readiness and official-Zalo contact are separate checklist timestamps, not kanban stages. Payment and license states are independent.

Badge colors: new = info, consulting / trial = warning, enrolled = success, dropped = muted.

Management list (`/quan-tri/hoc-vien`): table view (default) and kanban by pipeline status; filters for status, source (A/B/C/R), sign-up month, and search by name / phone / email / ID; quick actions: change status, open profile, copy phone, open Zalo (`https://zalo.me/<phone>`).

Student profile (`/quan-tri/hoc-vien/[id]`) replaces the per-student sheet the client duplicates by hand: sign-up answers (occupation, how they heard about RVPY…), status timeline, per-lesson progress, call notes, payments, license, granted documents, and a **"next message"** block suggesting the template for the current status with a copy button.

**Student ID** format: `<source code><YYMM><three-digit sequence>`, e.g. `R2610021` (R = found by RVPY itself), `A2610007` (ad runner A). Allocate atomically per source and month in `Asia/Ho_Chi_Minh`; keep UUIDs as internal keys. Shown in mono. Long Zalo labels are generated when needed; preserve imported labels/raw exceptions separately.

## 7. Fees & referral offer

Current offer (client poster), valid during the 9-day trial:
- Signing up within the 9 days: **4.500.000đ**.
- Fee drops to **3.600.000đ** when the student refers 5 new people who join the 3 free trial lessons.
- Drops to **2.700.000đ** when 1 of those 5 enrolls.
- When 2 more referrals enroll, RVPY refunds the 2.700.000đ — the course becomes free.

Alumni thank-you offer: after enrolling, every referred student from the **4th** onward refunds **30%** of the fee, unlimited.

Public site: show as 4 tiers plus the alumni offer. Student area (`/hoc-vien/gioi-thieu-ban`): personal referral link + copy button, progress "invited x/5 · enrolled y", current tier. Numbers come from the API; the frontend does not calculate them.

## 8. Zalo communities

Benefits: course materials and Revit library updates · job connections between students and employers · Q&A during the course · announcements of new topics and events.

Two groups, students should join both:
- `https://zalo.me/g/zojesfhkvohvxp84kwl7`
- `https://zalo.me/g/3l9dhtuf9gmb7vk6bpc0`

Keep them in `lib/constants.ts`.

## 9. Suggested build order

Status markers: [x] done · [ ] to do.

1. [x] Next.js 16 + Supabase/Drizzle skeleton, DB schema + first migration, auth/permission helpers, `BACKEND_RULES.md`.
2. [x] Tokens, fonts, light/dark, base `ui` components (shadcn, Radix base), logo, favicons. Dev-only showcase at `/ui-kit`.
3. [ ] Public home ([x] landing page) + trial sign-up form wired to `submitLeadSignup` (thank-you page with the 2 Zalo links).
4. [ ] Supabase project + Google provider; `/dang-nhap`, `/auth/callback`, `/chua-kich-hoat`; app shell + role guards (mock role switcher for dev).
5. [ ] Management: student list (table + kanban), student profile, status changes, call notes, message templates, Excel export.
6. [ ] Student area: overview, materials (signed URLs, view-only), software + install guide, progress, referrals.
7. [ ] Payments, licenses, reports, settings; nightly backup cron; one-off Google Sheets import script.
8. [ ] Later: payment gateway webhook, add-in license check API, self-install of the add-in.

## 10. Open questions for the client

- Resolve conflicting fee sources: the nine-day poster offers 4,500,000 VND, while the legacy formula suggests 5,400,000 VND for birth year < 1990. Confirm which rule takes precedence; no default agreed fee is automated.
- Resolve conflicting course schedules: landing copy says minimum 45 days and two online sessions/week; the legacy plan totals 50 base days and the screenshot says 1.5-2 months with specialist sessions Saturday at 05:00. Confirm each phase before publishing those claims.


- Confirm the observed birth-year fee rule: born before 1990 → 5.400.000đ suggested, otherwise 4.500.000đ. Keep negotiated fees separate.
- Is the pipeline in §6 correct and complete?
- Is there a "teaching assistant" role, or only admin + sale?
- Can a `sale` see how much their own students paid?
- Is the add-in licensed to every student or only paying ones, and for how long?
- Online or in-person lessons?
- Landing copy written without a client source, live on the home page until confirmed: "45 minutes per 1-on-1 session"; "RVPY contacts you on Zalo the same day"; FAQ system requirements (Windows 10/11 64-bit, ~10 GB installer, Revit 2025–2027); tool names "Đánh số tự động" and "Xuất bản vẽ hàng loạt" (only Auto Join is confirmed); the FAQ answer to "online or in-person".
- Prioritize confirmation of CHIA %: commission formula, rate basis, settlement period and sale visibility. Codes are already decided: one counter per source/month.
