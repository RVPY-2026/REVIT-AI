# RVPY Web: Agent Guide

This file used to be a second copy of the project guide and drifted out of date. **The single source of truth is [CLAUDE.md](CLAUDE.md)**: read it first, then follow the rules it points to:

- Frontend work: [FRONTEND_RULES.md](FRONTEND_RULES.md) (live reference: the UI kit at `/ui-kit`).
- Backend work: [BACKEND_RULES.md](BACKEND_RULES.md). Its section 4 (authorization) is non-negotiable.

Do not add project context here; edit CLAUDE.md instead.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
