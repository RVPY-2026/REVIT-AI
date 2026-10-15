# CRM phase 1

## List and classification

`/quan-tri/hoc-vien` has a paginated table, mobile cards and five Kanban classifications. Filters apply immediately through the URL: status, owned source, signup month (`month=YYYY-MM`), search, follow-up and admin-only archive. Month/year use accessible menus rather than a native month input. Page size is 25/50/100; existing bounded page-size URLs still work. Search escapes LIKE metacharacters, canonicalizes Vietnamese phone digits (including +84/84), and ignores Vietnamese accents in names/email.

**Cần xử lý** uses `followUp=due` and sorts appointments first, then never-contacted/oldest-contact leads. Sales default to this view when the URL has no filters. Admin defaults to all; `quickView=all` explicitly preserves the all view for sales. Existing `uncontacted` and `overdue` filters remain supported. Status chips count matches with other active filters applied, excluding status itself; the due count excludes only the follow-up filter. One grouped query supplies these facets.

StatusCell and desktop Kanban drag both call `updateStudentStatus`; all five classifications are allowed, including reverse changes. Ordinary changes apply immediately with an eight-second Undo toast. Dropped needs a reason: `price`, `time`, `no_contact`, `other_course`, `not_interested`, or `other`; other requires a note. Reasons appear in the row and timeline. Classification never changes enrollment, payments or account access. Trial/formal classification shows a reminder to open the profile for dedicated enrollment actions. Touch devices hide the drag grip and use the status menu.

Bulk accepts only consulting or dropped. Every selected row carries its expected status, checked under a scoped row lock; changed/invisible rows are reported as skipped. **Select all matching results** obtains a server-filtered snapshot of at most 100 IDs/statuses and reapplies the filter inside the mutation. When more than 100 match, the UI explains the cap. Selection resets on URL changes. Contact editing lives in the row menu or profile; row actions retain call, profile and contact-note links.

The trial column/card line is populated with grouped queries for the displayed IDs only: nine-day days remaining, preparation checklist x/3 (both groups and software), and confirmed trial lessons x/3. A missing/inactive enrollment or incomplete three-lesson plan shows **Chưa mở học thử**. Other classifications have no trial content. The table scrolls internally; its positioned container also prevents screen-reader labels from causing page overflow.

## Duplicate phone protection

`findPhoneMatches(user, phone)` searches canonical phones across all sources. Admin receives profile identifiers/name/status/source/signup time; sales receive those details only for owned sources and at most one `{ otherSource: true }` for all hidden matches. The hidden existence probe is the sole documented cross-source read; it returns neither PII nor a count. Admin row badges use one grouped query for current-page phones. Sales never receive this badge.

Manual creation checks a valid phone after 350 ms. Create and phone saves recheck at save time, show visible profile links, and require a second explicit confirmation before allowing a duplicate. The server repeats the check inside the transaction and shares a phone advisory lock with public insertion. Acknowledged create/edit audits record `duplicateAcknowledged: true`. Phones remain non-unique to support legacy data. Public signup retains its ownership-cookie and short retry-protection rules; matching does not prove identity.

## Archive and ownership

Admins archive with `spam`, `duplicate`, `test`, or `other` (other requires a note), and can restore from the profile. Archived rows are excluded from default lists, Kanban, dashboard aggregates and follow-up. They cannot be edited, classified, enrolled, activated, checklist-updated, or noted until restored. Sheet imports still recognize their immutable code but skip their changes. Archiving preserves status/enrollment and never deletes a record, consumes an allocator value or reuses a code.

Admins can transfer a profile to an active source with a reason and an expected-source snapshot. Student code, codeMonth and seq remain immutable. SourceId represents current ownership, so the old `(sourceId, codeMonth, seq)` uniqueness was removed; `students.code` remains unique and atomic `source_month_counters` retains its independent `(sourceId, codeMonth)` key. Transfer neither updates nor resets counters. Existing source/month code prefixes must remain stable. Transfer history contains before/after source IDs and a reason.

Archive, restore and source transfer reuse `student_status_events` with explicit `kind` and structured `data`, preserving one ordered profile timeline without a second event table. Their from/to status is unchanged. The nullable `reason` column is reserved for dropped classifications, including new events; legacy historical dropped rows are not assigned invented reasons.

## Contact notes and messages

Notes require a body; channel defaults to call and also accepts Zalo/meeting/other. Outcome is optional (`no_answer`, `interested`, `thinking`, `declined`, `other`); a next action is optional. Quick chips set today 17:00, tomorrow 10:00 or +3 days 10:00 in Asia/Ho_Chi_Minh, independent of the browser zone. The latest note's schedule wins: past/exact time is due, future is scheduled. Without a schedule, no note means uncontacted; a note two Vietnam calendar days old means overdue. This preserves the existing calendar-day rule (weekends are not excluded). All channels count as contact. Fresh contact labels say **Đã liên hệ**, while schedules show a concrete date/time.

