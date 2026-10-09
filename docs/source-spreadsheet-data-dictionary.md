# Source spreadsheet data dictionary

Inspected on 2026-10-09 through authenticated Google Drive / Sheets reads and a read-only inspection of the original student-template XLSX. This document describes the legacy sources as observed; it does not approve new business rules or an import implementation.

Private source URLs, Drive file IDs, student identities, and raw records are excluded. Source labels below follow the order of the five files supplied in the conversation. Column letters are original spreadsheet coordinates, not the index column sometimes added by CSV/pandas extraction. Suggested field names are documentation aids, not existing database columns.

## 1. Source inventory and evidence

| Source | File title | Purpose | Verified access |
| --- | --- | --- | --- |
| F1 | THÔNG TIN HỌC VIÊN (Câu trả lời) - 260927 | Lead intake, sales follow-up, feedback, monthly conversion / commission calculations | Native Sheets metadata, every tab's headers, bounded full-grid values, selected original formulas |
| F2 | 261010 - R00RV000 - MẪU - RVPY Ocean Studio.xlsx | Template duplicated for an individual student's learning plan, availability, and identity | Original XLSX read with formulas and cached values; all three tabs inspected |
| F3 | RVPY - Thong Tin Khoa hoc - 261009 | Administrative student register, tuition, payment flags, learning activity, tool access | Native Sheets metadata, full-grid values, selected formulas and validations |
| F4 | TÀI KHOẢN TRUY CẬP ADDIN RVPY | Derived list of add-in accounts and emails | Native Sheets metadata, full-grid values, original projection formula |
| F5 | RVPY Ocean Studio - 3 Bai Trai Nghiem 9 Ngay - Update 260921.xlsx | Trial-learning workbook, based on its verified title and F2's link label | Metadata only; downloading is forbidden (403). Its tabs, columns, and detailed content are unverified |

F1 is a native Google Sheet even though one text-fetch response described an XLSX representation. F2 and F5 are Office workbooks displayed in Google's spreadsheet interface; native Sheets API reads do not apply to them. F3 and F4 cannot be exported through the available fetch path, but direct native cell reads work.

Grid dimensions below include empty or formatted rows. They are not student counts. Counts describe the inspected snapshot and can change.

## 2. F1 — lead-response workbook

### 2.1 Tab inventory

| Exact tab name | Allocated grid | Structure / inspected population |
| --- | --- | --- |
| ĐĂNG KÝ KHOÁ REVIT | 527 rows × 30 columns (A:AD) | Header row 1; candidate records from row 2; headers occupy A:X; 427 nonblank timestamps, with additional formula-only rows |
| HỌC VIÊN CHƯA ĐIỀN FORM | 65 × 10 (A:J) | Header row 1; A:D defined; no populated records in the inspected snapshot |
| KHẢO SÁT ĐÁNH GIÁ | 107 × 14 (A:N) | Header row 1; A:H defined; 6 returned response rows |
| GỢI Ý VÀ ĐÁNH GIÁ ADDIN RVPY | 102 × 11 (A:K) | Header row 1; A:E defined; 1 returned response row |
| CHIA % | 886 × 30 (A:AD) | Report with header, parameter cells, helper totals, and monthly rows; not a student table |

The first four tabs freeze row 1. Workbook locale is vi_VN; its time zone is Etc/GMT-7 (UTC+7).

### 2.2 ĐĂNG KÝ KHOÁ REVIT — column dictionary

Long form-question headers below retain their distinguishing text but omit parenthetical examples. The original headers contain line breaks.

