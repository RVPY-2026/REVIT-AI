# CRM hardening verification report

Implemented on `feature/students-crm-hardening`, branched from `main` at `f9eb1d7`. Commits are local only. No push, hosted migration, real database write or live-DB test was performed. The pre-existing `.claude/launch.json` change is excluded from the task commits.

## Behavior and design decisions

- Duplicate phone warnings/search share canonical Vietnamese digits, including +84/84. The server rechecks under a phone advisory lock shared with public insertion. The only cross-source probe returns existence; sales receive at most `{ otherSource: true }`, with no hidden details/count. A second explicit confirmation adds `duplicateAcknowledged: true` to create/phone-edit audits. Admin page badges use one grouped query; phone remains non-unique.
- Archive preserves the student's CRM/enrollment state and immutable code. Archive/restore/source-transfer events reuse the existing timeline with `kind` and structured `data`; this keeps one ordered history and avoids another event table. Archived profiles are excluded from working queries and cannot be edited/noted/onboarded; imports recognize the code and skip their changes.
- SourceId now means current ownership. Removing its student sequence uniqueness permits two transferred profiles with the same month/seq. Immutable `students.code` stays unique, and independent atomic source/month counters retain their key and values. Transfers never allocate/reuse codes. Regression tests cover two transfers to one destination and subsequent allocation there.
- Dropped classifications require a reason, with a note for other. Ordinary single status changes retain an eight-second Undo; desktop Kanban uses the same action and all five classifications. Bulk permits consulting/dropped only, locks scoped rows in stable order, and reports stale/invisible IDs as skipped. Filter selection is capped at 100 and is checked again inside the write transaction.
- Contact notes accept channel, outcome and next appointment. Only the latest note's schedule applies; sent-template acknowledgments copy it under the parent lock, while a normal new contact can complete it. A body correction preserves creation time and schedule. Authors can correct body through the exact 15-minute boundary, marked edited and audited. The sent-message action appends a Zalo contact note; copying records nothing and sends nothing.
- Existing follow-up aging means Vietnam calendar days, including weekends. Appointment times are exact instants; fallback aging uses Vietnam midnight. Due appointments sort first, followed by never/oldest contact. The Unicode NFD search alternative handles Vietnamese accents and D-stroke without an extension dependency.

## Generated migration and exact SQL summary

`src/server/db/migrations/0004_students_crm_hardening.sql`, generated with `pnpm db:generate --name students_crm_hardening`; its journal entry and snapshot are included.

1. Create enums `archive_reason` (spam/duplicate/test/other), `contact_channel` (call/zalo/meeting/other), `contact_outcome` (no_answer/interested/thinking/declined/other), and `dropped_reason` (price/time/no_contact/other_course/not_interested/other).
2. Drop student constraint `students_sourceId_codeMonth_seq_unique`. Retain `students.code` uniqueness and all allocator constraints.
3. Add `call_notes.channel` NOT NULL DEFAULT call, nullable outcome, next_action_at timestamptz, and edited_at timestamptz.
4. Add nullable student_status_events.reason, kind text NOT NULL DEFAULT status, and nullable data jsonb. Add `student_events_kind` CHECK allowing status/archive/restore/source_transfer.
5. Add nullable students.archived_at timestamptz, archive_reason enum, archived_by_id UUID referencing users(id) ON DELETE SET NULL. Add `students_archived_at_index` and `students_archive_state` CHECK requiring timestamp/reason to be either both null or both populated.
6. Define `rvpy_search_text(text) RETURNS text`, LANGUAGE SQL, IMMUTABLE, STRICT, PARALLEL SAFE: NFD-normalize UTF-8 input, remove U+0300–U+036F combining marks, translate D-stroke to D/d, and lowercase. This reviewed addition follows the generated schema diff.

Affected tables retain RLS; no public policies or new public table grants are introduced. Existing contacts default to call, existing events to status; no invented legacy dropped reasons or PII rewrites. The migration was applied only inside isolated PGlite instances.

## Validation actually run

- Final `pnpm typecheck` and `pnpm lint` passed. Final `pnpm test`: **110 tests, 107 passed, 0 failed, 3 skipped**. The two new hardening files contribute 37 passing tests (including nested cases); the archived-import regression adds one more to the existing signup suite. Existing three live-DB checks stay opt-in and were not enabled.
- New unit tests cover the complete active/inactive/archive follow-up matrix, schedule precedence, exact due time, Vietnam midnight, exact note correction boundary, phone/Unicode normalization, dropped/archive validation, bulk target/cap validation, mock privacy and URL contracts.
- New PGlite tests apply migrations 0000–0005 and execute actual actions/queries for own/foreign duplicate results, acknowledged create and all phone editors, archive/restore permissions/exclusion/locks, dropped reasons without enrollment mutation, transfer collision/counter safety, note ownership/window/conflicts/audit rollback, latest-note due SQL/facets, literal/accent/phone searches, stale/hidden bulk rows/filter snapshots/cap, and scoped trial aggregates. They also assert RLS/no policies and zero writes in mock paths.
- Existing signup/contact/import regressions now apply 0004; an additional import test proves archived profiles are neither recreated nor edited/noted. Existing tests were updated for the intended default call channel and unified Kanban classification, with none deleted or skipped to obtain a pass.
- Standalone CRUD helper: 1 passed, 0 failed, 0 skipped, using `RVPY_PGLITE_MODULE` and `pnpm exec node --wasm-num-compilation-tasks=2 --import tsx --conditions=react-server tests/student-crud-integration.mjs` against PGlite.
- The host exhausted memory during parallel Node/Wasm compilation. The test script now runs test files serially and limits Wasm compilation to two tasks; test coverage and live opt-in flags remain intact.

