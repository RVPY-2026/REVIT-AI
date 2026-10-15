# Admin sources and audit verification

## Delivery

Worktree: `D:\RVPY\admin-sources-audit`. Branch: `feature/admin-sources-audit`. Base: `main` at `f9eb1d7`. Changes are committed locally in separate backend, UI and evidence commits. No push or merge was performed.

Migration: **none**. Exact SQL schema changes: **none**. Reserved number `0005` remains unused. Existing migrations were exercised only in isolated PGlite. No live database, real Zalo delivery or production cron was used. `CLAUDE.md` and `/quan-tri/hoc-vien/**` are unchanged.

## Automated checks actually run

- `pnpm typecheck`: passed.
- `pnpm lint`: passed.
- `pnpm test`: **83 passed, 0 failed, 3 skipped** (86 total). Baseline was 69 passed; this feature adds 14 passing tests. The three existing live-database skips remain unchanged.
- Final full-suite run used `NODE_OPTIONS=--disable-wasm-trap-handler --max-old-space-size=768` to avoid the Windows runtime allocation failure. All live-database opt-in flags were unset.
- Typecheck and lint were repeated before each local commit.
- No test was removed or newly skipped.

`tests/admin-sources-audit.test.ts` covers actual permission checks; reserved/unique source code; sale-only owner assignment; scoped visibility after transfer; lead-count confirmation; optimistic conflict and reversal; keeping R active; editing a source whose previous owner lost the sale role; manual inactive-source rejection; public unknown/inactive fallback; atomic audit rollback; audit SQL filters and page boundaries; recursive secret removal and numeric/international/adjacent phone masking; unknown/prototype-key label fallback; failed-only retries and the 50-item cap; safe error output; existing RLS and absence of public policies.

## Browser and keyboard checks actually run

The mock development server ran on port 3117 with `NEXT_PUBLIC_USE_MOCK=true`, `RVPY_TEST_DIST_DIR=.next-admin-sources-final` and `RVPY_ADMIN_VIEWER_TEST_STATES=1`. The server has been stopped. Existing management pages and `/ui-kit` were inspected to match the established patterns.

The optional `tests/admin-sources-audit-browser.mjs` script completed `--flows --transfers` with `passed: true`. It used the bundled Playwright runtime, with `RVPY_PLAYWRIGHT_MODULE` pointing to that installation. It is not a replacement for the normal test suite and adds no dependency.

Keyboard checks used Tab, Enter and Escape for source creation/editing, owner selection, detail sheets, audit detail/JSON controls, filters, pagination and the bulk retry confirmation. Validation moved focus to the transfer confirmation when required. Fixes made during verification include resetting stale dialog expectations, preserving failed drafts, clearing filter form state after navigation, popup close timing, readable focus/scroll regions and compact queue summaries at 375px. All three routes denied the mock sale role.

Browser writes are disabled by mock mode. A guarded browser regression programmatically submits a form only after asserting the preview banner, to verify the existing preview error and preserved values. Source transfer and retry state changes are tested in isolated PGlite. Actual delivery, authenticated Supabase sessions and concurrent transactions on real Postgres were not verified. Token presence cannot prove cron installation. Contrast follows existing tokens and was visually inspected; no instrumented contrast measurement was performed.

## Screenshot evidence

Folder: `design/reference/admin-sources-audit/`.

- 108 screenshots: three routes × light/dark × 375/768/1280px × loading/empty/populated/error/validation/dialog.
- 36 screenshots: the same routes/themes/widths for one-row and long-list cases.
- 11 supplemental screenshots: source sheet, audit details/JSON, three no-permission screens and six source-transfer validation screens.
- Total: **155 PNG screenshots**, plus seven JSON result files and seven JPEG contact sheets.

Every captured viewport asserts no horizontal page overflow. Screenshots were inspected using route/theme contact sheets and representative full-size images, including the final compact queue layout and mobile transfer validation. The audit page has no mutation dialog; its dialog-state captures show the action-filter popover. Error-state captures exercise the actual segment error boundary through a local-only fixture. The capture hides the Next development overlay only. Source codes permit at most 26 real sources; 100+ row checks use 113 audit and 103 queue mock records.