| Col | Actual header | Suggested field | Observed type / interpretation |
| --- | --- | --- | --- |
| A | Dấu thời gian | submittedAt | Form submission timestamp; native date/time serial, formatted as a date/time |
| B | Column 22 | registeredFlag | Computed numeric 0/1; 1 exactly when C equals ĐÃ ĐĂNG KÝ |
| C | Column 18 | legacySalesStatus | Text status; observed ĐÃ ĐĂNG KÝ, CHỜ CHỐT SALE, BỎ QUA |
| D | A | legacyContactLabel | Uppercase composite label generated from identity, date, source, sequence, month, and fee suggestion |
| E | Column 24 | submissionDayMonthToken | Formula LEFT(A,4); appears to extract a DDMM token from the formatted timestamp. Preserve observed text; do not treat it as a full date |
| F | NHÓM | legacySourceCode | Source/group text; observed R and A. Distinct from the free-text discovery channel in P |
| G | MÃ SỐ | legacySequence | Text sequence with leading zeros, such as fictional 007 |
| H | NGÀY THÁNG | legacyMonthCode | Text token appearing to use YYMM; unlike E, this is a month/cohort token |
| I | Chuyên ngành | specialty | Free text; spelling, abbreviations, and capitalization vary |
| J | Họ và tên | fullName | Personal name text |
| K | Năm sinh | birthYear | Numeric birth year; not a full birth date |
| L | Quê quán (Tỉnh/ Thành phố) | hometown | Free-text location; nullable |
| M | Gmail để nhận giáo trình, bài thu hoạch và clip mỗi buổi học | email | Email text; nullable, inconsistent casing |
| N | Số điện thoại Zalo | zaloPhone | Phone text; preserve leading zero |
| O | LINK KHOÁ HỌC | personalTrackingUrl | Per-student spreadsheet URL where populated; 27 nonblank values in the inspected snapshot |
| P | Bạn biết đến RVPY qua ai hay kênh nào ? | discoveryChannel | Free-text referral / marketing channel; may name a person, Facebook, advertising, or self-discovery |
| Q | Mong muốn của bạn cần RVPY Ocean Studio training những nội dung nào cho công việc và học tập? | learningGoals | Free-text desired training content |
| R | Nghề nghiệp | occupation | Free text, not an enum enforced by this sheet |
| S | ĐỀ XUẤT | legacyFeeSuggestionCode | Computed numeric 45 or 54 from birth year; exact money unit / policy requires confirmation |
| T | Đơn vị công tác, học tập | organization | Employer, school, or other organization text |
| U | TELESALE | salesFollowUp | Staff follow-up content; 116 nonblank values; do not assume numeric or a completed-call boolean |
| V | NOTE | staffNotes | Free-text notes; 44 nonblank values |
| W | Link Facebook | facebookReference | Form answer text; not guaranteed to be a valid URL |
| X | Bạn giúp xác nhận đã kết bạn Zalo với RVPY Ocean Studio qua mã QR trên (...) | zaloFriendConfirmation | Self-reported confirmation text; not verified through Zalo API |
| Y:AD | No headers | reservedUnknown | No populated values returned in the full inspected range; no defined semantics |

### 2.3 Verified registration formulas

Representative original formulas from row 2:

```text
B2 = IF(C2="ĐÃ ĐĂNG KÝ";1;0)
D2 = UPPER(CONCATENATE(E2;F2;H2;G2;"RV";K2;"-";J2;"-";I2;"-";L2;"-";S2))
E2 = LEFT(A2;4)
S2 = IF(K2<1990;54;45)
```

The composite label is structured as:

```text
<dayMonth><source><monthCode><sequence>RV<birthYear>-<name>-<specialty>-<hometown>-<suggestion>
```

Fictional structural example: `0910A2610007RV1995-DEMO STUDENT-KTS-DEMO CITY-45`. The owner has adopted `<source><YYMM><three-digit sequence>` for canonical codes, such as `A2610007`. The long contact label is generated when needed; preserve original imported values in legacy metadata. The formula's 45/54 rule is verified; its business rationale and conversion into VND are not.

There are 526 returned rows below the header, but only 427 nonblank timestamps and names. B, D, and S remain populated by formulas in unused rows. A generated label or fee suggestion alone does not establish a real lead. Some unused rows also contain stray specialty text. Use genuine identity/submission evidence and quarantine incomplete rows.

### 2.4 HỌC VIÊN CHƯA ĐIỀN FORM

| Col | Header | Meaning / type |
| --- | --- | --- |
| A | Họ và tên | Prospect name, text |
| B | Số điện thoại Zalo | Prospect phone, text |
| C | TELESALE | Sales follow-up content, unverified beyond header |
| D | Mong muốn của bạn cần RVPY Ocean Studio training những nội dung nào cho công việc và học tập? | Training goals, text |
| E:J | No headers | No populated records returned |

This tab can represent prospects without a full form response. It has no verified stable ID or email column. No current rows were returned, so there is no evidence of actual cell types or historical behavior beyond the headers.

### 2.5 KHẢO SÁT ĐÁNH GIÁ

Each data row is a course-feedback submission, not a new student.

