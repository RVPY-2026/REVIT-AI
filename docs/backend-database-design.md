# Lean backend and database v1

Updated 2026-10-09 after the project owner's scope review. This is the implementation specification; the [expanded proposal](archive/backend-database-design-expanded.md) is retained as analysis only. Evidence is in the [workflow review](business-workflow-review.md) and [source dictionary](source-spreadsheet-data-dictionary.md).

## Scope

One Next.js app, Supabase Auth/Postgres/private Storage, Drizzle and zod. Keep 16 tables: the proposed 15 plus one feedback table for the two existing survey forms. No curriculum-version, fee-agreement, refund, grant, referral-award, booking, submission-history, workflow-event, or import-history tables in v1.

## Tables

| Table | v1 responsibility |
| --- | --- |
| users | Approved Google login accounts |
| user_roles | Admin, sale and student roles |
| ad_sources | Source R/A/B/C and sales owner |
| source_month_counters | Atomic source/month sequence |
| students | Shared lead/student identity, background, fixed checklist, legacy metadata and referrer |
| student_status_events | Append-only CRM stage history using the current status enum |
| call_notes | Human consultation notes |
| message_templates | Copyable Zalo scripts |
| lessons | Editable foundation/specialist templates, including grouped lesson numbers |
| learning_resources | View/download resources and trial/formal audience |
| enrollments | One RVPY enrollment per person: trial/formal, active/paused/completed/cancelled, fee and personal-plan settings |
| study_plan_lessons | Copied titles/numbers/durations/order/trial selection, progress and a submission link |
| payments | Positive amount, kind payment/refund, actual transaction date, optional void reason |
| licenses | Email/product entitlement independently controlled by admin |
| audit_log | Changes including fees, checklist, identity and access |
| feedback | Course ratings and add-in feedback; nullable student link for anonymous legacy responses |

All tables enable RLS; business data is accessed through the server. Keep UUID links, integer VND, timezone-aware event timestamps and Vietnamese business months. Historical non-Gmail/missing emails remain import exceptions rather than discarded people.

## Student codes and checklist

Canonical code: source + YYMM + three-digit sequence, such as A2610007. The counter key is (source_id, code_month). Public and manual signup use the same atomic counter transaction; 999 is the explicit capacity for a source/month, without silently expanding the format. UUID remains the internal key. Do not join old records by the six-character CODE.

Keep legacy_label and legacy_raw JSONB on students. Preserve original labels, unknown payment flags and reference errors. Generate new long Zalo labels from identity when needed; do not store a second authoritative generated label.

Five CRM stages: new -> consulting -> trial -> enrolled, plus dropped. Consulting corresponds to the clarified CHỜ CHỐT SALE meaning; money is not a CRM stage.

Kanban accepts only new, consulting and dropped. An existing enrollment cannot be moved back to new/consulting. Dedicated openTrialEnrollment and activateFormalEnrollment actions update enrollment, copied plan, CRM stage, history and audit in one transaction. Trial opening allows admin/sale within management scope; formal activation and stopping formal study require admin. Dropping cancels the enrollment. Formal activation requires an explicit agreed fee and does not create a receipt, license or login account. Reopening an existing enrollment preserves its lesson snapshots and original activation timestamps.

Public signup retries with the same normalized phone within five minutes reuse the existing code without consuming a sequence. A transaction advisory lock serializes concurrent retries. Staff entry remains explicit and is not deduplicated this way; retries never replace source/referrer attribution.

Six nullable checklist timestamps live on students: zalo_friend_at, group1_at, group2_at, fee_sent_at, software_ready_at, official_zalo_at. Null means unconfirmed. Never infer a timestamp from a copied message or invent an old event time from signup time. Changes are audited.

## Access and manual entry

studentScope(user, area) requires an area chosen by server code:
- management: admin sees all; sale sees owned sources; student-only accounts see no management records.
- student: only the linked student ID, even for sale/student or admin/student accounts. Without a linked student, deny. Admin preview is a separate management-authorized operation.
- Every protected read still checks permission and selects only permitted fields.

createManualLead supports staff entry before a full form is available. Name, phone and source are required; email/background may be absent. Admin selects an active source; sale can select only an active source they own. The students.create permission is independent of arbitrary profile editing. The action and audit exist; the management form is a later UI step.

## Learning plan and dates

A lesson template can be edited. At plan creation copy title, phase, grouped lesson numbers, base days, ordering and trial order into study_plan_lessons. The optional lesson reference connects resources, but display/timing use the copies. Existing plans therefore remain stable without a version system.

Trial orders 1/2/3 point to foundation lessons 2/13/14. Resource checks use these copied selections, not lessonNumber <= 3. Both course phases belong to one enrollment. Login timing and student-edit permissions still require the client answer.

Store start_date and duration_multiplier on enrollments. Compute commitment dates from cumulative (copied base_days x multiplier), preserving fractions across topics. Only a manual due_date_override is stored per topic. An override anchors following topics as in the source recurrence. Priority checkboxes do not remove durations. Unknown duration keeps dates unknown until an explicit anchor. Specialist scheduling remains separate and deferred.