Exact screenshot list:

- `audit-details-json-keyboard.png`
- `nguon-quang-cao-dark-1280-dialog.png`
- `nguon-quang-cao-dark-1280-empty.png`
- `nguon-quang-cao-dark-1280-error.png`
- `nguon-quang-cao-dark-1280-loading.png`
- `nguon-quang-cao-dark-1280-long.png`
- `nguon-quang-cao-dark-1280-one.png`
- `nguon-quang-cao-dark-1280-populated.png`
- `nguon-quang-cao-dark-1280-validation.png`
- `nguon-quang-cao-dark-375-dialog.png`
- `nguon-quang-cao-dark-375-empty.png`
- `nguon-quang-cao-dark-375-error.png`
- `nguon-quang-cao-dark-375-loading.png`
- `nguon-quang-cao-dark-375-long.png`
- `nguon-quang-cao-dark-375-one.png`
- `nguon-quang-cao-dark-375-populated.png`
- `nguon-quang-cao-dark-375-validation.png`
- `nguon-quang-cao-dark-768-dialog.png`
- `nguon-quang-cao-dark-768-empty.png`
- `nguon-quang-cao-dark-768-error.png`
- `nguon-quang-cao-dark-768-loading.png`
- `nguon-quang-cao-dark-768-long.png`
- `nguon-quang-cao-dark-768-one.png`
- `nguon-quang-cao-dark-768-populated.png`
- `nguon-quang-cao-dark-768-validation.png`
- `nguon-quang-cao-light-1280-dialog.png`
- `nguon-quang-cao-light-1280-empty.png`
- `nguon-quang-cao-light-1280-error.png`
- `nguon-quang-cao-light-1280-loading.png`
- `nguon-quang-cao-light-1280-long.png`
- `nguon-quang-cao-light-1280-one.png`
- `nguon-quang-cao-light-1280-populated.png`
- `nguon-quang-cao-light-1280-validation.png`
- `nguon-quang-cao-light-375-dialog.png`
- `nguon-quang-cao-light-375-empty.png`
- `nguon-quang-cao-light-375-error.png`
- `nguon-quang-cao-light-375-loading.png`
- `nguon-quang-cao-light-375-long.png`
- `nguon-quang-cao-light-375-one.png`
- `nguon-quang-cao-light-375-populated.png`
- `nguon-quang-cao-light-375-validation.png`
- `nguon-quang-cao-light-768-dialog.png`
- `nguon-quang-cao-light-768-empty.png`
- `nguon-quang-cao-light-768-error.png`
- `nguon-quang-cao-light-768-loading.png`
- `nguon-quang-cao-light-768-long.png`
- `nguon-quang-cao-light-768-one.png`
- `nguon-quang-cao-light-768-populated.png`
- `nguon-quang-cao-light-768-validation.png`
- `nguon-quang-cao-sale-no-permission.png`
- `nhat-ky-dark-1280-dialog.png`
- `nhat-ky-dark-1280-empty.png`
- `nhat-ky-dark-1280-error.png`
- `nhat-ky-dark-1280-loading.png`
- `nhat-ky-dark-1280-long.png`
- `nhat-ky-dark-1280-one.png`
- `nhat-ky-dark-1280-populated.png`
- `nhat-ky-dark-1280-validation.png`
- `nhat-ky-dark-375-dialog.png`
- `nhat-ky-dark-375-empty.png`
- `nhat-ky-dark-375-error.png`
- `nhat-ky-dark-375-loading.png`
- `nhat-ky-dark-375-long.png`
- `nhat-ky-dark-375-one.png`
- `nhat-ky-dark-375-populated.png`
- `nhat-ky-dark-375-validation.png`
- `nhat-ky-dark-768-dialog.png`
- `nhat-ky-dark-768-empty.png`
- `nhat-ky-dark-768-error.png`
- `nhat-ky-dark-768-loading.png`
- `nhat-ky-dark-768-long.png`
- `nhat-ky-dark-768-one.png`
- `nhat-ky-dark-768-populated.png`
- `nhat-ky-dark-768-validation.png`
- `nhat-ky-light-1280-dialog.png`
- `nhat-ky-light-1280-empty.png`
- `nhat-ky-light-1280-error.png`
- `nhat-ky-light-1280-loading.png`
- `nhat-ky-light-1280-long.png`
- `nhat-ky-light-1280-one.png`
- `nhat-ky-light-1280-populated.png`
- `nhat-ky-light-1280-validation.png`
- `nhat-ky-light-375-dialog.png`
- `nhat-ky-light-375-empty.png`
- `nhat-ky-light-375-error.png`
- `nhat-ky-light-375-loading.png`
- `nhat-ky-light-375-long.png`
- `nhat-ky-light-375-one.png`
- `nhat-ky-light-375-populated.png`
- `nhat-ky-light-375-validation.png`
- `nhat-ky-light-768-dialog.png`
- `nhat-ky-light-768-empty.png`
- `nhat-ky-light-768-error.png`
- `nhat-ky-light-768-loading.png`
- `nhat-ky-light-768-long.png`
- `nhat-ky-light-768-one.png`
- `nhat-ky-light-768-populated.png`
- `nhat-ky-light-768-validation.png`
- `nhat-ky-sale-no-permission.png`
- `source-detail-keyboard.png`
- `source-transfer-dark-1280.png`
- `source-transfer-dark-375.png`
- `source-transfer-dark-768.png`
- `source-transfer-light-1280.png`
- `source-transfer-light-375.png`
- `source-transfer-light-768.png`
- `zalo-dark-1280-dialog.png`
- `zalo-dark-1280-empty.png`
- `zalo-dark-1280-error.png`
- `zalo-dark-1280-loading.png`
- `zalo-dark-1280-long.png`
- `zalo-dark-1280-one.png`
- `zalo-dark-1280-populated.png`
- `zalo-dark-1280-validation.png`
- `zalo-dark-375-dialog.png`
- `zalo-dark-375-empty.png`
- `zalo-dark-375-error.png`
- `zalo-dark-375-loading.png`
- `zalo-dark-375-long.png`
- `zalo-dark-375-one.png`
- `zalo-dark-375-populated.png`
- `zalo-dark-375-validation.png`
- `zalo-dark-768-dialog.png`
- `zalo-dark-768-empty.png`
- `zalo-dark-768-error.png`
- `zalo-dark-768-loading.png`
- `zalo-dark-768-long.png`
- `zalo-dark-768-one.png`
- `zalo-dark-768-populated.png`
- `zalo-dark-768-validation.png`
- `zalo-light-1280-dialog.png`
- `zalo-light-1280-empty.png`
- `zalo-light-1280-error.png`
- `zalo-light-1280-loading.png`
- `zalo-light-1280-long.png`
- `zalo-light-1280-one.png`
- `zalo-light-1280-populated.png`
- `zalo-light-1280-validation.png`
- `zalo-light-375-dialog.png`
- `zalo-light-375-empty.png`
- `zalo-light-375-error.png`
- `zalo-light-375-loading.png`
- `zalo-light-375-long.png`
- `zalo-light-375-one.png`
- `zalo-light-375-populated.png`
- `zalo-light-375-validation.png`
- `zalo-light-768-dialog.png`
- `zalo-light-768-empty.png`
- `zalo-light-768-error.png`
- `zalo-light-768-loading.png`
- `zalo-light-768-long.png`
- `zalo-light-768-one.png`
- `zalo-light-768-populated.png`
- `zalo-light-768-validation.png`
- `zalo-sale-no-permission.png`

