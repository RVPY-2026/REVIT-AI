# Admin learning content review fixes

## Checkout and merge

Worktree: `D:/RVPY/worktrees/admin-learning-content`; branch: `feature/admin-learning-content`, originally based on main `f9eb1d7`. CRM baseline `53dd948` is merged in local commit `07aab9e`. Its archive checks, permission additions, student-profile changes and migrations 0004/0005 are preserved. No push, live database migration, real Storage mutation or external message was performed. Changes to CLAUDE.md in this branch come solely from that CRM merge; this feature did not edit it.

The feature's own history was rewritten non-interactively to remove every file under `design/reference/admin-learning-content/` from its commits. Local evidence was restored from an archive and is now gitignored. Other branches and the original dirty checkout were preserved. Old commit IDs from the initial handoff must not be used as the current feature tip.

## C-1: direct signed uploads

`prepareResourceUpload` validates extension + MIME + mode + size on the server, authorizes `resources.manage`, generates an independent private path, creates an audited reservation and returns the official signed destination/token only to the admin uploader. The browser uses the official `uploadToSignedUrl` method. An XMLHttpRequest fetch adapter supplies progress and AbortController cancellation; retry uses a new reservation. The Next.js PUT proxy and byte-streaming helper are removed. Files never pass through the application request body.

`completeResourceUpload` authorizes and locks the caller's pending reservation, then reads actual Storage metadata. Matching size/MIME changes it to uploaded. Mismatch/expiry cancels it, records audit in that transaction, and removes the object best-effort. Another admin cannot complete or cancel a caller's reservation. Resource save consumes the reservation once, preserving resource IDs during replacement. Students still receive no bucket or path and access files only through their existing authorized resource endpoint.

Bucket creation/update enforces privacy, a 50,000,000-byte file limit and the MIME allowlist. View uploads are capped at 25,000,000 bytes; downloads at 50,000,000 bytes. Larger installers are explicitly rejected in the Vietnamese form. External generic links are not offered because the existing origin CHECK permits only Storage or a YouTube embed.

Expired pending/uploaded/cancelled reservations are cleaned on the next authorized prepare and by the existing bearer-authenticated `/api/cron/zalo-outbox` worker. No scheduler was created. Cleanup marks successful rows cleaned with audit in the same transaction and leaves failed deletions retryable. Replaced/deleted consumed reservations are retired so objects recreated using a still-valid old signed capability are swept after expiry. Closing/cancelling also attempts immediate removal. Operational reservation rows remain for audit.

### Official limits checked on 15 October 2026

