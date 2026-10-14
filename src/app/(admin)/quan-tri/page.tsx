import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ArrowDownRight, ArrowRight, ArrowUpRight, CheckCircle2, MessageCircle, Minus, Phone } from "lucide-react";
import { getStudentOverview } from "@/lib/api/students";
import { requirePermission } from "@/server/auth/session";
import { STUDENT_STATUSES, STUDENT_STATUS_META, zaloChatUrl, type StudentStatus } from "@/lib/constants";
import { followUpState } from "@/lib/follow-up";
import { formatDate } from "@/lib/format";
import type { StudentOverview, StudentSummary } from "@/lib/schemas/student";
import { FollowUpBadge } from "@/components/admin/FollowUpBadge";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = { title: "Quản lý RVPY", robots: { index: false, follow: false } };

const STATUS_BAR: Record<StudentStatus, string> = {
  new: "bg-info", consulting: "bg-warning", trial: "bg-warning/60", enrolled: "bg-success", dropped: "bg-muted-foreground/40",
};

const today = new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" });

export default function ManagementPage() {
  return <Suspense fallback={<OverviewLoading />}><ManagementOverview /></Suspense>;
}

async function ManagementOverview() {
  const user = await requirePermission("students.view");
  const overview = await getStudentOverview();
  const todo = overview.uncontacted.count + overview.overdue.count;

  return (
    <main className="content grid gap-6 py-8 sm:py-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs text-muted-foreground">TỔNG QUAN · {today.format(new Date()).toUpperCase()}</p>
          <h1 className="mt-2 font-heading text-[28px] font-light">Việc cần làm hôm nay</h1>
          <p className="mt-1 text-sm text-muted-foreground">{user.name} · {todo > 0 ? `${todo} học viên đang chờ bạn liên hệ` : "không còn học viên nào chờ liên hệ"}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm"><Link href="/quan-tri/mau-tin-nhan">Mẫu tin nhắn</Link></Button>
          <Button asChild size="sm"><Link href="/quan-tri/hoc-vien">Xem tất cả học viên <ArrowRight aria-hidden strokeWidth={1.75} /></Link></Button>
        </div>
      </header>

      <section aria-label="Cần xử lý" className="grid gap-4 lg:grid-cols-2">
        <ActionList
          title="Chưa liên hệ"
          hint="Đã đăng ký nhưng chưa có ghi chú cuộc gọi nào."
          tone="destructive"
          href="/quan-tri/hoc-vien?followUp=uncontacted"
          group={overview.uncontacted}
          emptyText="Mọi học viên đăng ký đều đã được liên hệ."
        />
        <ActionList
          title="Quá hạn follow-up"
          hint="Lần liên hệ gần nhất đã quá 2 ngày."
          tone="warning"
          href="/quan-tri/hoc-vien?followUp=overdue"
          group={overview.overdue}
          emptyText="Không có học viên nào quá hạn follow-up."
        />
      </section>

      <SignupStats signups={overview.signups} total={overview.total} />

      <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
        <Pipeline overview={overview} />
        <SourcePerformance sources={overview.sources} />
      </div>

      <section className="rounded-2xl border border-border bg-card p-4 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-[21px] font-medium">Đăng ký gần đây</h2><Link className="text-sm text-primary underline-offset-4 hover:underline" href="/quan-tri/hoc-vien">Xem tất cả ({overview.total})</Link></div>
        {overview.rows.length ? <ul className="mt-2 divide-y divide-border">{overview.rows.map((student) => (
          <li key={student.id}><Link href={`/quan-tri/hoc-vien/${student.id}`} className="flex flex-wrap items-center justify-between gap-3 py-3.5 hover:text-primary"><div><p className="font-medium">{student.fullName}</p><p className="mt-1 font-mono text-[13px] text-muted-foreground">{student.code} · {formatDate(student.signedUpAt)}</p></div><StatusBadge status={student.status} /></Link></li>
        ))}</ul> : <p className="mt-4 text-muted-foreground">Chưa có đăng ký trong phạm vi của bạn. Học viên mới sẽ xuất hiện tại đây sau khi điền form.</p>}
      </section>
    </main>
  );
}

