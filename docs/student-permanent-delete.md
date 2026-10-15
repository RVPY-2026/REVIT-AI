# Permanent deletion of archived CRM profiles

This owner-authorized exception supersedes the earlier blanket no-delete rule for eligible students only. Payments, licenses and other business records must never be deleted to make a profile eligible. Baseline `53dd948` remains independently consumable by the learning-content and sources/audit branches.

## Gates and transaction

Only `students.delete` (admin) can read deletion eligibility or invoke `deleteStudentPermanently`. The action validates UUID, exact uppercase code, expected archive timestamp and a nonempty reason. The profile must have been archived for at least 30 elapsed days using the exact SQL predicate `archived_at <= current_timestamp - interval '30 days'`. All checks run again after a scoped parent `FOR UPDATE` lock. This conflicts with the FK key-share lock needed by new child records. Deletion first takes the import advisory lock and immutable-code advisory lock, in that order; allocation takes the same code lock before checking the permanent reservation. Concurrent link/restore/profile edits also wait on the parent.

The transaction reserves the immutable code in `deleted_student_codes` before deleting contact notes, status events, signup sessions and the student. The counter is not reset. Sheet preview/application rejects burned codes, including a stale preview created before deletion; import application replans under the shared import lock. Allocation checks each candidate code against the permanent reservation and increments again when burned. The reservation stores only code, current source ID, original code month/sequence, deletion timestamp, actor and required reason; no contact fields. Source ownership may have changed, but the immutable code is checked globally.

The same transaction records `student.permanently_deleted` with exactly code, current source code, status, archive reason and signup timestamp. It does not copy name, phone, email, note bodies or the free-text deletion reason into audit data. Existing audit history is retained. Any audit failure rolls back the reservation, children and parent deletion. Success revalidates list/profile/dashboard and returns to the archive view without Undo.

## Foreign-key decisions

Every direct incoming FK to `public.students` is checked against `pg_constraint` at runtime and in an isolated test. A new or changed undecided FK fails closed.

| Referencing table.column | Decision | Reason |
|---|---|---|
| call_notes.student_id | Delete in transaction | Erase private consultant notes |
| student_status_events.student_id | Delete in transaction | Erase this profile's timeline |
| lead_signup_sessions.student_id | Delete in transaction | Revoke browser signup proof |
| enrollments.student_id | Block | Preserve trial/formal enrollment, even cancelled |
| payments.student_id | Block | Preserve all financial history, including void/refund records |
| licenses.student_id | Block | Preserve granted licenses, even revoked/expired |
| students.referred_by_id | Block | Preserve other students' referral attribution |
| zalo_bot_connections.student_id | Block | Preserve connection and issued-token history, even expired/unconnected |
| zalo_bot_outbox.student_id | Block | Preserve every queue row, including sent/failed |
| feedback.student_id | Block | Preserve course/add-in feedback and its provenance |

`students.user_id` is an outgoing FK, checked separately: a linked login blocks deletion. `study_plan_lessons.enrollment_id` points to enrollments; the enrollment blocker therefore covers every study plan without deleting or detaching its rows. `payments(enrollment_id,student_id)` references enrollments indirectly and is retained for the same reason. Audit entity IDs are not student FKs and remain available after deletion. Burned-code source and actor FKs restrict deletion of that provenance.

## UI

The only production entry is an admin's archived profile, reached from the archive list. There is no delete action in the active list, Kanban, normal profiles or bulk toolbar. Preloaded blockers appear beside a disabled trigger. Eligible profiles open an accessible destructive dialog explaining the exact erased data and permanent code reservation. The form requires the exact code and a reason, preserves drafts/errors, disables dismissal/submission during a pending request, and uses the existing dialog focus handling. Mock mode previews the states without deleting anything. The UI kit contains eligible and blocked examples.

## Migration dependency and verification

Implementation was checkpointed separately in `be4a99b` and `7ca70d9`. C and B consumed the committed CRM baseline first. Final C `eb60adb` and B `62e182d` are merged. C regenerated its unapplied 0006 after B generated 0007; the final chain was therefore regenerated with Drizzle Kit from C's actual 0006 metadata, then B's exact index schema, then the full schema including permanent deletion. Regenerated 0007 SQL was compared with B's four index statements and is unchanged. The generated 0007/0008 snapshots and journal were copied intact from that isolated generation directory; no snapshot IDs or schema metadata were patched. Snapshot ancestry 0006 → 0007 → 0008 is verified. All mutations/migrations remain local or inside disposable PGlite, with no application to a real DB.

## Migration SQL summary

