# Admin feature end-to-end checklist

## Running locally

The integrated source is on `main`. Start from `D:\RVPY\REVIT-AI` with dependencies installed through pnpm.

| URL | Runtime | What can be tested |
|---|---|---|
| http://localhost:3000/dang-nhap | Full Next.js server, `NEXT_PUBLIC_USE_MOCK=false`, existing `.env.local` | Real sign-in, server actions, database and Storage after the target test environment is ready |
| http://localhost:3100/dang-nhap | Same application, `NEXT_PUBLIC_USE_MOCK=true`, separate `.next-crm-check` output | Fake admin/sale/trial/formal identities, layouts, dialogs, filters, validation and permission previews |

The full application has no separate backend process: Next.js runs both pages and server actions. Mock mode intentionally disables persisted mutations and file upload. It cannot prove successful save, permanent deletion, real file delivery or live authentication.

If restarting manually, use separate PowerShell terminals:

```powershell
Set-Location D:\RVPY\REVIT-AI
$env:NEXT_PUBLIC_USE_MOCK = 'false'
Remove-Item Env:RVPY_TEST_DIST_DIR -ErrorAction SilentlyContinue
pnpm dev --port 3000
```

```powershell
Set-Location D:\RVPY\REVIT-AI
$env:NEXT_PUBLIC_USE_MOCK = 'true'
$env:RVPY_TEST_DIST_DIR = '.next-crm-check'
pnpm dev --port 3100
```

In mock mode, open sign-in in a fresh browser profile and choose `Quản trị`, `Sale`, `Học viên (học thử)` or `Học viên (chính thức)`. An existing mock identity redirects to its home area. Sign out before selecting another identity. Cookies are shared across localhost ports, but the full server ignores mock identity cookies.

## Prerequisites for write-through E2E

Use a designated test Supabase project and fictional records. Existing environment variable presence alone does not prove connectivity, migration state or authorized account roles. No real database was inspected, migrated or seeded by this handoff.

1. Configure the test project URL, publishable key, secret Storage key, database and direct/session database URL in `.env.local`. Keep all values outside Git. Restart the full server after changing them.
2. Configure the test Auth provider and its localhost callback. Login identities must have application roles; signing in automatically grants only `user`, never admin/sale/student. Use the existing staff bootstrap/role-management process for authorized test accounts.
3. On that confirmed test project, apply the committed migration journal through 0008 with `pnpm db:migrate`. Run `pnpm db:seed` if reference source R/lessons/templates are missing. These commands write to the configured project and are not mock commands. They were not executed as part of this handoff.
4. Prepare admin, sale A, sale B and linked trial/formal student test accounts. Use separate browser profiles to keep sessions distinct. Prepare two active sources owned by the respective sales.
5. Prepare fictional leads with/without related enrollments, payments, licenses, login links, referral edges, feedback and Zalo rows. For permanent-delete success, an isolated test fixture must already be archived at least 30 days. Newly archived profiles should be blocked. Do not weaken the application gate to accelerate this test.
6. Use only a test Zalo bot/recipient for any real delivery test. The existing worker may send eligible queued messages; retry is not a harmless UI-only operation. No bot message or scheduler setup was performed here.

## A. CRM

| Test | Steps | Expected result |
|---|---|---|
| Create and persist | Admin creates a fictional student at `/quan-tri/hoc-vien`, notes its code, reloads and opens profile | Values persist; code is allocated once; audit identifies the creation |
| Duplicate phone privacy | Create another lead with the same phone; repeat as a sale whose matching lead belongs to another source | Explicit acknowledgment is required for active duplicates; hidden profiles expose no contact details; archived matches do not block |
| Status and notes | Change classification, use Undo; choose dropped with a reason; add a contact note and appointment | Status/history/audit agree; Undo respects stale edits; note and next appointment survive reload; classification alone does not enroll a student |
| Source transfer | Admin transfers a lead to B with a reason; compare sale A/B sessions and the original student code | B gains access, A loses it, immutable code remains unchanged |
| Archive/restore | Archive a test lead, refresh active list and source statistics, find archived list, restore | Active lists/statistics omit it; archived profile is not editable; restore returns it to active management |
| Delete blockers | Open recent archive and old archive with each dependency | Disabled deletion plus specific blockers; no dependency is removed to make it eligible |
| Permanent delete | On an eligible old archive, enter incorrect then exact code and a reason; submit once | Incorrect code cannot delete; success removes profile/notes/status events/signup sessions, retains burned code and minimal audit, no Undo |
| Role and stale checks | Sale opens `?archived=1&view=kanban`; two admin tabs edit the same snapshot | Friendly permission panel for sale, no delete control; stale edits fail clearly and retain drafts |

Burned-code allocation, audit-failure rollback, exact 30-day microsecond boundary and every incoming FK decision are covered by the isolated automated suite. Never reset a production allocator or fabricate old production timestamps for manual tests. Existing historical audit rows are retained; the new deletion event itself does not copy name/phone/email.