Verification JSON and contact sheets:

- `capture-all-all-edge-cases.json`
- `capture-all-all.json`
- `capture-nhat-ky-all.json`
- `capture-zalo-all-edge-cases.json`
- `capture-zalo-all.json`
- `keyboard-and-regressions.json`
- `nguon-quang-cao-dark-contact-sheet.jpg`
- `nguon-quang-cao-light-contact-sheet.jpg`
- `nhat-ky-dark-contact-sheet.jpg`
- `nhat-ky-light-contact-sheet.jpg`
- `source-transfer-checks.json`
- `supplemental-contact-sheet.jpg`
- `zalo-dark-contact-sheet.jpg`
- `zalo-light-contact-sheet.jpg`

## Decisions and reviewer risks

- `zalo.view` is a separate admin-only capability instead of coupling queue reading to student activation.
- No audit index was added because no production need was measured.
- Six-month source figures are signup cohorts classified by current CRM status, not historical enrollment snapshots.
- R cannot be paused because public signup requires a valid fallback.
- Unknown audit action keys retain a sanitized raw-key fallback; sensitive values are removed before reaching the client, including JSON details.
- Queue errors use a safe Vietnamese instruction instead of returning provider errors.
- Source Undo lasts eight seconds and uses optimistic expectations; a concurrent edit can cause a safe conflict.
- New assignments require an enabled sale account; an unchanged legacy owner assignment does not block unrelated edits after role revocation.

