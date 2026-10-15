# Admin learning content delivery report

## Scope and isolation

- Branch: `feature/admin-learning-content`, based on `main` at `f9eb1d7`.
- Working checkout: `D:/RVPY/worktrees/admin-learning-content`. The initial managed C: worktree was relocated with Git repair after the C: drive filled. The resulting checkout is a valid Git worktree but the desktop app declined to register the relocated path as a managed attachment.
- The original `D:/RVPY/REVIT-AI` checkout and its uncommitted CRM changes were not edited. `CLAUDE.md` was not edited. The student-profile route has exactly one added, self-contained Suspense mount block.
- No push, live migration, real database test, or real Storage mutation was performed.

## Delivered behavior

Admin resource management includes lesson groups, unassigned materials, title search, audience/lesson filters, file format icons, audience and active badges, known size, guarded reordering, create/edit dialogs, YouTube normalization and ID preview, opaque streaming uploads, progress/cancel/retry, replacement without changing resource IDs, activation Undo and named deletion confirmation. The private storage location never enters a client payload.

Curriculum management includes phases, combined lesson numbers, durations, trial slots, active state, resource and plan counts, add/edit/deactivate/reorder, and a validated three-slot trial replacement. Existing plan snapshots are preserved. Both management lists export their filtered rows to Excel.

The student progress panel includes every plan lesson by phase, reports/notes/submission links, confirmations, dates, scoped staff actions and an atomic bulk confirmation capped at 30. Trial confirmation retains its original restriction through the shared helper. Withdrawal preserves reports. Undo uses server-returned timestamps.

A student-side access bug was fixed minimally in `src/server/queries/student-area.ts`: trial resource access now follows that student's plan snapshot after a template trial-slot change. No student-area UI changed.

## Migration 0006

`0006_admin_learning_content.sql` was generated with `pnpm db:generate --name admin_learning_content`, then assigned the reserved `0006` prefix with its matching snapshot and journal entry. The generated SQL is otherwise unchanged.

Exact SQL summary: creates `learning_uploads` with nine columns (`id`, `actor_id`, `filename`, `object_path`, `content_type`, `size`, `mode`, `status`, `expires_at`); UUID primary key defaults to `gen_random_uuid()`; `object_path` is unique; `actor_id` references `users.id` with no cascading deletion; size must be greater than zero and at most 104857600 bytes; mode must be view/download; status must be pending/uploaded/consumed/cancelled. RLS is enabled. No public policies, business-table changes, seed changes or real database application.

## Decisions and reviewer risks

- View/upload caps are 25/100 MiB. A matching extension and allowlisted MIME are both required. Unknown RVT/RFA MIME is `application/octet-stream`; the backend still requires those exact extensions and download mode.
- Direct signed Storage upload URLs expose the bucket/path, conflicting with the brief's stricter no-path rule. Uploads therefore use an opaque same-origin streaming endpoint. Real hosting body/duration limits must support these sizes. Live Storage/CORS/platform behavior and large uploads have not been tested against a real project.
- The private bucket is created on the first authorized real upload attempt if missing; a public bucket is rejected. No bucket was created during this work.
- Pending/uploaded reservations expire after two hours and are reaped on the next authorized upload attempt. Cancelled rows do not monopolize the cleanup batch. There is no scheduled orphan-cleanup job. Storage deletion is best-effort and failures are surfaced, so an operator may need to remove an orphan manually.
- The upload transaction holds a reservation row lock while streaming. Review hosting and database idle-transaction limits for slow uploads before production use.
- Lessons have no hard-delete operation; deactivation is the only removal path. Trial lessons must be swapped before deactivation.
- A template's phase is immutable during editing. New lessons may be added to either phase.
- Lists use 20-row pagination; filtered export includes all matching rows. Reordering requires the full group's current order and is disabled while title sorting is active.
- The optional DataTable card modes leave existing CRM defaults unchanged. New lists use cards below 1024px; the narrow progress panel uses cards at every width.
- Migration metadata is based on `0003`; reconcile the `0006` snapshot with the other agents' reserved `0004`/`0005` snapshots when combining branches. The SQL itself only creates the upload-reservation table.
- Test files run serially because concurrent PGlite/TypeScript processes exhausted this machine's memory. Existing tests were neither removed nor newly skipped.
- Screenshots use mock data. Save/upload/delete/reorder/confirm controls intentionally remain disabled in preview; their record/action behavior is verified with isolated Postgres and explicit provider boundaries, not a live browser-to-Supabase flow.
- Deliberately failing mock queries trigger the real error segments. Some error screenshots include Next.js's development-only issue indicator; it is not application UI.

