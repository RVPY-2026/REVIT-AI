import type { Metadata } from "next"
import { Suspense } from "react"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, CalendarClock, MessageSquareText, Phone, UserRound } from "lucide-react"
import { CallNoteForm } from "@/components/admin/CallNoteForm"
import { ClipboardButton } from "@/components/admin/ClipboardButton"
import { StatusCell } from "@/components/admin/StatusCell"
import { StudentProfileForm, type ProfileFieldSpec } from "@/components/admin/StudentProfileForm"
import { StudentOnboardingPanel } from "@/components/admin/StudentOnboardingPanel"
import { StudentManagementActions } from "@/components/admin/StudentManagementActions"
import { NoteBodyEditor } from "@/components/admin/NoteBodyEditor"
import { RecordSentMessage } from "@/components/admin/RecordSentMessage"
import { StudentContactDialog } from "@/components/admin/StudentContactDialog"
import { ARCHIVE_REASON_LABELS, CONTACT_CHANNEL_LABELS, CONTACT_OUTCOME_LABELS, DROPPED_REASON_LABELS } from "@/lib/crm"
import { getStudentOnboarding } from "@/lib/api/student-onboarding"
import type { SessionUser } from "@/lib/auth/permissions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { getStudent, getStudentSources } from "@/lib/api/students"
import { getStudentMessages } from "@/lib/api/templates"
import { can } from "@/lib/auth/permissions"
import { STUDENT_STATUS_META, zaloChatUrl } from "@/lib/constants"
import { formatDate, formatDateTime } from "@/lib/format"
import { requirePermission } from "@/server/auth/session"
import { USE_MOCK } from "@/lib/runtime-mode"

export const metadata: Metadata = {
  title: "Hồ sơ học viên · Quản lý RVPY",
  robots: { index: false, follow: false },
}

export default function StudentProfilePage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<ProfileLoading />}>
      <StudentProfile params={params} />
    </Suspense>
  )
}

