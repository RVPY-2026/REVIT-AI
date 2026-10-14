# CRM phase 1

## Implemented routes

- `/quan-tri`: source-scoped pipeline counts and recent signups.
- `/quan-tri/hoc-vien`: server-filtered, paginated table; mobile cards; Kanban; manual student creation. A shared filter popover collects draft status, source and signup-month choices until Apply; Close discards drafts and Reset clears them. Applied filters appear as compact chips. Search and filtering reset pagination, preserve the current view and keep Excel exports aligned.
- `/quan-tri/hoc-vien/[id]`: signup answers, status history, call notes, rendered message suggestions and contact editing.
- `/quan-tri/mau-tin-nhan`: read-only message template library.
- `/api/export/students`: all filtered, authorized rows in an Excel workbook.

All list, detail, history, note and student-template lookups enforce management scope. Sales staff only see their owned sources. Status changes use the existing transactional enrollment helper and an explicit confirmation. Kanban drag-and-drop cannot activate trial or formal enrollment. The explicit manual status editor supports all five classifications, including reversing a previous status, with scoped locking and atomic history/audit. It changes CRM classification only: enrollment, financial records and account access remain independent. Call notes are append-only and audited in the same transaction.

Manual creation requires name, phone and an active, authorized source; email is optional. It shares the atomic source/month code allocator and opens the new profile after saving. Click a value or pencil to edit directly in table cells, mobile cards and profile information rows; Save applies only that field and Cancel/Escape discards the draft. Name, phone, email and status are editable in the list. The profile additionally supports occupation, birth year, specialty, hometown, organization, Zalo name and existing signup answers. Student code, source and registration date are read-only. Single-field patches lock the scoped row, compare the expected value to reject stale edits, preserve other fields/answers and record before/after values in the same audited transaction. Blank email clears the field; editing contact email does not change the linked authentication account. Creation and edits invalidate the list and dashboard; edits also invalidate the profile. Mock mode and UI kit previews disable these saves.

## Local preview

Set `NEXT_PUBLIC_USE_MOCK=true` in development, run `pnpm dev`, and open `/dang-nhap`. The development-only role picker provides fake admin, sale, student and public identities. Sales identity A only sees source A. Mock mode supports reading, copying and Excel export; record mutations return an unavailable message. Production ignores the mock flag and rejects the role-picker action.

The dedicated CRM preview uses port 3100 and `RVPY_TEST_DIST_DIR=.next-crm-check` to avoid sharing build artifacts with another development server. Its generated output is ignored by Git and ESLint.

## Verification

Run `pnpm typecheck`, `pnpm lint` and `pnpm test`. CRM tests cover literal wildcard searches, Vietnamese month boundaries, source scope, note validation, template placeholders and an XLSX round trip including filtered rows beyond one page.

Browser verification uses fake records and covers manual creation and inline editors at 375, 768 and 1280 px. The actual creation and contact-edit Server Actions also run against isolated in-memory Postgres through `tests/student-crud-integration.mjs`. This checks source ownership/activity, scoped updates, preserved account/enrollment fields, email clearing, transactional audit values, invalidation and zero mock-mode writes, inline field preservation, stale-write rejection and rollback when auditing fails. Session resolution and invalidation are stubbed; hosted authentication is outside this check.

To run the optional database check, set `RVPY_PGLITE_MODULE` to an installed `@electric-sql/pglite/dist/index.js` module and run `pnpm exec tsx --conditions=react-server tests/student-crud-integration.mjs`. It does not connect to the configured application database.

## Data-fetch performance

The dashboard uses one grouped status count and one recent-students query. Kanban uses a scoped ranking query (100 cards per status) and grouped counts, plus one source-options query for the filter toolbar. These run concurrently; source options are loaded once and remain limited to the caller's assigned sources. Existing linked accounts load their roles, source IDs and linked student ID with the account lookup, and profiles fetch messages alongside the student detail.

The Postgres.js read pool keeps five connections and `max_pipeline: 0` to avoid stalled concurrent reads through the tested Supavisor endpoint. Transactions use a separate pool capped at two connections with `max_pipeline: 1`: zero bypasses the driver's connection-reservation callback and breaks transaction startup. Both pools use `prepare: false` and a 60-second idle timeout. `db.transaction` delegates to the write pool; existing authorization, transaction and audit boundaries remain unchanged. A scoped rollback-only check against the configured database verified student updates, history and audit without persisting diagnostic changes. The opt-in `RVPY_VERIFY_DATABASE_TRANSACTIONS=1 pnpm exec tsx --conditions=react-server --test tests/postgres-transactions.test.ts` checks commit, rollback, connection reuse and concurrent reads using SELECTs only.

Read-only verification against the configured database compared old and new results, including sale source scope and authorization projections. On a single warm connection, dashboard queries measured about 3.29 s versus 0.32 s, and Kanban queries about 2.73 s versus 0.34 s. These are database-query timings, not full browser load times; cold connections still add about 1.1 s on the tested network.

## Remaining phases

Management can create students manually, edit their name/phone/contact email, edit any CRM classification and append call notes. Existing questionnaire answers can be edited inline in the profile. Business records are never hard-deleted; the dropped status preserves their history.

Trial attendance/checklists, student activation, payment entry, learning content, licensing, referral qualification, monthly reports and backups remain separate work. This iteration does not add template editing or bulk actions. Kanban shows up to 100 matching records per column with the full count displayed; use the paginated table for larger lists. Excel exports all matching records.
