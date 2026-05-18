"use client"

import { useQuery } from "@tanstack/react-query"

import { useAuth } from "@/context/AuthContext"
import { api } from "@/lib/api"

// ── Shared types (mirror backend service contracts) ──────────────────────────
export interface AdminStats {
  active_students: { total: number; enrolled_this_week: number; delta_pct: number | null }
  active_teachers: { total: number; on_leave_today: number }
  pending_admissions: { total: number; awaiting_review: number }
  todays_classes: { total: number; completed: number; ongoing: number; upcoming: number; upcoming_7d: number }
  pending_dues: { amount: number | null; currency: string; overdue_invoice_count: number }
  active_live_sessions: { count: number; students_joined: number }
}

export interface AdminTodaysOps {
  date: string
  day_of_week: string
  classes_today: number
  live_upcoming: number
  cancelled_or_overridden: number
  attendance_pending: number
}

export type NonNormalChangeKind = "CANCELLED" | "OVERRIDDEN" | "UPDATED"

export interface NonNormalOccurrence {
  override_id: string
  entry_id: string
  date: string
  scheduled_start_at: string
  start_time: string
  end_time: string
  subject: { id: string; name: string } | null
  batch: { id: string; name: string } | null
  teacher: { id: string; name: string } | null
  room: { id: string; name: string } | null
  delivery_mode: string
  status: "CANCELLED" | "UPDATED"
  change_kind: NonNormalChangeKind
  reason: string | null
  is_today: boolean
}

export interface NonNormalOccurrencesResult {
  total: number
  shown: number
  window: { from: string; to: string }
  data: NonNormalOccurrence[]
}

export interface StudentStats {
  attendance: {
    percentage: number | null
    weeks_attended: number | null
    weeks_total: number | null
    delta_pct: number | null
    label: string | null
  }
  upcoming_events: {
    count: number
    next: UpcomingEvent | null
    window: { from: string; to: string }
  }
  pending_due: {
    amount: number | null
    currency: string
    due_date: string | null
    label: string | null
  }
  unread_notifications: { count: number; from_teacher_count: number }
  latest_result: {
    title: string | null
    grade: string | null
    percentage: number | null
    obtained_marks: number | null
    total_marks: number | null
    source: "EXAM" | "ASSESSMENT" | null
    graded_at: string | null
  }
}

export type UpcomingEventType = "EXAM" | "QUIZ" | "ASSIGNMENT"

export interface UpcomingEvent {
  id: string
  type: UpcomingEventType
  title: string
  scheduled_at: string
  marks: number | null
  duration_min: number | null
  batch: { id: string; name: string } | null
  subject: { id: string; name: string } | null
}

export interface UpcomingEventsList {
  data: UpcomingEvent[]
  window: { from: string; to: string }
}

export interface TodaysClassItem {
  entry_id: string
  start_time: string
  end_time: string
  scheduled_start_at: string
  scheduled_end_at: string
  subject: { id: string; name: string } | null
  teacher: { id: string; name: string; avatar_url: string | null } | null
  batch: { id: string; name: string } | null
  delivery_mode: string
  room: { id: string; name: string } | null
  live_session_ref: string | null
  status: "COMPLETED" | "ONGOING" | "UPCOMING"
  minutes_until_start: number
  is_now: boolean
  is_live_now: boolean
  is_overridden: boolean
  notes: string | null
}

export interface TodaysClassesResult {
  date: string
  day_of_week: string
  scheduled_count: number
  live_now_count: number
  data: TodaysClassItem[]
}

export interface TeacherStats {
  todays_classes: { total: number | null; done: number | null; ongoing: number | null; upcoming: number | null; date: string }
  pending_attendance: { count: number; batches: { batch_id: string; batch_name: string }[] }
  pending_evaluations: { submission_count: number; assessment_count: number }
  upcoming_live: {
    count: number
    next: { id: string; title: string; scheduled_at: string; minutes_until: number; batch: { id: string; name: string } | null } | null
  }
  unread_notices: { count: number; from_admin_count: number }
}

export interface PlannerEntry {
  entry_id: string
  date: string
  day_of_week: string
  start_time: string
  end_time: string
  scheduled_start_at: string
  scheduled_end_at: string
  subject: { id: string; name: string } | null
  batch: { id: string; name: string } | null
  delivery_mode: string
  room: { id: string; name: string } | null
  live_session_ref: string | null
  status: "COMPLETED" | "ONGOING" | "UPCOMING"
  minutes_until_start: number
  is_overridden: boolean
  is_now: boolean
  notes: string | null
}

