# Trial onboarding and student activation

The management student profile now contains **Học thử & tài khoản**. This connects the existing student area to staff operations without changing the manual CRM status editor.

## Staff workflow

1. Open a student profile and choose **Mở học thử**, then confirm. The existing enrollment action sets the CRM status, creates the student's plan from active lesson templates, and preserves the plan and start date on repeated calls. The three trial templates must already be configured.
2. An admin enters the **Email đăng nhập** and confirms **Cấp quyền học viên**. This links an existing app account or creates one before first sign-in, adds only the `student` role, and preserves other roles. The student signs in using Google or the existing email-link sign-in with exactly this email. No invitation is sent automatically.
3. Staff mark contact, two community groups, fee information, software readiness and official Zalo contact in the checklist. Each timestamp can be cleared.
4. Staff review the three trial lessons, the student's note and submission link, then confirm completion. A directly checked lesson may also be confirmed before a web report. Confirmation can be withdrawn; the report and submitted work are preserved.

## Access and consistency

- `students.activate`: admin only. Login identities are not returned to sale callers.
- `enrollments.trial` and `students.learning.edit`: admin and sale; sale callers are restricted to their owned sources by `studentScope(user, "management")` on reads and writes.
- A current active enrollment is required to grant login access or confirm trial lessons. Changing the CRM badge alone does not create an enrollment.
- The login email is separate from the editable contact email. An existing linked identity cannot be silently replaced. Disabled accounts and accounts already linked to another student are rejected.
- Mutations lock their rows, require timestamp snapshots for checklist/progress changes, and write their audit entry in the same transaction. A stale screen returns an error instead of overwriting newer work.
- Opening an expired trial does not reset the nine-day clock. The existing student-area policy still does not automatically lock content at the end of the trial.
- No schema migration is needed: this uses existing account, checklist, enrollment and plan tables.

## Verification

- `pnpm typecheck`, `pnpm lint`, `pnpm test`.
- Real Postgres integration, fixtures and changes rolled back: `RVPY_VERIFY_ONBOARDING_DB=1 pnpm exec tsx --conditions=react-server --test tests/student-onboarding-db.test.ts`.
- The DB check covers account provisioning/reuse, the real app session resolver with a verified-claims provider double, disabled/duplicate identity rejection, sale scope, idempotent trial creation, stale updates, all three confirmations, student reporting, withdrawal, and rollback when the audit fails.
- `/ui-kit` includes a fake-data preview; mock profiles show onboarding according to their mock CRM status. Mutations remain disabled in preview mode.
