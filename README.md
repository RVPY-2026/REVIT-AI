# RVPY Web

Website for RVPY (Ocean Studio): a public site advertising the Revit course and the RVPY add-in suite, a student area, and a management area that replaces the current Google Sheets + Zalo manual workflow.

## Docs

| File | Contents |
|---|---|
| [CLAUDE.md](CLAUDE.md) / [AGENTS.md](AGENTS.md) | Project context for agents: product, roles, page map, business flow, open questions |
| [FRONTEND_RULES.md](FRONTEND_RULES.md) | Frontend-only rules: stack, design tokens, layout patterns, components, quality bar |
| [BACKEND_RULES.md](BACKEND_RULES.md) | Server rules: Supabase + Drizzle, Google sign-in, authorization, actions, exports, payments/licensing |
| [design/reference/rvpy-landing.html](design/reference/rvpy-landing.html) | Approved design as a static HTML page — open it in a browser |

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
- [x] Frontend rules + reference page
- [x] Next.js project setup (skeleton)
- [x] Backend rules + database schema
- [ ] Supabase project + Google provider
- [ ] UI foundation (tokens, shadcn, logo)
