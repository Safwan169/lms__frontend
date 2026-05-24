"use client"

import {
  AlertTriangle,
  ArrowRight,
  BellRing,
  Bookmark,
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  ClipboardList,
  Eye,
  Library,
  Paperclip,
  PlayCircle,
  RefreshCw,
  Star,
  TrendingUp,
  Video,
  Wallet,
} from "lucide-react"

import Link from "next/link"
import { useState } from "react"

import { useAuth } from "@/context/AuthContext"
import ClassSessionModal from "@/features/schedule/ClassSessionModal"
import {
  daysUntil,
  formatBdt,
  formatDateLong,
  formatDay,
  formatMonth,
  formatTimeHm,
  useStudentAssessmentDetail,
  useStudentStats,
  useStudentTodaysClasses,
  useStudentUpcomingAssessments,
  type UpcomingEvent,
} from "./api"
import { ExternalLink, FileText } from "lucide-react"
import { EmptyState, LoadingBlock, SectionCard } from "./shared"

type SessionEntry = {
  id: string
  subjectName: string
  teacherName: string
  dayOfWeek: string
  startTime: string
  endTime: string
  deliveryMode: string
  roomName?: string
  liveSessionRef?: string
  notes?: string
  status: string
  isOverride?: boolean
}

type AnyUser = any

function pickFirstName(user: AnyUser) {
  for (const v of [user?.name, user?.full_name, user?.username]) {
    if (typeof v === "string" && v.trim()) return v.trim().split(" ")[0]
  }
  return "Student"
}