`0008_permanent_delete.sql` was generated with the project's Drizzle Kit and snake_case configuration after both actual dependencies were available. The resulting SQL:

1. Creates `deleted_student_codes`: code text primary key, source UUID, code month text, integer sequence, deletion timestamptz default now, actor UUID and reason text; all non-null.
2. Adds code/month format, sequence 1–999 and trimmed reason length 1–4000 CHECKs. Source and actor FKs use NO ACTION, preserving reservation provenance.
3. Enables RLS and adds no public policies.
4. Adds reviewed trigger SQL after the generated table diff: invoker `public.rvpy_keep_deleted_student_codes()` with an empty search_path, EXECUTE revoked from PUBLIC and existing anon/authenticated roles, raising SQLSTATE 55000 on changes.
5. Installs BEFORE UPDATE/DELETE row and BEFORE TRUNCATE statement triggers. Inserts remain permitted only through authorized server code; updates, deletion and truncation are rejected, including for the ordinary table owner.

The test migration readers follow the complete journal and check its file ordering. The learning-specific metadata regression still verifies 0004/0005/0006 without incorrectly assuming that 0006 is the final migration.

The mock archived dialog has been inspected at 375/768/1280px in both themes: no horizontal overflow, 343px dialog width at 375px, 512px at desktop widths, 44px mobile buttons. Keyboard Enter opens it, focus enters the code field, Tab reaches the cancel button, and Escape returns focus to the trigger. Recent archives show blockers and a disabled trigger. Sale `?archived=1&view=kanban` renders the friendly permission panel, without an error boundary or delete entry. Six JPEG screenshots are saved in the chat visualization output. Successful deletion/loading/error responses are tested server-side, not by enabling writes in the mock browser.

Final verification uses the actual generated 0000–0008 chain. The nine permanent-deletion tests pass, covering every blocker, exact 30-day boundary at database microsecond precision, sale denial, exact-code/stale-archive rejection, new-FK fail-closed coverage, erased children, retained RLS/provenance, update/delete/truncate rejection, PII-free audit, complete audit-failure rollback, burned-sequence allocation after counter reset, stale-sheet prevention and zero mock writes. Baseline was 107 passing tests plus three opt-in live-DB skips. The final combined suite has 162 tests: 159 passed, zero failed and the same three live-DB skips. Typecheck and lint pass. The standalone CRUD PGlite runner also passes once, with no skips. Drizzle reports no remaining schema changes after the generated chain is installed in the workspace.

The responsive/keyboard/browser checks above were repeated after the final C/B merge, including a disabled recent archive, no delete entry on a normal profile and the sale Kanban archive permission panel. Browser successful writes, in-flight destructive requests, hosted authentication and deployment against Supabase remain unverified; browser mock mutations stay disabled. No multi-connection delete/FK contention benchmark was performed. The locking order is implemented and SQL/transaction behavior is verified in disposable PGlite. No push, real-DB write/migration or main-branch commit occurred. The existing `.claude/launch.json` edit remains outside task commits.

## Files and local checkpoints

- `be4a99b`: permission, schema declaration, blockers/action, profile dialog/preload, reservation-aware allocation and initial regression suite; intentionally separate from migrations.
- `7ca70d9`: stale-import protection, shared code/import locks, final fixtures and migration-aware learning tests.
- C baseline `07aab9e`, B `62e182d` and final C `eb60adb` are merged locally. `144315e` introduced generated 0008; `98f9f6c` regenerates the unapplied 0007/0008 metadata from C's final 0006 as described above.
- Main implementation files: `src/server/actions/student-delete.ts`, `src/server/student-deletion.ts`, `src/server/queries/student-deletion.ts`, `src/lib/api/student-deletion.ts`, `src/lib/student-deletion.ts`, `src/lib/schemas/student-management.ts`, `src/server/db/schema/deleted-student-codes.ts` plus its index export, `src/server/lead-record.ts`, `src/server/import/student-sheet.ts`, and the permission map.
- UI integration: `StudentPermanentDelete.tsx`, the student profile page, fake archived fixtures and the CRM UI-kit showcase. `src/lib/audit-labels.ts` gives the deletion event and its metadata Vietnamese labels.
- Tests: `student-permanent-delete.test.ts`; actual-journal migration readers shared with C/B and updated existing PGlite runners. Shared DataTable accessibility/responsiveness and student/learning/admin status vocabularies are reconciled during merges.
- Docs: BACKEND_RULES, CLAUDE section 6 only, CRM phase guide and this FK/verification report. Generated migration SQL/journal/snapshots remain committed; screenshot binaries stay in the chat visualization directory outside Git.
