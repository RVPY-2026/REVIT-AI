# Business workflow review

Reviewed on 2026-10-09. This is a discovery record, not an approved replacement for the business rules. Unresolved mappings must be confirmed before implementation or import.

This is the original discovery record. Later verification is in the [source dictionary](source-spreadsheet-data-dictionary.md); the owner's simplified implementation specification is [Lean backend and database v1](backend-database-design.md). Code and schema changes after this initial review are described there.

## Evidence and reading limits

The review covers the supplied discovery-call transcript, pasted Zalo scripts, project guides, existing database schema, lead action, authentication helpers, permissions, constants, and current routes.

| Source | What was inspected | Limit |
| --- | --- | --- |
| Lead-response workbook | Extracted contents of all five returned sections: registrations, telesales, course feedback, add-in feedback, monthly source report | Office text extraction does not expose original formulas, validations, or layout |
| Individual student template | All three extracted sections: personal learning plan, weekly availability, student identity | Original formulas and exact tab names were not returned |
| Admin course-management sheet | All populated values across the 37-column grid; header, identity formulas, selected validations, fee total formula | Financial meanings and legacy flags still require confirmation |
| Add-in account sheet | All returned rows and columns; the cross-workbook extraction formula | No evidence of the running Revit add-in implementation or expiry enforcement |
| Nine-day trial workbook | File metadata and the owner-supplied screenshot of the two-phase introduction | It is an Office workbook; native Sheets reads are unsupported and authenticated file downloads return 403. The screenshot does not expose the complete workbook or its two reported tabs |

Private source links, student identities, and raw exports are deliberately absent from this document. No source file or production data was changed.

## Existing workflow

1. A prospect receives the registration form and submits personal details, professional background, learning goals, discovery channel, and Zalo information.
2. Staff copy formulas and allocate a sequence, distinguish the ad source from RVPY's own source, and construct a recognizable Zalo contact label.
3. Staff duplicate a student tracking template, insert identity data, rename the workbook, and share it with the student's email.
4. Trial learning resources are shared for viewing. The student's tracking workbook is separately shared for editing. Staff disable notifications and restrict file copying/downloading where available.
5. Staff copy the personal tracking link back into the lead sheet and pin/send it in Zalo.
6. Staff send the community invitation and ask the student to join both groups. Group membership is a manual milestone, not something established by clicking a website link.
7. Staff send the applicable fee and referral offer, followed by introduction, course-content, and software-preparation links.
8. The student downloads software and arranges a consultation. Staff currently install software remotely and discuss the course personally.
9. The student attends three trial lessons during a nine-day experience period. The supplied screenshot identifies them as foundation lessons 2, 13, and 14. Their detailed trial resources and instructions remain unread because the full workbook is inaccessible.
10. When the student wants to enroll, staff send payment details, confirm the payment, thank the student, and request contact with the company's official Zalo account.
11. Staff copy information into the admin register and maintain payment, study, and tool-access information there.
12. A formula projects tool-account records into a separate email-based add-in account workbook.

Evidence: transcript 03:24-10:01 and 15:56-25:23. Several phrases in the transcription are garbled; ambiguous labels must not become implementation rules merely from the transcript.

## What each source represents

### Lead responses and source reports

The registration section includes timestamp, source, sequence, year/month, specialty, name, birth year, hometown, email, Zalo phone, personal course link, discovery channel, learning goals, occupation, proposed fee/package indicator, organization, telesales, notes, Facebook link, and self-reported Zalo contact status.

Observed legacy sales labels are `CHỜ CHỐT SALE`, `ĐÃ ĐĂNG KÝ`, and `BỎ QUA`. The project owner clarified that `CHỜ CHỐT SALE` means an ongoing message conversation with an agreeable student response; it does not mean payment has been received. The other labels and precise transition conditions still need confirmation.

The other extracted sections cover telesales, course evaluation, add-in evaluation, and monthly acquisition/conversion/commission projections. The monthly section is not a payment transaction ledger. Confirm the definitions of contact, registration, projected registration, conversion rate, and commission before rebuilding it.

### Individual learning plan

