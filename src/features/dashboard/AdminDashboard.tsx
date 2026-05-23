"use client"

import {
  AlertTriangle,
  ArrowRight,
  BellRing,
  CalendarDays,
  Check,
  GraduationCap,
  Pin,
  Plus,
  RefreshCw,
  Send,
  TrendingDown,
  TrendingUp,
  UserPlus,
  Users,
  Video,
  Wallet,
} from "lucide-react"

import Link from "next/link"
import { useState } from "react"
import { useQuery } from "@tanstack/react-query"

import {
  formatBdt,
  formatDateLong,
  formatTimeHm,
  greetingFor,
  timeAgo,
  useAdminAdmissionsQueue,
  useAdminBillingDueThisWeek,
  useAdminBillingOverdue30dPlus,
  useAdminBillingPendingVerify,
  useAdminBillingTodaysCollected,
  useAdminDeliveryHealth,
  useAdminNonNormalOccurrences,
  useAdminRevenueChart,
  useAdminStats,
  useAdminTodaysOps,
} from "./api"
import type { AdmissionQueueItem, AdmissionQueueStatus, AdmissionQueueTag } from "./api"
import { EmptyState, LoadingBlock, SectionCard } from "./shared"
import noticesApi from "@/features/notices/api"
import type { Audience, NoticeDetail, NoticeSummary } from "@/features/notices/types"

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

const ROLE_PLURALS: Record<string, string> = {
  STUDENT: "All students",
  TEACHER: "All teachers",
  ADMIN: "All admins",
  ACCOUNTANT: "All accountants",
  EMPLOYEE: "All staff",
}

/** Human-readable audience summary for a notice. */
function audienceLabel(a?: Audience): string {
  if (!a) return "—"
  switch (a.audience_type) {
    case "ALL":
      return "Everyone"
    case "ROLE":
      return (a.role_targets ?? [])
        .map((r) => ROLE_PLURALS[r.toUpperCase()] ?? r)
        .join(" · ") || "Selected roles"
    case "CLASS": {
      const n = a.class_ids?.length ?? 0
      return `${n} ${n === 1 ? "class" : "classes"}`
    }
    case "BATCH": {
      const n = a.batch_ids?.length ?? 0
      return `${n} ${n === 1 ? "batch" : "batches"}`
    }
    case "USER": {
      const n = a.user_ids?.length ?? 0
      return `${n} ${n === 1 ? "person" : "people"}`
    }
    default:
      return "—"
  }
}

/** Full taka amount with Indian (lakh) grouping — "৳ 12,84,500". */
function formatTaka(value: number | string | null | undefined): string {
  const n = typeof value === "string" ? Number(value) : value
  if (n == null || Number.isNaN(n)) return "৳ —"
  return `৳ ${Math.round(n).toLocaleString("en-IN")}`
}

/** Short "16 May · 09:00" sent-at label. */
function formatSentAt(iso?: string | null): string {
  if (!iso) return "not sent"
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return "not sent"
  const date = d.toLocaleDateString("en-GB", { day: "numeric", month: "short" })
  const time = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
  return `sent ${date} · ${time}`
}

