"use client"

import {
  AlertTriangle,
  ArrowRight,
  BellRing,
  CalendarDays,
  GraduationCap,
  Plus,
  RefreshCw,
  Send,
  TrendingUp,
  UserPlus,
  Users,
  Video,
  Wallet,
} from "lucide-react"

import Link from "next/link"

import {
  formatBdt,
  formatDateLong,
  formatTimeHm,
  greetingFor,
  useAdminNonNormalOccurrences,
  useAdminStats,
  useAdminTodaysOps,
} from "./api"
import { EmptyState, LoadingBlock, SectionCard } from "./shared"

type AnyUser = any

function pickName(user: AnyUser) {
  for (const v of [user?.name, user?.full_name, user?.username]) {
    if (typeof v === "string" && v.trim()) return v.trim()
  }
  return "Admin"
}

const STATUS_TONES: Record<string, string> = {
  UPDATED: "bg-sky-100 text-sky-700",
  OVERRIDDEN: "bg-amber-100 text-amber-700",
  CANCELLED: "bg-rose-100 text-rose-700",
}

export default function AdminDashboard({ user }: { user: AnyUser }) {
  const name = pickName(user)

  const statsQ = useAdminStats()
  const opsQ = useAdminTodaysOps()
  const occQ = useAdminNonNormalOccurrences()

  const s = statsQ.data
  const ops = opsQ.data

  const kpis = [
    {
      label: "Active Students",
      value: s?.active_students.total != null ? String(s.active_students.total) : "—",
      hint:
        s?.active_students.enrolled_this_week != null
          ? `${s.active_students.enrolled_this_week} enrolled this week`
          : "No data",
      badge:
        s?.active_students.delta_pct != null && s.active_students.delta_pct !== 0
          ? `${s.active_students.delta_pct > 0 ? "+" : ""}${s.active_students.delta_pct}%`
          : null,
      icon: Users,
      tone: "text-indigo-600 bg-indigo-100",
      cornerTone: "bg-indigo-500",
    },
    {
      label: "Active Teachers",
      value: s?.active_teachers.total != null ? String(s.active_teachers.total) : "—",
      hint: s?.active_teachers.on_leave_today != null ? `${s.active_teachers.on_leave_today} on leave today` : "No data",
      icon: GraduationCap,
      tone: "text-sky-600 bg-sky-100",
      cornerTone: "bg-sky-500",
    },
    {
      label: "Pending Admissions",
      value: s?.pending_admissions.total != null ? String(s.pending_admissions.total) : "—",
      hint:
        s?.pending_admissions.awaiting_review != null ? `${s.pending_admissions.awaiting_review} awaiting review` : "No data",
      icon: UserPlus,
      tone: "text-amber-600 bg-amber-100",
      cornerTone: "bg-amber-500",
    },
    {
      label: "Today's Classes",
      value: s?.todays_classes.total != null ? String(s.todays_classes.total) : "—",
      hint:
        s?.todays_classes
          ? `${s.todays_classes.ongoing} ongoing · ${s.todays_classes.upcoming} upcoming`
          : "No data",
      icon: CalendarDays,
      tone: "text-violet-600 bg-violet-100",
      cornerTone: "bg-violet-500",
    },
    {
      label: "Pending Dues",
      value: s?.pending_dues.amount != null ? formatBdt(s.pending_dues.amount) : "—",
      hint:
        s?.pending_dues.overdue_invoice_count != null
          ? `${s.pending_dues.overdue_invoice_count} invoices overdue`
          : "No data",
      icon: Wallet,
      tone: "text-rose-600 bg-rose-100",
      cornerTone: "bg-rose-500",
    },
    {
      label: "Active Live Sessions",
      value: s?.active_live_sessions.count != null ? String(s.active_live_sessions.count) : "—",
      hint:
        s?.active_live_sessions.students_joined != null
          ? `${s.active_live_sessions.students_joined} students joined`
          : "No data",
      badge: s && s.active_live_sessions.count > 0 ? "Now" : null,
      icon: Video,
      tone: "text-emerald-600 bg-emerald-100",
      cornerTone: "bg-emerald-500",
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
              {formatDateLong(new Date().toISOString())}
              {s?.active_live_sessions.count ? ` · ${s.active_live_sessions.count} live sessions` : ""}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => {
                statsQ.refetch()
                opsQ.refetch()
                occQ.refetch()
              }}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </button>
            {/* <button className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700">
              <Plus className="h-3.5 w-3.5" />
              New admission
            </button> */}
          </div>
        </div>

        {/* KPI cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {kpis.map((k) => {
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
                      {k.badge !== "Now" && <TrendingUp className="h-3 w-3" />}
                      {k.badge}
                    </span>
                  )}
                </div>
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
            { label: "Review admissions", Icon: UserPlus, href: "/dashboard/admissions", count: s?.pending_admissions.total ?? null },
            { label: "Open schedule", Icon: CalendarDays, href: "/dashboard/timetable" },
            { label: "Manage students", Icon: Users, href: "/dashboard/students" },
            { label: "Manage teachers", Icon: GraduationCap, href: "/dashboard/teachers" },
            { label: "Send announcement", Icon: Send, href: "/dashboard/notices" },
          ].map((a) => (
            <Link
              key={a.label}
              href={a.href}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:border-indigo-200 hover:bg-indigo-50/40"
            >
              <a.Icon className="h-3.5 w-3.5" />
              <span>{a.label}</span>
              {a.count != null && a.count > 0 && (
                <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">{a.count}</span>
              )}
            </Link>
          ))}
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          {/* Today's academic operations */}
          <SectionCard
            icon={<CalendarDays className="h-4 w-4" />}
            iconTone="bg-violet-50 text-violet-600"
            title="Today's academic operations"
            subtitle={ops ? formatDateLong(ops.date) : undefined}
            action={
              <button className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:underline">
                <Link href="/dashboard/timetable">View full schedule</Link> <ArrowRight className="h-3.5 w-3.5" />
              </button>
            }
          >
            {opsQ.isLoading ? (
              <LoadingBlock rows={1} />
            ) : !ops ? (
              <EmptyState icon={<CalendarDays className="h-5 w-5" />} title="No data" />
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {[
                  { v: ops.classes_today, l: "Classes today" },
                  { v: ops.live_upcoming, l: "Live upcoming" },
                  { v: ops.cancelled_or_overridden, l: "Cancelled / overridden" },
                ].map((t) => (
                  <div key={t.l} className="rounded-2xl bg-slate-50 p-3 text-center">
                    <div className="text-2xl font-semibold text-slate-900 tabular-nums">{t.v}</div>
                    <div className="mt-1 text-[11px] text-slate-500">{t.l}</div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-5">
              <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Non-normal occurrences</div>
              <div className="mt-3 space-y-2">
                {occQ.isLoading ? (
                  <LoadingBlock rows={2} />
                ) : !occQ.data || occQ.data.data.length === 0 ? (
                  <EmptyState icon={<CalendarDays className="h-5 w-5" />} title="No exceptions in the next 7 days" />
                ) : (
                  occQ.data.data.map((o) => (
                    <div key={o.override_id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/50 p-3">
                      <div>
                        <div className="text-sm font-medium text-slate-900">
                          {o.subject?.name ?? "Class"}
                          {o.batch?.name && ` — ${o.batch.name}`}
                        </div>
                        <div className="mt-0.5 text-xs text-slate-500">
                          {o.teacher?.name ?? "—"} · <span className="tabular-nums">{o.start_time} – {o.end_time}</span>
                          {o.room?.name && ` · ${o.room.name}`}
                        </div>
                      </div>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_TONES[o.change_kind] ?? "bg-slate-100 text-slate-700"}`}>
                        {o.change_kind}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </SectionCard>

          {/* Payment & billing (no dedicated endpoint — derive from stats.pending_dues) */}
          <SectionCard
            icon={<Wallet className="h-4 w-4" />}
            iconTone="bg-emerald-50 text-emerald-600"
            title="Payment & billing"
            subtitle="Current cycle"
            action={
              <button className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:underline">
                <Link href="/dashboard/payments">View details</Link> <ArrowRight className="h-3.5 w-3.5" />
              </button>
            }
          >
            {statsQ.isLoading ? (
              <LoadingBlock rows={2} />
            ) : !s ? (
              <EmptyState icon={<Wallet className="h-5 w-5" />} title="No billing data" />
            ) : (
              <>
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <div className="text-3xl font-semibold text-slate-900 tabular-nums">
                      {s.pending_dues.amount != null ? formatBdt(s.pending_dues.amount) : "—"}
                    </div>
                    <div className="text-xs text-slate-500">Outstanding dues</div>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-slate-50 p-3">
                    <div className="text-[11px] text-slate-500">Overdue invoices</div>
                    <div className="mt-1 text-lg font-semibold text-slate-900 tabular-nums">
                      {s.pending_dues.overdue_invoice_count}
                    </div>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3">
                    <div className="text-[11px] text-slate-500">Currency</div>
                    <div className="mt-1 text-lg font-semibold text-slate-900">{s.pending_dues.currency}</div>
                  </div>
                </div>
              </>
            )}
          </SectionCard>
        </div>

        {/* Admissions queue — no dashboard endpoint, link out */}
        <SectionCard
          icon={<UserPlus className="h-4 w-4" />}
          iconTone="bg-amber-50 text-amber-600"
          title="Admissions queue"
          subtitle={
            s?.pending_admissions.total != null
              ? `${s.pending_admissions.total} pending · ${s.pending_admissions.awaiting_review} awaiting review`
              : undefined
          }
          action={
            <Link href="/dashboard/admissions" className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:underline">
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          }
        >
          <EmptyState
            icon={<UserPlus className="h-5 w-5" />}
            title="Open the Admissions module"
            detail="Detailed applicant list lives in the Admissions section."
          />
        </SectionCard>

        {/* Alerts placeholder + recent live occurrences */}
        <div className="grid gap-6 xl:grid-cols-2">
          <SectionCard
            icon={<AlertTriangle className="h-4 w-4" />}
            iconTone="bg-rose-50 text-rose-600"
            title="Alerts & exceptions"
            subtitle="Things that need attention now"
          >
            {occQ.isLoading ? (
              <LoadingBlock rows={3} />
            ) : !occQ.data || occQ.data.data.length === 0 ? (
              <EmptyState icon={<AlertTriangle className="h-5 w-5" />} title="No alerts" detail="No exceptions raised in the next 7 days." />
            ) : (
              <div className="space-y-2">
                {occQ.data.data.slice(0, 5).map((o) => (
                  <div key={o.override_id} className="flex items-start gap-3 rounded-xl bg-slate-50 p-3">
                    <span className="rounded-lg bg-white p-1.5 text-rose-600">
                      <AlertTriangle className="h-3.5 w-3.5" />
                    </span>
                    <div className="flex-1 text-sm">
                      <div className="font-medium text-slate-900">
                        {o.change_kind} — {o.subject?.name ?? "Class"}
                      </div>
                      <div className="text-xs text-slate-500">
                        {o.batch?.name ?? "—"} · {formatTimeHm(o.scheduled_start_at)}
                        {o.reason && ` · ${o.reason}`}
                      </div>
                    </div>
                    <span className="whitespace-nowrap text-[11px] text-slate-400">
                      {o.is_today ? "Today" : new Date(o.date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          <SectionCard
            icon={<BellRing className="h-4 w-4" />}
            iconTone="bg-sky-50 text-sky-600"
            title="Communication & notice"
            action={
              <Link href="/dashboard/notices" className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:underline">
                Open notices <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            }
          >
            <EmptyState icon={<BellRing className="h-5 w-5" />} title="Open the Notices module" detail="Recent announcements and delivery health live there." />
          </SectionCard>
        </div>
      </div>
    </div>
  )
}