async function StudentProfile({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await requirePermission("students.view")
  const templatesAllowed = can(user, "templates.view")
  const [student, messages, sources] = await Promise.all([
    getStudent(id),
    templatesAllowed ? getStudentMessages(id) : Promise.resolve([]),
    can(user, "students.transfer") ? getStudentSources() : Promise.resolve([]),
  ])
  if (!student) notFound()
  const editable = can(user, "students.edit") && !student.archivedAt
  const suggested = messages.find((message) => message.forStatus === student.status) ?? messages.find((message) => message.forStatus === null)
  const extraMessages = messages.filter((message) => message.id !== suggested?.id)
  const text = (value: string | number | null) => String(value ?? "")
  const fields: ProfileFieldSpec[] = [
    { field: "fullName", label: "Họ và tên", value: student.fullName },
    { field: "phone", label: "Số điện thoại", value: student.phone },
    { field: "email", label: "Email liên hệ", value: text(student.email) },
    { field: "zaloName", label: "Tên Zalo", value: text(student.zaloName) },
    { field: "occupation", label: "Nghề nghiệp", value: text(student.occupation) },
    { field: "birthYear", label: "Năm sinh", value: text(student.birthYear) },
    { field: "specialty", label: "Chuyên môn", value: text(student.specialty) },
    { field: "hometown", label: "Quê quán", value: text(student.hometown) },
    { field: "organization", label: "Đơn vị", value: text(student.organization) },
    { field: "fullName", key: "code", label: "Mã học viên", value: student.code, readOnly: true, mono: true },
    { field: "fullName", key: "signedUpAt", label: "Ngày đăng ký", value: formatDate(student.signedUpAt), readOnly: true },
  ]
  const answers: ProfileFieldSpec[] = Object.entries(student.signupAnswers).map(([question, answer]) => (
    { field: "signupAnswer", answerKey: question, label: answerLabel(question), value: answer, multiline: true }
  ))

  return (
    <main className="content py-8 sm:py-10">
      <Link href="/quan-tri/hoc-vien" className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground">
        <ArrowLeft aria-hidden="true" size={18} strokeWidth={1.75} />Về danh sách học viên
      </Link>

      <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-heading text-[28px] font-light text-foreground">{student.fullName}</h1>
            <StatusCell studentId={id} fullName={student.fullName} status={student.status} droppedReason={student.droppedReason} droppedNote={student.droppedNote} editable={editable} />
          </div>
          <p className="mt-1 font-mono text-sm text-muted-foreground">{student.code}</p>
          <p className="mt-2 text-sm text-muted-foreground">Nguồn {student.sourceCode} · {student.sourceName} · đăng ký {formatDate(student.signedUpAt)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {editable && <StudentContactDialog student={student} />}
          {can(user, "students.archive") && <StudentManagementActions student={student} sources={sources} />}
          <Button asChild variant="outline" size="compact"><a href={`tel:${student.phone}`}><Phone aria-hidden="true" strokeWidth={1.75} />Gọi điện</a></Button>
          <Button asChild variant="outline" size="compact"><a href={zaloChatUrl(student.phone)} target="_blank" rel="noreferrer">Mở Zalo</a></Button>
        </div>
      </div>
      {student.archivedAt && <p role="status" className="mt-4 rounded-xl border border-warning p-3 text-sm text-warning">Đã lưu trữ · {student.archiveReason ? ARCHIVE_REASON_LABELS[student.archiveReason] : ""}. Bạn khôi phục hồ sơ trước khi sửa hoặc ghi chú.</p>}

      <div className="mt-7 grid gap-4 lg:grid-cols-[1.35fr_0.65fr]">
        <div className="grid min-w-0 gap-4">
          {!student.archivedAt && <Suspense fallback={<Skeleton className="h-64 rounded-2xl" />}>
            <StudentLearning studentId={id} contactEmail={student.email} user={user} />
          </Suspense>}
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><UserRound aria-hidden="true" size={18} strokeWidth={1.75} />Thông tin đăng ký</CardTitle></CardHeader>
            <CardContent>
              <StudentProfileForm studentId={id} fields={fields} answers={answers} editable={editable} preview={USE_MOCK} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><CalendarClock aria-hidden="true" size={18} strokeWidth={1.75} />Lịch sử trạng thái</CardTitle></CardHeader>
            <CardContent>
              {student.timeline.length ? (
                <ol className="grid gap-0">
                  {student.timeline.map((event, index) => (
                    <li key={event.id} className="relative grid grid-cols-[16px_1fr] gap-x-3 pb-5 last:pb-0">
                      <span className="relative flex justify-center"><span className="mt-1.5 size-2.5 rounded-full border border-primary bg-primary-soft" />{index < student.timeline.length - 1 && <span className="absolute top-4 bottom-0 w-px bg-border" />}</span>
                      <div>
                        <p className="text-sm font-medium">{event.kind === "archive" ? `Lưu trữ hồ sơ · ${ARCHIVE_REASON_LABELS[event.data?.reason as keyof typeof ARCHIVE_REASON_LABELS] ?? ""}` : event.kind === "restore" ? "Khôi phục hồ sơ" : event.kind === "source_transfer" ? `Chuyển nguồn · ${sources.find(source => source.id === event.data?.before)?.code ?? "Nguồn trước"} → ${sources.find(source => source.id === event.data?.after)?.code ?? student.sourceCode}` : <>{event.fromStatus ? `${STUDENT_STATUS_META[event.fromStatus].label} → ` : ""}{STUDENT_STATUS_META[event.toStatus].label}</>}</p>
                        {event.reason && <p className="mt-1 text-sm text-muted-foreground">{DROPPED_REASON_LABELS[event.reason]}</p>}
                        <p className="mt-0.5 text-xs tabular-nums text-muted-foreground">{formatDateTime(event.createdAt)}</p>
                        {event.note && <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{event.note}</p>}
                      </div>
                    </li>
                  ))}
                </ol>
              ) : <p className="text-sm text-muted-foreground">Chưa có thay đổi trạng thái.</p>}
            </CardContent>
          </Card>

          <Card id="ghi-chu" className="scroll-mt-24">
            <CardHeader><CardTitle className="flex items-center gap-2"><MessageSquareText aria-hidden="true" size={18} strokeWidth={1.75} />Ghi chú cuộc gọi</CardTitle></CardHeader>
            <CardContent className="grid gap-5">
              {student.notes.length ? (
                <ol className="grid gap-3">
                  {student.notes.map((note) => (
                    <li key={note.id} className="rounded-xl border border-border bg-background-2/60 p-3.5">
                      <p className="whitespace-pre-wrap text-sm leading-relaxed">{note.body}</p>
                      <p className="mt-2 text-xs text-muted-foreground">{note.authorName ?? "Nhân viên"} · {formatDateTime(note.createdAt)}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{CONTACT_CHANNEL_LABELS[note.channel ?? "call"]}{note.outcome && ` · ${CONTACT_OUTCOME_LABELS[note.outcome]}`}{note.editedAt && " · đã sửa"}{note.nextActionAt && ` · Hẹn ${formatDateTime(note.nextActionAt)}`}</p>
                      {editable && note.canEdit && <NoteBodyEditor studentId={id} noteId={note.id} body={note.body} />}
                    </li>
                  ))}
                </ol>
              ) : <p className="text-sm text-muted-foreground">Chưa có ghi chú. Thêm nội dung sau cuộc gọi để đội ngũ theo dõi tiếp.</p>}
              {editable && <div className="border-t border-border pt-4"><CallNoteForm studentId={student.id} preview={USE_MOCK} /></div>}
            </CardContent>
          </Card>
        </div>

        <aside className="grid content-start gap-4">
          <Card>
            <CardHeader><CardTitle>Tin nhắn tiếp theo</CardTitle></CardHeader>
            <CardContent className="grid gap-4">
              {suggested ? (
                <MessageCard studentId={id} editable={editable} title={suggested.title} body={suggested.body} suggested />
              ) : (
                <p className="text-sm text-muted-foreground">Chưa có mẫu tin phù hợp với trạng thái hiện tại.</p>
              )}
              {extraMessages.map((message) => <MessageCard key={message.id} studentId={id} editable={editable} title={message.title} body={message.body} />)}
              <p className="text-xs text-muted-foreground">Bạn tự gửi qua Zalo, rồi chọn “Đã gửi cho học viên” để ghi nhận. Sao chép không tạo ghi chú.</p>
            </CardContent>
          </Card>
          <Card size="sm">
            <CardHeader><CardTitle className="text-sm">Tóm tắt hồ sơ</CardTitle></CardHeader>
            <CardContent className="grid gap-3 text-sm">
              <InfoRow label="Trạng thái" value={STUDENT_STATUS_META[student.status].label} />
              <InfoRow label="Nguồn giới thiệu" value={`${student.sourceCode} · ${student.sourceName}`} />
              <InfoRow label="Ngày đăng ký" value={formatDate(student.signedUpAt)} />
            </CardContent>
          </Card>
        </aside>
      </div>
    </main>
  )
}

async function StudentLearning({ studentId, contactEmail, user }: { studentId: string; contactEmail: string | null; user: SessionUser }) {
  const data = await getStudentOnboarding(studentId)
  if (!data) return null
  return <StudentOnboardingPanel key={`${studentId}-${data.account?.email ?? ""}`} data={data} contactEmail={contactEmail}
    canOpenTrial={can(user, "enrollments.trial")} canActivate={can(user, "students.activate")} canEdit={can(user, "students.learning.edit")} preview={USE_MOCK} />
}

function InfoRow({ label, value, mono = false }: { label: string; value: string | null | undefined; mono?: boolean }) {
  return (
    <div className="grid min-w-0 grid-cols-[minmax(100px,0.7fr)_minmax(0,1fr)] gap-3 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={`break-words text-foreground ${mono ? "font-mono text-[13px]" : ""}`}>{value || "Chưa cập nhật"}</dd>
    </div>
  )
}

function answerLabel(key: string) {
  const labels: Record<string, string> = {
    heardAbout: "Bạn biết đến RVPY qua ai hay kênh nào?",
    heardAboutOther: "Thông tin nguồn đăng ký",
    learningGoal: "Mục tiêu học Revit",
    experience: "Kinh nghiệm với Revit",
  }
  return Object.hasOwn(labels, key) ? labels[key] : "Thông tin bổ sung"
}

function MessageCard({ studentId, editable, title, body, suggested = false }: { studentId: string; editable: boolean; title: string; body: string; suggested?: boolean }) {
  return (
    <div className={`grid gap-2 rounded-xl border p-3.5 ${suggested ? "border-primary/40 bg-primary-soft/40" : "border-border"}`}>
      <h3 className="text-sm font-medium">{title}{suggested && <span className="ml-2 text-xs font-normal text-primary">Gợi ý theo trạng thái</span>}</h3>
      <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{body}</p>
      <div className="flex flex-wrap gap-2"><ClipboardButton text={body} label="Sao chép tin nhắn" className="px-2" />{editable && <RecordSentMessage studentId={studentId} title={title} />}</div>
    </div>
  )
}

function ProfileLoading() {
  return <main className="content space-y-5 py-8" aria-label="Đang tải hồ sơ học viên"><Skeleton className="h-5 w-44" /><Skeleton className="h-12 w-80 max-w-full" /><div className="grid gap-4 lg:grid-cols-[1.35fr_0.65fr]"><div className="grid gap-4"><Skeleton className="h-64 rounded-2xl" /><Skeleton className="h-56 rounded-2xl" /><Skeleton className="h-64 rounded-2xl" /></div><div className="grid content-start gap-4"><Skeleton className="h-72 rounded-2xl" /><Skeleton className="h-40 rounded-2xl" /></div></div></main>
}
