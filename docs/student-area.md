# Student area (`/hoc-vien`)

Replaces the per-student tracking sheet and the Zalo hand-offs for a signed-in student. Roles `student` and `admin` may open it (`student-area.view`); data is always the caller's own.

## Pages

| Route | What it shows |
|---|---|
| `/hoc-vien` | Enrollment kind and trial countdown, progress, next lesson, start checklist (Zalo groups, software, trial lessons), licence summary, community links |
| `/hoc-vien/khoa-hoc` | The curriculum from the student's own plan, grouped by phase. Locked rows show "Mở khi học chính thức" |
| `/hoc-vien/khoa-hoc/[lesson]` | One lesson: embedded videos and PDFs, and the "Báo hoàn thành" form. `[lesson]` is a `study_plan_lessons.id`, so another student's id is a 404 |
| `/hoc-vien/tai-lieu` | View-only materials grouped by lesson; `?xem=<id>` opens the viewer above the list |
| `/hoc-vien/tien-do` | Progress figures and a table of every lesson with its due date and state |
| `/hoc-vien/phan-mem` | Licences, installer downloads, generic install steps |
| `/hoc-vien/gioi-thieu-ban` | Personal link `/dang-ky?ref=<code>`, copy buttons, counts of invited/enrolled, fee ladder from `REFERRAL_TIERS` |
| `/hoc-vien/ho-tro` | Zalo contact, community groups, course/add-in feedback form |

## How access is decided

- **Scope.** Every query in `src/server/queries/student-area.ts` starts from `students` filtered by `studentScope(user, "student")` or joins to it. A staff account without a linked student sees "Tài khoản chưa gắn với hồ sơ học viên".
- **Rules** live in `src/lib/student-learning.ts` (pure, tested): trial students open the three `trialOrder` lessons, formal students the whole plan; paused or cancelled enrollments keep only audience `all` material that is not tied to a lesson.
- **Files.** `learning_resources` rows are filtered in SQL by audience and by the lesson's access. `/api/student/resources/[id]` streams the private object: PDFs and images inline, installers (`mode = download`) as attachments, nothing else. Bucket and path never reach the browser. YouTube videos are embedded from the validated embed URL.
- **Mutations** (`src/server/actions/student-area.ts`): `reportLesson` (sets `reportedAt`, optional note and https link, or withdraws it; never touches `completedAt`) and `submitFeedback` (max 5 per student per day). Both are scoped, transactional and audited.
- **Due dates** are computed on the server with `commitmentDates` from the enrollment start date and multiplier; a trial has no start date, so it shows none.
- **Referrals** show counts of `students.referredById` only (BACKEND_RULES §8). The page does not compute a fee tier; staff adjust the agreed fee.

## Assumptions (to confirm with the client)

1. Staff, not the student, confirm that a lesson is complete. The management student profile now confirms the three trial lessons (see `docs/student-onboarding.md`); confirmation of the remaining formal lessons is not implemented yet.
2. The 9-day trial runs from `trialStartedAt`; the student area does not lock when it ends.
3. Installers and documents are managed as `learning_resources` rows (private bucket + object path). No upload UI exists yet.
4. The install steps on `/hoc-vien/phan-mem` are generic placeholders.
5. The checklist uses the existing timestamps `group1At`, `group2At`, `softwareReadyAt`, set by staff in the management student profile.

## Preview and tests

- Mock mode: `NEXT_PUBLIC_USE_MOCK=true`, then pick "Học viên (học thử)" or "Học viên (chính thức)" on `/dang-nhap`. Mutations and file streaming are unavailable in mock mode.
- `pnpm test` runs `tests/student-area.test.ts` (rules, schemas, mock data, scope SQL).
- Opt-in, against the configured database, rolled back at the end: `RVPY_VERIFY_STUDENT_AREA_DB=1 pnpm exec tsx --conditions=react-server --test tests/student-area-db.test.ts`. It builds two fixture students, a trial and a formal enrollment, resources, licences and referrals inside one transaction and checks isolation, audience rules, reporting and the feedback cap.