## Browser verification and limits

Mock preview used port 3104 and `.next-crm-hardening-check`. Inspected list/all/due views, profile and Kanban at 375/768/1280 px in light/dark, with touch emulation at 375. Measured document width never exceeded the viewport after fixes: 375/375, 768/753 and 1280/1265 (desktop scrollbars account for 15 px). The table scrolls internally; positioning its container fixed a screen-reader-label overflow at 768. The UI kit now also fits 375.

The duplicate create warning appeared in all three sizes/both themes. Sales showed their own linked profile and the generic foreign-source warning without the foreign name. Sales default due and explicit all URLs, admin archive filter/restore dialog, select-all matching results, page-size/month controls, contact scheduling chips, and trial-without-plan badges were inspected. Bulk dropdown offers only consulting/dropped; the dropped dialog was exercised through keyboard navigation at 375, including light/dark and 44 px controls. Note quick chips consistently produced 15/10/2026 10:00 Vietnam time. Source-transfer reason dialogs fit all three sizes/both themes. Desktop grips appeared and touch grips were hidden. Final preview navigation had no console errors or the earlier clock-prerender warning.

Mock fixtures include an author-owned note younger than 15 minutes so its body-correction form can be inspected; saving stays disabled. Preview Kanban drag retains the existing unavailable message. Browser writes stay disabled in mock mode; successful save/conflict behavior is verified by isolated DB tests, not a hosted staff session. Native Safari was not available: its month input was replaced with shared accessible menus, tested in Chrome. Hosted Supabase/Postgres migration application, hosted authentication, real concurrent-client load and actual Zalo delivery were not tested. No production performance numbers are claimed. Phone grouping and accent-insensitive substring search can require scans on large datasets; reviewers should evaluate indexing with representative production volume. Review deployment ordering: 0004 and 0005 are required before deploying code that selects its new columns. The migration intentionally does not backfill historical dropped reasons.

## Local commits

- `686962e` — Harden CRM permissions, records and scoped queries.
- `bd13526` — Add CRM triage controls and responsive profile workflows.
- `53e0dab` — Document CRM hardening decisions and verification.
- `bff253b` — Keep note editing and Kanban feedback consistent in mock mode.
- `fa533a1` — Fix CRM review findings and add regression coverage.
- Documentation follow-up — Record review decisions and final verification.

The branch starts at `main` (`f9eb1d7`); main was not committed to. No commits were pushed. Only the pre-existing `.claude/launch.json` edit remains outside this task's commits.

## Files changed