- Vercel's exact documented Function request/response payload limit is **"4.5 MB"**. Larger bodies receive 413. Streaming through a Function does not make that ingress limit suitable for these files. [Vercel Functions limits](https://vercel.com/docs/functions/limitations#request-body-size).
- Supabase Free's maximum global per-file setting is **"50 MB"**; a bucket limit cannot exceed the global limit. We use 50,000,000 bytes conservatively and do not alter the plan/global setting. A lower project setting still needs owner configuration. Direct Storage transfer bypasses the Vercel body limit. [Supabase file limits](https://supabase.com/docs/guides/storage/uploads/file-limits).
- Signed upload capabilities last two hours. Creation disables upsert. [createSignedUploadUrl](https://supabase.com/docs/reference/javascript/storage-from-createsigneduploadurl), [uploadToSignedUrl](https://supabase.com/docs/reference/javascript/storage-from-uploadtosignedurl), [object info](https://supabase.com/docs/reference/javascript/storage-from-info), [bucket restrictions](https://supabase.com/docs/reference/javascript/storage-updatebucket). Installed SDK source and Context7 were also checked; the official method does not forward an AbortSignal, which is why the custom fetch adapter owns the XHR cancellation.

## C-2: migration proof and dependencies

After merging CRM 0004/0005, 0006 was regenerated with `pnpm db:generate --name admin_learning_content`. No snapshot content or predecessor IDs were manually edited. The resulting journal ends 0004, 0005, 0006. `0006.prevId` equals the actual `0005.id`; the complete generated schema includes `students.archived_at`. The metadata regression test asserts both facts.

Final SQL `0006_admin_learning_content.sql` creates only `learning_uploads`: nine columns (id, actor_id, filename, object_path, content_type, size, mode, status, expires_at), UUID primary key with `gen_random_uuid()`, unique object_path, actor FK to users without cascading deletion; size >0 and <=50000000; mode view/download; status pending/uploaded/consumed/cancelled/cleaned. It enables RLS and creates no public policies. Existing business tables are unchanged by 0006.

`pnpm db:generate --name verify_learning_metadata` reports **No schema changes, nothing to migrate**. The isolated learning Postgres test applies fresh SQL 0000 through 0006, including CRM 0004 and 0005, and checks RLS/no policies. The server-module test explicitly defines the `@/server/zalo/outbox` boundary; no real provider is reachable implicitly.

**Pending integration dependency:** migrations 0007 (B) and 0008 (A) are not on this branch. Their owners must consume this final 0006 snapshot and generate their own real successor metadata in that order. No placeholders or fabricated predecessor snapshots were added. This branch is ready for that dependency handoff; it does not claim the future 0004–0008 chain has been verified.

## C-3 and C-4: scope and shared UI

The learning Excel endpoint, toolbar button, its test and old documentation claims were removed as requested. Other lists' exports are unchanged.

LearningPrimaryButton was deleted. All new screens use the existing Button. LearningSelect uses the normal Button/DropdownMenu styling without shadow overrides; its label, truncation and accessible menu behavior remain. All inline learning badge colors and data-learning attributes were removed. StatusBadge now has a discriminated union: the existing default student context takes only StudentStatus, while `context="learning"` takes only learning statuses. This prevents active/inactive collisions with other admin domains.

Shared globals.css tokens now provide accessible primary-button gradient endpoints (#a3124f to #c2185b) in both normal themes, while preserving the brighter dark link/focus accent. Light success/warning text tokens are darkened (#187347 and #935700). FRONTEND_RULES section 3 and the UI kit document/show those changes. There are no feature-specific color overrides. The token regression checks both gradient endpoints and status text against card backgrounds in both themes. Browser measurements across 60 populated state/theme cases had a minimum **4.879:1**, including the shared badges and primary controls.

DataTable's four feature switches are replaced by the small documented `presentation` enum (responsive/wide/cards) and accessible `label`. The default preserves CRM's md table breakpoint and unrestricted table height. Wide learning lists use cards below lg and a keyboard-focusable scrolling table with sticky header above lg. The progress panel uses cards. Student-list regression screenshots confirm cards at 375 and tables at 768/1280 in both themes without page overflow.

The requested ManagementPageHeader, ManagementEmpty, ManagementLoading, ViewerFilters and ViewerPagination are absent from the merged baseline. No copies were invented. The learning screens retain the student-list header anatomy and existing primitives. Reuse of B's components remains dependent on their actual integration.

StudentLearningProgress uses a static import and one self-contained Suspense mount, guarded for archived profiles. Compared with 53dd948, that route changes only the import and mount block. Learning managers/dialogs are formatted into readable statements; upload orchestration lives in a small dedicated hook with unmount cancellation. All business behavior and snapshot/trial rules remain intact.

## Verification

Final command counts, history proof and exact file/screenshot inventories are appended below after the final run. No live database/provider flags were enabled. The only UI mutations exercised in browser are local mock form/filter/dialog interactions; server saves remain disabled in preview. Save, permission, scope, lock, audit, stale-write, snapshot and upload metadata behavior are exercised with isolated Postgres and explicit provider boundaries. Real Storage/CORS behavior, a deployed 50 MB transfer, project-global limits and production worker operation remain unverified. CLS/Lighthouse were not run.

The mock server ran on port 3106 with `RVPY_TEST_DIST_DIR=.next-learning`. Two pages were checked at 375/768/1280 in light/dark with loading, empty, populated, one row, 120 long rows, error, create dialog and validation states. Progress/bulk confirmation, sale denial, UI kit examples, replacement validation and the CRM student list are also captured. All new management layouts were reviewed using 12 refreshed contact sheets. Intentional mock query errors may display Next.js's development issue indicator. A development hydration warning involving modal aria-hidden attributes appeared during rapid automated profile navigation; no broken keyboard or overflow assertion resulted, and no live/deployment conclusion is drawn from it.

Keyboard: Tab/Enter/menu arrows/Escape for source/audience selection, YouTube ID preview, mobile filters, row editing, trial swaps and combined 4/5 lessons; bulk dialog Enter/Escape is part of the visual harness. Forced mock submit proves an unuploaded replacement is blocked inline, retains the draft and focuses the picker without a mutation request. The real SDK plus fake XHR transport verifies direct Storage URL/method, progress, abort and retry without a live request.

## Final recorded results

- Code commit: `ab8d819`; CRM merge: `07aab9e`. The following documentation/evidence-script commit is listed in Git history.
- `pnpm typecheck` passed. `pnpm lint` passed with no errors or warnings (the unused test parameter warning was fixed).
- `pnpm test`: 134 total, **131 passed, 0 failed, 3 unchanged opt-in skips**. This feature's test file contributes 24 passing checks including nested Postgres cases; the merged CRM baseline accounts for the remaining increase over the original 69-pass baseline.
- Coverage includes real SDK direct upload/progress/abort/retry using a fake XHR boundary, bucket restrictions/privacy, reservation validation/ownership/expiry, metadata mismatch deletion, cleanup/worker authorization, migration predecessors/fresh application, resource audience/access, safe reordering, exact trial count, snapshot isolation, scope, stale protection, rollback audit, bulk confirmation and preview errors.
- Full new-page matrix: 97 checks, zero page-overflow failures; 60 contrast measurement cases, lowest ratio 4.879:1. Every recorded sticky-header assertion passed. Keyboard harness: five detailed checks passed. Student-list regression: six width/theme checks passed, preserving the existing md breakpoint.
- Screenshot evidence: **117 PNGs**, all gitignored, plus 12 refreshed review sheets. The manifest below lists every PNG. Older progress-follow-up JSON is retained locally as prior-run evidence; the current matrix is `checks.json`.
- `pnpm db:generate --name verify_learning_metadata`: no schema changes, nothing to migrate. Fresh PGlite application of SQL 0000–0006 passed in the learning suite. Live DB tests stayed off.
- `git diff --check` passed. `git rev-list --objects main..HEAD` piped to `git cat-file --batch-check` found **zero image blobs**, therefore zero images over 500,000 bytes. No screenshot from an older feature commit remains reachable in the current branch range.

## Shared object-store observation

```text
warning: garbage found: D:/RVPY/REVIT-AI/.git/worktrees/REVIT-AI/refs
warning: garbage found: D:/RVPY/REVIT-AI/.git/objects/5c/tmp_obj_AFxt2l
warning: garbage found: D:/RVPY/REVIT-AI/.git/objects/c4/tmp_obj_b0Rhql
count: 4137
size: 269.53 MiB
in-pack: 0
packs: 0
size-pack: 0 bytes
prune-packable: 0
garbage: 3
size-garbage: 4.35 MiB
```

This is the shared repository object store, including other branches, backup refs and reflogs. Its size is not this branch's payload. The existing garbage warnings were recorded; no shared garbage collection or other-branch history rewrite was attempted. Current-range image proof is separate and zero. Local screenshots remain available on disk.

## Feature file inventory relative to CRM 53dd948

- `.gitignore`
- `docs/admin-learning-content-report.md`
- `docs/admin-learning-content.md`
- `docs/student-area.md`
- `eslint.config.mjs`
- `FRONTEND_RULES.md`
- `next.config.ts`
- `scripts/learning-content-keyboard-check.mjs`
- `scripts/learning-content-regression-check.mjs`
- `scripts/learning-content-visual-check.mjs`
- `src/app/(admin)/quan-tri/chuong-trinh/error.tsx`
- `src/app/(admin)/quan-tri/chuong-trinh/loading.tsx`
- `src/app/(admin)/quan-tri/chuong-trinh/page.tsx`
- `src/app/(admin)/quan-tri/hoc-vien/[id]/page.tsx`
- `src/app/(admin)/quan-tri/tai-lieu/error.tsx`
- `src/app/(admin)/quan-tri/tai-lieu/loading.tsx`
- `src/app/(admin)/quan-tri/tai-lieu/page.tsx`
- `src/app/api/cron/zalo-outbox/route.ts`
- `src/app/globals.css`
- `src/app/ui-kit/page.tsx`
- `src/components/admin/DataTable.tsx`
- `src/components/admin/LearningContentError.tsx`
- `src/components/admin/LearningContentLoading.tsx`
- `src/components/admin/LearningContentManager.tsx`
- `src/components/admin/LearningContentShowcase.tsx`
- `src/components/admin/LearningLessonDialog.tsx`
- `src/components/admin/LearningResourceDialog.tsx`
- `src/components/admin/LearningSelect.tsx`
- `src/components/admin/LearningTrialDialog.tsx`
- `src/components/admin/StatusBadge.tsx`
- `src/components/admin/StudentLearningProgress.tsx`
- `src/components/admin/StudentLearningProgressPanel.tsx`
- `src/components/admin/useLearningResourceUpload.ts`
- `src/components/layout/ManagementShell.tsx`
- `src/lib/api/learning-content.ts`
- `src/lib/auth/permissions.ts`
- `src/lib/learning-content.ts`
- `src/lib/learning-upload.ts`
- `src/lib/schemas/learning-content.ts`
- `src/mocks/learning-content.ts`
- `src/server/actions/learning-content.ts`
- `src/server/db/migrations/0006_admin_learning_content.sql`
- `src/server/db/migrations/meta/_journal.json`
- `src/server/db/migrations/meta/0006_snapshot.json`
- `src/server/db/schema/index.ts`
- `src/server/db/schema/learning-uploads.ts`
- `src/server/learning-content-record.ts`
- `src/server/learning-storage.ts`
- `src/server/learning-upload-cleanup.ts`
- `src/server/learning-upload-config.ts`
- `src/server/queries/learning-content.ts`
- `src/server/queries/student-area.ts`
- `src/server/student-onboarding-record.ts`
- `tests/admin-learning-content.test.ts`
- `tests/helpers/server-module.ts`
- `tsconfig.json`

The CRM merge's own files and verification are documented in `docs/crm-hardening-report.md`.

## Local screenshot manifest

All names below are relative to the gitignored `design/reference/admin-learning-content/` directory.

- `curriculum-1280-dark-dialog.png`
- `curriculum-1280-dark-empty.png`
- `curriculum-1280-dark-error.png`
- `curriculum-1280-dark-loading.png`
- `curriculum-1280-dark-many.png`
- `curriculum-1280-dark-one.png`
- `curriculum-1280-dark-populated.png`
- `curriculum-1280-dark-validation.png`
- `curriculum-1280-light-dialog.png`
- `curriculum-1280-light-empty.png`
- `curriculum-1280-light-error.png`
- `curriculum-1280-light-loading.png`
- `curriculum-1280-light-many.png`
- `curriculum-1280-light-one.png`
- `curriculum-1280-light-populated.png`
- `curriculum-1280-light-validation.png`
- `curriculum-375-dark-dialog.png`
- `curriculum-375-dark-empty.png`
- `curriculum-375-dark-error.png`
- `curriculum-375-dark-loading.png`
- `curriculum-375-dark-many.png`
- `curriculum-375-dark-one.png`
- `curriculum-375-dark-populated.png`
- `curriculum-375-dark-validation.png`
- `curriculum-375-light-dialog.png`
- `curriculum-375-light-empty.png`
- `curriculum-375-light-error.png`
- `curriculum-375-light-loading.png`
- `curriculum-375-light-many.png`
- `curriculum-375-light-one.png`
- `curriculum-375-light-populated.png`
- `curriculum-375-light-validation.png`
- `curriculum-768-dark-dialog.png`
- `curriculum-768-dark-empty.png`
- `curriculum-768-dark-error.png`
- `curriculum-768-dark-loading.png`
- `curriculum-768-dark-many.png`
- `curriculum-768-dark-one.png`
- `curriculum-768-dark-populated.png`
- `curriculum-768-dark-validation.png`
- `curriculum-768-light-dialog.png`
- `curriculum-768-light-empty.png`
- `curriculum-768-light-error.png`
- `curriculum-768-light-loading.png`
- `curriculum-768-light-many.png`
- `curriculum-768-light-one.png`
- `curriculum-768-light-populated.png`
- `curriculum-768-light-validation.png`
- `progress-1280-dark-dialog.png`
- `progress-1280-dark-populated.png`
- `progress-1280-light-dialog.png`
- `progress-1280-light-populated.png`
- `progress-375-dark-dialog.png`
- `progress-375-dark-populated.png`
- `progress-375-light-dialog.png`
- `progress-375-light-populated.png`
- `progress-768-dark-dialog.png`
- `progress-768-dark-populated.png`
- `progress-768-light-dialog.png`
- `progress-768-light-populated.png`
- `resources-1280-dark-dialog.png`
- `resources-1280-dark-empty.png`
- `resources-1280-dark-error.png`
- `resources-1280-dark-loading.png`
- `resources-1280-dark-many.png`
- `resources-1280-dark-one.png`
- `resources-1280-dark-populated.png`
- `resources-1280-dark-validation.png`
- `resources-1280-light-dialog.png`
- `resources-1280-light-empty.png`
- `resources-1280-light-error.png`
- `resources-1280-light-loading.png`
- `resources-1280-light-many.png`
- `resources-1280-light-one.png`
- `resources-1280-light-populated.png`
- `resources-1280-light-validation.png`
- `resources-375-dark-dialog.png`
- `resources-375-dark-empty.png`
- `resources-375-dark-error.png`
- `resources-375-dark-loading.png`
- `resources-375-dark-many.png`
- `resources-375-dark-one.png`
- `resources-375-dark-populated.png`
- `resources-375-dark-validation.png`
- `resources-375-light-dialog.png`
- `resources-375-light-empty.png`
- `resources-375-light-error.png`
- `resources-375-light-loading.png`
- `resources-375-light-many.png`
- `resources-375-light-one.png`
- `resources-375-light-populated.png`
- `resources-375-light-validation.png`
- `resources-768-dark-dialog.png`
- `resources-768-dark-empty.png`
- `resources-768-dark-error.png`
- `resources-768-dark-loading.png`
- `resources-768-dark-many.png`
- `resources-768-dark-one.png`
- `resources-768-dark-populated.png`
- `resources-768-dark-validation.png`
- `resources-768-light-dialog.png`
- `resources-768-light-empty.png`
- `resources-768-light-error.png`
- `resources-768-light-loading.png`
- `resources-768-light-many.png`
- `resources-768-light-one.png`
- `resources-768-light-populated.png`
- `resources-768-light-validation.png`
- `resources-replacement-validation.png`
- `resources-sale-no-permission.png`
- `students-1280-dark-regression.png`
- `students-1280-light-regression.png`
- `students-375-dark-regression.png`
- `students-375-light-regression.png`
- `students-768-dark-regression.png`
- `students-768-light-regression.png`
- `ui-kit-shared-states.png`

Local supporting evidence: `checks.json`, `keyboard-checks.json`, `students-regression-checks.json`, `review-*-{light,dark}.jpg`, `typecheck.log`, `lint.log`, `tests.log`, `migration-generation-proof.log`, `history-proof.json` and `object-count.log`.
