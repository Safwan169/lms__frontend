"use client"

import { useEffect, useState } from "react"
import {
  AlertTriangle,
  ArrowRight,
  BellRing,
  CalendarDays,
  Check,
  ClipboardCheck,
  Eye,
  FileText,
  Library,
  Paperclip,
  PlayCircle,
  Plus,
  RefreshCw,
  TrendingDown,
  Upload,
  Users,
  UserSquare2,
  Video,
} from "lucide-react"

import Link from "next/link"
import { useRouter } from "next/navigation"

import {
  formatDateLong,
  formatTimeHm,
  greetingFor,
  useTeacherPlanner,
  useTeacherStats,
  type PlannerEntry,
} from "./api"
import { EmptyState, LoadingBlock, SectionCard } from "./shared"
import {
  AttendanceModal,
  EvaluationsModal,
  LiveClassModal,
  NoticesModal,
  PlannerEntryModal,
} from "./TeacherDashboardModals"

type AnyUser = any

function pickName(user: AnyUser) {
  for (const v of [user?.name, user?.full_name, user?.username]) {
    if (typeof v === "string" && v.trim()) return v.trim()
  }
  return "Teacher"
}

function statusTone(status: string, isNow: boolean) {
  if (isNow) return "bg-sky-100 text-sky-700"
  if (status === "COMPLETED") return "bg-emerald-100 text-emerald-700"
  if (status === "ONGOING") return "bg-sky-100 text-sky-700"
  return "bg-amber-100 text-amber-700"
}

function statusLabel(status: string, minutesUntil: number) {
  if (status === "COMPLETED") return "Completed"
  if (status === "ONGOING") return "Ongoing"
  if (minutesUntil <= 60) return `Starts in ${minutesUntil}m`
  return "Upcoming"
}

