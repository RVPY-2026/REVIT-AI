# Admin sources and audit review follow-up

## Delivery and integration

Worktree: `D:\RVPY\admin-sources-audit`. Branch: `feature/admin-sources-audit`. Original base: `main` at `f9eb1d7`.

- Backend/UI implementation commits `9c33a55` and `8199cfa` remain unchanged.
- The old screenshot commit `8b2c722` was amended to `59bae2b`, removing the evidence folder from that commit and adding its Git ignore rule. The files remain available locally. No other branch was rewritten and no force push was performed. **Do not integrate old `8b2c722`.** If an integration branch already contains that old commit, merging this rewritten branch cannot remove the old reachable blobs; rebuild that integration history from the clean base with the rewritten feature branch. No other branch was changed here.
- `0e7b929` merges committed CRM baseline `53dd948`. Conflicts retain the compatible manual source shared lock and both DataTable accessibility/scrolling improvements. CLAUDE.md and student route changes come exclusively from that CRM baseline; this feature does not author changes there.
- `6f59ca3` imports C's exact completed `0006` SQL, schema and generated snapshot from `07aab9e`, including its journal entry. C's feature code/history is intentionally left for the coordinator to integrate separately, avoiding unrelated large screenshot objects in this branch.
- `df420b9` adds archive-aware figures/confirmation counts, source lock concurrency checks, audit indexes/bounded pagination and the full migration loaders. `62e182d` adds one-instance sticky headers, bounded pagination UI and documented UI-kit examples. A final documentation commit follows them.

**Migration dependency:** `0004 -> 0005 -> 0006 -> 0007` is complete here. A's reserved `0008` must be generated after integrating these exact snapshots and its own schema changes. This branch never consumes A's `0008`. The coordinator must integrate C's remaining feature changes and A's future migration; their application behavior is outside this verification.

## Exact SQL summary

Generated with `pnpm db:generate --name audit_log_indexes`:

```sql
CREATE INDEX "audit_log_created_id_index" ON "audit_log" USING btree ("created_at" DESC NULLS LAST,"id" DESC NULLS LAST);
CREATE INDEX "audit_log_entity_id_index" ON "audit_log" USING btree ("entity","entity_id");
CREATE INDEX "audit_log_action_created_index" ON "audit_log" USING btree ("action","created_at" DESC NULLS LAST);
CREATE INDEX "audit_log_actor_created_index" ON "audit_log" USING btree ("actor_id","created_at" DESC NULLS LAST);
```

`0007_audit_log_indexes` only adds those four indexes. It does not alter RLS, policies or business records. The generated `0007` snapshot's `prevId` equals C's actual `0006.id`; a test checks every snapshot/journal link. No snapshot was hand-edited or fabricated. A subsequent `pnpm db:generate` reports **No schema changes, nothing to migrate**. Imported `0006` creates C's learning upload reservations table, enables RLS, and adds its FK/checks; that SQL is unchanged from C.

## Automated checks actually run

- `pnpm typecheck`: passed.
- `pnpm lint`: passed.
- `pnpm test`: **126 passed, 0 failed, 3 existing live-database skips** (129 total). The admin source/audit suite contributes 19 passes, up from its original 14; no existing test was removed or newly skipped.
- `pnpm exec tsx --conditions=react-server tests/ad-source-locks-postgres.ts`: passed all three concurrency checks on a disposable PostgreSQL 16 cluster.
- `tests/migration-v1.mjs`: passed against isolated PGlite after migrating the full current chain. Its module boundaries now avoid importing the live DB through the outbox.
- `tests/student-crud-integration.mjs`: 1 passed, 0 failed, 0 skipped with PGlite explicitly enabled.
- `pnpm db:generate` after generation: nothing to migrate.

The final source/audit tests apply every migration from the journal and verify the files exactly match it. Existing CRM and signup PGlite suites and legacy migration/CRUD runners also use this shared loader, so new migrations cannot silently be omitted. The leads action test injects the actual `@/server/phone-matches` module, preserving its `DuplicatePhoneError` and `requirePhoneAcknowledgment` exports.