Notes have no deletion operation. Their author may correct body only during the first 15 minutes, with expected-body concurrency checking, `editedAt`, and before/after audit; channel, contact time and schedule stay fixed. An edit does not reset the follow-up clock. **Đã gửi cho học viên** records a Zalo note `Đã gửi tin: <template title>` without extra input; copying records nothing and no message is sent automatically.

## Security and migration

Every new mutation validates with zod, resolves a permission, uses management scope and scoped student locking, writes history/audit in the same transaction, then revalidates list/profile/dashboard. No per-user shared cache is introduced. Facet clocks explicitly wait for a request to satisfy Next.js partial-prefetch validation. Mock record mutations retain the existing unavailable messages.

Generated migration: `0004_students_crm_hardening`. It adds four enums, archive timestamps/reason/actor, contact channel/outcome/schedule/edit timestamp, event reason/kind/data, archive index/check and event-kind check; removes ownership-based student sequence uniqueness. All affected tables retain RLS and no public policies. The migration also defines immutable, strict, parallel-safe `rvpy_search_text(text)` using Postgres UTF-8 NFD normalization, removal of combining marks and D-stroke transliteration. This is an extension-free alternative to unaccent; it needs no Supabase extension installation and matches the JavaScript mock normalization. No existing PII or historic event reasons are rewritten.

Generate with `pnpm db:generate --name students_crm_hardening`. Review and apply separately through the approved deployment workflow; development verification does not connect to a real database.

## Verification

`pnpm typecheck`, `pnpm lint`, `pnpm test` are required. The test runner runs files serially and limits Wasm compilation to two tasks so isolated PGlite stays within a busy Windows host's memory budget; no tests are skipped by this setting. `tests/crm-hardening.test.ts` covers follow-up state branches/Vietnam midnight, validation, Unicode/phone normalization, URL contracts and mock privacy. `tests/crm-hardening-db.test.ts` applies migrations 0000–0005 in isolated PGlite and executes actual actions/queries for duplicate acknowledgments, scope, archive/restore, dropped reasons, transfer collisions/counters, note corrections/audit rollback, due SQL/facets, search, stale bulk rows/caps and scoped trial aggregates. Existing signup/contact/import regressions also apply 0005. Hosted auth, real Postgres deployment, and live integration tests remain separate opt-in checks.

For the optional CRUD helper: set `RVPY_PGLITE_MODULE` to the installed PGlite `dist/index.js`, then run `pnpm exec tsx --conditions=react-server tests/student-crud-integration.mjs`. It never uses the configured application DB.

Mock preview uses `NEXT_PUBLIC_USE_MOCK=true RVPY_TEST_DIST_DIR=.next-crm-hardening-check pnpm dev --port 3104`. Fake fixtures include a cross-source duplicate pair, due/future appointments, dropped reasons, an archived profile and a trial classification without a plan. `/ui-kit` showcases the new CRM menus, reasons, notes, duplicate warning and trial summary. Verify list/quick views/filters/bulk/create/profile/kanban at 375/768/1280 px in both themes. Saving is verified against isolated Postgres; browser mutation controls remain disabled in mock mode.

Excel workbook generation, student area, payments, licenses, reports and Zalo Bot delivery are unchanged. The review adds only an archived-export authorization response.

## Review corrections

Sent-template acknowledgments copy the latest appointment under the locked parent row, so both overdue and future appointments survive. An ordinary new contact note with no appointment completes the existing schedule; body corrections never alter it.

Only active phone matches require acknowledgment or count toward admin duplicate badges. Visible archived matches are optional history hints without confirmation; foreign archived profiles never produce even an existence hint. The lookup action returns `ActionResult`, validates before querying and allows 30 lookups per user per minute through atomic durable counters in `signup_rate_limits`. Keys are namespaced SHA-256 digests; existing expiry cleanup applies. Mock lookups bypass database counters.

Both `archived=true` and legacy `archived=1` parse to the canonical filter. Sales see a recovery panel in table and Kanban views; archived export requests return a Vietnamese 403 before querying or creating a workbook. Internal archive authorization failures use `StudentArchiveAccessError`.

CRM buttons explicitly use shared `compact` / `icon-compact` sizes: 44px on mobile or coarse pointers, 36px on desktop fine pointers. No page-wide button-height overrides remain. The UI kit shows these variants. Code/name queries containing letters do not also search phone substrings; formatted numeric phone queries still normalize correctly.

Custom migration `0005_crm_review_function_security`, generated by Drizzle Kit, fixes the search function path to empty and revokes EXECUTE from PUBLIC and existing Supabase anon/authenticated roles. Migration 0004 remains intact. Only isolated PGlite has applied either migration. Production substring-search scan cost remains unmeasured.