export default function TeacherDashboard({ user }: { user: AnyUser }) {
  const name = pickName(user)
  const router = useRouter()
  const [range, setRange] = useState<"today" | "week">("today")

  const statsQ = useTeacherStats()
  const plannerQ = useTeacherPlanner(range)

  const s = statsQ.data

  const [plannerEntry, setPlannerEntry] = useState<PlannerEntry | null>(null)
  const [attBatch, setAttBatch] = useState<{ id: string; name: string } | null>(null)
  const [evalOpen, setEvalOpen] = useState(false)
  const [noticesOpen, setNoticesOpen] = useState(false)
  const [liveOpen, setLiveOpen] = useState(false)

  const kpis = [
    {
      label: "Today's Classes",
      value: s?.todays_classes.total != null ? String(s.todays_classes.total) : "—",
      hint:
        s?.todays_classes
          ? `${s.todays_classes.done ?? 0} done · ${s.todays_classes.ongoing ?? 0} ongoing · ${s.todays_classes.upcoming ?? 0} upcoming`
          : "No data",
      icon: CalendarDays,
      tone: "text-indigo-600 bg-indigo-100",
      cornerTone: "bg-indigo-500",
    },
    {
      label: "Pending Attendance",
      value: s?.pending_attendance.count != null ? String(s.pending_attendance.count) : "—",
      hint:
        s?.pending_attendance.batches?.length
          ? s.pending_attendance.batches.map((b) => b.batch_name).join(" & ")
          : "Nothing pending",
      icon: ClipboardCheck,
      tone: "text-amber-600 bg-amber-100",
      cornerTone: "bg-amber-500",
    },
    {
      label: "Pending Evaluations",
      value: s?.pending_evaluations.submission_count != null ? String(s.pending_evaluations.submission_count) : "—",
      hint:
        s?.pending_evaluations.assessment_count != null
          ? `across ${s.pending_evaluations.assessment_count} assessments`
          : "No data",
      icon: FileText,
      tone: "text-rose-600 bg-rose-100",
      cornerTone: "bg-rose-500",
    },
    {
      label: "Upcoming Live",
      value: s?.upcoming_live.count != null ? String(s.upcoming_live.count) : "—",
      hint:
        s?.upcoming_live.next
          ? `${s.upcoming_live.next.title} · in ${s.upcoming_live.next.minutes_until} min`
          : "Nothing scheduled",
      icon: Video,
      tone: "text-emerald-600 bg-emerald-100",
      cornerTone: "bg-emerald-500",
    },
    {
      label: "Unread Notices",
      value: s?.unread_notices.count != null ? String(s.unread_notices.count) : "—",
      hint:
        s?.unread_notices.from_admin_count
          ? `${s.unread_notices.from_admin_count} from admin`
          : "No new notices",
      icon: BellRing,
      tone: "text-sky-600 bg-sky-100",
      cornerTone: "bg-sky-500",
    },
  ]

  return (
    <div className="min-h-full bg-slate-50/60 p-4 md:p-6">
      <div className="mx-auto max-w-8xl space-y-6">
        {/* Greeting */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-slate-900">
              {greetingFor()}, <span>{name}</span>
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {formatDateLong(new Date().toISOString())} · Bangladesh Standard Time (UTC+6)
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => {
                statsQ.refetch()
                plannerQ.refetch()
              }}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </button>
            {/* <button className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-rose-700">
              <Video className="h-3.5 w-3.5" />
              Start live class
            </button> */}
          </div>
        </div>

        {/* KPIs */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {kpis.map((k) => {
            const Icon = k.icon
            return (
              <div key={k.label} className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <span className={`pointer-events-none absolute -bottom-2.5 -right-2.5 h-[70px] w-[70px] rounded-full opacity-10 ${k.cornerTone}`} />
                <span className={`relative inline-flex rounded-xl p-2 ${k.tone}`}>
                  <Icon className="h-5 w-5" />
                </span>
                <div className="relative mt-3">
                  <div className="text-3xl font-semibold text-slate-900 tabular-nums">
                    {statsQ.isLoading ? "…" : k.value}
                  </div>
                  <div className="mt-1 text-sm font-medium text-slate-700">{k.label}</div>
                  <div className="mt-0.5 text-xs text-slate-500">{k.hint}</div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Quick actions */}
        <div className="flex flex-wrap gap-2">
          {[
            { label: "Take attendance", Icon: ClipboardCheck, href: "/dashboard/attendance" },
            { label: "Upload material", Icon: Upload, href: "/dashboard/content" },
            { label: "Create assessment", Icon: Plus, href: "/dashboard/assessments" },
            { label: "Review submissions", Icon: FileText, href: "/dashboard/assessments", count: s?.pending_evaluations.submission_count ?? null },
            { label: "My class", Icon: Users, href: "/dashboard/my-class" },
          ].map((a) => (
            <Link
              key={a.label}
              href={a.href}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:border-indigo-200 hover:bg-indigo-50/40"
            >
              <a.Icon className="h-3.5 w-3.5" />
              <span>{a.label}</span>
              {a.count != null && a.count > 0 && (
                <span className="rounded-full bg-rose-100 px-1.5 py-0.5 text-[10px] font-semibold text-rose-700">{a.count}</span>
              )}
            </Link>
          ))}
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
          {/* Planner */}
          <SectionCard
            icon={<CalendarDays className="h-4 w-4" />}
            iconTone="bg-indigo-50 text-indigo-600"
            title="Today's teaching planner"
            subtitle={
              plannerQ.data
                ? `${formatDateLong(new Date().toISOString())} · ${plannerQ.data.total_count} classes assigned`
                : undefined
            }
            action={
              <div className="flex items-center gap-3">
                <div className="inline-flex rounded-full border border-slate-200 bg-slate-50 p-0.5 text-xs">
                  <button
                    onClick={() => setRange("today")}
                    className={`rounded-full px-3 py-1 font-medium transition ${range === "today" ? "bg-slate-900 text-white shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                  >
                    Today
                  </button>
                  <button
                    onClick={() => setRange("week")}
                    className={`rounded-full px-3 py-1 font-medium transition ${range === "week" ? "bg-slate-900 text-white shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                  >
                    This week
                  </button>
                </div>
                <Link
                  href="/dashboard/my-class"
                  className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:underline"
                >
                  My class <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            }
          >
            {plannerQ.isLoading ? (
              <LoadingBlock rows={3} />
            ) : !plannerQ.data || plannerQ.data.data.length === 0 ? (
              <EmptyState icon={<CalendarDays className="h-5 w-5" />} title="No classes" detail="Nothing on your planner for this range." />
            ) : (
              <div>
                {plannerQ.data.data.map((p) => {
                  const isOngoing = p.is_now || p.status === "ONGOING"
                  const isLive = p.delivery_mode === "LIVE_ONLINE" || p.delivery_mode === "ONLINE"
                  const isLiveUpcoming = isLive && !isOngoing && p.status !== "COMPLETED"
                  return (
                    <div
                      key={p.entry_id + p.date}
                      className={`flex flex-col gap-3 border-t border-l-[3px] p-3 sm:flex-row sm:items-center sm:gap-4 ${
                        isOngoing
                          ? "border-t-slate-200 border-l-emerald-500 bg-emerald-50/70"
                          : isLiveUpcoming
                          ? "border-t-slate-200 border-l-violet-500 bg-violet-50/60"
                          : p.status === "COMPLETED"
                          ? "border-t-slate-100 border-l-transparent bg-white opacity-90"
                          : "border-t-slate-100 border-l-transparent bg-white"
                      }`}
                    >
                      <div className="flex w-20 shrink-0 flex-col items-start">
                        <span className="text-sm font-semibold text-slate-900 tabular-nums">{p.start_time}</span>
                        <span className="text-[11px] text-slate-500 tabular-nums">→ {p.end_time}</span>
                        {p.is_now && (
                          <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Now
                          </span>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-slate-900">{p.subject?.name ?? "Class"}</span>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${modeBadgeClasses(p.delivery_mode)}`}>
                            {formatMode(p.delivery_mode)}
                          </span>
                          <PlannerStatusPill status={p.status} minutesUntil={p.minutes_until_start} />
                          {p.is_overridden && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> Updated
                            </span>
                          )}
                        </div>
                        <div className="mt-1 flex flex-wrap gap-3 text-xs text-slate-500">
                          {p.batch?.name && (
                            <span className="inline-flex items-center gap-1">
                              <Users className="h-3 w-3" /> {p.batch.name}
                            </span>
                          )}
                          {p.room?.name && (
                            <span className="inline-flex items-center gap-1">
                              <Library className="h-3 w-3" /> {p.room.name}
                            </span>
                          )}
                          {isLive && !p.room?.name && (
                            <span className="inline-flex items-center gap-1">
                              <Video className="h-3 w-3" /> Live
                            </span>
                          )}
                          {p.has_material && (
                            <span className="inline-flex items-center gap-1 font-medium text-emerald-600">
                              <Paperclip className="h-3 w-3" /> Material attached
                            </span>
                          )}
                        </div>
                      </div>
                      <PlannerRowActions
                        p={p}
                        onOpen={() => setPlannerEntry(p)}
                        onLive={() => setLiveOpen(true)}
                        onMaterial={() => {
                          const qs = new URLSearchParams({ create: "1" })
                          if (p.subject?.id) qs.set("subject", p.subject.id)
                          if (p.batch?.id) qs.set("batch", p.batch.id)
                          router.push(`/dashboard/content?${qs.toString()}`)
                        }}
                        onAssessment={() => setEvalOpen(true)}
                      />
                    </div>
                  )
                })}
              </div>
            )}
          </SectionCard>

          {/* Next live class + pending work */}
          <div className="space-y-6">
            <NextLiveClassCard
              next={s?.upcoming_live.next ?? null}
              endTime={
                s?.upcoming_live.next
                  ? plannerQ.data?.data.find((e) => e.entry_id === s.upcoming_live.next!.id)?.end_time
                  : undefined
              }
              startTime={
                s?.upcoming_live.next
                  ? plannerQ.data?.data.find((e) => e.entry_id === s.upcoming_live.next!.id)?.start_time
                  : undefined
              }
              onPrep={() => setLiveOpen(true)}
              onStart={() => setLiveOpen(true)}
            />

            {/* Pending work — list style matching mockup */}
            <PendingWorkCard
              loading={statsQ.isLoading}
              stats={s}
              onOpenAttendance={(b) => setAttBatch(b)}
              onOpenEvaluations={() => setEvalOpen(true)}
              onOpenNotices={() => setNoticesOpen(true)}
            />
          </div>
        </div>

        {/* Student performance insight + Teacher alerts — placeholder data matches mockup until analytics & alert endpoints exist */}
        <div className="grid gap-6 xl:grid-cols-2">
          <PerformanceInsightCard />
          <TeacherAlertsCard />
        </div>
      </div>

      <PlannerEntryModal
        entry={plannerEntry}
        open={!!plannerEntry}
        onOpenChange={(v) => !v && setPlannerEntry(null)}
      />
      <AttendanceModal
        batchId={attBatch?.id ?? null}
        batchName={attBatch?.name ?? null}
        open={!!attBatch}
        onOpenChange={(v) => !v && setAttBatch(null)}
      />
      <EvaluationsModal open={evalOpen} onOpenChange={setEvalOpen} />
      <NoticesModal open={noticesOpen} onOpenChange={setNoticesOpen} />
      <LiveClassModal
        next={s?.upcoming_live.next ?? null}
        open={liveOpen}
        onOpenChange={setLiveOpen}
      />
    </div>
  )
}

function formatMode(mode: string): string {
  if (mode === "ON_SITE") return "On Site"
  if (mode === "LIVE_ONLINE" || mode === "ONLINE") return "Live"
  if (mode === "HYBRID") return "Hybrid"
  return mode
}

function modeBadgeClasses(mode: string): string {
  if (mode === "ON_SITE") return "bg-blue-100 text-blue-700"
  if (mode === "LIVE_ONLINE" || mode === "ONLINE") return "bg-violet-100 text-violet-700"
  if (mode === "HYBRID") return "bg-amber-100 text-amber-800"
  return "bg-slate-100 text-slate-600"
}

function PlannerStatusPill({
  status,
  minutesUntil,
}: {
  status: string
  minutesUntil: number
}) {
  if (status === "COMPLETED") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Completed
      </span>
    )
  }
  if (status === "ONGOING") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold text-violet-700">
        <span className="h-1.5 w-1.5 rounded-full bg-violet-500" /> Ongoing
      </span>
    )
  }
  if (minutesUntil > 0 && minutesUntil <= 60) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
        Starts in {minutesUntil}m
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
      <span className="h-1.5 w-1.5 rounded-full bg-slate-400" /> Upcoming
    </span>
  )
}

function PlannerRowActions({
  p,
  onOpen,
  onLive,
  onMaterial,
  onAssessment,
}: {
  p: PlannerEntry
  onOpen: () => void
  onLive: () => void
  onMaterial: () => void
  onAssessment: () => void
}) {
  const isLive = p.delivery_mode === "LIVE_ONLINE" || p.delivery_mode === "ONLINE"

  function startLive() {
    if (p.live_session_ref && /^https?:\/\//i.test(p.live_session_ref)) {
      window.open(p.live_session_ref, "_blank", "noopener,noreferrer")
    } else {
      onLive()
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {/* View — opens class details */}
      <button
        onClick={onOpen}
        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
      >
        <Eye className="h-3.5 w-3.5" /> View
      </button>

      {/* Start live — opens the live link in a new tab (live classes only) */}
      {isLive && (
        <button
          onClick={startLive}
          className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
        >
          <PlayCircle className="h-3.5 w-3.5" /> Start live
        </button>
      )}

      {/* Assessment — opens the assessment modal */}
      <button
        onClick={onAssessment}
        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
      >
        <FileText className="h-3.5 w-3.5" /> Assessment
      </button>

      {/* Material — opens the attachment popup. Hidden once an attachment exists. */}
      {!p.has_material && (
        <button
          onClick={onMaterial}
          className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
        >
          <Upload className="h-3.5 w-3.5" /> Material
        </button>
      )}
    </div>
  )
}

function useCountdown(targetIso: string | undefined) {
  const [now, setNow] = useState<number>(() => Date.now())
  useEffect(() => {
    if (!targetIso) return
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [targetIso])
  if (!targetIso) return null
  const diff = new Date(targetIso).getTime() - now
  if (diff <= 0) return "00:00:00"
  const totalSec = Math.floor(diff / 1000)
  const hh = String(Math.floor(totalSec / 3600)).padStart(2, "0")
  const mm = String(Math.floor((totalSec % 3600) / 60)).padStart(2, "0")
  const ss = String(totalSec % 60).padStart(2, "0")
  return `${hh}:${mm}:${ss}`
}

function NextLiveClassCard({
  next,
  startTime,
  endTime,
  onPrep,
  onStart,
}: {
  next: { id: string; title: string; scheduled_at: string; minutes_until: number; batch: { id: string; name: string } | null } | null
  startTime?: string
  endTime?: string
  onPrep: () => void
  onStart: () => void
}) {
  const countdown = useCountdown(next?.scheduled_at)
  const windowLabel =
    startTime && endTime
      ? `${startTime} – ${endTime}`
      : next
      ? formatTimeHm(next.scheduled_at)
      : "—"

  return (
    <section className="overflow-hidden rounded-3xl border border-violet-100 bg-linear-to-b from-violet-50 to-white p-5 shadow-sm">
      {/* Header row: label + LIVE badge */}
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-violet-700">
          <span className="h-1.5 w-1.5 rounded-full bg-violet-500" />
          Next live class
        </span>
        {next && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-violet-400 opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-violet-500" />
            </span>
            Live
          </span>
        )}
      </div>

      {next ? (
        <>
          {/* Title block */}
          <div className="mt-3">
            <h4 className="text-xl font-semibold leading-tight text-slate-900">{next.title}</h4>
            {next.batch?.name && (
              <div className="mt-0.5 text-xs text-slate-500">
                {next.batch.name}
                <span className="px-1.5 text-slate-300">·</span>
                Live class
              </div>
            )}
          </div>

          {/* Countdown + Window block */}
          <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                  Starts in
                </div>
                <div className="mt-1 font-serif text-3xl font-semibold leading-none text-slate-900 tabular-nums">
                  {countdown ?? "—"}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                  Window
                </div>
                <div className="mt-1 text-sm font-medium text-slate-700 tabular-nums">{windowLabel}</div>
              </div>
            </div>
          </div>

          {/* Prep checklist */}
          <ul className="mt-4 space-y-2.5 text-[13px]">
            <PrepItem label="Camera & mic checked" tone="ok" />
            <PrepItem label="Lecture slides attached (12 pages)" tone="ok" />
            <PrepItem
              label={`Quiz at ${startTime ?? formatTimeHm(next.scheduled_at)} — not yet pinned`}
              tone="warn"
            />
          </ul>

          {/* Action buttons */}
          <div className="mt-5 flex items-stretch gap-2">
            <button
              onClick={onStart}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800"
            >
              <PlayCircle className="h-4 w-4" /> Start live class
            </button>
            <button
              onClick={onPrep}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
            >
              <Paperclip className="h-3.5 w-3.5" /> Prep
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="mt-3">
            <h4 className="text-xl font-semibold leading-tight text-slate-400">No live class scheduled</h4>
            <div className="mt-0.5 text-xs text-slate-500">Your next live session will appear here.</div>
          </div>
          <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">Starts in</div>
                <div className="mt-1 font-serif text-3xl font-semibold leading-none text-slate-300 tabular-nums">
                  —
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">Window</div>
                <div className="mt-1 text-sm font-medium text-slate-300 tabular-nums">—</div>
              </div>
            </div>
          </div>
        </>
      )}
    </section>
  )
}

function PrepItem({ label, tone }: { label: string; tone: "ok" | "warn" | "neutral" }) {
  if (tone === "ok") {
    return (
      <li className="flex items-center gap-2 text-slate-700">
        <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
          <Check className="h-3 w-3" />
        </span>
        {label}
      </li>
    )
  }
  if (tone === "warn") {
    return (
      <li className="flex items-center gap-2 text-amber-700">
        <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-amber-100 text-amber-700">
          <AlertTriangle className="h-3 w-3" />
        </span>
        {label}
      </li>
    )
  }
  return (
    <li className="flex items-center gap-2 text-slate-500">
      <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-slate-100 text-slate-500">
        ·
      </span>
      {label}
    </li>
  )
}

function PendingWorkCard({
  loading,
  stats,
  onOpenAttendance,
  onOpenEvaluations,
  onOpenNotices,
}: {
  loading: boolean
  stats: ReturnType<typeof useTeacherStats>["data"]
  onOpenAttendance: (b: { id: string; name: string }) => void
  onOpenEvaluations: () => void
  onOpenNotices: () => void
}) {
  const count =
    (stats?.pending_attendance.batches?.length ?? 0) +
    (stats && stats.pending_evaluations.submission_count > 0 ? 1 : 0) +
    (stats && stats.unread_notices.count > 0 ? 1 : 0)

  return (
    <SectionCard
      icon={<ClipboardCheck className="h-4 w-4" />}
      iconTone="bg-amber-50 text-amber-600"
      title="Pending work"
      action={
        count > 0 ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-700">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-500" /> {count}
          </span>
        ) : null
      }
    >
      {loading ? (
        <LoadingBlock rows={3} />
      ) : (
        <div className="space-y-2">
          {stats?.pending_attendance.batches?.slice(0, 2).map((b) => (
            <PendingRow
              key={b.batch_id}
              icon={<ClipboardCheck className="h-3.5 w-3.5" />}
              tone="bg-rose-50 text-rose-600"
              title={`Take attendance — ${b.batch_name}`}
              detail="Window closes soon"
              action="Open"
              onClick={() => onOpenAttendance({ id: b.batch_id, name: b.batch_name })}
            />
          ))}

          {stats && stats.pending_evaluations.submission_count > 0 && (
            <PendingRow
              icon={<FileText className="h-3.5 w-3.5" />}
              tone="bg-amber-50 text-amber-600"
              title={`Grade — ${stats.pending_evaluations.submission_count} submissions left`}
              detail={`across ${stats.pending_evaluations.assessment_count} assessments`}
              action="Open"
              onClick={onOpenEvaluations}
            />
          )}

          {stats && stats.unread_notices.count > 0 && (
            <PendingRow
              icon={<BellRing className="h-3.5 w-3.5" />}
              tone="bg-violet-50 text-violet-600"
              title={`Notice from admin`}
              detail={
                stats.unread_notices.from_admin_count > 0
                  ? `${stats.unread_notices.from_admin_count} from admin`
                  : `${stats.unread_notices.count} unread`
              }
              action="Open"
              onClick={onOpenNotices}
            />
          )}

          {stats &&
            !stats.pending_attendance.batches?.length &&
            stats.pending_evaluations.submission_count === 0 &&
            stats.unread_notices.count === 0 && (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/40 p-6 text-center text-sm text-slate-500">
                All caught up — nothing pending right now.
              </div>
            )}
        </div>
      )}
    </SectionCard>
  )
}

function PendingRow({
  icon,
  tone,
  title,
  detail,
  action,
  onClick,
}: {
  icon: React.ReactNode
  tone: string
  title: string
  detail: string
  action: string
  onClick: () => void
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-3 hover:border-slate-200">
      <span className={`inline-flex h-8 w-8 items-center justify-center rounded-full ${tone}`}>{icon}</span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-slate-900">{title}</div>
        <div className="truncate text-xs text-slate-500">{detail}</div>
      </div>
      <button
        onClick={onClick}
        className="inline-flex items-center gap-1 rounded-lg text-xs font-medium text-indigo-600 hover:underline"
      >
        {action} <ArrowRight className="h-3 w-3" />
      </button>
    </div>
  )
}

function PerformanceInsightCard() {
  return (
    <SectionCard
      icon={<UserSquare2 className="h-4 w-4" />}
      iconTone="bg-violet-50 text-violet-600"
      title="Student performance insight"
      subtitle="Across your 6 assigned batches · last 14 days"
    >
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50/40 p-4">
          <div className="min-w-0">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Weakest topic</div>
            <div className="mt-1 truncate text-sm font-semibold text-slate-900">Quadratic equations — Class 9-B</div>
            <div className="mt-0.5 text-xs text-slate-500">Average 58% across 3 recent quizzes (–9 pts vs last month)</div>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-700">
            <TrendingDown className="h-3 w-3" /> –9
          </span>
        </div>

        <div className="flex items-start justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50/40 p-4">
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Low performers (3)</div>
            <div className="mt-1.5 flex items-center gap-2">
              <div className="flex -space-x-2">
                {["RA", "NJ", "TH"].map((initials, i) => (
                  <span
                    key={i}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-violet-100 text-[10px] font-semibold text-violet-700"
                  >
                    {initials}
                  </span>
                ))}
              </div>
              <span className="text-xs text-slate-600">scored below 40% on Math Quiz 3</span>
            </div>
          </div>
          <button className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">
            Review <ArrowRight className="h-3 w-3" />
          </button>
        </div>

        <div className="flex items-start justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50/40 p-4">
          <div className="min-w-0">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Absence pattern</div>
            <div className="mt-1 truncate text-sm font-semibold text-slate-900">Friday afternoon attendance ↓ 12%</div>
            <div className="mt-0.5 text-xs text-slate-500">Affecting Physics 10-C the most. Consider rescheduling.</div>
          </div>
          <span className="inline-flex shrink-0 items-center rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-violet-700">
            Pattern
          </span>
        </div>
      </div>
    </SectionCard>
  )
}

function TeacherAlertsCard() {
  const items = [
    {
      icon: <CalendarDays className="h-3.5 w-3.5" />,
      tone: "bg-rose-50 text-rose-600",
      title: "Physics 10-C — room changed",
      detail: "Moved from Room 308 to Room 311 by admin",
      time: "08:21",
    },
    {
      icon: <Video className="h-3.5 w-3.5" />,
      tone: "bg-amber-50 text-amber-600",
      title: "Live session — audio drops",
      detail: "Math 9-A live yesterday — 6 students affected",
      time: "13:02",
    },
    {
      icon: <ClipboardCheck className="h-3.5 w-3.5" />,
      tone: "bg-amber-50 text-amber-600",
      title: "Evaluation deadline tonight",
      detail: "Math Quiz 3 — finalize before 18:00",
      time: "09:00",
    },
  ]
  return (
    <SectionCard
      icon={<AlertTriangle className="h-4 w-4" />}
      iconTone="bg-slate-100 text-slate-600"
      title="Teacher alerts"
      subtitle="Schedule changes, overrides, deadlines"
      action={
        <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-700">
          <span className="h-1.5 w-1.5 rounded-full bg-rose-500" /> {items.length}
        </span>
      }
    >
      <div>
        {items.map((a, i) => (
          <div
            key={i}
            className="flex items-center gap-3 border-t border-slate-100 p-3"
          >
            <span className={`inline-flex h-8 w-8 items-center justify-center rounded-lg ${a.tone}`}>{a.icon}</span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] font-semibold text-slate-900">{a.title}</div>
              <div className="truncate text-xs text-slate-500">{a.detail}</div>
            </div>
            <span className="text-[11px] font-medium text-slate-400 tabular-nums">{a.time}</span>
          </div>
        ))}
      </div>
    </SectionCard>
  )
}