## Visual and keyboard verification

The browser check used isolated Chrome and a mock server on port 3106 with `RVPY_TEST_DIST_DIR=.next-learning`. `/ui-kit`, student list, permissions and import pages were browsed as references. Background route prefetching was blocked in the screenshot harness to prevent unrelated pages consuming the constrained machine's resources. Native compiler threads were limited for the successful run.

The two new pages have screenshots at 375, 768 and 1280px in light and dark for loading, empty, populated, error, one row, 120 rows with long titles, create dialog and inline validation. The progress panel has populated and bulk-dialog screenshots for each width/theme. A sale permission-denial screenshot is included. Browser checks assert that no tested page has horizontal overflow.

Keyboard checks cover opening create and trial-swap dialogs with Enter, moving focus with Tab, blur validation, closing with Escape, and opening/closing the bulk confirmation dialog. An additional walkthrough verified YouTube and audience selection, mobile filters, row edit dialogs, trial selection and preserving 4/5 in the combined-lesson editor. The mock filtered Excel endpoint was also exercised over HTTP. Preview confirmation is disabled. Visual review fixed a missing semantic progress heading, native English file-picker text, small close-button targets, excessive mobile form grid spacing and clipped table actions at tablet/profile widths. Confirmation/save behavior requiring a real connection was not exercised in the browser.

The screenshot manifest, exact file inventory, test totals and commit identifiers follow below.

## Checks and test totals

- `pnpm typecheck`: passed.
- `pnpm lint`: passed with no errors or warnings.
- `pnpm test`: 89 passed, 0 failed, 3 skipped; 92 total. Baseline was 69 passed, 3 skipped. Added 20 passing checks including nested isolated-Postgres cases. All original tests and their opt-in live-DB flags remain intact.
- `git diff --check`: passed.
- Browser: 111 PNG screenshots, plus 12 review contact sheets. Full matrix has 98 recorded checks; the progress-label follow-up has 13. All recorded page-overflow checks are false.
- Isolated coverage: permissions; MIME/extension/size allowlists; actual stream byte counting and private-bucket rejection; sanitized server paths; YouTube normalization/rejection; RLS/no policies; safe/stale reordering; exactly-three trial swaps; referenced-template deactivation and snapshot preservation; resource audience/active rules; resource replacement and single-use upload reservations; source-scoped formal confirmation; trial restriction; stale progress; report-preserving withdrawal; student progress summaries; audit rollback; atomic/capped bulk confirmation; preview rejection; cleanup batches advancing past cancelled rows; and filtered Excel export with permission enforcement.
- Live provider calls, live PostgreSQL checks, deployment and browser mutation saves were not run. The three live-DB tests stayed skipped by their existing opt-in flags.


## Final review decisions

- Private bucket configuration and path generation are server-only. Upload reservation IDs and private path UUIDs are independent. The browser run scanned 2594 delivered client-script responses and found no private bucket identifier.
- Learning primary actions use the existing deep accent token; learning status text uses the existing foreground token with semantic colored outlines. This avoids changing global tokens or legacy CRM rendering while meeting AA. Computed foreground/background contrast was checked in both themes; the lowest observed ratio for the new enabled actions and status labels was 5.87:1. A token-level regression test also enforces 4.5:1.
- Selecting a replacement file cannot silently save the old file: the editor requires the selected file to finish uploading before saving.
- Automated CLS/Lighthouse profiling was not performed. Screenshot comparisons, viewport overflow checks, computed contrast checks and keyboard interactions are the recorded UI evidence.
- Long desktop tables passed eight sticky-header scroll checks. These table regions are keyboard focusable.

