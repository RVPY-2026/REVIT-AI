# RVPY Web

Website for RVPY (Ocean Studio): a public site advertising the Revit course and the RVPY add-in suite, a student area, and a management area that replaces the current Google Sheets + Zalo manual workflow.

## Docs

| File | Contents |
|---|---|
| [CLAUDE.md](CLAUDE.md) / [AGENTS.md](AGENTS.md) | Project context for agents: product, roles, page map, business flow, open questions |
| [FRONTEND_RULES.md](FRONTEND_RULES.md) | Frontend-only rules: stack, design tokens, layout patterns, components, quality bar |
| [BACKEND_RULES.md](BACKEND_RULES.md) | Server rules: Supabase + Drizzle, Google sign-in, authorization, actions, exports, payments/licensing |
| [docs/](docs) | Database design and ERD, business workflow review, Google sign-in + admin setup, staging setup, CRM phase 1 notes, source-spreadsheet data dictionary |


## Stack

Next.js 16 (App Router, frontend + backend in one app) · TypeScript · Tailwind v4 + shadcn/ui · Supabase (Postgres, Google sign-in, Storage) · Drizzle ORM · zod · Vercel · pnpm.

## Getting started

```bash
pnpm install
cp .env.example .env.local   # NEXT_PUBLIC_USE_MOCK=true works without a database
pnpm dev
```

With a Supabase project: fill `.env.local`, then `pnpm db:migrate && pnpm db:seed`.

## Status

- [x] Visual direction "Magenta Night" approved
- [x] Frontend rules; live reference is the UI kit at `/ui-kit` (dev only)
- [x] Next.js project setup (skeleton)
- [x] Backend rules + database schema
- [ ] Supabase project + Google provider (sign-in pages and CRM screens are built; they run in mock mode until this exists)
- [x] UI foundation (tokens, shadcn, logo) — preview at `/ui-kit`