The template contains a foundation phase spanning lesson numbers 1-25, including combined lesson rows. Topics include PDF workflow, CAD, project modeling, families, materials/rendering, massing, specialty elements, documentation, view templates, schedules, coordination, advanced project workflows, and final review.

It also contains a separate online specialist phase with delivered/current/planned topics. Planned specialist dates are tentative, not confirmed public commitments.

Per-student information includes selected topics, exercise progress, minimum duration, a duration coefficient, committed dates, project milestones, final-project guidance, and weekly availability. Foundation learning, specialist participation, exercise submission, and actual one-to-one attendance are distinct concepts.

The template is regularly revised according to the transcript. A future model needs a decision about whether curriculum changes affect existing personal plans or only newly created plans.

### Course introduction verified from the supplied screenshot

The visible introduction describes two training phases:

- Foundation: architecture, advanced topics, management, and BIM; one-to-one instruction with an individual plan; 25 lessons; an indicative duration of 1.5-2 months. Learning revolves around a student-selected project and a final project presented as an output-quality commitment. The visible examples include townhouses, villas, hotels, and restaurants below seven floors. This introduction and the personal template use somewhat different project-eligibility wording; reconcile them before publishing a definitive restriction.
- Specialist: advanced structural and MEP topics plus other specialist courses; one online session per week at 05:00 on Saturdays, with additional topics introduced periodically.
- The introduction states that a single registration allows participation in courses across both phases. It does not establish a license duration or a lifetime-access promise.
- The three trial sessions are foundation lessons 2, 13, and 14 over nine days. In the inspected personal template those lesson numbers correspond to CAD in Revit, View Template, and Schedule. This is a cross-reference to the template, not a read of the hidden detailed trial sections.
- The screenshot links enrollment during the trial period to fee incentives; exact eligibility and timing rules remain client questions.

Website implications: model trial access as a selected subset of foundation lessons, retain both learning phases, and distinguish personal one-to-one scheduling from recurring specialist sessions. Do not implement the trial as automatic access to lessons 1-3.

### Admin management register

The register combines referral/source context, tool access, derived contact codes, specialist participation, identity, contact information, priority, reminder notes, submitted work, one-to-one lessons, agency classification, personal tracking link, fee, payment flag, and custom policy.

Agency choices include student, prospect, and three agency levels. These are business classifications, not evidence that additional authentication roles already exist.

Observed payment labels include `NOT`, `NO NOT 1`, `NO NOT 2`, `NO NOT 3`, `DONE`, `DONE - A`, and `DONE - B`. Do not map suffixes to installments, staff, sources, or payment methods without confirmation.

The fee column contains standard-looking amounts, discounts, zero amounts, and negotiated amounts. A fee is not necessarily an amount received. Policy cells mix commission information, exceptions, bundles, and free-text arrangements.

### Add-in account projection

The live formula imports admin columns A:N and selects columns 2, 3, 5, and 14 where column 2 is nonempty. These correspond to tool status, derived code, Zalo/contact label, and email.

The condition is a nonempty tool cell, not an explicit equality check for `OK` and not a payment-status condition. The current data contains tool-enabled rows whose payment flags are not `DONE`. This supports keeping payment confirmation and license entitlement separate pending confirmation; it does not establish why those exceptions exist.

The account sheet alone does not establish product scope, expiration, revocation, device limits, or how the add-in verifies an email. The fifteen-day software trial mentioned later in the call is a separate future licensing discussion, not the nine-day course trial.

## Mapping to the website

| Current operation | Intended website behavior |
| --- | --- |
| Registration form and response rows | Public signup creates a scoped prospect record with preserved answers |
| Manual identity/formula copying | Server assigns identity; staff can copy the Zalo label |
| Duplicate a personal tracking workbook | Create a personal course plan associated with the same student |
| Share trial resources and editable tracker separately | Enforce resource grants and narrowly defined progress-edit permissions |
| Forward scripted messages | Render editable templates with permitted student data and a copy action |
| Copy paid student into another register | Record enrollment/payment against the existing student identity |
| Maintain source workbooks A/B/C separately | Each salesperson sees only their assigned source records |
| Project eligible emails into a license sheet | Explicit admin-controlled entitlements associated with email/product |
| Read formulas for reports | Produce reports from defined acquisition, enrollment, payment, and commission records |
| Keep local Excel copies | Scoped exports, monthly reports, backups, and a tested restore procedure |