| Col | Header | Meaning / type |
| --- | --- | --- |
| A | Dấu thời gian | Submission timestamp |
| B | ĐÁNH GIÁ CHO GIAI ĐOẠN | Phase / advanced-topic selection, nullable; blank in all 6 inspected responses |
| C | Họ và tên | Respondent name, nullable; can be anonymous; not a safe foreign key |
| D | TỐC ĐỘ DẠY | Teaching-speed text; observed Vừa phải and Kỹ quá |
| E | NỘI DUNG GIÁO TRÌNH | Numeric score, header specifies 1–10 |
| F | CHẤT LƯỢNG GIẢNG DẠY CỦA GIẢNG VIÊN | Numeric score, header specifies 1–10 |
| G | CHẤT LƯỢNG HỔ TRỢ CỦA TRỢ GIẢNG | Numeric score, header specifies 1–10; currently blank |
| H | Đánh giá tổng thể và ý kiến riêng nếu có | Free-text feedback, nullable |
| I:N | No headers | No populated values returned |

The 6 responses contain 5 populated names and 5 populated comments. Do not invent a student association from a name match alone.

### 2.6 GỢI Ý VÀ ĐÁNH GIÁ ADDIN RVPY

Each row is an add-in-feedback submission. There is no verified respondent ID, email, or student-code column.

| Col | Header | Meaning / type |
| --- | --- | --- |
| A | Dấu thời gian | Submission timestamp |
| B | ĐÁNH GIÁ ADDIN | Existing add-in feedback versus new suggestion; inspected value Addin Cũ |
| C | BỘ MÔN CỦA ADDIN | Discipline; inspected value Kiến Trúc |
| D | CHẤT LƯỢNG ADDIN | Numeric score; header specifies 1–10 |
| E | Đánh giá hoặc ý kiến góp ý cho Addin mới | Free-text feedback |
| F:K | No headers | No populated values returned |

### 2.7 CHIA % — monthly calculation report

This tab has multiple regions. Do not parse it as one ordinary table with a single header row.

| Range / column | Observed role |
| --- | --- |
| A1:G1 | Main headings: THÁNG, TÌM HIỂU, ĐĂNG KÝ, DỰ KIẾN, TỶ LỆ, CHIA %, HỌC PHÍ |
| A2:A8 | Spill from UNIQUE of registration H; inspected month tokens 2501 and 2605–2610 |
| B2:B8 | Count of registration rows with the corresponding H month token |
| C2:C8 | Sum of registration B flags by month; reflects legacy ĐÃ ĐĂNG KÝ status, not a payment ledger |
| D3:D8 | Forecast count: monthly lead count × maximum conversion ratio in E3:E |
| E2:E8 | C/B conversion ratio |
| F3:F8 | Calculated commission/share fraction using helper cells and monthly performance |
| G2:I2 | Fee assumptions: 3,600,000; 4,500,000; 5,400,000 VND |
| G3:I8 | Each fee assumption × monthly share fraction F |
| J2 | Dự kiến heading |
| J3:J8 | C × H2, an estimated total based on the 4,500,000 fee assumption; not confirmed collected revenue |
| K1:L1 | Numeric parameters; both 35 in the snapshot |
| K2:L2 | Labels Min % and Max % |
| N1:O1 | MAX of B3:B and C3:C; N2/O2 both labeled Max |
| Q1:R1 | SUM of B3:B and C3:C; Q2/R2 labeled Liên hệ / Đăng ký |
| S1 | R1/Q1 total conversion; S2 labeled Tỷ Lệ |
| H1:J1, M, P, T:AD | Unlabeled / separator cells in the inspected top report region |

Representative formulas:

```text
A2 = UNIQUE('ĐĂNG KÝ KHOÁ REVIT'!H2:H)
B3 = COUNTIF('ĐĂNG KÝ KHOÁ REVIT'!$H$2:H;A3)
C3 = SUMIF('ĐĂNG KÝ KHOÁ REVIT'!$H$2:H;A3;'ĐĂNG KÝ KHOÁ REVIT'!B3:B)
D3 = B3*MAX($E$3:$E)
E3 = C3/B3
F3 = IF((INT(C3/$O$1*($L$1-10))+INT(B3/$N$1*10))<25;$K$1;
        (INT(C3/$O$1*($L$1-10))+INT(B3/$N$1*10)))/100
G3 = $G$2*F3
H3 = $H$2*F3
I3 = $I$2*F3
J3 = C3*$H$2
```

Review before migration: C's criteria range starts at H2 while its sum range advances B3, B4, etc. across the inspected rows. This is an apparent range-alignment issue; do not adopt these report outputs as audited financial truth. The share formula tests a threshold of 25 but returns K1, currently 35, when below it. That behavior is verified, but an intended minimum of 25 must not be inferred. Zero denominators are not guarded in the inspected formulas.

## 3. F2 — individual student-template workbook

This is a form-like workbook for one person, not a master list. Large formatted areas, merged cells, formulas, lesson rows, and instructional text coexist. Read cell coordinates rather than a generic first-row table parser.