Archive fixtures cover all six signup cohorts, monthly/lifetime/enrolled figures, conversion, non-archived transfer confirmation counts, and a source containing only archived students (zero counts, null conversion, zero confirmation count). Existing source scope, reserved/unique code, optimistic conflicts, manual inactive rejection, public fallback, audit privacy/filters/pagination and failed-only/capped Zalo retry checks remain green.

Normal tests used `NODE_OPTIONS=--disable-wasm-trap-handler --max-old-space-size=768` to avoid Windows allocation issues. All real-database opt-in flags remained unset. The PostgreSQL concurrency runner never reads any project DATABASE_URL; it creates a temporary cluster on a free 127.0.0.1 port and shuts it down/removes it afterwards. It proves two signups can reach the insert boundary together while holding compatible source locks, a source edit waits for both, and an edit that commits first makes the blocked signup fall back to R.

## Audit query evidence and trade-off

The actual one-statement query was exercised on 12,050 matching fake audit rows, plus other fixture events. It materializes only narrow `(id, created_at)` pairs for the newest 10,001 matches (one sentinel), counts that bounded set, and enriches at most 50 page rows. Offset is capped at 9,950 (page 200). Older matches require narrower filters. This preserves existing page URLs/back navigation instead of introducing cursor state; work on matched IDs and offsets is bounded, although selective/free-text filters can still examine nonmatching rows.

The 12,050-row test verifies capped totals, last page, no duplicate page IDs, date filtering and empty boundaries. A separate 10,000/10,001 fixture verifies the exact-to-capped transition. The UI displays `10.000+`, a correct visible range and a narrowing instruction, with previous/next availability from the server and filters preserved.

The recorded run took **41 ms** for the normal query; EXPLAIN execution took **107.537 ms** under PGlite while other tests ran. The plan uses `audit_log_created_id_index`, returns 10,001 matching IDs, and joins 50 payload rows by primary key. `DESC NULLS LAST` in the query matches Drizzle's generated descending index ordering. These are local correctness/planner observations, not production latency guarantees. The full measured plan is committed as [admin-sources-audit-query-plan.json](admin-sources-audit-query-plan.json).

## Browser and keyboard checks actually run

Mock development server: port 3117, `NEXT_PUBLIC_USE_MOCK=true`, `RVPY_TEST_DIST_DIR=.next-admin-review`, `RVPY_ADMIN_VIEWER_TEST_STATES=1`. The browser runner uses bundled Playwright via `RVPY_PLAYWRIGHT_MODULE`; no package dependency was added.

- `--captures`: 108 screenshots, all passed.
- `--captures --edge-cases`: 36 screenshots, all passed.
- `--headers --flows --transfers`: 29 screenshots, passed.
- Final keyboard follow-up also verifies the UI-kit bounded pagination example shows `10.000+` and disables next on page 200.

The three pages were rechecked at 375/768/1280px in light and dark: loading, empty, populated, error, invalid form/filter, open dialog/popover, one row and long text/list. Every capture asserts no horizontal page overflow. Route/theme contact sheets and representative full-size images were visually inspected again. The audit viewer has no mutation dialog; its dialog capture shows the action filter popover. Error fixtures enter real segment error boundaries; only the Next development portal is hidden for capture.

Keyboard checks cover Tab/Enter owner selection, source validation, source/sheet Escape, preserved drafts after a mock server error, reset filters, audit details/JSON, pagination, queue confirmation and no-permission routes. The header checks scroll all three routes in all six viewport/theme combinations, assert exactly one primary action, verify it remains within the visible viewport, and open/close exactly one dialog/alert-dialog. ManagementPageHeader now uses CSS sticky positioning without an observer or cloned action, retaining one stateful dialog instance. The shared header/empty/loading/filter/pagination patterns are demonstrated in `/ui-kit` and documented in FRONTEND_RULES section 5.

## Evidence and history hygiene

The **173 PNG screenshots remain local**, under `design/reference/admin-sources-audit/`, ignored by Git. They consist of the 144 route/theme/viewport/state cases plus 29 supplementary keyboard, permission, transfer and sticky-header screenshots. No screenshot is included in the new branch history. The checked `git rev-list --objects main..HEAD | git cat-file --batch-check` contains **zero blobs over 500,000 bytes**. Existing unrelated branches and working directories were not rewritten or cleaned.

