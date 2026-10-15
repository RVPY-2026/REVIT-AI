# Admin sources, audit and Zalo queue

## Scope and permissions

The implementation starts at `main` commit `f9eb1d7` in the separate worktree `D:\RVPY\admin-sources-audit`, branch `feature/admin-sources-audit`. It adds three management routes:

| Route | Permission | Roles |
| --- | --- | --- |
| `/quan-tri/nguon-quang-cao` | `sources.manage` | admin |
| `/quan-tri/nhat-ky` | `audit.view` | admin |
| `/quan-tri/zalo` | `zalo.view` | admin |

`zalo.view` is separate from account activation, so queue access remains an explicit capability if roles evolve. Queries assert permission and every student join includes `studentScope(user, "management")`. Pages use `src/lib/api/admin-sources-audit.ts`; they never import the DB. Navigation appends one block to the existing System group. `CLAUDE.md` and student route files were not edited.

## Ad sources

- Codes are one uppercase ASCII letter, unique and immutable. Creation normalizes lowercase input and rejects reserved `R`. Sources are never deleted.
- `R` cannot be paused: public signup needs it for default, unknown and inactive source fallback. An already inactive R from external legacy data can be reactivated.
- New assignments require an enabled account with role `sale`. One account can own multiple sources. Existing assignments are preserved if the role is later revoked; unrelated name/activation edits still work. Revoked users lose management access through the session/permission checks. Reassigning or clearing the owner uses the normal transfer confirmation.
- Edits lock the source and compare expected name, owner and active values. The dialog captures these expectations together with its draft when opened. A server conflict preserves the draft; reopening captures fresh values.
- Owner changes count scoped existing leads under the source lock. Transfers with any leads require explicit confirmation and an exact expected lead count. Manual/public creation also locks source attribution rows, preventing an insert from slipping between that count and reassignment/deactivation.
- Activation changes are reversible, with an eight-second Undo toast. Undo performs the same optimistic server edit and can fail safely if another admin has changed the source.
- Live counts use signup month in `Asia/Ho_Chi_Minh`. Enrolled means current CRM status `enrolled`; conversion is enrolled divided by total, or an em dash at zero. The six-month drawer shows monthly arrivals and cumulative signup cohorts, classified by their **current** status. These are cohort figures, not reconstructed historical enrollment snapshots.
- Source lists sort by code. The single-letter uniqueness constraint bounds the real list to 26 rows, so a 100-row source list is not a valid business state. Audit and queue mocks contain 113 and 103 rows to exercise pagination.

## Audit privacy and pagination

`src/lib/audit-labels.ts` contains grouped action labels, entity names and field labels. Unknown actions fall back to their raw key. Student/source labels are joined into the audit SQL statement, avoiding per-row queries.

One CTE-based SQL statement applies actor name/email substring, exact action/entity, inclusive Vietnam business dates and literal entity-ID substring filters. It returns count, a clamped page and at most 50 rows from one snapshot, ordered by timestamp and ID descending. UUID substring matching casts to text; LIKE wildcard characters are escaped.

Sanitization happens before serialization, including the optional JSON view:

- Keys matching secret, token, password, credential, authorization, API key, cookie, chat ID or link hash are removed recursively.
- A change identified by a sensitive `field`, `key` or `answerKey` suppresses its before/after values.
- Email addresses become `a***@domain`. String, numeric and international contact values are masked; contact keys and phone before/after changes receive field-aware masking. Adjacent numbers that create an oversized phone candidate are conservatively redacted.
- Bearer/API/JWT-like tokens, labelled embedded secrets and URLs are redacted from strings.
- Recursion, collection sizes and string lengths are bounded. Unknown action/entity strings and actor names are sanitized too.

This is a defense layer for existing audit data, not a replacement for keeping secrets out of audit writes. No new audit index was added: this work did not measure a production need, and the brief requires evidence before adding one. Production-scale query planning remains a follow-up.

## Zalo queue