### 3.1 Exact tabs and relevant regions

| Tab | XLSX dimensions | Meaningful content |
| --- | --- | --- |
| 01. TIẾP CẬN LỘ TRÌNH HỌC | 999 × 29 (A:AC) | Content through row 53; identity / links, foundation learning plan, advanced-topic plan, side instructions |
| 02. THỜI GIAN BIỂU | 1005 × 26 (A:Z) | Identity cells and weekly grid through row 16 |
| 03. THÔNG TIN HỌC VIÊN | 1003 × 12 (A:L) | Title B2; header B4:K4; one person's input row B5:K5 |

The inspected XLSX has no ordinary openpyxl data-validation records. Boolean cells exist; that does not prove the presence or semantics of a Google checkbox UI in all copies.

### 3.2 03. THÔNG TIN HỌC VIÊN — identity inputs

| Input cell | Header at row 4 | Suggested field / interpretation |
| --- | --- | --- |
| B5 | CODE | legacyPrefixToken; its exact meaning is unverified |
| C5 | NHÓM LỚP | legacySourceOrClassToken; distinguish from course cohort |
| D5 | MÃ SỐ | legacySequence; preserve as text |
| E5 | KHOÁ | legacyCohortToken; code text |
| F5 | CHUYÊN NGÀNH | specialty |
| G5 | HỌ VÀ TÊN | fullName; template contains an instruction placeholder |
| H5 | NĂM SINH | birthYear |
| I5 | QUÊ QUÁN | hometown |
| J5 | EMAIL | email; template contains a dash |
| K5 | SDT | phone |
| L5 | No header | Dash placeholder; meaning unverified |

A is a margin. Other rows are not additional verified student records. Do not import the template instruction text or dash as an actual student/email.

### 3.3 01. TIẾP CẬN LỘ TRÌNH HỌC — fixed cells

| Cell / region | Role |
| --- | --- |
| C6 | Course title |
| C7 | TODAY() display date; not a historical edit timestamp |
| C8 | Email formula linked to identity J5 |
| C9 | Uppercase label constructed from identity B5,C5,D5,E5, RV, H5, and G5 |
| C11:C15 | Links to main course content, trial workbook, Revit library, course-feedback form, add-in-feedback form |
| F16 | Learning start date |
| G16 | C7-F16: elapsed days as of TODAY() |
| F17 | Progress / duration multiplier; snapshot value 1 |
| G17 | G40-F16: planned total span in days; snapshot cached value 50 |
| H16:H17 | Instructional labels, including DONE; do not treat these fixed headings as a student's completion event |
| J1:R11 | Merged preparation instructions; anchored J1 |
| J17:R17 | Personal-plan introduction, anchored J17 |
| J18:R36 | Merged personal-plan free-text area, anchored J18 |
| J37:R37 | Project-assignment heading |
| J38:R53 | Project requirements and guidance, anchored J38 |

Identity formula:

```text
C9 = UPPER(CONCATENATE(identity!B5,identity!C5,identity!D5,identity!E5,
                      "RV",identity!H5," - ",identity!G5))
```

Here `identity` is a documentation alias for the exact tab `03. THÔNG TIN HỌC VIÊN`, not an actual worksheet name. Unlike F1's contact label, this formula concatenates sequence before cohort and omits specialty/hometown. Do not expect labels to match byte for byte across files.

### 3.4 Foundation plan — header row 18, data rows 19:40

22 topic rows cover lesson numbers 1–25 because some rows combine two lessons.

| Col | Header / visible context | Meaning / type |
| --- | --- | --- |
| A | Within merged NỀN TẢNG l 1 KÈM 1 heading | Boolean flag; interpretation not explicitly named. Context H16 suggests instructor priority selection; do not assume lesson completion |
| B | Within the same merged heading | Lesson number / grouping, mixed numeric and text such as 4 và 5 |
| C | NỘI DUNG BUỔI HỌC | Topic title |
| D | HOÀN THÀNH BÀI TẬP | Free-text progress / exercise-completion entry, with prompts in template |
| E | No distinct header | Base duration number; inferred unit days from date-addition formulas |
| F | THỜI GIAN TỐI THIỂU | E × absolute F17 multiplier, numeric duration |
| G | HỌC VIÊN CAM KẾT | Planned target date, calculated cumulatively |
| H | BÀI THU HOẠCH | Milestone / deliverable description; static template labels such as ĐÃ ĐẠT ... are not verified completed events |
| I | - | Auxiliary placeholder, semantics unverified |
| J:R | Merged side panels | Instructions / personal plan / project requirements, not per-topic columns |
| S:AC | No populated cells in inspected template | Formatting / unused region |