## B. Sources, audit and Zalo

| Test | Steps | Expected result |
|---|---|---|
| Source CRUD | At `/quan-tri/nguon-quang-cao`, create an unused single-letter source, then try duplicate/R; edit name and owner | Valid data persists; reserved/duplicate codes fail; code is immutable; owner must be an active sale |
| Owner handoff | Change a source owner with active leads; inspect confirmation and both sale sessions | Confirmation count excludes archived profiles; owner change immediately updates lead visibility |
| Source activity | Deactivate a source, attempt manual creation, then public signup with its code | Manual creation is rejected; public signup falls back to R; previous profiles remain available; Undo restores activity |
| Statistics | Compare source total/month/enrolled/conversion and six-month detail against the test fixture before/after archive | Every number excludes archived profiles; archived-only source has no conversion percentage |
| Audit | At `/quan-tri/nhat-ky`, locate the actions above; filter actor/action/entity/date, page next/back, expand details | Filters persist; newest first; phone/email masking and secret removal work; old/new values are readable |
| Audit cap | Run the isolated 12,050-row test fixture; inspect the bounded-pagination example in `/ui-kit` | A bounded `10.000+` total and narrowing-filter explanation; only newest 10,000 are browsable |
| Queue | At `/quan-tri/zalo`, filter failed items and inspect sanitized error; retry one or a capped batch on test bot only | Only failed items reset via shared retry logic; batch capped at 50; retry is audited; actual delivery requires configured worker/bot |
| Access | Sale directly opens source/audit/Zalo URLs | Access is denied; hiding navigation alone is not the security test |

## C. Learning content

| Test | Steps | Expected result |
|---|---|---|
| Resource upload | At `/quan-tri/tai-lieu`, add a PDF/image, choose file, click `Tải tệp lên`, then save resource and reload | Browser sends bytes directly to Supabase Storage; progress appears; server verifies metadata; saved resource persists |
| Limits and type | Try disallowed extension/MIME, view file above 25 MB and downloadable file above 50 MB | Clear validation error and no usable resource; large installers explain the limit without unsupported external-file origins |
| Cancel/retry | Throttle network for a test upload, cancel midway, retry; close an unsaved upload dialog | Cancellation/retry works; no premature uploaded/consumed state; abandoned reservations are cleaned after expiry by authorized prepare/existing worker |
| Private access | In browser Network, inspect upload destination; as student inspect resource requests | Upload body goes to Storage, never a Next.js upload proxy; student receives no bucket/object path and opens only `/api/student/resources/[id]` |
| Audience | Create trial/formal/all resources; compare linked trial and formal accounts; disable a resource | Visibility follows audience and lesson access; disabled content disappears; file endpoint enforces access too |
| Curriculum | At `/quan-tri/chuong-trinh`, edit/reorder lessons, use trial swap, compare an existing plan with a newly opened plan | Exactly three trial lessons; safe ordering; old plan snapshots remain unchanged |
| Formal progress | Formal student reports completion at `/hoc-vien/tien-do`; scoped staff confirms/withdraws in student profile; reload both sides | Confirmation updates progress; withdrawal retains student report; foreign-source sale is denied; bulk confirmation respects the 30-item cap |

In DevTools Network, preserve the log while uploading. The expected upload is a Storage signed PUT, followed by the app's metadata-completion action and resource save. A page opening successfully is not evidence that these writes succeeded.

## UI regression pass

Check the five new admin pages plus archived profile at widths 375/768/1280 in light/dark: no horizontal page scroll, one creation dialog, readable long names, matching loading/empty/error states, visible focus, Enter to submit/open and Escape to close. On mobile, filters close back to their trigger. On 120 mock learning rows, pagination advances 1–20 to 21–40 and search/filter changes reset it correctly.

Useful mock fixtures:

- `/quan-tri/hoc-vien/mock-student-13`: recent archive, deletion blocked.
- `/quan-tri/hoc-vien/mock-student-14`: old eligible archive, dialog preview only.
- `/quan-tri/tai-lieu?state=empty`, `?state=loading`, `?state=error`, `?state=many`.
- `/quan-tri/chuong-trinh?state=empty`, `?state=many`.
- `/ui-kit`: shared components and fake-data examples.

## Automated checks and recording results

```powershell
pnpm typecheck
pnpm lint
pnpm test
pnpm db:generate
```

The integrated baseline is 159 pass, zero fail, three existing opt-in live-DB skips; generation reports nothing to migrate. `pnpm test` exercises real server-action/query logic through isolated PGlite and provider boundaries; it does not prove browser-to-hosted-Supabase E2E.

For each manual test record role, URL, fixture code, action, expected/actual outcome and screenshot. For mutations, refresh or open a second session and check the audit entry. Use fake values and keep captures outside Git. Save only non-secret failure messages, never full environment values, session cookies or signed upload tokens.