The viewer selects only student identity, timestamps, kind, status, attempts and safe delivery-error text. It never returns chat IDs, message bodies, event keys or raw provider errors. Arbitrary delivery failures become a short Vietnamese instruction; the desktop table truncates it with a title and mobile cards wrap it.

`getZaloQueueSummary` is shared with the existing profile query and scopes the join to students. Counts remain global to the caller's scope, independent of viewer filters. Oldest pending age is calculated on the server.

Single-item retries are immediate. Bulk retries require a dialog and reset at most 50 oldest failed rows, locking queue rows with `FOR UPDATE SKIP LOCKED`. Both profile and viewer paths use `resetFailedZaloItems` in `src/server/zalo/outbox.ts`; retry state transitions are not duplicated. Audit writes are in the retry transaction. Viewer retries only requeue records; delivery remains owned by the configured worker/cron path.

The configuration banner checks only presence of `ZALO_BOT_TOKEN` and `CRON_SECRET`; it never prints values. Presence does not prove that a cron job is installed or that delivery succeeds.

## Mock mode and UI patterns

All three pages render fake data from `src/mocks/admin-sources-audit.ts`. Create/edit/retry actions return the existing preview error and save controls are disabled with an explanatory line. Mock student links resolve existing fake profiles and source links use existing fake source IDs.

The pages reuse `AppShell`, `DataTable`, `StatusBadge`, clipboard buttons and Radix/shadcn dialogs, alert dialogs, sheets and popovers. Shared header, loading, empty, filter and pagination patterns are showcased in `/ui-kit`. Source and filter forms use React Hook Form and zod, validating on blur and submit; values survive server errors. Filters reset after clear and URL navigation. Source dialogs become full-screen on mobile; primary actions remain reachable after scrolling. Tables have sticky headers inside a keyboard-focusable scrolling region and become cards below 768px.

When both `NEXT_PUBLIC_USE_MOCK=true` and local-only `RVPY_ADMIN_VIEWER_TEST_STATES=1` are set, `previewState=loading|empty|error|one|long` selects reproducible acceptance fixtures. This is ignored in production and permission checks run before fixture handling. The error fixture deliberately throws into each segment's real error boundary.

## Database and integration

**Migration: none. SQL schema changes: none.** The existing source, audit and queue tables already have RLS enabled with no public policies; the isolated PGlite suite checks that state. Reserved migration `0005` is unused. No real database was migrated or contacted, no Zalo message was sent, and no branch was pushed.

Shared changes to coordinate when integrating: permissions, System navigation, status constants/badges, DataTable labels/scrolling, public/manual source locks in `actions/leads.ts`, profile queue-summary query and profile retry reset helper. Build-output ignore rules were broadened to `.next-*` because otherwise ESLint scanned generated preview bundles and exhausted memory. Do not copy generated dist folders or local logs into the parent checkout.

## Verification evidence

The final verification results, screenshots and keyboard observations are recorded in `docs/admin-sources-audit-verification.md`. `tests/admin-sources-audit.test.ts` runs actual records, actions and queries against isolated PGlite migrations, without falling through to a live connection. Existing live DB suites retain their opt-in flags.

To reproduce browser checks, start mock `pnpm dev` with a free port, `RVPY_TEST_DIST_DIR` and `RVPY_ADMIN_VIEWER_TEST_STATES=1`. Run `node tests/admin-sources-audit-browser.mjs --flows` or `--captures --route=zalo --theme=dark`, with `RVPY_PREVIEW_BASE_URL` pointing to the local server. Supply `RVPY_PLAYWRIGHT_MODULE` if Playwright is available through a bundled runtime rather than the project. The browser script verifies the mock banner before any form submission; the snapshot regression invokes only a mock action and confirms the preview error.

Remaining external verification: real authenticated Supabase sessions, real concurrent Postgres transactions and deployed Zalo/cron delivery. They were intentionally not performed under the brief's no-live-DB constraint. The Undo toast and pending delivery behavior have server-side coverage but cannot complete real writes in mock mode.