Verified recurrence:

```text
F19 = E19*$F$17
G19 = F16+F19
F20 = E20*$F$17
G20 = G19+F20
... through G40
```

| Row | Lesson label | Topic | Base duration E |
| --- | --- | --- | --- |
| 19 | 1 | Bluebeam Revu PDF | 1 |
| 20 | 2 | CAD trong REVIT | 1 |
| 21 | 3 | Dựng hình Model Project | 2 |
| 22 | 4 và 5 | Family Revit | 5 |
| 23 | 6 | Material và Render Enscape | 2 |
| 24 | 7 và 8 | Massing Revit | 4 |
| 25 | 9 | Chuyên đề Nhôm Kính | 2 |
| 26 | 10 | Chuyên đề Beam System | 2 |
| 27 | 11 | Chuyên đề Stair | 2 |
| 28 | 12 | Series Hồ Sơ | 3 |
| 29 | 13 | View Template | 3 |
| 30 | 14 | Schedule | 3 |
| 31 | 15 | 3D Section và Xung đột | 2 |
| 32 | 16 | Chuyên đề nâng cao: Cài đặt ban đầu | 2 |
| 33 | 17 | Chuyên đề nâng cao: Khởi tạo dự án | 2 |
| 34 | 18 | Chuyên đề nâng cao: Dựng hình Project | 2 |
| 35 | 19 | Chuyên đề nâng cao: Dựng hình Family | 2 |
| 36 | 20 | Chuyên đề làm việc nhóm và phối hợp các bộ môn | 2 |
| 37 | 21 | Chuyên đề quản lý dự án | 2 |
| 38 | 22 | Chuyên đề quản lý thể hiện hồ sơ | 2 |
| 39 | 23 | Chi tiết các lệnh Revit và xây dựng template cá nhân | 2 |
| 40 | 24 và 25 | Tổng kết | 2 |

These durations are planning inputs, not hours of teaching or proof of completion. The side-panel project requirements specify a project used throughout the official course, with guidance on building type, size, available drawings, and practical BIM work.

### 3.5 Advanced-topic plan — header row 41, rows 42:53

| Col | Meaning |
| --- | --- |
| A:B | Stage heading at row 41; B42/B43 contain teaching-state labels ĐÃ DẠY / ĐANG DẠY |
| C | Advanced-topic title / plan text |
| D | Fixed schedule note at D41: 5H SÁNG THỨ 7 HÀNG TUẦN |
| E | No populated values in this region |
| F | THỜI GIAN TOÀN CHUYÊN ĐỀ; current data mostly Dự kiến, despite the duration-style heading |
| G | BẮT ĐẦU; mixed real dates and Coming soon... text |
| H | GHI CHÚ; free-text practice notes |
| I | Auxiliary dash heading |

Topics include advanced structure, MEP, combined three-discipline practice, Revit AI / plugin creation, high-rise work, Dynamo, API, fire-protection documentation, interior fabrication with SketchUp, and D5. Row 42 points back to previously taught topics in the main course resource; row 53 is an ellipsis placeholder. Do not interpret all these rows as scheduled lessons with real dates.

### 3.6 02. THỜI GIAN BIỂU — weekly availability grid

| Cell / range | Meaning |
| --- | --- |
| B1 | Course / schedule title |
| B2 | TODAY(); display date |
| B3 | Email linked through the learning-plan C8 cell |
| B4 | Student label linked through learning-plan C9 |
| A6 | TIME heading |
| B6:H6 | Monday through Sunday headers, THỨ 2 ... CHỦ NHẬT |
| A7:A16 | Ten time-slot labels |
| B7:H16 | 7-day × 10-slot availability matrix; blank in this template |
| I | Spacer |
| J6 | THỜI GIAN HỌC legend |
| K6 | Boolean TRUE legend/example; not an actual booking |

The ten printed slots are 4–6 AM, 6–8 AM, 8–10 AM, 10–12 PM, 1–3 PM, 3–5 PM, 5–7 PM, 7–9 PM, 9–11 PM, and 11–1 AM. The final slot crosses midnight. The template supplies no actual selected availability. Interpret boolean/formatting conventions in a populated copy before importing bookings.

## 4. F3 — administrative course/student register

Exact tab: `LỚP HỌC REVIT`. Allocated grid: 1191 × 37 (A:AK). Rows 1:11 are frozen. Workbook time zone is America/Los_Angeles, unlike F1 and F4; do not assume all source date serials share one time zone.

### 4.1 Layout and record boundaries

