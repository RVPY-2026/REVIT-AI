# Combined admin review completion

Date: 2026-10-15. All work is local; no push, deployment, real database migration or real Storage write was performed.

## Integrated scope

- CRM: archive/restore and source transfer, duplicate-phone privacy/acknowledgment, status and contact history, scoped permissions and optimistic concurrency checks. Permanent deletion is admin-only after 30 days, with explicit relationship blockers, typed code/reason, transactional child cleanup, append-only burned codes and minimal audit data. Allocation and imports cannot reuse deleted codes.
- Sources and operations: source management/statistics exclude archived students; source-owner confirmations use the same lead definition. Public signup uses ordered shared source locks. Audit and Zalo viewers preserve filters and privacy masking; failed Zalo retries reuse the existing outbox boundary.
- Audit performance: four indexes, a 10,001-ID bounded probe, 50-row payload retrieval, a 10,000-result browsing cap and a visible overflow label. Offset is capped at 9,950; older matches require narrower filters.
- Learning: resource/curriculum management, formal lesson confirmation and unchanged trial/snapshot rules. Uploads go directly to private Supabase Storage through the official signed-upload API. Server reservation validation, bucket limits, real metadata completion checks, rejection/removal, ownership and cleanup remain enforced. Student access stays behind the student resource endpoint. Learning Excel export is removed.
- Shared UI: learning pages now consume B's actual ManagementPageHeader, ManagementEmpty, ManagementLoading, ViewerFilters and ViewerPagination. Header eyebrow is configurable; controlled pagination is one-based and does not mount URL hooks. Domain filter fields retain their mobile sheet and desktop layout. The filter trigger uses SheetTrigger so Escape restores focus. FRONTEND_RULES and the existing learning UI-kit showcase describe the integrated pattern.

## Merge completion

CRM had already integrated C's final eb60adb and B's implementation through 62e182d. The final B branch ce2163f, including query-plan evidence and reports, is now merged too. Migration metadata was retained from the reconciled CRM chain rather than replaced with B's older predecessor metadata. All three feature branch tips are ancestors of the combined result.

Migration journal is 0000 through 0008 in order, with linear snapshot ancestry. The final additions are 0006_admin_learning_content, 0007_audit_log_indexes and 0008_permanent_delete. `pnpm db:generate` reports `No schema changes, nothing to migrate`.

## Verification

- Typecheck and lint pass on the integrated code.
- Full suite: 162 tests, 159 pass, zero failures, three existing opt-in live-database skips. PGlite suites apply the complete actual migration journal, including deletion and audit-index fixtures.
- Standalone student CRUD PGlite runner: one pass, zero skips.
- Fresh browser checks: resource/curriculum/source/audit/Zalo populated pages at 375, 768 and 1280 in light and dark, 30 screenshots, no horizontal page overflow. One creation action per learning page.
- Resource and curriculum empty/loading states checked at 375px. UI-kit learning showcase renders. Browser console check after the primary flows had no errors.
- Keyboard: mobile resource filters open with Enter, close with Escape and restore focus. Resource editor opens as one dialog and closes with Escape. Search empty-state reset works. Controlled pagination on 120 rows advances from 1–20 to 21–40.
- Archived eligible profile opens the permanent-deletion dialog. Sale archived Kanban renders its permission panel without a deletion entry.
- Screenshots remain ignored under design/reference/admin-learning-content/final-integration/. No screenshot binaries were added to Git.
- Feature ranges contain no blobs over 500,000 bytes. The shared object store still contains old unreachable/reflog objects and two pre-existing temporary-object warnings; no shared garbage collection was performed.

## Remaining environment verification

Real Supabase authentication/Storage/CORS, deployed uploads, deployment worker/cron and real Zalo delivery remain unverified. Production build/deployment was not run, and no real data was changed. Mock mutations remain disabled. The three live-database tests remain intentionally skipped. The existing unrelated .claude/launch.json change is preserved outside the integration commits; temporary Next dev tsconfig additions are removed.

Detailed domain reports: [CRM deletion/FK decisions](student-permanent-delete.md), [learning/upload limits](admin-learning-content-report.md), [sources/audit evidence](admin-sources-audit-verification.md). Earlier pending-dependency notes in those reports describe their individual branch handoff; this document records the final combined state.