## Local implementation commits

- c37b573 Add audited learning content records, uploads and formal confirmations
- 1ecd4fb Keep orphan cleanup advancing beyond cancelled uploads
- 0bcbfc3 Add Vietnamese learning management pages and student progress controls
- 1e76748 Fix client boundary for the learning UI kit showcase
- d06caad Keep upload paths private and add accessible learning color tokens
- 7b90cf5 Meet learning control contrast and prevent unsent file replacements
- d940d4f Keep long learning table headers visible while scrolling

The final documentation/evidence commit follows these implementation commits in Git history.

## File inventory

- `.gitignore`
- `docs/admin-learning-content-report.md`
- `docs/admin-learning-content.md`
- `docs/student-area.md`
- `eslint.config.mjs`
- `next.config.ts`
- `package.json`
- `scripts/learning-content-keyboard-check.mjs`
- `scripts/learning-content-visual-check.mjs`
- `src/app/(admin)/quan-tri/chuong-trinh/error.tsx`
- `src/app/(admin)/quan-tri/chuong-trinh/loading.tsx`
- `src/app/(admin)/quan-tri/chuong-trinh/page.tsx`
- `src/app/(admin)/quan-tri/hoc-vien/[id]/page.tsx`
- `src/app/(admin)/quan-tri/tai-lieu/error.tsx`
- `src/app/(admin)/quan-tri/tai-lieu/loading.tsx`
- `src/app/(admin)/quan-tri/tai-lieu/page.tsx`
- `src/app/api/admin/learning-uploads/[id]/route.ts`
- `src/app/api/export/learning-content/route.ts`
- `src/app/ui-kit/page.tsx`
- `src/components/admin/DataTable.tsx`
- `src/components/admin/LearningContentError.tsx`
- `src/components/admin/LearningContentLoading.tsx`
- `src/components/admin/LearningContentManager.tsx`
- `src/components/admin/LearningContentShowcase.tsx`
- `src/components/admin/LearningLessonDialog.tsx`
- `src/components/admin/LearningPrimaryButton.tsx`
- `src/components/admin/LearningResourceDialog.tsx`
- `src/components/admin/LearningSelect.tsx`
- `src/components/admin/LearningTrialDialog.tsx`
- `src/components/admin/StatusBadge.tsx`
- `src/components/admin/StudentLearningProgress.tsx`
- `src/components/admin/StudentLearningProgressPanel.tsx`
- `src/components/layout/ManagementShell.tsx`
- `src/lib/api/learning-content.ts`
- `src/lib/auth/permissions.ts`
- `src/lib/learning-content.ts`
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
- `src/server/learning-upload-config.ts`
- `src/server/queries/learning-content.ts`
- `src/server/queries/student-area.ts`
- `src/server/student-onboarding-record.ts`
- `tests/admin-learning-content.test.ts`
- `tests/helpers/server-module.ts`
- `tsconfig.json`

## Screenshot and evidence manifest

All paths below are relative to `design/reference/admin-learning-content/`. Review sheets combine the eight management-page states for one viewport/theme. The three JSON files record browser, follow-up, and keyboard assertions. The logs contain the final command results.

- `checks.json`
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
- `keyboard-checks.json`
- `lint.log`
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
- `progress-followup-checks.json`
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
- `review-curriculum-1280-dark.jpg`
- `review-curriculum-1280-light.jpg`
- `review-curriculum-375-dark.jpg`
- `review-curriculum-375-light.jpg`
- `review-curriculum-768-dark.jpg`
- `review-curriculum-768-light.jpg`
- `review-resources-1280-dark.jpg`
- `review-resources-1280-light.jpg`
- `review-resources-375-dark.jpg`
- `review-resources-375-light.jpg`
- `review-resources-768-dark.jpg`
- `review-resources-768-light.jpg`
- `tests.log`
- `typecheck.log`
- `ui-kit-shared-states.png`