/** The one place the dashboard asks for action, so it gets the strongest treatment. */
function ActionList({ title, hint, tone, href, group, emptyText }: {
  title: string; hint: string; tone: "destructive" | "warning"; href: string;
  group: StudentOverview["uncontacted"]; emptyText: string;
}) {
  const accent = tone === "destructive" ? "text-destructive" : "text-warning";
  return (
    <div className={`rounded-2xl border bg-card p-4 md:p-6 ${group.count ? (tone === "destructive" ? "border-destructive/50" : "border-warning/50") : "border-border"}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[21px] font-medium">{title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{hint}</p>
        </div>
        <p className={`font-mono text-[40px] leading-none tabular-nums ${group.count ? accent : "text-muted-foreground"}`} aria-label={`${group.count} học viên`}>{group.count}</p>
      </div>
      {group.rows.length ? (
        <>
          <ul className="mt-3 divide-y divide-border">{group.rows.map((student) => <LeadRow key={student.id} student={student} />)}</ul>
          {group.count > group.rows.length && <Link href={href} className="mt-3 inline-flex text-sm text-primary underline-offset-4 hover:underline">Xem cả {group.count} học viên</Link>}
        </>
      ) : <p className="mt-5 flex items-center gap-2 text-sm text-muted-foreground"><CheckCircle2 aria-hidden size={16} strokeWidth={1.75} className="text-success" />{emptyText}</p>}
    </div>
  );
}

function LeadRow({ student }: { student: StudentSummary }) {
  const state = followUpState(student);
  return (
    <li className="flex items-center gap-3 py-3">
      <Link href={`/quan-tri/hoc-vien/${student.id}`} className="min-w-0 flex-1 hover:text-primary">
        <p className="truncate font-medium">{student.fullName}</p>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[13px] text-muted-foreground">
          <span className="font-mono">{student.code}</span>
          <span>Đăng ký {formatDate(student.signedUpAt)}</span>
          {state.kind === "overdue" && <FollowUpBadge student={student} />}
        </p>
      </Link>
      <Button asChild variant="outline" size="icon-sm"><a href={zaloChatUrl(student.phone)} target="_blank" rel="noreferrer" aria-label={`Mở Zalo của ${student.fullName}`}><MessageCircle aria-hidden strokeWidth={1.75} /></a></Button>
      <Button asChild variant="outline" size="icon-sm"><a href={`tel:${student.phone}`} aria-label={`Gọi ${student.fullName}`}><Phone aria-hidden strokeWidth={1.75} /></a></Button>
    </li>
  );
}

function SignupStats({ signups, total }: { signups: StudentOverview["signups"]; total: number }) {
  const diff = signups.week - signups.previousWeek;
  const Trend = diff > 0 ? ArrowUpRight : diff < 0 ? ArrowDownRight : Minus;
  const trendTone = diff > 0 ? "text-success" : diff < 0 ? "text-destructive" : "text-muted-foreground";
  return (
    <section aria-label="Đăng ký mới" className="grid grid-cols-3 divide-x divide-border rounded-2xl border border-border bg-card">
      <Stat label="Hôm nay" value={signups.today} />
      <Stat label="7 ngày qua" value={signups.week}>
        <p className={`mt-2 inline-flex items-center gap-1 text-[13px] ${trendTone}`}>
          <Trend aria-hidden size={14} strokeWidth={1.75} />
          {diff === 0 ? "Bằng 7 ngày trước" : `${diff > 0 ? "+" : "−"}${Math.abs(diff)} so với 7 ngày trước`}
        </p>
      </Stat>
      <Stat label="Tổng học viên" value={total} />
    </section>
  );
}

function Stat({ label, value, children }: { label: string; value: number; children?: React.ReactNode }) {
  return <div className="p-4 md:p-5"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-2 font-mono text-[28px] leading-none tabular-nums">{value}</p>{children}</div>;
}

function Pipeline({ overview }: { overview: StudentOverview }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-4 md:p-6" aria-label="Tình trạng học viên">
      <h2 className="text-[21px] font-medium">Tình trạng học viên</h2>
      <div className="mt-4 flex h-2.5 overflow-hidden rounded-full bg-background-2" role="img" aria-label={STUDENT_STATUSES.map((status) => `${STUDENT_STATUS_META[status].label}: ${overview.counts[status]}`).join(", ")}>
        {STUDENT_STATUSES.map((status) => overview.counts[status] > 0 && <span key={status} className={STATUS_BAR[status]} style={{ width: `${(overview.counts[status] / Math.max(overview.total, 1)) * 100}%` }} />)}
      </div>
      <ul className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
        {STUDENT_STATUSES.map((status) => (
          <li key={status}>
            <Link href={`/quan-tri/hoc-vien?status=${status}`} className="block rounded-xl border border-transparent p-2.5 hover:border-primary hover:bg-primary-soft">
              <p className="flex items-center gap-1.5 text-[13px] text-muted-foreground"><span aria-hidden className={`size-2 rounded-full ${STATUS_BAR[status]}`} />{STUDENT_STATUS_META[status].label}</p>
              <p className="mt-1.5 font-mono text-[22px] tabular-nums">{overview.counts[status]}</p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function SourcePerformance({ sources }: { sources: StudentOverview["sources"] }) {
  const best = Math.max(0, ...sources.map((source) => (source.total ? source.enrolled / source.total : 0)));
  return (
    <section className="rounded-2xl border border-border bg-card p-4 md:p-6" aria-label="Hiệu quả theo nguồn">
      <h2 className="text-[21px] font-medium">Hiệu quả theo nguồn</h2>
      <p className="mt-1 text-sm text-muted-foreground">Tỷ lệ học viên chuyển thành học chính thức.</p>
      {sources.length ? (
        <ul className="mt-4 grid gap-4">
          {sources.map((source) => {
            const rate = source.total ? Math.round((source.enrolled / source.total) * 100) : 0;
            const isBest = best > 0 && source.total > 0 && source.enrolled / source.total === best;
            return (
              <li key={source.code}>
                <Link href={`/quan-tri/hoc-vien?sourceId=${source.id}`} className="block rounded-lg hover:text-primary">
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span><span className="font-mono font-medium">{source.code}</span> <span className="text-muted-foreground">· {source.name}</span>{isBest && <span className="ml-2 text-xs font-medium text-success">Tốt nhất</span>}</span>
                  <span className="font-mono tabular-nums text-muted-foreground">{source.enrolled}/{source.total} · <span className="text-foreground">{rate}%</span></span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-background-2"><div className={isBest ? "h-full bg-success" : "h-full bg-primary"} style={{ width: `${rate}%` }} /></div>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : <p className="mt-4 text-sm text-muted-foreground">Chưa có nguồn nào có học viên.</p>}
    </section>
  );
}

function OverviewLoading() {
  return <div className="content grid gap-6 py-8" aria-label="Đang tải tổng quan"><Skeleton className="h-12 w-72" /><div className="grid gap-4 lg:grid-cols-2"><Skeleton className="h-64 rounded-2xl" /><Skeleton className="h-64 rounded-2xl" /></div><Skeleton className="h-24 rounded-2xl" /><Skeleton className="h-48 rounded-2xl" /></div>;
}