Exact local screenshot manifest:

- `audit-details-json-keyboard.png`
- `header-sticky-nguon-quang-cao-dark-1280.png`
- `header-sticky-nguon-quang-cao-dark-375.png`
- `header-sticky-nguon-quang-cao-dark-768.png`
- `header-sticky-nguon-quang-cao-light-1280.png`
- `header-sticky-nguon-quang-cao-light-375.png`
- `header-sticky-nguon-quang-cao-light-768.png`
- `header-sticky-nhat-ky-dark-1280.png`
- `header-sticky-nhat-ky-dark-375.png`
- `header-sticky-nhat-ky-dark-768.png`
- `header-sticky-nhat-ky-light-1280.png`
- `header-sticky-nhat-ky-light-375.png`
- `header-sticky-nhat-ky-light-768.png`
- `header-sticky-zalo-dark-1280.png`
- `header-sticky-zalo-dark-375.png`
- `header-sticky-zalo-dark-768.png`
- `header-sticky-zalo-light-1280.png`
- `header-sticky-zalo-light-375.png`
- `header-sticky-zalo-light-768.png`
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

## Remaining verification and reviewer risks

- No shared Supabase DB, real authentication session, Storage service, deployed cron or real Zalo delivery was used. Real writes remain disabled in the mock browser; record/transaction behavior is covered by isolated databases.
- PostgreSQL concurrency was verified on a disposable local cluster, not the deployed connection pool or shared DB. The default test command requires no PostgreSQL service; the explicit concurrency runner requires local binaries (`RVPY_POSTGRES_BIN` overrides their directory).
- Production query plans and write cost of four additional audit indexes still need workload validation. Actor substring and entity-ID substring searches may examine many nonmatching rows despite the matched-count cap.
- UI colors follow existing tokens and were visually inspected; no new instrumented contrast audit was run.
- The six-month source display is signup cohorts classified by current status, not reconstructed historical enrollment snapshots.
- Sources are bounded to 26 possible single-letter codes. The 100+ row cases use audit/queue mocks (113/103), not impossible source counts.
- C's full feature and A's `0008` are coordinator dependencies; importing `0006` here does not validate C's upload flows or A's new work. Compare the exact completed `0006` snapshot before integration; regenerate later migrations if C changes it.

## Review follow-up file manifest

- `FRONTEND_RULES.md`
- `docs/admin-sources-audit-query-plan.json`
- `docs/admin-sources-audit.md`
- `src/app/(admin)/quan-tri/nhat-ky/page.tsx`
- `src/components/admin/AdminSourcesAuditShowcase.tsx`
- `src/components/admin/ManagementPageHeader.tsx`
- `src/components/admin/ViewerPagination.tsx`
- `src/lib/api/admin-sources-audit.ts`
- `src/server/actions/leads.ts`
- `src/server/ad-source-record.ts`
- `src/server/db/migrations/0007_audit_log_indexes.sql`
- `src/server/db/migrations/meta/0007_snapshot.json`
- `src/server/db/migrations/meta/_journal.json`
- `src/server/db/schema/content.ts`
- `src/server/queries/ad-sources.ts`
- `src/server/queries/audit-log.ts`
- `tests/ad-source-locks-postgres.ts`
- `tests/admin-sources-audit-browser.mjs`
- `tests/admin-sources-audit.test.ts`
- `tests/crm-hardening-db.test.ts`
- `tests/helpers/db-migrations.ts`
- `tests/helpers/local-postgres.ts`
- `tests/migration-v1.mjs`
- `tests/signup-crm-regressions.test.ts`
- `tests/student-crud-integration.mjs`

Behavior/privacy: [admin-sources-audit.md](admin-sources-audit.md). Local captures, logs, temporary clusters and build output are excluded from commits.

## Final history audit

`git rev-list --objects main..HEAD` checked with `git cat-file --batch-check`: 0 blobs above 500,000 bytes, 0 objects in the ignored capture folder. Largest changed blob: 75,851 bytes (`src/server/db/migrations/meta/0007_snapshot.json`). C dependency files compare byte-for-byte with `07aab9e`. No push, project database migration or Zalo delivery was performed.
