"use client"

import { useState } from "react"
import {
  AlertTriangle,
  ArrowRight,
  BellRing,
  CalendarDays,
  ClipboardCheck,
  FileText,
  Library,
  Plus,
  RefreshCw,
  Upload,
  Users,
  Video,
} from "lucide-react"

import Link from "next/link"

import {
  formatDateLong,
  formatTimeHm,
  greetingFor,
  useTeacherPlanner,
  useTeacherStats,
} from "./api"
import { EmptyState, LoadingBlock, SectionCard } from "./shared"

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
  const [range, setRange] = useState<"today" | "week">("today")

  const statsQ = useTeacherStats()
  const plannerQ = useTeacherPlanner(range)

  const s = statsQ.data

  const kpis = [
    {
      label: "Today's Classes",
      value: s?.todays_classes.total != null ? String(s.todays_classes.total) : "—",
      hint:
        s?.todays_classes
          ? `${s.todays_classes.done ?? 0} done · ${s.todays_classes.ongoing ?? 0} ongoing · ${s.todays_classes.upcoming ?? 0} upcoming`
          : "No data",
      icon: CalendarDays,
      tone: "text-indigo-600 bg-indigo-50",
    },
    {
      label: "Pending Attendance",
      value: s?.pending_attendance.count != null ? String(s.pending_attendance.count) : "—",
      hint:
        s?.pending_attendance.batches?.length
          ? s.pending_attendance.batches.map((b) => b.batch_name).join(" & ")
          : "Nothing pending",
      icon: ClipboardCheck,
      tone: "text-amber-600 bg-amber-50",
    },
    {
      label: "Pending Evaluations",
      value: s?.pending_evaluations.submission_count != null ? String(s.pending_evaluations.submission_count) : "—",
      hint:
        s?.pending_evaluations.assessment_count != null
          ? `across ${s.pending_evaluations.assessment_count} assessments`
          : "No data",
      icon: FileText,
      tone: "text-rose-600 bg-rose-50",
    },
    {
      label: "Upcoming Live",
      value: s?.upcoming_live.count != null ? String(s.upcoming_live.count) : "—",
      hint:
        s?.upcoming_live.next
          ? `${s.upcoming_live.next.title} · in ${s.upcoming_live.next.minutes_until} min`
          : "Nothing scheduled",
      icon: Video,
      tone: "text-emerald-600 bg-emerald-50",
    },
    {
      label: "Unread Notices",
      value: s?.unread_notices.count != null ? String(s.unread_notices.count) : "—",
      hint:
        s?.unread_notices.from_admin_count
          ? `${s.unread_notices.from_admin_count} from admin`
          : "No new notices",
      icon: BellRing,
      tone: "text-sky-600 bg-sky-50",
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
              <div key={k.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <span className={`inline-flex rounded-xl p-2 ${k.tone}`}>
                  <Icon className="h-5 w-5" />
                </span>
                <div className="mt-3">
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
            { label: "Take attendance", Icon: ClipboardCheck, href: "/dashboard/teacher-attendance" },
            { label: "Upload material", Icon: Upload, href: "/dashboard/content" },
            { label: "Create assessment", Icon: Plus, href: "/dashboard/assessments" },
            { label: "Review submissions", Icon: FileText, href: "/dashboard/assessments", count: s?.pending_evaluations.submission_count ?? null },
            { label: "View schedule", Icon: CalendarDays, href: "/dashboard/timetable" },
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
            title="Teaching planner"
            subtitle={
              plannerQ.data
                ? `${range === "today" ? "Today" : "This week"} · ${plannerQ.data.total_count} classes assigned`
                : undefined
            }
            action={
              <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-xs">
                <button
                  onClick={() => setRange("today")}
                  className={`rounded-md px-2.5 py-1 font-medium ${range === "today" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                >
                  Today
                </button>
                <button
                  onClick={() => setRange("week")}
                  className={`rounded-md px-2.5 py-1 font-medium ${range === "week" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                >
                  This week
                </button>
              </div>
            }
          >
            {plannerQ.isLoading ? (
              <LoadingBlock rows={3} />
            ) : !plannerQ.data || plannerQ.data.data.length === 0 ? (
              <EmptyState icon={<CalendarDays className="h-5 w-5" />} title="No classes" detail="Nothing on your planner for this range." />
            ) : (
              <div className="space-y-2">
                {plannerQ.data.data.map((p) => (
                  <div
                    key={p.entry_id + p.date}
                    className={`flex flex-col gap-3 rounded-2xl border p-3 sm:flex-row sm:items-center sm:gap-4 ${
                      p.status === "COMPLETED"
                        ? "border-slate-100 bg-slate-50/40 opacity-80"
                        : p.is_now
                        ? "border-sky-200 bg-sky-50/40"
                        : "border-slate-100 bg-white"
                    }`}
                  >
                    <div className="flex w-24 shrink-0 flex-col items-start">
                      <span className="text-sm font-medium text-slate-900 tabular-nums">{p.start_time}</span>
                      <span className="text-[11px] text-slate-500 tabular-nums">→ {p.end_time}</span>
                      {p.is_now && (
                        <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          Now
                        </span>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-slate-900">{p.subject?.name ?? "Class"}</span>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">{p.delivery_mode}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusTone(p.status, p.is_now)}`}>
                          {statusLabel(p.status, p.minutes_until_start)}
                        </span>
                        {p.is_overridden && (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">Updated</span>
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
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {p.delivery_mode === "ONLINE" && p.status !== "COMPLETED" ? (
                        <button className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700">
                          Start live
                        </button>
                      ) : (
                        <button className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">
                          Open
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          {/* Next live class + pending work */}
          <div className="space-y-6">
            {/* Next live class — styled card matching mockup */}
            <section className="rounded-3xl border border-rose-100 bg-linear-to-br from-rose-50/60 to-amber-50/40 p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1 text-xs font-medium text-rose-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-rose-600" />
                  Next live class
                </span>
                {s?.upcoming_live.next && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-semibold text-rose-700">
                    <Video className="h-3 w-3" /> Live
                  </span>
                )}
              </div>

              {s?.upcoming_live.next ? (
                <>
                  <div className="mt-2 text-xl font-semibold text-slate-900">
                    {s.upcoming_live.next.title}
                  </div>
                  {s.upcoming_live.next.batch?.name && (
                    <div className="text-xs text-slate-500">{s.upcoming_live.next.batch.name}</div>
                  )}

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-white p-3">
                      <div className="text-[11px] text-slate-500">Starts in</div>
                      <div className="text-xl font-semibold text-slate-900 tabular-nums">
                        {s.upcoming_live.next.minutes_until > 0
                          ? `${s.upcoming_live.next.minutes_until} min`
                          : "Now"}
                      </div>
                    </div>
                    <div className="rounded-xl bg-white p-3">
                      <div className="text-[11px] text-slate-500">Scheduled</div>
                      <div className="text-sm font-medium text-slate-900 tabular-nums">
                        {formatTimeHm(s.upcoming_live.next.scheduled_at)}
                      </div>
                    </div>
                  </div>

                  {/* Prep checklist — no backend signal, render neutral defaults */}
                  <ul className="mt-4 space-y-1.5 text-xs">
                    <li className="flex items-center gap-2 text-slate-500">
                      <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-slate-100">·</span>
                      Camera &amp; mic check pending
                    </li>
                    <li className="flex items-center gap-2 text-slate-500">
                      <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-slate-100">·</span>
                      Lecture material not attached
                    </li>
                    <li className="flex items-center gap-2 text-slate-500">
                      <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-slate-100">·</span>
                      In-class quiz not pinned
                    </li>
                  </ul>

                  <div className="mt-4 flex gap-2">
                    <button className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-rose-600 px-3 py-2 text-xs font-semibold text-white hover:bg-rose-700">
                      <Video className="h-3.5 w-3.5" /> Start live class
                    </button>
                    <button className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50">
                      <FileText className="h-3.5 w-3.5" /> Prep
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="mt-2 text-xl font-semibold text-slate-400">No live class scheduled</div>
                  <div className="text-xs text-slate-500">Your next live session will appear here.</div>
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-white p-3">
                      <div className="text-[11px] text-slate-500">Starts in</div>
                      <div className="text-xl font-semibold text-slate-300 tabular-nums">—</div>
                    </div>
                    <div className="rounded-xl bg-white p-3">
                      <div className="text-[11px] text-slate-500">Scheduled</div>
                      <div className="text-sm font-medium text-slate-300 tabular-nums">—</div>
                    </div>
                  </div>
                </>
              )}
            </section>

            {/* Pending work — list style matching mockup */}
            <SectionCard
              icon={<ClipboardCheck className="h-4 w-4" />}
              iconTone="bg-amber-50 text-amber-600"
              title="Pending work"
              subtitle={
                s
                  ? `${(s.pending_attendance.count ?? 0) + (s.pending_evaluations.submission_count > 0 ? 1 : 0) + (s.unread_notices.count > 0 ? 1 : 0)} items`
                  : undefined
              }
            >
              {statsQ.isLoading ? (
                <LoadingBlock rows={3} />
              ) : (
                <div className="space-y-2">
                  {s?.pending_attendance.batches?.length
                    ? s.pending_attendance.batches.slice(0, 2).map((b) => (
                        <div key={b.batch_id} className="flex items-start gap-3 rounded-xl bg-slate-50 p-3">
                          <span className="rounded-lg bg-white p-1.5 text-amber-600">
                            <ClipboardCheck className="h-3.5 w-3.5" />
                          </span>
                          <div className="flex-1">
                            <div className="text-sm font-medium text-slate-900">Take attendance — {b.batch_name}</div>
                            <div className="text-xs text-slate-500">Window closes soon</div>
                          </div>
                          <Link
                            href="/dashboard/teacher-attendance"
                            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-white"
                          >
                            Open
                          </Link>
                        </div>
                      ))
                    : null}

                  {s && s.pending_evaluations.submission_count > 0 && (
                    <div className="flex items-start gap-3 rounded-xl bg-slate-50 p-3">
                      <span className="rounded-lg bg-white p-1.5 text-rose-600">
                        <FileText className="h-3.5 w-3.5" />
                      </span>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-slate-900">
                          Grade — {s.pending_evaluations.submission_count} submissions left
                        </div>
                        <div className="text-xs text-slate-500">
                          across {s.pending_evaluations.assessment_count} assessments
                        </div>
                      </div>
                      <Link
                        href="/dashboard/assessments"
                        className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-white"
                      >
                        Open
                      </Link>
                    </div>
                  )}

                  {s && s.unread_notices.count > 0 && (
                    <div className="flex items-start gap-3 rounded-xl bg-slate-50 p-3">
                      <span className="rounded-lg bg-white p-1.5 text-violet-600">
                        <BellRing className="h-3.5 w-3.5" />
                      </span>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-slate-900">
                          {s.unread_notices.count} unread {s.unread_notices.count === 1 ? "notice" : "notices"}
                        </div>
                        {s.unread_notices.from_admin_count > 0 && (
                          <div className="text-xs text-slate-500">
                            {s.unread_notices.from_admin_count} from admin
                          </div>
                        )}
                      </div>
                      <Link
                        href="/dashboard/notices"
                        className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-white"
                      >
                        Open
                      </Link>
                    </div>
                  )}

                  {s &&
                    !s.pending_attendance.batches?.length &&
                    s.pending_evaluations.submission_count === 0 &&
                    s.unread_notices.count === 0 && (
                      <div className="rounded-xl bg-slate-50 p-4 text-center text-sm text-slate-500">
                        All caught up — nothing pending right now.
                      </div>
                    )}
                </div>
              )}
            </SectionCard>
          </div>
        </div>

        {/* Student performance insight + Teacher alerts — keep mockup structure */}
        <div className="grid gap-6 xl:grid-cols-2">
          {/* Performance insight — 3-card layout from mockup, empty content (no analytics endpoint) */}
          <SectionCard
            icon={<Users className="h-4 w-4" />}
            iconTone="bg-violet-50 text-violet-600"
            title="Student performance insight"
            subtitle="Across your assigned batches"
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50/50 p-3">
                <div>
                  <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Weakest topic</div>
                  <div className="mt-0.5 text-sm font-medium text-slate-400">No data available</div>
                  <div className="mt-0.5 text-xs text-slate-400">Connect an analytics endpoint to surface weak topics.</div>
                </div>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">—</span>
              </div>

              <div className="flex items-start justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50/50 p-3">
                <div className="flex-1">
                  <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Low performers</div>
                  <div className="mt-1.5 flex items-center gap-2">
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-200 text-[10px] font-semibold text-slate-500">—</span>
                    <span className="text-xs text-slate-400">No performance data yet</span>
                  </div>
                </div>
                <button
                  disabled
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-400"
                >
                  Review
                </button>
              </div>

              <div className="flex items-start justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50/50 p-3">
                <div>
                  <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Absence pattern</div>
                  <div className="mt-0.5 text-sm font-medium text-slate-400">No pattern detected</div>
                  <div className="mt-0.5 text-xs text-slate-400">Attendance trends will appear when enough data is recorded.</div>
                </div>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">Pattern</span>
              </div>
            </div>
          </SectionCard>

          {/* Teacher alerts — list structure with empty rows */}
          <SectionCard
            icon={<AlertTriangle className="h-4 w-4" />}
            iconTone="bg-rose-50 text-rose-600"
            title="Teacher alerts"
            subtitle="Schedule changes, overrides, deadlines"
            action={
              <Link
                href="/dashboard/notices"
                className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:underline"
              >
                Notices <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            }
          >
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/40 p-6 text-center">
              <span className="mx-auto mb-2 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-500 shadow-sm">
                <AlertTriangle className="h-5 w-5" />
              </span>
              <div className="text-sm font-medium text-slate-700">No alerts right now</div>
              <div className="mt-1 text-xs text-slate-500">
                Schedule overrides and deadline reminders will appear here.
              </div>
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  )
}