Consultation and Zalo sending remain human activities. The web can remove copying and present the next task without treating a copied message as sent or a link click as completed participation.

## Differences from the current project

- The repository currently provides the database/auth foundation and UI components. The home page is a placeholder; the management/student routes, exports, imports, and their workflows are not yet implemented.
- The schema has users, roles, sources, students, status events, call notes, payments, licenses, templates, and audit logs. It does not yet have lessons, personal plans, availability, submissions, resource grants, referral qualification events, agency agreements, or commission settlements.
- The existing pipeline is explicitly a draft. Software readiness, consultation, per-group membership, payment-request messages, and official-Zalo contact may need separate checklist events rather than more mutually exclusive pipeline statuses.
- The code allocator is a lifetime source counter. In the lead workbook, source/sequence combinations repeat across months, while source/month/sequence combinations are distinct in the inspected dated rows. Confirm whether monthly resets are intentional.
- The admin short code is derived from the first six characters of the contact label. Duplicate short codes occur. It must not become the sole import key.
- Historical records include missing emails and non-Gmail addresses, despite the current Gmail-only new-signup schema. Preserve exceptions for review instead of silently discarding them or changing their addresses.
- The visible admin total sums a fixed subset of fee rows. It must not be imported as authoritative cash received or assumed to represent the complete register.
- Some cells contain reference errors or values outside their apparent column meaning. Import requires a preview, exceptions report, reconciliation, and rerun protection.
- The transcript discusses keeping both systems synchronized while confidence grows. The current backend rules specify one-off import plus web exports, with no live two-way synchronization. This difference needs a scope decision.
- The template has both editable student tracking and view-only educational resources. Treating every student-facing surface as view-only would lose part of the existing workflow.

## Import and validation decisions

Keep one student identity across lead, enrollment, progress, and license domains. Preserve legacy identifiers and provenance independently of the future public code. A source sequence or short contact code is insufficient for automatic matching.

Match candidate records using multiple verified fields, expose ambiguous matches for review, and never merge solely because a phone or email repeats. Exclude template/placeholder rows, preserve unresolved legacy flags, and do not invent payment dates or amounts from fee quotes.

Initialize future counters only after the legacy-code policy is chosen. Reconcile source totals and individual exceptions before any live cutover. Raw input files belong in an explicitly git-ignored location; the current `.gitignore` does not yet include the `data/` directory described by BACKEND_RULES.

## Project-owner clarifications

- Keep the old student-code method: source + YYMM + three-digit sequence, with a counter per source/month. This was resolved by the owner's scope review; long Zalo labels are generated from identity.
- `CHỜ CHỐT SALE` describes an ongoing sales conversation with an agreeable student response, not payment confirmation.
- Record unresolved payment/license labels and trial-student access/editing rules for the project owner to ask the client later. Do not block this discovery review or invent their meanings.

## Questions for the next client conversation

1. Prioritize the CHIA % commission formula, calculation basis, settlement period and sale visibility. Student code/reset format is resolved.
2. What do the remaining sales labels and each payment suffix mean? What condition authorizes tool access, and can it be granted before full payment?
3. When may a trial student sign in, what may they edit, and who approves completion/submitted work?
4. Confirm the observed formula's policy: birth year before 1990 suggests 5,400,000 VND; otherwise 4,500,000 VND. Avoid the transcript's unverified adult/child terminology.
5. What qualifies a referral: registration, group membership, attendance at all three trial lessons, payment, or approved enrollment? When does the nine-day offer start, and how are later enrollments/refunds handled?
6. Are agency levels and historical commission/bundle policies part of v1? Can a salesperson see any financial details about their own students?
7. Does an updated curriculum change existing plans? Which progress dates/counters are calculated versus reported or approved?
8. Is import plus export sufficient for transition, or is continued live Google Sheets synchronization required?
9. Provide the rest of the nine-day trial workbook to verify its two reported tabs and detailed lesson/resource structure. The screenshot confirms the introduction and trial lesson numbers only; connector access still cannot retrieve the full contents.

No schema, status mapping, financial calculation, entitlement rule, or curriculum was changed during this review.
