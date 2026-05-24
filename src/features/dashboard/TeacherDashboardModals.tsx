"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import {
  BellRing,
  CalendarDays,
  ClipboardCheck,
  FileText,
  Library,
  Users,
  Video,
} from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useAuth } from "@/context/AuthContext"
import { getAttendanceRollCall } from "@/features/attendance/api"
import { getSubmissions, getTeacherAssessments } from "@/features/learning/api"
import { noticesApi } from "@/features/notices/api"

import type { PlannerEntry } from "./api"
import { formatDateLong, formatTimeHm } from "./api"

function useTenantId(): string | null {
  const { user } = useAuth() as any
  return user?.tenant_id ?? user?.tenantId ?? user?.tenant?.id ?? null
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[140px_minmax(0,1fr)] gap-3 py-1.5 text-sm">
      <span className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</span>
      <span className="min-w-0 break-words text-slate-900">
        {value ?? <span className="text-slate-400">—</span>}
      </span>
    </div>
  )
}

function Pill({ children, tone = "slate" }: { children: React.ReactNode; tone?: string }) {
  const toneMap: Record<string, string> = {
    slate: "bg-slate-100 text-slate-700",
    emerald: "bg-emerald-100 text-emerald-700",
    sky: "bg-sky-100 text-sky-700",
    rose: "bg-rose-100 text-rose-700",
    amber: "bg-amber-100 text-amber-700",
    violet: "bg-violet-100 text-violet-700",
    indigo: "bg-indigo-100 text-indigo-700",
  }
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${toneMap[tone] ?? toneMap.slate}`}>
      {children}
    </span>
  )
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Planner entry modal                                                        */
/* ────────────────────────────────────────────────────────────────────────── */

export function PlannerEntryModal({
  entry,
  open,
  onOpenChange,
}: {
  entry: PlannerEntry | null
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-indigo-600" />
            {entry?.subject?.name ?? "Class"}
          </DialogTitle>
          <DialogDescription>
            {entry ? `${formatDateLong(entry.date)} · ${entry.day_of_week}` : ""}
          </DialogDescription>
        </DialogHeader>

        {!entry ? null : (
          <div className="space-y-1 divide-y divide-slate-100">
            <Row label="Subject" value={entry.subject?.name ?? "—"} />
            <Row label="Batch" value={entry.batch?.name ?? "—"} />
            <Row label="Room" value={entry.room?.name ?? "—"} />
            <Row label="Delivery mode" value={<Pill tone="indigo">{entry.delivery_mode}</Pill>} />
            <Row
              label="Status"
              value={
                <Pill tone={entry.is_now ? "sky" : entry.status === "COMPLETED" ? "emerald" : "amber"}>
                  {entry.is_now ? "Now" : entry.status}
                </Pill>
              }
            />
            <Row label="Start time" value={entry.start_time} />
            <Row label="End time" value={entry.end_time} />
            <Row label="Scheduled start" value={new Date(entry.scheduled_start_at).toLocaleString()} />
            <Row label="Scheduled end" value={new Date(entry.scheduled_end_at).toLocaleString()} />
            <Row label="Minutes until start" value={entry.minutes_until_start} />
            <Row label="Overridden" value={entry.is_overridden ? "Yes" : "No"} />
            <Row
              label="Live session ref"
              value={
                entry.live_session_ref ? (
                  /^https?:\/\//i.test(entry.live_session_ref) ? (
                    <a
                      href={entry.live_session_ref}
                      target="_blank"
                      rel="noreferrer"
                      className="block truncate text-indigo-600 underline hover:text-indigo-700"
                      title={entry.live_session_ref}
                    >
                      {entry.live_session_ref}
                    </a>
                  ) : (
                    <span className="break-all">{entry.live_session_ref}</span>
                  )
                ) : (
                  "—"
                )
              }
            />
          
          </div>
        )}

        <div className="mt-4 flex justify-end gap-2">
          {entry?.delivery_mode === "ONLINE" && entry.status !== "COMPLETED" && (
            <button className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-2 text-xs font-semibold text-white hover:bg-rose-700">
              <Video className="h-3.5 w-3.5" /> Start live class
            </button>
          )}
          <button
            onClick={() => onOpenChange(false)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            Close
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Attendance modal — fetches roster for batch + date                         */
/* ────────────────────────────────────────────────────────────────────────── */

export function AttendanceModal({
  batchId,
  batchName,
  open,
  onOpenChange,
}: {
  batchId: string | null
  batchName: string | null
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const date = new Date().toISOString().slice(0, 10)
  const q = useQuery({
    queryKey: ["teacher-dashboard", "attendance-roll", batchId, date],
    queryFn: () => getAttendanceRollCall({ batchId: batchId!, date }),
    enabled: !!batchId && open,
  })

  const stats = (q.data ?? []).reduce(
    (a, r) => {
      a.total++
      if (r.status === "PRESENT") a.present++
      else if (r.status === "ABSENT") a.absent++
      else if (r.status === "LATE") a.late++
      else if (r.status === "EXCUSED") a.excused++
      return a
    },
    { total: 0, present: 0, absent: 0, late: 0, excused: 0 },
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-amber-600" />
            Attendance — {batchName ?? "Batch"}
          </DialogTitle>
          <DialogDescription>{formatDateLong(date)} · today's roster</DialogDescription>
        </DialogHeader>

        <div className="mt-2 grid grid-cols-5 gap-2">
          {[
            { label: "Total", v: stats.total, tone: "bg-slate-100 text-slate-700" },
            { label: "Present", v: stats.present, tone: "bg-emerald-100 text-emerald-700" },
            { label: "Absent", v: stats.absent, tone: "bg-rose-100 text-rose-700" },
            { label: "Late", v: stats.late, tone: "bg-amber-100 text-amber-700" },
            { label: "Excused", v: stats.excused, tone: "bg-sky-100 text-sky-700" },
          ].map((c) => (
            <div key={c.label} className={`rounded-xl p-2 text-center ${c.tone}`}>
              <div className="text-lg font-semibold tabular-nums">{c.v}</div>
              <div className="text-[10px] font-medium uppercase tracking-wide">{c.label}</div>
            </div>
          ))}
        </div>

        <div className="mt-4 max-h-[420px] overflow-y-auto rounded-xl border border-slate-100">
          {q.isLoading ? (
            <div className="p-4 text-sm text-slate-500">Loading roster…</div>
          ) : !q.data?.length ? (
            <div className="p-4 text-sm text-slate-500">No students found for this batch.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-[11px] uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2">Roll</th>
                  <th className="px-3 py-2">Student</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Source</th>
                  <th className="px-3 py-2">First entry</th>
                  <th className="px-3 py-2">Last exit</th>
                  <th className="px-3 py-2">Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {q.data.map((r) => (
                  <tr key={r.id || r.studentId}>
                    <td className="px-3 py-2 tabular-nums text-slate-600">{r.rollNumber || "—"}</td>
                    <td className="px-3 py-2 font-medium text-slate-900">{r.studentName}</td>
                    <td className="px-3 py-2">
                      <Pill
                        tone={
                          r.status === "PRESENT" ? "emerald" : r.status === "ABSENT" ? "rose" : r.status === "LATE" ? "amber" : "sky"
                        }
                      >
                        {r.status}
                      </Pill>
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-500">{r.source}</td>
                    <td className="px-3 py-2 text-xs text-slate-500 tabular-nums">{r.firstEntry ?? "—"}</td>
                    <td className="px-3 py-2 text-xs text-slate-500 tabular-nums">{r.lastExit ?? "—"}</td>
                    <td className="px-3 py-2 text-xs text-slate-500">{r.note ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Evaluations modal — assessment list with ungraded submissions              */
/* ────────────────────────────────────────────────────────────────────────── */

export function EvaluationsModal({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const tenantId = useTenantId()
  const [selected, setSelected] = useState<string | null>(null)

  const listQ = useQuery({
    queryKey: ["teacher-dashboard", "assessments", tenantId],
    queryFn: () => getTeacherAssessments(tenantId!).then((r: any) => r?.data ?? r),
    enabled: !!tenantId && open,
  })

  const subQ = useQuery({
    queryKey: ["teacher-dashboard", "submissions", tenantId, selected],
    queryFn: () => getSubmissions(tenantId!, selected!).then((r: any) => r?.data ?? r),
    enabled: !!tenantId && !!selected,
  })

  const items: any[] = (listQ.data as any)?.items ?? (listQ.data as any)?.data ?? (Array.isArray(listQ.data) ? listQ.data : [])
  const submissions: any[] = (subQ.data as any)?.submissions ?? (subQ.data as any)?.data ?? (Array.isArray(subQ.data) ? subQ.data : [])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-rose-600" />
            Pending evaluations
          </DialogTitle>
          <DialogDescription>Assessments with submissions awaiting grading</DialogDescription>
        </DialogHeader>

        <div className="mt-2 grid gap-4 md:grid-cols-[1fr_1.2fr]">
          <div className="max-h-[460px] overflow-y-auto rounded-xl border border-slate-100">
            {listQ.isLoading ? (
              <div className="p-4 text-sm text-slate-500">Loading assessments…</div>
            ) : !items.length ? (
              <div className="p-4 text-sm text-slate-500">No assessments.</div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {items.map((a) => {
                  const id = a.id ?? a.assessment_id
                  return (
                    <li
                      key={id}
                      onClick={() => setSelected(id)}
                      className={`cursor-pointer p-3 hover:bg-slate-50 ${selected === id ? "bg-rose-50/60" : ""}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="text-sm font-medium text-slate-900">{a.title ?? a.name ?? "Untitled"}</div>
                        {a.assessment_type && <Pill tone="violet">{a.assessment_type}</Pill>}
                      </div>
                      <div className="mt-1 flex flex-wrap gap-2 text-xs text-slate-500">
                        {a.subject_name && <span>📘 {a.subject_name}</span>}
                        {a.deadline_at && <span>⏰ {new Date(a.deadline_at).toLocaleDateString()}</span>}
                        {a.marks != null && <span>· {a.marks} marks</span>}
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          <div className="max-h-[460px] overflow-y-auto rounded-xl border border-slate-100">
            {!selected ? (
              <div className="p-4 text-sm text-slate-500">Select an assessment to view submissions.</div>
            ) : subQ.isLoading ? (
              <div className="p-4 text-sm text-slate-500">Loading submissions…</div>
            ) : !submissions.length ? (
              <div className="p-4 text-sm text-slate-500">No submissions yet.</div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {submissions.map((s) => {
                  const marked = s.is_marked || s.result_status === "MARKED" || s.marks_obtained != null
                  return (
                    <li key={s.id} className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-sm font-medium text-slate-900">
                            {s.student_name ?? s.student?.name ?? "Student"}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            Submitted {s.submitted_at ? new Date(s.submitted_at).toLocaleString() : "—"}
                            {s.is_late ? " · late" : ""}
                          </div>
                        </div>
                        <Pill tone={marked ? "emerald" : "amber"}>
                          {marked ? `Marked${s.marks_obtained != null ? ` · ${s.marks_obtained}` : ""}` : "Pending"}
                        </Pill>
                      </div>
                      {s.marks_feedback && (
                        <div className="mt-1 text-xs text-slate-500">Feedback: {s.marks_feedback}</div>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Notices modal — unread feed                                                */
/* ────────────────────────────────────────────────────────────────────────── */

export function NoticesModal({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const tenantId = useTenantId()
  const [openId, setOpenId] = useState<string | null>(null)

  const feedQ = useQuery({
    queryKey: ["teacher-dashboard", "notices-unread", tenantId],
    queryFn: () => noticesApi.feed(tenantId!, { unread: true, limit: 50 }),
    enabled: !!tenantId && open,
  })

  const detailQ = useQuery({
    queryKey: ["teacher-dashboard", "notice-detail", tenantId, openId],
    queryFn: () => noticesApi.getOne(tenantId!, openId!),
    enabled: !!tenantId && !!openId,
  })

  const notices = feedQ.data?.data ?? []
  const detail = (detailQ.data as any)?.notice ?? null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BellRing className="h-5 w-5 text-violet-600" />
            Unread notices
          </DialogTitle>
          <DialogDescription>{notices.length} unread</DialogDescription>
        </DialogHeader>

        <div className="mt-2 grid gap-4 md:grid-cols-[1fr_1.3fr]">
          <div className="max-h-[460px] overflow-y-auto rounded-xl border border-slate-100">
            {feedQ.isLoading ? (
              <div className="p-4 text-sm text-slate-500">Loading…</div>
            ) : !notices.length ? (
              <div className="p-4 text-sm text-slate-500">All caught up.</div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {notices.map((n) => (
                  <li
                    key={n.id}
                    onClick={() => {
                      setOpenId(n.id)
                      noticesApi.markRead(tenantId!, n.id).catch(() => {})
                    }}
                    className={`cursor-pointer p-3 hover:bg-slate-50 ${openId === n.id ? "bg-violet-50/60" : ""}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="text-sm font-medium text-slate-900">{n.title}</div>
                      <div className="flex gap-1">
                        {n.is_pinned && <Pill tone="amber">Pinned</Pill>}
                        {n.is_urgent && <Pill tone="rose">Urgent</Pill>}
                      </div>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-slate-500">
                      <Pill tone="slate">{n.category}</Pill>
                      <Pill tone="indigo">{n.priority}</Pill>
                      {n.author?.name && <span>· {n.author.name}</span>}
                      {n.published_at && <span>· {new Date(n.published_at).toLocaleDateString()}</span>}
                    </div>
                    {n.preview && <div className="mt-1 line-clamp-2 text-xs text-slate-600">{n.preview}</div>}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="max-h-[460px] overflow-y-auto rounded-xl border border-slate-100 p-3">
            {!openId ? (
              <div className="p-2 text-sm text-slate-500">Select a notice to view full content.</div>
            ) : detailQ.isLoading || !detail ? (
              <div className="p-2 text-sm text-slate-500">Loading…</div>
            ) : (
              <div className="space-y-2">
                <div className="text-base font-semibold text-slate-900">{detail.title}</div>
                <div className="flex flex-wrap gap-1">
                  <Pill tone="slate">{detail.category}</Pill>
                  <Pill tone="indigo">{detail.priority}</Pill>
                  <Pill tone="emerald">{detail.state}</Pill>
                  {detail.is_pinned && <Pill tone="amber">Pinned</Pill>}
                </div>
                <div className="text-[11px] text-slate-500">
                  {detail.author?.name ? `By ${detail.author.name}` : ""}
                  {detail.published_at ? ` · ${new Date(detail.published_at).toLocaleString()}` : ""}
                  {detail.expires_at ? ` · expires ${new Date(detail.expires_at).toLocaleDateString()}` : ""}
                </div>
                <div className="whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-sm text-slate-800">
                  {detail.content}
                </div>
                {detail.attachments?.length ? (
                  <div className="text-xs text-slate-500">
                    📎 {detail.attachments.length} attachment{detail.attachments.length > 1 ? "s" : ""}
                  </div>
                ) : null}
                {detail.audience && (
                  <div className="text-[11px] text-slate-500">
                    Audience: {detail.audience.audience_type}
                    {detail.recipient_count != null ? ` · ${detail.recipient_count} recipients` : ""}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Live-class modal — full upcoming live class info                           */
/* ────────────────────────────────────────────────────────────────────────── */

export function LiveClassModal({
  next,
  open,
  onOpenChange,
}: {
  next: {
    id: string
    title: string
    scheduled_at: string
    minutes_until: number
    batch: { id: string; name: string } | null
  } | null
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Video className="h-5 w-5 text-rose-600" />
            Next live class
          </DialogTitle>
        </DialogHeader>
        {!next ? (
          <div className="p-4 text-sm text-slate-500">No live class scheduled.</div>
        ) : (
          <div className="space-y-1 divide-y divide-slate-100">
            <Row label="Title" value={next.title} />
            <Row label="Batch" value={next.batch?.name ?? "—"} />
            <Row label="Scheduled at" value={new Date(next.scheduled_at).toLocaleString()} />
            <Row label="Starts in" value={next.minutes_until > 0 ? `${next.minutes_until} min` : "Now"} />
            <Row label="Session ID" value={<code className="block break-all text-xs">{next.id}</code>} />
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