- `.gitignore`
- `BACKEND_RULES.md`
- `CLAUDE.md`
- `FRONTEND_RULES.md`
- `docs/crm-hardening-report.md`
- `docs/crm-phase-1.md`
- `eslint.config.mjs`
- `package.json`
- `src/app/(admin)/quan-tri/hoc-vien/[id]/page.tsx`
- `src/app/(admin)/quan-tri/hoc-vien/page.tsx`
- `src/app/api/export/students/route.ts`
- `src/components/admin/CallNoteForm.tsx`
- `src/components/admin/ClipboardButton.tsx`
- `src/components/admin/CrmSelect.tsx`
- `src/components/admin/DataTable.tsx`
- `src/components/admin/DroppedReasonDialog.tsx`
- `src/components/admin/DuplicatePhoneWarning.tsx`
- `src/components/admin/FollowUpBadge.tsx`
- `src/components/admin/InlineStudentField.tsx`
- `src/components/admin/KanbanBoard.tsx`
- `src/components/admin/ManualStudentDialog.tsx`
- `src/components/admin/NoteBodyEditor.tsx`
- `src/components/admin/RecordSentMessage.tsx`
- `src/components/admin/StatusCell.tsx`
- `src/components/admin/StatusChangeDialog.tsx`
- `src/components/admin/StudentActionMenu.tsx`
- `src/components/admin/StudentContactDialog.tsx`
- `src/components/admin/StudentFilterToolbar.tsx`
- `src/components/admin/StudentManagementActions.tsx`
- `src/components/admin/StudentMonthPicker.tsx`
- `src/components/admin/StudentOnboardingPanel.tsx`
- `src/components/admin/StudentProfileForm.tsx`
- `src/components/admin/StudentTable.tsx`
- `src/components/admin/TrialSummary.tsx`
- `src/components/layout/CrmComponentShowcase.tsx`
- `src/components/ui/button.tsx`
- `src/components/ui/dialog.tsx`
- `src/lib/api/students.ts`
- `src/lib/auth/permissions.ts`
- `src/lib/contact-note.ts`
- `src/lib/crm.ts`
- `src/lib/follow-up.ts`
- `src/lib/phone.ts`
- `src/lib/schemas/enrollment.ts`
- `src/lib/schemas/lead.ts`
- `src/lib/schemas/student-contact.ts`
- `src/lib/schemas/student-field.ts`
- `src/lib/schemas/student-management.ts`
- `src/lib/schemas/student-note.ts`
- `src/lib/schemas/student-status.ts`
- `src/lib/schemas/student.ts`
- `src/lib/student-filter-url.ts`
- `src/lib/student-phone-match.ts`
- `src/lib/student-search.ts`
- `src/mocks/student-onboarding.ts`
- `src/mocks/students.ts`
- `src/server/actions/enrollments.ts`
- `src/server/actions/leads.ts`
- `src/server/actions/student-contact.ts`
- `src/server/actions/student-field.ts`
- `src/server/actions/student-management.ts`
- `src/server/actions/student-notes.ts`
- `src/server/actions/student-phone.ts`
- `src/server/actions/student-selection.ts`
- `src/server/actions/student-status.ts`
- `src/server/db/migrations/0004_students_crm_hardening.sql`
- `src/server/db/migrations/0005_crm_review_function_security.sql`
- `src/server/db/migrations/meta/0004_snapshot.json`
- `src/server/db/migrations/meta/0005_snapshot.json`
- `src/server/db/migrations/meta/_journal.json`
- `src/server/db/schema/enums.ts`
- `src/server/db/schema/students.ts`
- `src/server/enrollment-record.ts`
- `src/server/import/student-sheet.ts`
- `src/server/lead-record.ts`
- `src/server/phone-matches.ts`
- `src/server/queries/students.ts`
- `src/server/student-onboarding-record.ts`
- `src/server/student-phone-limit.ts`
- `tests/backend-v1.test.ts`
- `tests/crm-hardening-db.test.ts`
- `tests/crm-hardening.test.ts`
- `tests/crm-operations.test.ts`
- `tests/migration-v1.mjs`
- `tests/signup-crm-regressions.test.ts`
- `tests/student-crud-integration.mjs`
- `tsconfig.json`

## Review follow-up

Review items 2–7 and the code/phone search noise in item 8 are fixed. The supplied objective contains only items 2.1–2.7 and explicitly prohibits hard deletion; no inferred item 2.8 or permanent-delete permission/action was added.

- Sent-message notes preserve future and overdue appointments under the scoped parent lock. Normal contact with an empty appointment still completes the schedule. Regression tests cover both states, completed schedules, foreign/archived targets and mock writes.
- Archived profiles do not block duplicate saves or count toward badges. Visible history is shown separately; a foreign archive never produces an existence hint. Tests cover creating a replacement without acknowledgment and the remaining active record losing its duplicate badge.
- Phone lookup uses `ActionResult` and safe validation, with an atomic durable 30-request/user/minute budget in existing `signup_rate_limits`. The digest is namespaced; infrastructure counters share the existing cleanup. Tests exercise malformed requests without queries, blocking the 31st read, 35 concurrent attempts bounded to 30, distinct users and window reset.
- `archived=1` aliases canonical `archived=true`. Table and Kanban render a recovery panel for sales. Internal queries reject with a typed Vietnamese authorization error. Export gets only a 403 authorization guard, tested before query/workbook execution; workbook contents and formatting are unchanged.
- Explicit shared compact button sizes replace broad page/dialog overrides. Mobile and coarse-pointer buttons stay 44px; desktop fine-pointer buttons are 36px. Clipboard/status/selection controls follow the same sizing, and the UI kit documents it.
- Custom migration `0005_crm_review_function_security` was generated using `pnpm db:generate --custom --name crm_review_function_security`, with journal and snapshot. Its SQL sets `public.rvpy_search_text(text)` search_path to empty, revokes EXECUTE from PUBLIC, and conditionally revokes explicit anon/authenticated grants when those roles exist. Migration 0004 is unchanged. PGlite verifies normalization still works and both roles lack execution privileges, including after explicit grants are introduced before reapplying 0005.
- Alphanumeric code search no longer also searches extracted phone digits. Formatted numeric phone search retains normalization. Production scan/index performance remains unmeasured.

The follow-up browser pass measured list, profile and Kanban at 375/768/1280px in light and dark. Document widths were 375/375, 753/768 and 1265/1280, with no page overflow. Compact controls measured 44px on mobile and 36px on desktop. The mobile duplicate dialog measured 343px within 375px and its buttons measured 44px. Both active and archived-history hints were inspected as admin. A local JPEG of the mobile dialog was saved alongside this chat's visualization artifacts. Browser mutations remain disabled; successful writes and scoped sale behavior are tested through actual actions/queries in PGlite. A separate new sale browser pass was interrupted and is not claimed.

Final typecheck uses a 1024MB Node heap on this host; a 512MB attempt exhausted its heap. Lint and isolated tests use 512MB with two Wasm compilation tasks. No hosted DB, live-DB flag, push or main-branch commit is involved.