export default function StudentDashboard({ user }: { user: AnyUser }) {
  const firstName = pickFirstName(user)

  const { user: authUser } = useAuth()
  const tenantId: string | null =
    authUser?.tenant_id ?? (authUser as any)?.tenantId ?? (authUser as any)?.tenant?.id ?? null

  const statsQ = useStudentStats()
  const todaysQ = useStudentTodaysClasses()
  const upcomingQ = useStudentUpcomingAssessments()

  const [selectedEntry, setSelectedEntry] = useState<SessionEntry | null>(null)
  const [selectedDate, setSelectedDate] = useState<string>("")
  const [focusAttachments, setFocusAttachments] = useState(false)
  const [selectedAssessment, setSelectedAssessment] = useState<UpcomingEvent | null>(null)
  const assessmentDetailQ = useStudentAssessmentDetail(selectedAssessment?.id ?? null)
  const assessmentDetail = assessmentDetailQ.data

  type TodayClass = NonNullable<typeof todaysQ.data>["data"][number]
  const openClassSession = (c: TodayClass, focus: boolean) => {
    const d = new Date(c.scheduled_start_at)
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, "0")
    const dd = String(d.getDate()).padStart(2, "0")
    setSelectedEntry({
      id: c.entry_id,
      subjectName: c.subject?.name ?? "Class",
      teacherName: c.teacher?.name ?? "—",
      dayOfWeek: todaysQ.data?.day_of_week ?? "",
      startTime: c.start_time,
      endTime: c.end_time,
      deliveryMode: c.delivery_mode,
      roomName: c.room?.name,
      liveSessionRef: c.live_session_ref ?? undefined,
      notes: c.notes ?? undefined,
      status: c.status,
      isOverride: c.is_overridden,
    })
    setSelectedDate(`${yyyy}-${mm}-${dd}`)
    setFocusAttachments(focus)
  }

  const stats = statsQ.data
  const pendingDue = stats?.pending_due
  const attendance = stats?.attendance
  const upcomingEvents = stats?.upcoming_events
  const latest = stats?.latest_result

  return (
    <div className="min-h-full bg-slate-50/60 p-4 md:p-6">
      <div className="mx-auto max-w-8xl space-y-6">
        {/* Greeting */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-slate-900">
              Hi, <span>{firstName}</span>
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {formatDateLong(new Date().toISOString())} · Bangladesh Standard Time
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => {
                statsQ.refetch()
                todaysQ.refetch()
                upcomingQ.refetch()
              }}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </button>
            {/* <button className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700">
              <Video className="h-3.5 w-3.5" />
              Join live class
            </button> */}
          </div>
        </div>

        {/* Due alert banner */}
        {pendingDue?.amount != null && (
          <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <span className="rounded-lg bg-amber-100 p-2 text-amber-700">
              <AlertTriangle className="h-4 w-4" />
            </span>
            <div className="flex-1">
              <div className="text-sm font-semibold text-amber-900">
                {pendingDue.label ?? "Tuition due"} · {formatBdt(pendingDue.amount)}
              </div>
              {pendingDue.due_date && (
                <div className="mt-0.5 text-xs text-amber-800/80">
                  Pay before {new Date(pendingDue.due_date).toLocaleDateString("en-GB", { day: "numeric", month: "long" })} to avoid a late fine.
                </div>
              )}
            </div>
            <a href="#" className="inline-flex items-center gap-1 text-sm font-semibold text-amber-900 hover:underline">
              Pay now <ArrowRight className="h-3.5 w-3.5" />
            </a>
          </div>
        )}

        {/* Quick actions */}
        <div className="flex flex-wrap gap-2">
          {[
            { label: "Today's class", Icon: Library, href: "/dashboard/my-class" },
            { label: "Open ongoing exam", Icon: PlayCircle, href: "/dashboard/assessments" },
            { label: pendingDue?.amount ? `Pay due (${formatBdt(pendingDue.amount)})` : "Pay due", Icon: Wallet, href: "/dashboard/my-payments" },
            { label: "View results", Icon: Star, href: "/dashboard/assessments" },
            { label: "My attendance", Icon: ClipboardCheck, href: "/dashboard/self-attendance" },
            { label: "Notice board", Icon: BellRing, href: "/dashboard/notices" },
          ].map((a) => (
            <Link
              key={a.label}
              href={a.href}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:border-indigo-200 hover:bg-indigo-50/40"
            >
              <a.Icon className="h-3.5 w-3.5" />
              <span>{a.label}</span>
            </Link>
          ))}
        </div>

        {/* Today's classes */}
        <SectionCard
          icon={<CalendarDays className="h-4 w-4" />}
          iconTone="bg-indigo-50 text-indigo-600"
          title="Upcoming Classes"
          subtitle={
            todaysQ.data
              ? `${formatDateLong(todaysQ.data.date)} · ${todaysQ.data.scheduled_count} scheduled · ${todaysQ.data.live_now_count} live now`
              : undefined
          }
          action={
            <button className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:underline">
              <Link className="flex items-center gap-1" href="/dashboard/my-class">My classes <ArrowRight className="h-3.5 w-3.5" /></Link>
            </button>
          }
        >
          {todaysQ.isLoading ? (
            <LoadingBlock rows={2} />
          ) : !todaysQ.data || todaysQ.data.data.length === 0 ? (
            <EmptyState icon={<CalendarDays className="h-5 w-5" />} title="No classes scheduled" detail="Your timetable is clear for today." />
          ) : (
            <div className="divide-y divide-slate-100">
              {todaysQ.data.data.map((c) => {
                console.log(c, 'this is a student dashbord ')
                const Icon = c.delivery_mode === "ONLINE" ? Video : Library
                return (
                  <div key={c.entry_id} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3">
                      <span className={`rounded-xl p-2 ${c.is_live_now ? "bg-rose-50 text-rose-600" : "bg-slate-100 text-slate-600"}`}>
                        <Icon className="h-5 w-5" />
                      </span>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium text-slate-900">{c.subject?.name ?? "Class"}</span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${c.is_live_now ? "bg-rose-100 text-rose-700" : "bg-slate-100 text-slate-600"
                              }`}
                          >
                            {c.delivery_mode}
                          </span>
                          <div className="flex flex-wrap gap-2">
                            {c.contents.length > 0 && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                                <BookOpen size={12} />
                                {c.contents.length}
                              </span>
                            )}

                            {c.assessments.length > 0 && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold text-violet-700">
                                <ClipboardList size={12} />
                                {c.assessments.length}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="mt-0.5 text-xs text-slate-500">
                          {c.teacher?.name ?? "—"} ·{" "}
                          <span className="tabular-nums">
                            {formatTimeHm(c.scheduled_start_at)} – {formatTimeHm(c.scheduled_end_at)}
                          </span>
                          {c.room?.name && ` · ${c.room.name}`}
                        </div>

                      </div>
                    </div>
                    <div className="flex gap-2">
                      {c.live_session_ref && (
                        <a href={c.live_session_ref} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700">
                          <Video className="h-3.5 w-3.5" />
                          Join live now
                        </a >
                      )}

                      <button
                        onClick={() => openClassSession(c, false)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Details
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </SectionCard>

        {/* KPI cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {[
            {
              label: "Attendance",
              value: attendance?.percentage != null ? String(attendance.percentage) : "—",
              suffix: attendance?.percentage != null ? "%" : "",
              hint:
                attendance?.weeks_attended != null && attendance?.weeks_total != null
                  ? `${attendance.label ?? "This term"} · ${attendance.weeks_attended}/${attendance.weeks_total} weeks`
                  : attendance?.label ?? "No data",
              badge: attendance?.delta_pct != null && attendance.delta_pct !== 0 ? `${attendance.delta_pct > 0 ? "+" : ""}${attendance.delta_pct}%` : null,
              icon: ClipboardCheck,
              tone: "text-emerald-600 bg-emerald-100",
              cornerTone: "bg-emerald-500",
            },
            {
              label: "Upcoming Events",
              value: upcomingEvents?.count != null ? String(upcomingEvents.count) : "—",
              hint: upcomingEvents?.next
                ? `Next: ${upcomingEvents.next.title} · ${new Date(upcomingEvents.next.scheduled_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`
                : "No upcoming events",
              icon: Bookmark,
              tone: "text-indigo-600 bg-indigo-100",
              cornerTone: "bg-indigo-500",
            },
            {
              label: "Pending Due",
              value: pendingDue?.amount != null ? formatBdt(pendingDue.amount) : "—",
              hint: pendingDue?.label ?? "No pending dues",
              icon: Wallet,
              tone: "text-amber-600 bg-amber-100",
              cornerTone: "bg-amber-500",
            },
            {
              label: "Unread Notifications",
              value: stats?.unread_notifications?.count != null ? String(stats.unread_notifications.count) : "—",
              hint:
                stats?.unread_notifications?.from_teacher_count
                  ? `${stats.unread_notifications.from_teacher_count} from your teacher`
                  : "No new notifications",
              icon: BellRing,
              tone: "text-sky-600 bg-sky-100",
              cornerTone: "bg-sky-500",
            },
            {
              label: "Latest Result",
              value: latest?.grade ?? "—",
              suffix: latest?.percentage != null ? ` · ${latest.percentage}%` : "",
              hint: latest?.title ?? "No published results",
              icon: Star,
              tone: "text-violet-600 bg-violet-100",
              cornerTone: "bg-violet-500",
            },
          ].map((k) => {
            const Icon = k.icon
            return (
              <div key={k.label} className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <span className={`pointer-events-none absolute -bottom-2.5 -right-2.5 h-[70px] w-[70px] rounded-full opacity-10 ${k.cornerTone}`} />
                <div className="relative flex items-start justify-between gap-2">
                  <span className={`rounded-xl p-2 ${k.tone}`}>
                    <Icon className="h-5 w-5" />
                  </span>
                  {k.badge && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                      <TrendingUp className="h-3 w-3" />
                      {k.badge}
                    </span>
                  )}
                </div>
                <div className="relative mt-3">
                  <div className="text-3xl font-semibold text-slate-900">
                    <span className="tabular-nums">{statsQ.isLoading ? "…" : k.value}</span>
                    {k.suffix && <span className="text-base text-slate-500 tabular-nums">{k.suffix}</span>}
                  </div>
                  <div className="mt-1 text-sm font-medium text-slate-700">{k.label}</div>
                  <div className="mt-0.5 text-xs text-slate-500">{k.hint}</div>
                </div>
              </div>
            )
          })}
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
          {/* Upcoming assessments */}
          <SectionCard
            icon={<Bookmark className="h-4 w-4" />}
            iconTone="bg-amber-50 text-amber-600"
            title="Upcoming exams"
            action={
              <button className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:underline">
                <Link href="/dashboard/assessments">View all</Link> <ArrowRight className="h-3.5 w-3.5" />
              </button>
            }
          >
            {upcomingQ.isLoading ? (
              <LoadingBlock rows={3} />
            ) : !upcomingQ.data || upcomingQ.data.data.length === 0 ? (
              <EmptyState icon={<Bookmark className="h-5 w-5" />} title="No upcoming exams" detail="You're caught up on assessments." />
            ) : (
              <div className="space-y-3">
                {upcomingQ.data.data.map((e) => (
                  <div key={e.id} className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-slate-50/50 p-3">
                    <div className="flex w-14 flex-col items-center rounded-xl bg-white py-2 shadow-sm">
                      <span className="text-2xl font-semibold text-slate-900 tabular-nums">{formatDay(e.scheduled_at)}</span>
                      <span className="text-[10px] font-medium uppercase tracking-wide text-slate-500">{formatMonth(e.scheduled_at)}</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-slate-900">{e.title}</span>
                        <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-medium text-indigo-700">{e.type}</span>
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        <span className="tabular-nums">
                          {new Date(e.scheduled_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })} · {formatTimeHm(e.scheduled_at)}
                        </span>
                        {e.marks != null && ` · ${e.marks} marks`} · {daysUntil(e.scheduled_at)}
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedAssessment(e)}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
                    >
                      Open <ArrowRight className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          <div className="space-y-6">
            {/* Academic summary (latest result only — no historical endpoint) */}
            <SectionCard
              icon={<TrendingUp className="h-4 w-4" />}
              iconTone="bg-violet-50 text-violet-600"
              title="Academic summary"
              subtitle="Latest published result"
            >
              {statsQ.isLoading ? (
                <LoadingBlock rows={2} />
              ) : !latest?.title ? (
                <EmptyState icon={<Star className="h-5 w-5" />} title="No results yet" detail="Your published results will appear here." />
              ) : (
                <>
                  <div className="flex items-end justify-between gap-3 rounded-2xl bg-slate-50 p-4">
                    <div>
                      <div className="text-xs text-slate-500">Latest published</div>
                      <div className="mt-1 text-lg font-semibold text-slate-900">{latest.title}</div>
                      {latest.graded_at && (
                        <div className="text-[11px] text-slate-500">
                          Released {new Date(latest.graded_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      {latest.grade && <div className="text-3xl font-semibold text-emerald-600">{latest.grade}</div>}
                      {latest.obtained_marks != null && latest.total_marks != null && (
                        <div className="text-xs text-slate-500 tabular-nums">
                          {latest.obtained_marks} / {latest.total_marks}
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </SectionCard>

            {/* Alerts panel — no dedicated endpoint, hide unless data */}
            <SectionCard
              icon={<BellRing className="h-4 w-4" />}
              iconTone="bg-amber-50 text-amber-600"
              title="Alerts & updates"
            >
              <EmptyState icon={<BellRing className="h-5 w-5" />} title="All caught up" detail="No new alerts right now." />
            </SectionCard>
          </div>
        </div>
      </div>

      <ClassSessionModal
        open={!!selectedEntry}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedEntry(null)
            setSelectedDate("")
            setFocusAttachments(false)
          }
        }}
        entry={selectedEntry}
        sessionDate={selectedDate}
        tenantId={tenantId}
        role="student"
        focusAttachments={focusAttachments}
      />

      {selectedAssessment && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          onClick={() => setSelectedAssessment(null)}
        >
          <div
            className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-xl"
            onClick={(ev) => ev.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-slate-100 p-5">
              <div className="flex items-start gap-3">
                <span className="rounded-xl bg-amber-50 p-2 text-amber-600">
                  <Bookmark className="h-5 w-5" />
                </span>
                <div>
                  <div className="text-lg font-semibold text-slate-900">
                    {selectedAssessment.title}
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-medium text-indigo-700">
                      {selectedAssessment.type}
                    </span>
                    <span className="text-xs text-slate-500">
                      {daysUntil(selectedAssessment.scheduled_at)}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedAssessment(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <ArrowRight className="h-4 w-4 rotate-45" />
              </button>
            </div>

            <div className="space-y-3 p-5 text-sm">
              <AssessmentRow label="Date" value={formatDateLong(selectedAssessment.scheduled_at)} />
              <AssessmentRow label="Time" value={formatTimeHm(selectedAssessment.scheduled_at)} />
              {selectedAssessment.duration_min != null && (
                <AssessmentRow label="Duration" value={`${selectedAssessment.duration_min} min`} />
              )}
              {(assessmentDetail?.marks ?? selectedAssessment.marks) != null && (
                <AssessmentRow
                  label="Marks"
                  value={String(assessmentDetail?.marks ?? selectedAssessment.marks)}
                />
              )}
              {selectedAssessment.subject?.name && (
                <AssessmentRow label="Subject" value={selectedAssessment.subject.name} />
              )}
              {selectedAssessment.batch?.name && (
                <AssessmentRow label="Batch" value={selectedAssessment.batch.name} />
              )}
              {assessmentDetail?.deadline_at && (
                <AssessmentRow
                  label="Deadline"
                  value={`${formatDateLong(assessmentDetail.deadline_at)} · ${formatTimeHm(assessmentDetail.deadline_at)}`}
                />
              )}
              {assessmentDetail && (
                <AssessmentRow
                  label="Status"
                  value={
                    assessmentDetail.my_submission.result_status === "MARKED"
                      ? `Marked · ${assessmentDetail.my_submission.obtained_marks ?? "—"}`
                      : assessmentDetail.my_submission.result_status === "NOT_MARKED"
                        ? "Submitted · awaiting marks"
                        : assessmentDetail.is_submission_open
                          ? "Not submitted"
                          : "Closed"
                  }
                />
              )}

              {assessmentDetailQ.isLoading && (
                <div className="text-xs text-slate-500">Loading details…</div>
              )}

              {assessmentDetail?.description && (
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                  <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Description
                  </div>
                  <div className="mt-1 whitespace-pre-wrap text-sm text-slate-800">
                    {assessmentDetail.description}
                  </div>
                </div>
              )}

              {(assessmentDetail?.file || assessmentDetail?.link) && (
                <div className="space-y-2">
                  <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Resources
                  </div>
                  {assessmentDetail.file?.url && (
                    <a
                      href={assessmentDetail.file.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      <FileText className="h-3.5 w-3.5" /> Download attachment
                    </a>
                  )}
                  {assessmentDetail.link && (
                    <a
                      href={assessmentDetail.link}
                      target="_blank"
                      rel="noreferrer"
                      className="ml-2 inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      <ExternalLink className="h-3.5 w-3.5" /> Open external link
                    </a>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50 px-5 py-3">
              <button
                onClick={() => setSelectedAssessment(null)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
              >
                Close
              </button>
              <Link
                href="/dashboard/assessments"
                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700"
              >
                Go to assessments <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function AssessmentRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</span>
      <span className="text-right text-sm text-slate-800">{value}</span>
    </div>
  )
}
