# Admin learning content

The admin-only **Tài liệu** and **Chương trình học** pages manage the existing learning-resource and lesson-template tables. Permissions are `resources.manage` and `lessons.manage`. Staff confirmation uses `students.learning.edit`; sales callers remain restricted to their owned sources on every student read and write.

## Uploads

- View mode: PDF, PNG, JPG/JPEG and WebP, up to 25 MiB.
- Download mode: the view formats plus EXE, MSI, ZIP, RVT and RFA, up to 100 MiB.
- Extension and MIME must match the server allowlist in `src/lib/learning-content.ts`. Empty files, oversized files and double extensions that do not match the MIME are rejected.
- An authorized admin receives an opaque reservation ID. The server generates `resources/<uuid>/<sanitized-basename>` with an independent private UUID and ignores client paths. Bucket configuration and path generation live in a server-only module. The reservation belongs to that admin and expires after two hours. The server creates `learning-resources` as a private bucket if absent and rejects a public bucket.
- The same-origin PUT endpoint streams bytes into Storage, counts them against the authorized size, and checks stored size and MIME before marking the reservation uploaded. Paths and bucket names never appear in action results or list payloads; the admin list receives only the basename and known size.
- A file is not published until a resource save consumes the uploaded reservation in its audited transaction. Upload progress, cancellation and retry are available. Closing the dialog cancels its unused reservation. Failed uploads remove their object best-effort; expired pending/uploaded reservations are reaped on the next authorized upload attempt. Cancelled reservations are excluded so they do not block later cleanup batches. Failed Storage cleanup may require manual removal. There is no scheduled cleanup job.
- Replacing an object preserves the resource ID. The old object is removed only after the DB transaction commits. Failed cleanup is reported to the admin; business data stays committed.

### Upload transport decision

Direct Supabase signed upload URLs include the bucket and object path. The brief forbids exposing them to the browser, so this implementation uses an opaque same-origin streaming endpoint instead. It does not buffer a 100 MiB file or use a Server Action request body. The hosting platform must support the chosen request size and duration. In particular, a deployment with a lower request-body cap needs an upload ingress that supports these sizes before using the advertised maximums. Live Storage transport has not been exercised against a real project.

## Templates and ordering

Editing a lesson affects only plans created afterwards. Existing `study_plan_lessons` titles, numbers, durations, order, trial slots, reports and confirmations remain snapshots. The dialog explicitly explains this rule and shows the number of existing plans.

Lesson ordering is serialized by a transaction advisory lock. Row locks and a disjoint temporary order range avoid transient `(phase, sort_order)` conflicts. Resources are reordered only within their lesson group, including the unassigned group. Clients send the complete group order; stale order snapshots are rejected.

Trial selection replaces all three slots in one transaction. The server requires three distinct, active foundation lessons and validates the current slot snapshot before clearing/reassigning slots. Readers outside the transaction never see a partial swap. A selected trial lesson cannot be deactivated until a replacement is chosen.

## Deletion and confirmations

There is no lesson-delete operation. Deactivate lessons instead, retaining all referenced templates and plan snapshots. Only admins may delete a resource, after a dialog names the exact title and explains that open links may stop working. The DB row is deleted and audited together; its Storage object is removed best-effort after commit.

All plan lessons appear in the staff progress panel. Non-trial lessons require an active formal enrollment. Trial confirmation calls the same shared record helper with its original trial-only restriction. Confirmation withdrawal preserves the student's report, note and link. Timestamp snapshots prevent stale confirmation or withdrawal. Reversible actions offer an eight-second Undo toast. Bulk confirmation processes only reported, unconfirmed, eligible lessons, capped at 30, with a naming dialog and one transaction; any stale member rolls back the whole batch.

## Verification fixtures

Mock mode renders fake content and preserves the existing preview error for mutations. `?state=loading`, `empty`, `one`, `many`, and `error` provide development-only visual fixtures on both new pages. They are ignored outside mock mode. The `many` fixture has 120 rows and long titles. Real mutations are tested with PGlite and explicit module boundaries, never an implicit real database connection.

The local test command runs files serially to avoid simultaneous PGlite/TypeScript memory spikes. `RVPY_TEST_DIST_DIR=.next-learning` isolates the preview output.

See `design/reference/admin-learning-content/` for screenshots and browser checks, and `docs/admin-learning-content-report.md` for the final verification report.