- Rows 1:8: administrative reference links (download, registration, feedback, forms, earlier course resource). These are not students.
- Row 9: spacer.
- Row 10: main headings.
- Row 11: secondary markers under D, G, H, R, W; observed 3 Z-A, 2 Z-A, 1 Z-A, 1 Z-A, 4 Z-A. Their operational meaning is unverified.
- Row 12: RVPY template/example row, not an ordinary student.
- Row 13 onward: a mixture of students, blank separators, notes, and prepared formula/default rows. Full-grid values returned through row 235. 168 cells in K are populated, including the template; this is not a verified student count.
- Y has 3 populated unlabeled cells. Z:AK returned no values. Preserve unknowns for review rather than silently interpreting them.

### 4.2 Column dictionary

| Col | Header row 10 | Suggested field | Observed meaning / caveat |
| --- | --- | --- | --- |
| A | GIỚI THIỆU | referralReference | Mixed text; referral/introduction reference. No verified ID relationship |
| B | TOOL | legacyToolAccessStatus | Observed OK or blank; source for F4's access list |
| C | CODE | legacyShortCode | Usually LEFT(E,6), not a dedicated globally unique student identifier |
| D | LỚP CHUYÊN SÂU | advancedClassStatus | Observed DONE, NO, blank; exact membership semantics need confirmation |
| E | TÊN ZALO | legacyZaloLabel | Generated uppercase contact label, not a simple personal name |
| F | No header | legacyDayMonthPrefix | Mostly blank; some DDMM-like numeric text and other text. Formula places it first in E; precise meaning unverified |
| G | No header; row 11 has 2 Z-A | legacySourceCode | Observed R / A; inferred from contact formula and correspondence with F1 |
| H | No header; row 11 has 1 Z-A | legacySequence | Leading-zero sequence text |
| I | No header | legacyMonthCode | YYMM-like month/cohort text |
| J | No header | specialty | Discipline / professional abbreviation inferred from values and label formula |
| K | HỌC VIÊN | fullName | Student personal name; strongest name field here |
| L | No header | birthYear | Numeric years, inferred from values and contact-label formula |
| M | No header | hometown | Province/city text, inferred from values and label formula |
| N | MAIL | email | Student email, nullable |
| O | SDT | phone | Phone text, nullable |
| P | ƯU TIÊN | legacyPriority | Mixed numbers, spreadsheet URLs, dash, and #REF!; not consistently a numeric priority |
| Q | SỐ LẦN NHẮC NHỞ | legacyReminderEntry | Header suggests a count, but populated values include free-text notes; do not coerce blindly |
| R | NỘP BÀI | legacySubmissionMetric | Numeric values including 0–25 in snapshot; whether count or latest lesson number is unverified |
| S | ĐÃ BUỔI 1 KÈM 1 | legacyOneToOneMetric | Numeric values, dash, #REF!; not consistently a boolean |
| T | ĐẠI LÝ | legacyAgentTier | Validated dropdown; exact values listed below |
| U | LINK THEO DÕI | personalTrackingUrl | Individual learning-plan spreadsheet URL, where populated |
| V | HỌC PHÍ | legacyTuitionVnd | Numeric money displayed with đ; values include zero and multiple fee levels. Not proof of actual payment |
| W | ĐÓNG HỌC PHÍ | legacyPaymentStatus | Text flags; meanings listed below remain unverified |
| X | CHÍNH SÁCH | policyNotes | Mixed notes, percentages, monetary text, packages, discounts, refunds, free-study arrangements |
| Y | No header | unlabeledExtra | 3 nonblank text cells; semantics unverified |
| Z:AK | No headers | reservedUnknown | No populated values returned |

### 4.3 Verified formulas and validation

```text
C13 = LEFT(E13;6)
E13 = UPPER(CONCATENATE(F13;G13;I13;H13;"RV";L13;"-";K13;"-";J13;"-";M13))
P16 = VLOOKUP(S16;'BỘ LỌC'!$B$2:$C$26;2;0)
S16 = VLOOKUP(R16;'BỘ LỌC'!$A$2:$C$26;2;0)
```

Both P16 and S16 return `#REF!`: original cell errors explicitly report unresolved sheet name `BỘ LỌC`. Metadata exposes only `LỚP HỌC REVIT`; the referenced lookup tab is absent. Do not replace these errors with zero or infer the missing lookup mapping.

The label order is `<F><G><I><H>RV<L>-<K>-<J>-<M>`. It matches F1's broad pattern except for the missing final fee-suggestion suffix and often missing F prefix. Because C takes only six characters of this label, its content depends on how much prefix is present. Uniqueness has not been verified.