export interface TeachingPlannerResult {
  range: "today" | "week"
  date_from: string
  date_to: string
  total_count: number
  data: PlannerEntry[]
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function useTenantId(): string | null {
  const { user } = useAuth()
  return user?.tenant_id ?? user?.tenantId ?? user?.tenant?.id ?? null
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await api.get(url, { _suppressToast: true } as any)
  return res.data as T
}

// ── Admin ────────────────────────────────────────────────────────────────────
export function useAdminStats() {
  const tenantId = useTenantId()
  return useQuery<AdminStats>({
    queryKey: ["admin-dashboard", "stats", tenantId],
    queryFn: () => fetchJson(`/tenants/${tenantId}/admin-dashboard/stats`),
    enabled: !!tenantId,
  })
}

export function useAdminTodaysOps() {
  const tenantId = useTenantId()
  return useQuery<AdminTodaysOps>({
    queryKey: ["admin-dashboard", "todays-ops", tenantId],
    queryFn: () => fetchJson(`/tenants/${tenantId}/admin-dashboard/todays-academic-operations`),
    enabled: !!tenantId,
  })
}

export function useAdminNonNormalOccurrences() {
  const tenantId = useTenantId()
  return useQuery<NonNormalOccurrencesResult>({
    queryKey: ["admin-dashboard", "non-normal", tenantId],
    queryFn: () => fetchJson(`/tenants/${tenantId}/admin-dashboard/non-normal-occurrences`),
    enabled: !!tenantId,
  })
}

// ── Student ──────────────────────────────────────────────────────────────────
export function useStudentStats() {
  const tenantId = useTenantId()
  return useQuery<StudentStats>({
    queryKey: ["student-dashboard", "stats", tenantId],
    queryFn: () => fetchJson(`/tenants/${tenantId}/student-dashboard/stats`),
    enabled: !!tenantId,
  })
}

export function useStudentTodaysClasses() {
  const tenantId = useTenantId()
  return useQuery<TodaysClassesResult>({
    queryKey: ["student-dashboard", "todays-classes", tenantId],
    queryFn: () => fetchJson(`/tenants/${tenantId}/student-dashboard/todays-classes`),
    enabled: !!tenantId,
  })
}

export function useStudentUpcomingAssessments() {
  const tenantId = useTenantId()
  return useQuery<UpcomingEventsList>({
    queryKey: ["student-dashboard", "upcoming-assessments", tenantId],
    queryFn: () => fetchJson(`/tenants/${tenantId}/student-dashboard/upcoming-assessments`),
    enabled: !!tenantId,
  })
}

// ── Teacher ──────────────────────────────────────────────────────────────────
export function useTeacherStats() {
  const tenantId = useTenantId()
  return useQuery<TeacherStats>({
    queryKey: ["teacher-dashboard", "stats", tenantId],
    queryFn: () => fetchJson(`/tenants/${tenantId}/teacher-dashboard/stats`),
    enabled: !!tenantId,
  })
}

export function useTeacherPlanner(range: "today" | "week" = "today") {
  const tenantId = useTenantId()
  return useQuery<TeachingPlannerResult>({
    queryKey: ["teacher-dashboard", "planner", tenantId, range],
    queryFn: () => fetchJson(`/tenants/${tenantId}/teacher-dashboard/teaching-planner?range=${range}`),
    enabled: !!tenantId,
  })
}

// ── Display formatters ───────────────────────────────────────────────────────
export function formatBdt(amount: number | null | undefined): string {
  if (amount == null) return "—"
  if (amount >= 100000) return `৳ ${(amount / 100000).toFixed(2)}L`
  return `৳ ${amount.toLocaleString("en-IN")}`
}

export function formatTimeHm(iso: string): string {
  const d = new Date(iso)
  const h = String(d.getHours()).padStart(2, "0")
  const m = String(d.getMinutes()).padStart(2, "0")
  return `${h}:${m}`
}

export function formatDateLong(iso?: string | null): string {
  if (!iso) return ""
  const d = new Date(iso)
  return d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
}

export function formatDay(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit" })
}

export function formatMonth(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short" })
}

export function initialsOf(name?: string | null): string {
  if (!name) return "—"
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "—"
}

export function greetingFor(date: Date = new Date()): string {
  const h = date.getHours()
  if (h < 5) return "Good night"
  if (h < 12) return "Good morning"
  if (h < 17) return "Good afternoon"
  if (h < 21) return "Good evening"
  return "Good night"
}

export function daysUntil(iso: string): string {
  const ms = new Date(iso).getTime() - Date.now()
  const days = Math.ceil(ms / (24 * 60 * 60 * 1000))
  if (days <= 0) return "Today"
  if (days === 1) return "Tomorrow"
  return `In ${days} days`
}
