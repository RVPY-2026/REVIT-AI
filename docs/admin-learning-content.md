# Admin learning content

The admin-only **Tài liệu** and **Chương trình học** pages manage the existing learning-resource and lesson-template tables. Permissions are `resources.manage` and `lessons.manage`. Staff confirmation uses `students.learning.edit`; sales callers remain restricted to their owned sources on every student read and write.

## Uploads

- View mode: PDF, PNG, JPG/JPEG and WebP, up to 25,000,000 bytes (25 MB).
- Download mode: those formats plus EXE, MSI, ZIP, RVT and RFA, up to 50,000,000 bytes (50 MB). Larger installers are rejected and explained in the form. There is no external-file-link option: the existing origin CHECK only permits a Storage object or a validated YouTube embed.
- Extension, MIME, mode and size are validated server-side using `src/lib/learning-content.ts`. Empty files and mismatched formats are rejected. RVT/RFA use `application/octet-stream` with the exact allowlisted extension.
- `prepareResourceUpload` authorizes the admin, generates `resources/<uuid>/<sanitized-basename>`, creates an audited two-hour reservation owned by that admin, and returns the official signed upload destination/token. Client paths are never accepted. Only the authorized admin uploader receives the destination; student payloads still omit bucket and path.
- The private bucket is created if missing. Existing public buckets are rejected. Creation and updates enforce the 50,000,000-byte bucket limit and the complete MIME allowlist. A project with a lower global limit must be configured by its owner; this code never changes the project plan or global setting.
- The browser calls the official `uploadToSignedUrl` API directly. A custom fetch adapter uses XMLHttpRequest for progress and cancellation. No file body passes through Next.js. Retry creates a new reservation/path. A selected replacement must finish uploading before saving.
- `completeResourceUpload` locks the owned reservation and reads actual Storage object metadata. Only matching size/MIME marks it uploaded. Expired or mismatched reservations are cancelled and their objects removed best-effort. Another admin cannot complete or cancel the caller's lease. Storage failures preserve the draft and permit retry.
- Saving consumes the uploaded reservation in the resource transaction and preserves the resource ID. Replaced/deleted objects are removed after commit; their old reservations are retired so a still-valid signed capability cannot leave a permanently untracked recreated object.
- Closing/cancelling removes the temporary object best-effort. Expired pending, uploaded and cancelled reservations are swept on the next authorized prepare and by the existing authenticated `/api/cron/zalo-outbox` worker. No new scheduler is installed. Successful cleanup marks the operational reservation `cleaned` and writes audit in the same transaction; failed deletion remains retryable. Live Storage cleanup has not been exercised.

### Verified platform limits

The official [Vercel Functions limits](https://vercel.com/docs/functions/limitations#request-body-size) state: "The maximum payload size for the request body or the response body of a Vercel Function is 4.5 MB."

The official [Supabase file limits](https://supabase.com/docs/guides/storage/uploads/file-limits) state: "For Free projects, the limit can't exceed 50 MB." Direct Storage uploads bypass the Vercel request-body limit, while the application and bucket still enforce the conservative Free-compatible size above. Supabase documents [signed upload URLs](https://supabase.com/docs/reference/javascript/storage-from-createsigneduploadurl) as valid for two hours and supports [uploadToSignedUrl](https://supabase.com/docs/reference/javascript/storage-from-uploadtosignedurl). These pages were checked on 15 October 2026.

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

See the gitignored local `design/reference/admin-learning-content/` for screenshots and browser checks, and `docs/admin-learning-content-report.md` for the final verification report.