T dropdown values, checked on the sampled student/template rows:

```text
1. HỌC VIÊN
2. TIỀM NĂNG
3. ĐẠI LÝ CẤP 3 (1->2)
4. ĐẠI LÝ CẤP 2 (3->5)
5. ĐẠI LÝ CẤP 1 (6->10)
```

This is a student/referral-agent classification. It is not evidence of an application authorization role such as admin or sale.

Observed W payment flags:

```text
NOT
NO NOT 3
NO NOT 1
NO NOT 2
DONE - B
DONE - A
DONE
```

Preserve these exact flags and request a business mapping before converting them to paid/unpaid or payment events. V shows tuition-like amounts, while X mixes financial and nonfinancial conditions; none of these columns forms a complete transaction ledger with transaction date, amount received, and reference.

## 5. F4 — derived add-in access list

Exact tab: `Data`. Grid: 1000 × 26 (A:Z). Locale vi_VN; time zone Asia/Bangkok. Header row 1; projection formula anchored B2. Values returned through row 165.

| Col | Header row 1 | Actual source / meaning |
| --- | --- | --- |
| A | Blank | Empty margin |
| B | TÌNH TRẠNG | F3 B / TOOL; observed OK on the account-like rows |
| C | CODE | F3 C / calculated short code |
| D | TÊN HỌC VIÊN | F3 E / TÊN ZALO contact label, despite the destination header suggesting a personal name |
| E | EMAIL | F3 N / MAIL |
| F:Z | No headers | No populated values returned |

Original formula shape, with the private source URL replaced by a documentation placeholder:

```text
B2 = QUERY(
       IMPORTRANGE("<F3 private source URL>"; "'LỚP HỌC REVIT'!A:n");
       "SELECT Col2, Col3, Col5, Col14 WHERE Col2 IS NOT NULL"
     )
```

The source columns are B, C, E, N. The predicate tests only nonblank B; it does not explicitly require OK, a valid email, paid tuition, an expiry date, or a product selection. The formula does not specify the optional QUERY header-count argument.

Important observed artifact: B2:E2 is a header-like output row, not a student. B2 contains TOOL, C2 CODE, and D2/E2 contain concatenated source introductory/template content. The remaining 163 rows are account-like projection rows with B=OK, not a verified count of unique licensed people or valid emails. An importer must reject the header-like row and independently validate record identity and email.

No product, start date, expiry date, device, renewal, or revocation-history columns were observed. A subscription/licensing model needs additional business input; it cannot be reconstructed fully from this list.

## 6. F5 — trial workbook: access boundary

Verified MIME type: Office XLSX. Metadata reports approximately 18.7 MB. Original download and text fetch return 403; native Sheets metadata reports that the document is an Office file. No tab names, headers, row layout, embedded content, formulas, or validations were inspected.

The file title and F2's reference identify it as the three-lesson, nine-day trial resource. Do not infer its detailed lessons, column structure, or tab count from the title or another document. This dictionary can be completed after the owner supplies a readable export or access.

## 7. Cross-file relationships and source authority

| Relationship | Evidence | Import implications |
| --- | --- | --- |
| F1 registrations → F2 personal workbook copies | F1 O holds individual tracking links; F2 provides the one-person template | A URL can identify a separate workbook, not necessarily a student globally; preserve lineage |
| F3 register → F2 personal workbook copies | F3 U is LINK THEO DÕI | Match verified workbook references where available; many rows lack them |
| F3 → F4 add-in account list | Original IMPORTRANGE/QUERY formula | F4 is a projection, not an independent master source; avoid duplicate student imports |
| F2 identity tab → F2 plan → F2 weekly grid | Original cross-tab formulas | Read identity once; other tabs repeat calculated labels/email |
| F1 registrations → F1 CHIA % | COUNTIF/SUMIF/UNIQUE formulas | Report is derived; do not import its totals as student or payment transactions |
| F2 → F5 trial content | Labeled link in C12 | Resource reference only; F5 schema remains unknown |
| F1/F2/F3 identity fields | Matching concepts: source, sequence, cohort, name, birth year, specialty, email, phone | Semantic correspondence is supported; one-to-one record matches are not yet verified |

F1 is the intake source, F3 the administrative register, F2 the individualized learning-plan source, F4 a derived access projection, and F5 a shared trial resource. Where the same person's fields disagree, this inspection does not establish which timestamp/source should win.

### 7.1 Proposed matching strategy, not a verified join