export default function AdminDashboard({ user }: { user: AnyUser }) {
  const name = pickName(user)

  const statsQ = useAdminStats()
  const opsQ = useAdminTodaysOps()
  const occQ = useAdminNonNormalOccurrences()
  const revenueQ = useAdminRevenueChart()
  const dueThisWeekQ = useAdminBillingDueThisWeek()
  const overdue30Q = useAdminBillingOverdue30dPlus()
  const collectedQ = useAdminBillingTodaysCollected()
  const pendingVerifyQ = useAdminBillingPendingVerify()
  const deliveryHealthQ = useAdminDeliveryHealth()
  const admissionsQ = useAdminAdmissionsQueue()
  const [admFilter, setAdmFilter] = useState<"pending" | "all">("pending")

  const tenantId = String(user?.tenant_id ?? user?.tenantId ?? user?.tenant?.id ?? "")
  const noticesQ = useQuery({
    queryKey: ["admin-dashboard", "recent-notices", tenantId],
    queryFn: () =>
      noticesApi.adminList(tenantId, { page: 1, limit: 3, state: "PUBLISHED" }),
    enabled: !!tenantId,
  })
  const recentNotices: NoticeSummary[] = noticesQ.data?.data ?? []
  const noticeIds = recentNotices.map((n) => n.id)

  // Fetch per-notice detail to get recipient count + audience (not in the list payload).
  const detailsQ = useQuery({
    queryKey: ["admin-dashboard", "recent-notice-details", tenantId, noticeIds],
    queryFn: async () => {
      const results = await Promise.all(
        noticeIds.map((id) => noticesApi.getOne(tenantId, id)),
      )
      return results.map((r) => r.notice)
    },
    enabled: !!tenantId && noticeIds.length > 0,
  })
  const detailById = new Map<string, NoticeDetail>(
    (detailsQ.data ?? []).map((d) => [d.id, d]),
  )

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
                noticesQ.refetch()
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

        <div className="grid gap-6 xl:grid-cols-[1.55fr_1fr]">
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

          {/* Payment & billing — revenue chart (GET /api/v1/accounting/dashboard/revenue-chart) */}
          <SectionCard
            icon={<Wallet className="h-4 w-4" />}
            iconTone="bg-emerald-50 text-emerald-600"
            title="Payment & billing"
            subtitle="Revenue collected over the last 12 months"
            action={
              <Link
                href="/dashboard/accountant/revenue"
                className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:underline"
              >
                View details <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            }
          >
            {revenueQ.isLoading ? (
              <LoadingBlock rows={2} />
            ) : !revenueQ.data || revenueQ.data.monthly.length === 0 ? (
              <EmptyState
                icon={<Wallet className="h-5 w-5" />}
                title="No revenue data"
                detail="Revenue collected this cycle will appear here."
              />
            ) : (
              (() => {
                const months = revenueQ.data.monthly
                const current = months[months.length - 1]
                const previous = months[months.length - 2]
                const currentAmt = Number(current?.total_amount ?? 0)
                const prevAmt = Number(previous?.total_amount ?? 0)
                const deltaPct =
                  prevAmt > 0 ? ((currentAmt - prevAmt) / prevAmt) * 100 : null
                const prevAbbr = previous?.month_label?.split(" ")[0]?.toUpperCase() ?? ""
                const max = Math.max(...months.map((m) => Number(m.total_amount) || 0), 1)
                const up = (deltaPct ?? 0) >= 0
                return (
                  <div className="rounded-2xl bg-linear-to-br from-violet-50 via-violet-50/40 to-white p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-3xl font-bold tracking-tight text-slate-900 tabular-nums">
                          {formatTaka(currentAmt)}
                        </div>
                        <div className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                          Collected this month
                        </div>
                      </div>
                      {deltaPct != null && (
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                            up
                              ? "bg-emerald-50 text-emerald-600"
                              : "bg-rose-50 text-rose-600"
                          }`}
                        >
                          {up ? (
                            <TrendingUp className="h-3.5 w-3.5" />
                          ) : (
                            <TrendingDown className="h-3.5 w-3.5" />
                          )}
                          {`${up ? "+" : ""}${deltaPct.toFixed(0)}%`}
                          {prevAbbr && ` VS ${prevAbbr}`}
                        </span>
                      )}
                    </div>

                    {/* Monthly bar chart */}
                    <div className="mt-5 flex h-24 items-end gap-1.5">
                      {months.map((m, i) => {
                        const val = Number(m.total_amount) || 0
                        const heightPct = Math.max(6, (val / max) * 100)
                        const isRecent = i >= months.length - 2
                        return (
                          <div
                            key={m.month_key}
                            title={`${m.month_label}: ${formatTaka(val)}`}
                            className="flex-1 rounded-md transition-colors"
                            style={{
                              height: `${heightPct}%`,
                              backgroundColor: isRecent ? "#6D4FE0" : "#E4DEFA",
                            }}
                          />
                        )
                      })}
                    </div>
                    <div className="mt-2 flex justify-between text-[10px] text-slate-400">
                      <span>{months[0]?.month_label}</span>
                      <span>{current?.month_label}</span>
                    </div>
                  </div>
                )
              })()
            )}

            {/* Billing summary cards */}
            <div className="mt-4 grid grid-cols-2 gap-3">
              <BillingCard
                label="Due this week"
                dot="#F59E0B"
                loading={dueThisWeekQ.isLoading}
                value={dueThisWeekQ.data ? String(dueThisWeekQ.data.count) : "—"}
                sub={dueThisWeekQ.data ? formatBdt(dueThisWeekQ.data.amount) : undefined}
              />
              <BillingCard
                label="Overdue 30d+"
                dot="#EF4444"
                loading={overdue30Q.isLoading}
                value={overdue30Q.data ? String(overdue30Q.data.count) : "—"}
                sub={overdue30Q.data ? formatBdt(overdue30Q.data.amount) : undefined}
              />
              <BillingCard
                label="Today's collected"
                dot="#10B981"
                loading={collectedQ.isLoading}
                value={collectedQ.data ? formatBdt(collectedQ.data.amount) : "—"}
                sub={
                  collectedQ.data ? `${collectedQ.data.invoice_count} invoices` : undefined
                }
              />
              <BillingCard
                label="Pending verify"
                dot="#3B82F6"
                loading={pendingVerifyQ.isLoading}
                value={pendingVerifyQ.data ? String(pendingVerifyQ.data.count) : "—"}
                sub={pendingVerifyQ.data?.source}
              />
            </div>
          </SectionCard>
        </div>

        {/* Admissions queue + Alerts & exceptions */}
        <div className="grid gap-6 xl:grid-cols-[1.55fr_1fr]">
          {/* Admissions queue */}
          <section className="min-w-0 rounded-3xl border border-slate-200 bg-white shadow-sm">
            <header className="flex flex-col gap-3 p-5 pb-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-3">
                <span className="rounded-xl bg-amber-50 p-2 text-amber-600">
                  <UserPlus className="h-4 w-4" />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-semibold text-slate-900">Admissions queue</h3>
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                      {admissionsQ.data?.total_pending ?? 0} PENDING
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    {admissionsQ.data?.total_pending ?? 0} applications awaiting review
                    {admissionsQ.data?.last_submitted_at
                      ? ` · last submitted ${timeAgo(admissionsQ.data.last_submitted_at)}`
                      : ""}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="inline-flex rounded-lg bg-slate-100 p-0.5">
                  {(["pending", "all"] as const).map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setAdmFilter(f)}
                      className={`rounded-md px-3 py-1 text-xs font-medium capitalize transition ${
                        admFilter === f
                          ? "bg-[#101014] text-white"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
                <Link
                  href="/dashboard/admissions"
                  className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:underline"
                >
                  View all <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </header>

            {admissionsQ.isLoading ? (
              <div className="p-5 pt-2">
                <LoadingBlock rows={4} />
              </div>
            ) : (
              (() => {
                const items = admissionsQ.data?.items ?? []
                const shown =
                  admFilter === "pending"
                    ? items.filter((i) => i.status === "PENDING")
                    : items
                if (shown.length === 0) {
                  return (
                    <div className="p-5 pt-2">
                      <EmptyState
                        icon={<UserPlus className="h-5 w-5" />}
                        title="No applications in this view"
                        detail="New admission applications awaiting review will appear here."
                      />
                    </div>
                  )
                }
                return (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-y border-slate-100 bg-slate-50/60 text-[10px] uppercase tracking-wide text-slate-400">
                          <th className="px-5 py-2 text-left font-semibold">Applicant</th>
                          <th className="px-3 py-2 text-left font-semibold">Submitted</th>
                          <th className="px-3 py-2 text-left font-semibold">Status</th>
                          <th className="px-5 py-2" />
                        </tr>
                      </thead>
                      <tbody>
                        {shown.map((it) => (
                          <AdmissionRow key={it.application_id} item={it} />
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              })()
            )}
          </section>

          {/* Alerts & exceptions */}
          <section className="min-w-0 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <header className="mb-4 flex items-start gap-3">
              <span className="rounded-xl bg-rose-50 p-2 text-rose-600">
                <AlertTriangle className="h-4 w-4" />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-semibold text-slate-900">Alerts & exceptions</h3>
                  {!!occQ.data?.data.length && (
                    <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-semibold text-rose-700">
                      {occQ.data.data.length} OPEN
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500">
                  Things that need someone&apos;s attention now
                </p>
              </div>
            </header>

            {occQ.isLoading ? (
              <LoadingBlock rows={4} />
            ) : !occQ.data || occQ.data.data.length === 0 ? (
              <EmptyState
                icon={<AlertTriangle className="h-5 w-5" />}
                title="No alerts"
                detail="No exceptions raised in the next 7 days."
              />
            ) : (
              <>
                <div className="divide-y divide-slate-100">
                  {occQ.data.data.slice(0, 5).map((o) => (
                    <div key={o.override_id} className="flex items-start gap-3 py-3">
                      <span className="mt-0.5 rounded-lg bg-rose-50 p-1.5 text-rose-600">
                        <AlertTriangle className="h-3.5 w-3.5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 text-sm font-medium text-slate-900">
                          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-rose-500" />
                          <span className="truncate">
                            {o.change_kind} — {o.subject?.name ?? "Class"}
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {o.batch?.name ?? "—"} · {formatTimeHm(o.scheduled_start_at)}
                          {o.reason ? ` · ${o.reason}` : ""}
                        </p>
                      </div>
                      <span className="whitespace-nowrap text-[11px] text-slate-400">
                        {o.is_today
                          ? "Today"
                          : new Date(o.date).toLocaleDateString("en-GB", {
                              day: "numeric",
                              month: "short",
                            })}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-2 text-center">
                  <Link
                    href="/dashboard/timetable"
                    className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:underline"
                  >
                    View all alerts <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </>
            )}
          </section>
        </div>

        {/* Communication & notice */}
        <SectionCard
          icon={<BellRing className="h-4 w-4" />}
          iconTone="bg-sky-50 text-sky-600"
          title="Communication & notice"
          subtitle="Recent announcements, unread by audience, delivery health"
          action={
            <div className="flex items-center gap-2">
              <Link
                href="/dashboard/notices"
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                <Plus className="h-3.5 w-3.5" /> Compose notice
              </Link>
              <Link
                href="/dashboard/notices"
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#101014] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#1f1f25]"
              >
                <Send className="h-3.5 w-3.5" /> Send SMS
              </Link>
            </div>
          }
        >
          <div className="grid gap-5 lg:grid-cols-3">
            {/* Recent notices */}
            <div className="lg:col-span-2">
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                Recent notices
              </div>
              {noticesQ.isLoading ? (
                <LoadingBlock rows={3} />
              ) : recentNotices.length === 0 ? (
                <EmptyState
                  icon={<BellRing className="h-5 w-5" />}
                  title="No published notices"
                  detail="Compose and publish a notice to broadcast it to your community."
                />
              ) : (
                <div className="space-y-2">
                  {recentNotices.map((n) => {
                    const d = detailById.get(n.id)
                    const recipients = d?.recipient_count ?? null
                    const reads = d?.read_count ?? n.read_count ?? 0
                    const allRead =
                      recipients != null && recipients > 0 && reads >= recipients
                    const badge = allRead
                      ? { label: "DELIVERED", cls: "bg-emerald-50 text-emerald-700" }
                      : { label: "PARTIAL", cls: "bg-amber-50 text-amber-700" }
                    return (
                      <Link
                        key={n.id}
                        href={`/dashboard/notices/${n.id}`}
                        className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white p-3 hover:border-indigo-200 hover:bg-indigo-50/30"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            {n.is_pinned && (
                              <Pin className="h-3 w-3 shrink-0 text-amber-500" />
                            )}
                            <span className="truncate text-sm font-medium text-slate-900">
                              {n.title}
                            </span>
                          </div>
                          <div className="mt-0.5 truncate text-xs text-slate-500">
                            {audienceLabel(d?.audience)} · {formatSentAt(n.published_at)}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-semibold tabular-nums text-slate-900">
                            {reads}
                            {recipients != null ? `/${recipients}` : ""}
                          </div>
                          <div className="text-[10px] uppercase tracking-wide text-slate-400">
                            Read
                          </div>
                        </div>
                        <span
                          className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-semibold ${badge.cls}`}
                        >
                          {detailsQ.isLoading ? "…" : `• ${badge.label}`}
                        </span>
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Delivery health */}
            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                Delivery health
              </div>
              <div className="space-y-2.5">
                {[
                  {
                    label: "SMS sent today",
                    value: deliveryHealthQ.data?.sms_sent_today ?? 0,
                    tone: "text-slate-900",
                  },
                  {
                    label: "Delivered",
                    value: deliveryHealthQ.data?.delivered ?? 0,
                    tone: "text-emerald-600",
                  },
                  {
                    label: "Failed numbers",
                    value: deliveryHealthQ.data?.failed_numbers ?? 0,
                    tone: "text-rose-600",
                  },
                  {
                    label: "Push opt-outs",
                    value: deliveryHealthQ.data?.push_opt_outs ?? 0,
                    tone: "text-slate-900",
                  },
                ].map((r) => (
                  <div key={r.label} className="flex items-center justify-between">
                    <span className="text-sm text-slate-500">{r.label}</span>
                    <span className={`text-sm font-semibold tabular-nums ${r.tone}`}>
                      {deliveryHealthQ.isLoading ? "…" : r.value.toLocaleString("en-US")}
                    </span>
                  </div>
                ))}
              </div>
              <Link
                href="/dashboard/notices"
                className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:underline"
              >
                Open notices <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  )
}

const ADMISSION_STATUS: Record<
  AdmissionQueueStatus,
  { label: string; cls: string; dot: string }
> = {
  PENDING: { label: "PENDING", cls: "bg-amber-50 text-amber-700", dot: "#f59e0b" },
  REVIEW: { label: "REVIEW", cls: "bg-sky-50 text-sky-700", dot: "#0ea5e9" },
  DOC_NEEDED: { label: "DOC NEEDED", cls: "bg-rose-50 text-rose-700", dot: "#f43f5e" },
}

function AdmissionTagBadge({ tag }: { tag: AdmissionQueueTag }) {
  if (!tag) return null
  const cls =
    tag === "NEW" ? "bg-indigo-100 text-indigo-700" : "bg-violet-100 text-violet-700"
  return (
    <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ${cls}`}>
      {tag}
    </span>
  )
}

function AdmissionRow({ item }: { item: AdmissionQueueItem }) {
  const st = ADMISSION_STATUS[item.status] ?? ADMISSION_STATUS.PENDING
  const submitted = new Date(item.submitted_at)
  const submittedValid = !Number.isNaN(submitted.getTime())
  return (
    <tr className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60">
      <td className="px-5 py-3">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-xs font-semibold text-indigo-600">
            {item.applicant.initials}
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="truncate text-sm font-medium text-slate-900">
                {item.applicant.full_name}
              </span>
              <AdmissionTagBadge tag={item.tag} />
            </div>
            <div className="text-xs text-slate-500">
              {item.class ? `${item.class.name} · ${item.class.academic_year}` : "—"}
              {" · "}
              {item.applicant.phone}
            </div>
          </div>
        </div>
      </td>
      <td className="px-3 py-3 align-middle">
        <div className="text-xs text-slate-700">
          {submittedValid
            ? submitted.toLocaleDateString("en-GB", { day: "numeric", month: "short" })
            : "—"}
        </div>
        {submittedValid && (
          <div className="text-[11px] tabular-nums text-slate-400">
            {submitted.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
          </div>
        )}
      </td>
      <td className="px-3 py-3 align-middle">
        <span
          className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium ${st.cls}`}
        >
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: st.dot }} />
          {st.label}
        </span>
      </td>
      <td className="px-5 py-3 align-middle">
        <div className="flex items-center justify-end gap-2">
          <Link
            href="/dashboard/admissions"
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            Review
          </Link>
          <Link
            href="/dashboard/admissions"
            className="inline-flex items-center gap-1 rounded-lg bg-[#101014] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#1f1f25]"
          >
            <Check className="h-3.5 w-3.5" /> Approve
          </Link>
        </div>
      </td>
    </tr>
  )
}

function BillingCard({
  label,
  dot,
  value,
  sub,
  loading,
}: {
  label: string
  dot: string
  value: string
  sub?: string
  loading?: boolean
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          {label}
        </span>
        <span
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ backgroundColor: dot }}
        />
      </div>
      <div className="mt-2 text-2xl font-bold text-slate-900 tabular-nums">
        {loading ? "…" : value}
      </div>
      {sub && <div className="mt-0.5 text-xs text-slate-500">{loading ? "" : sub}</div>}
    </div>
  )
}