Integration hot spots: `permissions.ts`, `ManagementShell.tsx`, status constants/StatusBadge, DataTable, `actions/leads.ts`, the profile queue-summary query and profile retry helper. Preserve other agents' changes when resolving these small shared-file edits. No schema export change is required. Build-output ignores now cover `.next-*` to keep generated verification bundles out of lint and Git.

Behavior, permissions and privacy details: [admin-sources-audit.md](admin-sources-audit.md).

## Changed code and documentation files

- `.gitignore`
- `docs/admin-sources-audit-verification.md`
- `docs/admin-sources-audit.md`
- `eslint.config.mjs`
- `src/app/(admin)/quan-tri/nguon-quang-cao/error.tsx`
- `src/app/(admin)/quan-tri/nguon-quang-cao/loading.tsx`
- `src/app/(admin)/quan-tri/nguon-quang-cao/page.tsx`
- `src/app/(admin)/quan-tri/nhat-ky/error.tsx`
- `src/app/(admin)/quan-tri/nhat-ky/loading.tsx`
- `src/app/(admin)/quan-tri/nhat-ky/page.tsx`
- `src/app/(admin)/quan-tri/zalo/error.tsx`
- `src/app/(admin)/quan-tri/zalo/loading.tsx`
- `src/app/(admin)/quan-tri/zalo/page.tsx`
- `src/app/ui-kit/page.tsx`
- `src/components/admin/AdSourceDialog.tsx`
- `src/components/admin/AdSourceList.tsx`
- `src/components/admin/AdminSourcesAuditShowcase.tsx`
- `src/components/admin/AuditLogList.tsx`
- `src/components/admin/DataTable.tsx`
- `src/components/admin/ManagementEmpty.tsx`
- `src/components/admin/ManagementLoading.tsx`
- `src/components/admin/ManagementPageHeader.tsx`
- `src/components/admin/ManagementRefreshButton.tsx`
- `src/components/admin/StatusBadge.tsx`
- `src/components/admin/ViewerFilters.tsx`
- `src/components/admin/ViewerPagination.tsx`
- `src/components/admin/ZaloQueueList.tsx`
- `src/components/admin/ZaloQueueRetry.tsx`
- `src/components/layout/ManagementShell.tsx`
- `src/lib/api/admin-sources-audit.ts`
- `src/lib/audit-labels.ts`
- `src/lib/audit-privacy.ts`
- `src/lib/auth/permissions.ts`
- `src/lib/constants.ts`
- `src/lib/schemas/ad-source.ts`
- `src/lib/schemas/admin-viewers.ts`
- `src/mocks/admin-sources-audit.ts`
- `src/server/actions/ad-sources.ts`
- `src/server/actions/leads.ts`
- `src/server/actions/zalo-queue.ts`
- `src/server/ad-source-record.ts`
- `src/server/admin-preview-state.ts`
- `src/server/queries/ad-sources.ts`
- `src/server/queries/audit-log.ts`
- `src/server/queries/student-onboarding.ts`
- `src/server/queries/zalo-queue.ts`
- `src/server/student-onboarding-record.ts`
- `src/server/zalo-queue-record.ts`
- `src/server/zalo/outbox.ts`
- `tests/admin-sources-audit-browser.mjs`
- `tests/admin-sources-audit.test.ts`

The evidence folder files are listed above. Local logs and generated build output are excluded.