1. Retain a legacy source key containing workbook, tab, and original row/cell coordinates in a private import manifest.
2. Use lowercase trimmed email as a candidate match, not an automatic unique-person guarantee.
3. Use normalized phone and the composite source + cohort/month + sequence as supporting evidence.
4. Preserve leading zeros in sequence and phones. Sequence alone is insufficient; month/source dimensions appear in the legacy labels.
5. Use tracking-workbook identity/reference as additional evidence where available.
6. Quarantine conflicts and duplicate candidates. Do not merge people by name, six-character CODE, or uppercase contact label alone.
7. New application UUIDs / short student codes should remain separate from legacy labels and components.

### 7.2 Suggested normalized domains

These are modeling suggestions, not assertions that the current repository already supports every field:

| Domain | Candidate source |
| --- | --- |
| Lead / student identity and signup answers | F1 registration columns A, F:N, P:T, W:X; F3 identity fields |
| Legacy sales status and staff notes | F1 C, U, V |
| Individual course plan and topic targets | F2 foundation/advanced regions and F3 U |
| Weekly availability | F2 schedule matrix after populated-copy semantics are confirmed |
| Course feedback | F1 KHẢO SÁT ĐÁNH GIÁ |
| Add-in feedback | F1 GỢI Ý VÀ ĐÁNH GIÁ ADDIN RVPY |
| Legacy fee, payment flag, and policy notes | F3 V: X, preserving raw meanings |
| Tool-access legacy state | F3 B; F4 as a consistency check |
| Referral/agent classification | F3 A/T/X, after rules and relationships are confirmed |
| Monthly derived report | F1 CHIA %, recalculated from validated source facts |

## 8. Instructions for an agent using this dictionary

- Treat all source files as read-only unless the human explicitly requests edits.
- Read AGENTS.md and BACKEND_RULES.md before implementing an import or database change. The v1 workflow is a one-off export import, not live two-way sync.
- Import table sections and form-like workbooks with separate parsers. Use original column letters and exact tab names, not generated CSV index columns or Unnamed headers.
- Separate input cells, formulas, cached results, fixed instructions, and derived projections. TODAY() is not an audit timestamp. Static template DONE / ĐÃ ĐẠT labels are not completion history.
- Exclude introductory rows, repeated headers, template/example people, separator rows, dash placeholders, and formula-only prepared rows.
- Preserve legacy values and errors for review. Never silently turn #REF!, an unknown flag, or a blank into zero, paid, enrolled, or completed.
- Normalize Unicode/whitespace carefully, lowercase email, preserve phone/sequence zeros, and keep original raw values privately for reconciliation.
- Parse numeric money from native effective values where available, not only formatted strings. Do not parse mixed policy notes into payments without a reviewed mapping.
- Account for workbook time-zone differences. Store business dates in the application's configured Vietnamese business time zone after resolving what the original timestamp represents.
- Keep real records, raw exports, source links, and private manifests outside committed repository files. This document intentionally contains only structure and nonpersonal reference values.
- New queries/actions must honor the repository's authorization and studentScope requirements. Legacy source codes or referral-agent tiers never grant application roles.
- Tests of an importer should use synthetic fixtures representing formula-only rows, missing email, duplicate candidates, #REF!, leading-zero IDs, mixed payment flags, and the F4 header-contamination row.

## 9. Business questions that remain open

1. What do registration ĐÃ ĐĂNG KÝ and each F3 payment flag mean operationally? Are registration, tuition quotation, deposit, full payment, and enrollment distinct events?
2. Code/reset is resolved: source + YYMM + three-digit sequence, counter per source/month. Still review conflicting person matches before import; code components alone do not approve a merge.
3. Confirm the observed fee suggestion: before 1990 → 5,400,000 VND, otherwise 4,500,000 VND. Suggested fee and agreed fee remain distinct.
4. What are F3's unlabeled F and Y fields, the Z-A row-11 markers, and the mixed P/Q values intended to mean?
5. Does R count submitted exercises or name a latest lesson? What does S count? What was the missing BỘ LỌC mapping?
6. Are F2 column A flags instructor priorities, completion flags, or another state? Which inputs signify actual completion and project approval?
7. Which source wins for conflicting identity, email, phone, cohort, tuition, or status values?
8. Does TOOL=OK authorize every add-in? What are the expiry, trial, renewal, product, and revocation rules?
9. Priority: confirm CHIA % commission rules, including SUMIF alignment, minimum-share behavior, amount basis, settlement period and sale visibility.
10. Can the owner provide a readable F5 export so its exact structure can be documented?

Until resolved, preserve these fields as legacy data instead of encoding assumptions as production business rules.