Availability is [] when unspecified, otherwise a validated 7-weekday x 10-slot JSON matrix. A submitted assignment is a link plus progress note. reported_at and completed_at keep self-report and confirmation distinct without a submission-history table. No booking system in v1.

## Resource origins

Each learning resource has exactly one origin: a nonempty private Storage bucket/object path, or an external URL. External URLs are restricted by database CHECK to HTTPS YouTube/YouTube-nocookie embed URLs with a video ID and view mode. Admin must verify the video visibility before publishing; the URL pattern cannot establish whether a video is unlisted. Original Drive document links are rejected. Private documents use Storage and server access checks. View-only presentation cannot prevent screenshots or copying already delivered content.

## Fees, payments and referrals

agreed_fee_vnd and fee_note are on enrollments; null fee means unquoted, not free. Audit records fee edits. The verified legacy suggestion is birth year < 1990 -> 5,400,000 VND; otherwise 4,500,000 VND. Ask the client to confirm that policy before adopting it as the current fee; do not automatically set an agreed fee from it.

payments.kind is payment/refund with a positive amount. Net received sums nonvoided payments minus nonvoided refunds. paid_at is the actual movement time for either kind. Quoting a fee creates no payment. Keep external_ref uniqueness for future gateway support; no generic payload-fingerprint/idempotency framework now. A composite foreign key (enrollment_id, student_id) enforces ownership; enrollment_id may be null for unreconciled receipts. Add basic receipt/refund validation when those actions are built, rather than a new approval/settlement subsystem.

For v1, show the raw count of referredById as invited x/5 and label it as invitations, not qualifying trial attendance. Admin adjusts the fee manually. Agency bands 1-2, 3-5, 6-10 are derived from referral counts, never persisted as a role/rank field; confirm the count basis and treatment above ten before enabling an agency benefit. Refund and referral eligibility rules remain client decisions.

## Import, feedback and reporting

Use the one-off import script with dry run and a private manifest outside Git. Record original file/tab/row, approved student matches and imported payment references there. Exclude formula-only/template rows. Preserve #REF! and unmapped flags in legacy_raw; do not fabricate receipts or completed lessons. Seed source/month counters after import and keep reruns tied to the approved manifest.

feedback supports both source surveys, 1-10 scores, optional subject/discipline/speed and free text. Anonymous legacy responses stay unlinked; matching by respondent name alone is not safe.

Commission calculations in CHIA % are a priority client question. Verify formula ranges, conversion definition, rate/basis, settlement period and whether sale may see their own amounts. Preserve source attribution now; defer commission calculations and settlement tables.

Export the same scoped rows/filters as each management list. Monthly acquisition and actual cash movement use their respective dates. Keep the specified nightly Excel backup and database/file restore capability. No live two-way Sheets synchronization or automatic Zalo messages.

## Migration and verification

The owner confirmed on 2026-10-09 that the old 0000 had never run on a real database. Regenerate one clean 0000_init.sql from the 16-table schema instead of carrying an upgrade/backfill migration. Status history retains the status enum. legacy_label/legacy_raw remain for the future Sheet import, without previous-app backfill logic.

On 2026-10-09 the clean initial migration was also applied through Drizzle to the selected Supabase staging project. Hosted verification confirmed 16 business tables with RLS enabled. Production deployment and real Sheet import remain separate. Unit checks: `pnpm test`. Required checks: `pnpm typecheck` and `pnpm lint`.

The integration check exercises the actual lead/enrollment services and generated initial SQL: 16 RLS tables, public concurrent retry/code reuse, retry outside the five-minute window, manual entry, missing-template rollback, trial/formal transitions, copied-plan stability, scope/permissions, composite payment ownership, resource origin/provider checks and history enum. Install PGlite outside the app, set RVPY_PGLITE_MODULE to its absolute dist/index.js path and NODE_PATH to that temporary node_modules directory, then run `pnpm exec tsx --conditions=react-server tests/migration-v1.mjs`. No check reads the shared database; target Supabase staging verification remains a deployment step.

## Next client questions

1. CHIA %: commission formula, base, settlement and sale visibility.
2. Resolve the fee conflict: the nine-day poster says 4,500,000 VND for signup, while the legacy formula suggests 5,400,000 VND for birth year < 1990. Which rule takes precedence?
3. Map NO NOT 1/2/3, DONE - A/B and remaining sales flags.
4. Trial login and editable progress fields; when the nine-day window starts.
5. Formal activation, license validity and referral qualification/refund conditions.
6. Resolve the schedule conflict: current landing copy says minimum 45 days and two online sessions/week; the template totals 50 base days and the client screenshot describes 1.5-2 months plus specialist sessions Saturday at 05:00. Confirm schedules separately for each phase.
7. Remaining trial-workbook contents and agency count basis.

Build CRM/manual entry/export first, then personal learning, then financial/license/report operations. The draft schema supports these flows; it does not claim all actions or screens are already implemented.
