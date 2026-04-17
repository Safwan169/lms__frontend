"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useMutation, useQuery } from "@tanstack/react-query"
import {
  AlertCircle,
  BellRing,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Eye,
  LayoutGrid,
  Link2,
  ListFilter,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  Sparkles,
  XCircle,
} from "lucide-react"
import toast from "react-hot-toast"

import api from "@/lib/api"
import { cn } from "@/lib/utils"
import { useDebounce } from "@/hooks/useDebounce"
import { useIsMobile } from "@/hooks/use-mobile"
import { useAuth } from "@/context/AuthContext"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table-primitive"
import { Textarea } from "@/components/ui/textarea"

type RoutineStatus = "DRAFT" | "PUBLISHED"
type EntryStatus = "DRAFT" | "PUBLISHED" | "CANCELLED" | "OVERRIDE"
type DeliveryMode = "ON_SITE" | "LIVE_ONLINE" | "RECORDED_SUPPORT" | "HYBRID"
type ConflictSeverity = "SOFT" | "HARD"
type DayOfWeek =
  | "SATURDAY"
  | "SUNDAY"
  | "MONDAY"
  | "TUESDAY"
  | "WEDNESDAY"
  | "THURSDAY"
  | "FRIDAY"

type BatchOption = { id: string; name: string; classId: string; className: string }
type ClassOption = { id: string; name: string }
type SubjectOption = { id: string; name: string }
type TeacherOption = { id: string; name: string }
type RoomOption = { id: string; name: string }

type ConflictItem = {
  id: string
  severity: ConflictSeverity
  message: string
}

type ScheduleEntry = {
  id: string
  batchId: string
  dayOfWeek: DayOfWeek
  startTime: string
  endTime: string
  subjectId: string
  subjectName: string
  teacherId: string
  teacherName: string
  deliveryMode: DeliveryMode
  roomId?: string
  roomName?: string
  liveSessionRef?: string
  notes?: string
  status: EntryStatus
  isOverride?: boolean
  overrideDate?: string
  reason?: string
}

type RoutineRecord = {
  id: string
  batchId: string
  batchName: string
  status: RoutineStatus
  entries: ScheduleEntry[]
}

type NotificationItem = {
  id: string
  title: string
  description: string
  href: string
  unread: boolean
}

type ScheduleBootstrap = {
  classes: ClassOption[]
  batches: BatchOption[]
  subjects: SubjectOption[]
  teachers: TeacherOption[]
  rooms: RoomOption[]
  routines: RoutineRecord[]
  notifications: NotificationItem[]
}

type EntryDraft = {
  id?: string
  batchId: string
  dayOfWeek: DayOfWeek
  startTime: string
  endTime: string
  subjectId: string
  teacherId: string
  deliveryMode: DeliveryMode
  roomId: string
  liveSessionRef: string
  notes: string
}

type OverrideDraft = {
  overrideDate: string
  newStartTime: string
  newEndTime: string
  newTeacherId: string
  newMode: "" | DeliveryMode
  newRoomId: string
  newLiveSessionRef: string
  status: "UPDATED" | "CANCELLED"
  reason: string
}

type ViewMode = "builder" | "weekly" | "daily" | "list"

type ScheduleWorkspaceProps = {
  initialViewMode?: ViewMode
  pageTitle?: string
  pageDescription?: string
  hideBuilder?: boolean
  minimalView?: boolean
}

const BUILDER_DAYS: DayOfWeek[] = ["SATURDAY", "SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY"]
const FULL_WEEK_DAYS: DayOfWeek[] = ["SATURDAY", "SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"]
const DAY_LABELS: Record<DayOfWeek, string> = {
  SATURDAY: "Sat",
  SUNDAY: "Sun",
  MONDAY: "Mon",
  TUESDAY: "Tue",
  WEDNESDAY: "Wed",
  THURSDAY: "Thu",
  FRIDAY: "Fri",
}
const DAY_LONG_LABELS: Record<DayOfWeek, string> = {
  SATURDAY: "Saturday",
  SUNDAY: "Sunday",
  MONDAY: "Monday",
  TUESDAY: "Tuesday",
  WEDNESDAY: "Wednesday",
  THURSDAY: "Thursday",
  FRIDAY: "Friday",
}
const TIME_SLOTS = ["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00"]
const API_DAY_ORDER: DayOfWeek[] = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"]

const FALLBACK_DATA: ScheduleBootstrap = {
  classes: [
    { id: "class-1", name: "Class 9" },
    { id: "class-2", name: "Class 10" },
  ],
  batches: [
    { id: "batch-1", name: "Science Morning A", classId: "class-1", className: "Class 9" },
    { id: "batch-1", name: "Science Morning 2", classId: "class-1", className: "Class 9" },
    { id: "batch-1", name: "3", classId: "class-1", className: "Class 9" },
    { id: "batch-2", name: "Commerce Day B", classId: "class-1", className: "Class 9" },
    { id: "batch-3", name: "SSC Evening", classId: "class-2", className: "Class 10" },
  ],
  subjects: [
    { id: "subject-1", name: "Mathematics" },
    { id: "subject-2", name: "Physics" },
    { id: "subject-3", name: "Accounting" },
    { id: "subject-4", name: "English" },
  ],
  teachers: [
    { id: "teacher-1", name: "Farhana Akter" },
    { id: "teacher-2", name: "Mahmud Hasan" },
    { id: "teacher-3", name: "Tahsin Rahman" },
  ],
  rooms: [
    { id: "room-1", name: "Room 301" },
    { id: "room-2", name: "Lab 2" },
    { id: "room-3", name: "Seminar Hall" },
  ],
  routines: [
    {
      id: "routine-1",
      batchId: "batch-1",
      batchName: "Science Morning A",
      status: "DRAFT",
      entries: [
        {
          id: "entry-1",
          batchId: "batch-1",
          dayOfWeek: "SATURDAY",
          startTime: "09:00",
          endTime: "10:00",
          subjectId: "subject-1",
          subjectName: "Mathematics",
          teacherId: "teacher-1",
          teacherName: "Farhana Akter",
          deliveryMode: "ON_SITE",
          roomId: "room-1",
          roomName: "Room 301",
          status: "DRAFT",
          notes: "Chapter 4 workshop",
        },
      ],
    },
  ],
  notifications: [
    {
      id: "notif-1",
      title: "Routine published for Science Morning A",
      description: "Students and teachers can now view the updated schedule.",
      href: "/dashboard/timetable",
      unread: true,
    },
  ],
}

function parseTimeToMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number)
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return 0
  return hours * 60 + minutes
}

function formatTime(value: string) {
  if (!value) return "--"
  const [hours, minutes] = value.split(":").map(Number)
  const safeHours = Number.isNaN(hours) ? 0 : hours
  const suffix = safeHours >= 12 ? "PM" : "AM"
  const twelveHour = safeHours % 12 || 12
  return `${twelveHour}:${String(Number.isNaN(minutes) ? 0 : minutes).padStart(2, "0")} ${suffix}`
}

function formatDateLabel(value: string) {
  if (!value) return "-"
  const date = new Date(`${value}T00:00:00+06:00`)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Dhaka",
  }).format(date)
}

function getWeekStart(baseDate: Date) {
  const result = new Date(baseDate)
  const day = result.getDay()
  const diff = (day + 1) % 7
  result.setDate(result.getDate() - diff)
  result.setHours(0, 0, 0, 0)
  return result
}

function addDays(date: Date, days: number) {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

function toDateInput(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function getDayFromDate(value: string): DayOfWeek {
  const date = new Date(`${value}T00:00:00+06:00`)
  return API_DAY_ORDER[date.getDay()] as DayOfWeek
}

function dayOfWeekToApiValue(value: DayOfWeek) {
  const index = API_DAY_ORDER.indexOf(value)
  return index >= 0 ? index : 6
}

function getStatusBadgeProps(status: EntryStatus | RoutineStatus) {
  switch (status) {
    case "PUBLISHED":
      return { variant: "default" as const, className: "bg-emerald-100 text-emerald-800" }
    case "CANCELLED":
      return { variant: "destructive" as const, className: "" }
    case "OVERRIDE":
      return { variant: "warning" as const, className: "" }
    case "DRAFT":
    default:
      return { variant: "muted" as const, className: "" }
  }
}

function getModeBadgeProps(mode: DeliveryMode) {
  switch (mode) {
    case "ON_SITE":
      return { className: "bg-blue-100 text-blue-800", label: "On Site" }
    case "LIVE_ONLINE":
      return { className: "bg-violet-100 text-violet-800", label: "Live Online" }
    case "RECORDED_SUPPORT":
      return { className: "bg-teal-100 text-teal-800", label: "Recorded Support" }
    case "HYBRID":
    default:
      return { className: "bg-orange-100 text-orange-800", label: "Hybrid" }
  }
}

function matchesSlot(entry: ScheduleEntry, slotStart: string) {
  return entry.startTime === slotStart
}

function overlaps(startA: string, endA: string, startB: string, endB: string) {
  return parseTimeToMinutes(startA) < parseTimeToMinutes(endB) && parseTimeToMinutes(endA) > parseTimeToMinutes(startB)
}

function validateEntryDraft(draft: EntryDraft) {
  const errors: Partial<Record<keyof EntryDraft, string>> = {}
  if (!draft.dayOfWeek) errors.dayOfWeek = "Day is required"
  if (!draft.startTime) errors.startTime = "Start time is required"
  if (!draft.endTime) errors.endTime = "End time is required"
  if (draft.startTime && draft.endTime && parseTimeToMinutes(draft.endTime) <= parseTimeToMinutes(draft.startTime)) {
    errors.endTime = "End time must be after start time"
  }
  if (!draft.subjectId) errors.subjectId = "Subject is required"
  if (!draft.teacherId) errors.teacherId = "Teacher is required"
  if ((draft.deliveryMode === "ON_SITE" || draft.deliveryMode === "HYBRID") && !draft.roomId) {
    errors.roomId = "Room is required for this mode"
  }
  if ((draft.deliveryMode === "LIVE_ONLINE" || draft.deliveryMode === "HYBRID") && !draft.liveSessionRef) {
    errors.liveSessionRef = "Live session link is required for this mode"
  }
  if (draft.liveSessionRef) {
    try {
      new URL(draft.liveSessionRef)
    } catch {
      errors.liveSessionRef = "Enter a valid URL"
    }
  }
  return errors
}

function validateOverrideDraft(draft: OverrideDraft) {
  const errors: Partial<Record<keyof OverrideDraft, string>> = {}
  if (!draft.overrideDate) errors.overrideDate = "Override date is required"
  if (draft.newStartTime && draft.newEndTime && parseTimeToMinutes(draft.newEndTime) <= parseTimeToMinutes(draft.newStartTime)) {
    errors.newEndTime = "New end time must be after new start time"
  }
  if ((draft.newMode === "ON_SITE" || draft.newMode === "HYBRID") && !draft.newRoomId && draft.status !== "CANCELLED") {
    errors.newRoomId = "Room is required for the selected mode"
  }
  if ((draft.newMode === "LIVE_ONLINE" || draft.newMode === "HYBRID") && !draft.newLiveSessionRef && draft.status !== "CANCELLED") {
    errors.newLiveSessionRef = "Live session link is required for the selected mode"
  }
  if (draft.newLiveSessionRef) {
    try {
      new URL(draft.newLiveSessionRef)
    } catch {
      errors.newLiveSessionRef = "Enter a valid URL"
    }
  }
  return errors
}

async function loadScheduleBootstrap(tenantId: string | number | null): Promise<ScheduleBootstrap> {
  await new Promise((resolve) => setTimeout(resolve, 350))

  if (!tenantId) return FALLBACK_DATA

  try {
    const response = await api.get(`/api/tenants/${tenantId}/schedule/bootstrap`)
    const payload = response?.data?.data ?? response?.data
    if (payload?.batches && payload?.routines) {
      return {
        classes: payload.classes ?? FALLBACK_DATA.classes,
        batches: payload.batches ?? FALLBACK_DATA.batches,
        subjects: payload.subjects ?? FALLBACK_DATA.subjects,
        teachers: payload.teachers ?? FALLBACK_DATA.teachers,
        rooms: payload.rooms ?? FALLBACK_DATA.rooms,
        routines: payload.routines ?? FALLBACK_DATA.routines,
        notifications: payload.notifications ?? FALLBACK_DATA.notifications,
      }
    }
  } catch {
    // Fallback fixtures keep the frontend usable when the endpoint is not yet wired here.
  }

  return FALLBACK_DATA
}

function getRawItems(payload: any) {
  if (Array.isArray(payload?.data)) return payload.data
  if (Array.isArray(payload?.items)) return payload.items
  if (Array.isArray(payload)) return payload
  return []
}

function mapScheduleClassOption(item: any): ClassOption | null {
  const id = String(item?.id ?? item?.class_id ?? "").trim()
  const name = String(item?.class_name ?? item?.name ?? "").trim()
  if (!id) return null
  return { id, name: name || id }
}

function mapScheduleBatchOption(item: any): BatchOption | null {
  const id = String(item?.id ?? item?.batch_id ?? "").trim()
  const classId = String(item?.class_id ?? item?.class?.id ?? "").trim()
  const className = String(item?.class?.name ?? item?.class_name ?? "").trim()
  const name = String(item?.batch_name ?? item?.name ?? item?.section ?? "").trim()
  if (!id) return null
  return {
    id,
    classId,
    className: className || "-",
    name: name || id,
  }
}

function mapScheduleSubjectOption(item: any): SubjectOption | null {
  const id = String(item?.id ?? item?.subject_id ?? "").trim()
  const name = String(item?.name ?? item?.subject_name ?? item?.title ?? "").trim()
  if (!id) return null
  return { id, name: name || id }
}

function mapScheduleTeacherOption(item: any): TeacherOption | null {
  const id = String(item?.id ?? item?.teacher_id ?? item?.user_id ?? "").trim()
  const name = String(
    item?.user?.name ??
    item?.name ??
    item?.full_name ??
    item?.teacher_name ??
    item?.teacher_id ??
    ""
  ).trim()
  if (!id) return null
  return { id, name: name || id }
}

function mapScheduleRoomOption(item: any): RoomOption | null {
  const id = String(item?.id ?? item?.room_id ?? "").trim()
  const name = String(item?.name ?? item?.room_name ?? item?.title ?? "").trim()
  if (!id) return null
  return { id, name: name || id }
}

function normalizeRoutineStatus(value: any): RoutineStatus {
  return String(value ?? "").toUpperCase() === "PUBLISHED" ? "PUBLISHED" : "DRAFT"
}

function normalizeEntryStatus(value: any, fallbackStatus: RoutineStatus = "DRAFT", isOverride = false): EntryStatus {
  const normalized = String(value ?? "").toUpperCase()
  if (normalized === "CANCELLED") return "CANCELLED"
  if (normalized === "OVERRIDE" || isOverride) return "OVERRIDE"
  if (normalized === "PUBLISHED") return "PUBLISHED"
  return fallbackStatus === "PUBLISHED" ? "PUBLISHED" : "DRAFT"
}

function normalizeDeliveryMode(value: any): DeliveryMode {
  const normalized = String(value ?? "").toUpperCase()
  if (normalized === "LIVE_ONLINE") return "LIVE_ONLINE"
  if (normalized === "RECORDED_SUPPORT") return "RECORDED_SUPPORT"
  if (normalized === "HYBRID") return "HYBRID"
  return "ON_SITE"
}

function normalizeDayOfWeekValue(value: any): DayOfWeek {
  if (typeof value === "number" && Number.isInteger(value)) {
    return API_DAY_ORDER[value] ?? "SATURDAY"
  }

  const numericValue = Number(value)
  if (!Number.isNaN(numericValue) && Number.isInteger(numericValue)) {
    return API_DAY_ORDER[numericValue] ?? "SATURDAY"
  }

  const normalized = String(value ?? "").toUpperCase()
  if (FULL_WEEK_DAYS.includes(normalized as DayOfWeek)) return normalized as DayOfWeek
  return "SATURDAY"
}

function extractResponseData(response: any) {
  return response?.data?.data ?? response?.data ?? response
}

function mapRoutineEntry(item: any, routineStatus: RoutineStatus = "DRAFT"): ScheduleEntry | null {
  const id = String(item?.id ?? item?.entry_id ?? "").trim()
  const subjectId = String(item?.subject_id ?? item?.subject?.id ?? item?.subject_code ?? "").trim()
  const teacherId = String(item?.teacher_id ?? item?.teacher?.id ?? item?.teacher?.user_id ?? "").trim()
  const roomId = String(item?.room_id ?? item?.room?.id ?? "").trim()
  const overrideDate = String(item?.override_date ?? item?.overrideDate ?? "").trim()
  const isOverride = Boolean(item?.is_override ?? item?.isOverride ?? overrideDate)
  if (!id) return null

  return {
    id,
    batchId: String(item?.batch_id ?? item?.batch?.id ?? "").trim(),
    dayOfWeek: normalizeDayOfWeekValue(item?.day_of_week ?? item?.dayOfWeek),
    startTime: String(item?.start_time ?? item?.startTime ?? "").trim(),
    endTime: String(item?.end_time ?? item?.endTime ?? "").trim(),
    subjectId,
    subjectName: String(item?.subject_name ?? item?.subject?.name ?? subjectId ?? "Class Session").trim() || "Class Session",
    teacherId,
    teacherName: String(item?.teacher_name ?? item?.teacher?.name ?? teacherId ?? "").trim(),
    deliveryMode: normalizeDeliveryMode(item?.delivery_mode ?? item?.deliveryMode),
    roomId: roomId || undefined,
    roomName: String(item?.room_name ?? item?.room?.name ?? "").trim() || undefined,
    liveSessionRef: String(item?.live_session_ref ?? item?.liveSessionRef ?? "").trim() || undefined,
    notes: String(item?.notes ?? "").trim() || undefined,
    status: normalizeEntryStatus(item?.status, routineStatus, isOverride),
    isOverride,
    overrideDate: overrideDate || undefined,
    reason: String(item?.reason ?? "").trim() || undefined,
  }
}

function mapRoutineRecord(item: any, batches: BatchOption[]): RoutineRecord | null {
  const routineSource = item?.routine ?? item
  const id = String(routineSource?.id ?? routineSource?.routine_id ?? "").trim()
  const batchId = String(routineSource?.batch_id ?? routineSource?.batch?.id ?? "").trim()
  if (!id || !batchId) return null

  const routineStatus = normalizeRoutineStatus(routineSource?.status ?? item?.routine_status)
  const batch = batches.find((option) => option.id === batchId)
  const baseEntryCandidates =
    item?.entries ??
    routineSource?.entries ??
    item?.schedule_entries ??
    item?.routine_entries ??
    []

  const baseEntries = getRawItems(baseEntryCandidates)
    .map((entry: any) => mapRoutineEntry({ ...entry, batch_id: entry?.batch_id ?? batchId }, routineStatus))
    .filter((entry: any): entry is ScheduleEntry => Boolean(entry))

  const baseEntryMap = new Map(baseEntries.map((entry) => [entry.id, entry]))
  const overrideEntries = getRawItems(item?.overrides ?? routineSource?.overrides ?? [])
    .map((override: any) => {
      const scheduleEntryId = String(override?.schedule_entry_id ?? "").trim()
      const baseEntry = baseEntryMap.get(scheduleEntryId)
      if (!baseEntry) return null

      const overrideDate = String(override?.override_date ?? "").trim()
      if (!overrideDate) return null

      return mapRoutineEntry(
        {
          ...baseEntry,
          id: `${baseEntry.id}__override__${overrideDate}`,
          is_override: true,
          override_date: overrideDate,
          start_time: override?.new_start_time ?? baseEntry.startTime,
          end_time: override?.new_end_time ?? baseEntry.endTime,
          teacher_id: override?.new_teacher_id ?? baseEntry.teacherId,
          delivery_mode: override?.new_mode ?? baseEntry.deliveryMode,
          room_id: override?.new_room_id ?? baseEntry.roomId,
          live_session_ref: override?.new_live_session_ref ?? baseEntry.liveSessionRef,
          notes: override?.reason ?? baseEntry.notes,
          status: override?.status ?? "OVERRIDE",
          reason: override?.reason,
        },
        routineStatus
      )
    })
    .filter((entry: any): entry is ScheduleEntry => Boolean(entry))

  return {
    id,
    batchId,
    batchName: String(
      routineSource?.batch_name ??
        routineSource?.batch?.name ??
        item?.batch_name ??
        item?.batch?.name ??
        batch?.name ??
        batchId
    ),
    status: routineStatus,
    entries: [...baseEntries, ...overrideEntries],
  }
}

function groupTeacherScheduleRecords(items: any[], batches: BatchOption[]): RoutineRecord[] {
  const grouped = new Map<string, RoutineRecord>()

  items.forEach((item) => {
    const batchId = String(item?.batch_id ?? item?.batch?.id ?? "").trim()
    if (!batchId) return

    const routineId = String(item?.routine_id ?? item?.routine?.id ?? `teacher-routine-${batchId}`).trim()
    const routineStatus = normalizeRoutineStatus(item?.routine_status ?? item?.routine?.status ?? item?.status)
    const batch = batches.find((option) => option.id === batchId)
    const nextEntry = mapRoutineEntry(item, routineStatus)
    if (!nextEntry) return

    if (!grouped.has(batchId)) {
      grouped.set(batchId, {
        id: routineId,
        batchId,
        batchName: String(item?.batch_name ?? item?.batch?.name ?? batch?.name ?? batchId),
        status: routineStatus,
        entries: [],
      })
    }

    grouped.get(batchId)?.entries.push(nextEntry)
  })

  return Array.from(grouped.values())
}

async function fetchRoutineForBatch(batchId: string, batches: BatchOption[]) {
  const response = await api.get(`/api/batches/${batchId}/routine`)
  const payload = extractResponseData(response)
  return mapRoutineRecord(payload, batches)
}

async function fetchTeacherSchedule(teacherId: string, batches: BatchOption[]) {
  const response = await api.get(`/api/teachers/${teacherId}/schedule`)
  const payload = extractResponseData(response)
  const items =
    getRawItems(payload?.entries ?? payload?.schedule ?? payload?.items ?? payload)
  return groupTeacherScheduleRecords(items, batches)
}

function getRoutineDateWindow() {
  const now = new Date()
  return {
    effective_from: toDateInput(now),
    effective_to: `${now.getFullYear()}-12-31`,
  }
}

async function detectConflicts(
  draft: EntryDraft,
  routines: RoutineRecord[],
  teachers: TeacherOption[],
  rooms: RoomOption[],
  currentEntryId?: string
) {
  await new Promise((resolve) => setTimeout(resolve, 180))

  const conflicts: ConflictItem[] = []
  const entries = routines.flatMap((routine) => routine.entries).filter((entry) => entry.id !== currentEntryId && !entry.isOverride)

  entries.forEach((entry) => {
    if (entry.dayOfWeek !== draft.dayOfWeek) return
    if (!overlaps(entry.startTime, entry.endTime, draft.startTime, draft.endTime)) return

    if (entry.teacherId === draft.teacherId) {
      conflicts.push({
        id: `teacher-${entry.id}`,
        severity: "HARD",
        message: `Teacher ${teachers.find((teacher) => teacher.id === draft.teacherId)?.name ?? "Unknown"} is already assigned on ${DAY_LONG_LABELS[draft.dayOfWeek]} ${formatTime(entry.startTime)}-${formatTime(entry.endTime)}.`,
      })
    }

    if (draft.roomId && entry.roomId === draft.roomId && (draft.deliveryMode === "ON_SITE" || draft.deliveryMode === "HYBRID")) {
      conflicts.push({
        id: `room-${entry.id}`,
        severity: "HARD",
        message: `Room ${rooms.find((room) => room.id === draft.roomId)?.name ?? "Unknown"} is booked for another batch.`,
      })
    }

    if (entry.batchId === draft.batchId) {
      conflicts.push({
        id: `batch-${entry.id}`,
        severity: "HARD",
        message: `Batch overlap detected on ${DAY_LONG_LABELS[draft.dayOfWeek]} ${formatTime(entry.startTime)}-${formatTime(entry.endTime)}.`,
      })
    }
  })

  if (parseTimeToMinutes(draft.endTime) - parseTimeToMinutes(draft.startTime) > 120) {
    conflicts.push({
      id: "soft-duration",
      severity: "SOFT",
      message: "This class runs longer than two hours. Confirm the extended session before saving.",
    })
  }

  return conflicts
}

function computeRoutineConflicts(routine: RoutineRecord) {
  const hardConflicts: Array<{ entryId: string; message: string }> = []
  const baseEntries = routine.entries.filter((entry) => !entry.isOverride)
  baseEntries.forEach((entry, index) => {
    baseEntries.slice(index + 1).forEach((other) => {
      if (entry.dayOfWeek !== other.dayOfWeek) return
      if (!overlaps(entry.startTime, entry.endTime, other.startTime, other.endTime)) return
      if (entry.teacherId === other.teacherId) {
        hardConflicts.push({
          entryId: entry.id,
          message: `Teacher ${entry.teacherName} is double-booked on ${DAY_LONG_LABELS[entry.dayOfWeek]} ${formatTime(entry.startTime)}-${formatTime(other.endTime)}.`,
        })
      }
      if (entry.roomId && other.roomId && entry.roomId === other.roomId) {
        hardConflicts.push({
          entryId: entry.id,
          message: `Room ${entry.roomName ?? entry.roomId} is booked twice on ${DAY_LONG_LABELS[entry.dayOfWeek]}.`,
        })
      }
    })
  })
  return hardConflicts
}

function applyOverridesForWeek(routine: RoutineRecord | undefined, weekStart: Date) {
  if (!routine) return [] as ScheduleEntry[]
  return FULL_WEEK_DAYS.flatMap((day, index) => {
    const date = toDateInput(addDays(weekStart, index))
    const baseEntries = routine.entries.filter((entry) => entry.dayOfWeek === day && !entry.isOverride)
    const overrideEntries = routine.entries.filter((entry) => entry.isOverride && entry.overrideDate === date)
    return baseEntries.flatMap((entry:any) => {
      const override = overrideEntries.find((item) => item.id.startsWith(`${entry.id}__override`))
      if (!override) return [{ ...entry, status: routine.status === "PUBLISHED" ? "PUBLISHED" : entry.status }]
      if (override.status === "CANCELLED") {
        return [{ ...entry, status: "CANCELLED", isOverride: true, overrideDate: date, reason: override.reason }]
      }
      return [{ ...entry, ...override, status: "OVERRIDE", isOverride: true, overrideDate: date }]
    })
  })
}

function getDateForDayIndex(weekStart: Date, dayIndex: number) {
  return toDateInput(addDays(weekStart, dayIndex))
}

function buildDefaultDraft(batchId: string, dayOfWeek: DayOfWeek = "SATURDAY", startTime = "09:00"): EntryDraft {
  return {
    batchId,
    dayOfWeek,
    startTime,
    endTime: "10:00",
    subjectId: "",
    teacherId: "",
    deliveryMode: "ON_SITE",
    roomId: "",
    liveSessionRef: "",
    notes: "",
  }
}

function SearchableInput({
  listId,
  value,
  onChange,
  options,
  placeholder,
}: {
  listId: string
  value: string
  onChange: (value: string) => void
  options: Array<{ id: string; name: string }>
  placeholder: string
}) {
  const displayValue = options.find((option) => option.id === value)?.name ?? value

  return (
    <>
      <Input
        list={listId}
        value={displayValue}
        onChange={(event) => {
          const rawValue = event.target.value
          const matchedOption = options.find((option) => option.name === rawValue || option.id === rawValue)
          onChange(matchedOption?.id ?? rawValue)
        }}
        placeholder={placeholder}
      />
      <datalist id={listId}>
        {options.map((option) => (
          <option key={option.id} value={option.name}>
            {option.name}
          </option>
        ))}
      </datalist>
    </>
  )
}

function FieldLabel({ label, required = false }: { label: string; required?: boolean }) {
  return (
    <label className="mb-1 block text-sm font-medium text-slate-700">
      {label}
      {required ? <span className="text-red-500"> *</span> : null}
    </label>
  )
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="mt-1 text-xs text-red-600">{message}</p>
}

function ScheduleCard({ entry, onClick }: { entry: ScheduleEntry; onClick?: () => void }) {
  const modeBadge = getModeBadgeProps(entry.deliveryMode)
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-2xl border border-slate-200 bg-white p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className={cn("font-semibold text-slate-900", entry.status === "CANCELLED" ? "line-through opacity-70" : "")}>{entry.subjectName}</p>
          <p className="text-xs text-slate-500">{entry.teacherName}</p>
        </div>
        <Badge className={modeBadge.className}>{modeBadge.label}</Badge>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-600">
        <span className="inline-flex items-center gap-1">
          <Clock3 className="h-3.5 w-3.5" />
          {formatTime(entry.startTime)} - {formatTime(entry.endTime)}
        </span>
        {entry.roomName ? (
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" />
            {entry.roomName}
          </span>
        ) : null}
        {entry.liveSessionRef ? (
          <span className="inline-flex items-center gap-1">
            <Link2 className="h-3.5 w-3.5" />
            Live link
          </span>
        ) : null}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {entry.status === "CANCELLED" ? <Badge variant="destructive">Cancelled</Badge> : null}
        {entry.status === "OVERRIDE" || entry.isOverride ? <Badge variant="warning">Override</Badge> : null}
        {entry.status === "PUBLISHED" ? <Badge className="bg-emerald-100 text-emerald-800">Published</Badge> : null}
      </div>
    </button>
  )
}

export default function ScheduleWorkspace({
  initialViewMode,
  pageTitle = "Class Scheduling System",
  pageDescription = "Build, review, publish, and monitor weekly routines for admins, teachers, and students from one workspace.",
  hideBuilder = false,
  minimalView = false,
}: ScheduleWorkspaceProps = {}) {
  const { user } = useAuth()
  const isMobile = useIsMobile()
  const tenantId =
    (user as any)?.tenant_id ??
    (user as any)?.tenantId ??
    (user as any)?.tenant?.id ??
    null

  const normalizedRole = String(
    (user as any)?.role ??
    (Array.isArray((user as any)?.roles) ? (user as any)?.roles[0] : (user as any)?.roles) ??
    "admin"
  ).toLowerCase()

  const isAdmin = ["admin", "superadmin", "rektor"].includes(normalizedRole)
  const isRestrictedViewer = ["teacher", "student"].includes(normalizedRole)
  const showListView = isAdmin && !minimalView
  const teacherScopeId = String(
    (user as any)?.teacher_id ??
      (user as any)?.teacherId ??
      (user as any)?.teacher?.id ??
      (user as any)?.user_id ??
      (user as any)?.id ??
      ""
  ).trim()
  const userBatchId = String(
    (user as any)?.batch_id ??
      (user as any)?.batchId ??
      (user as any)?.batch?.id ??
      (user as any)?.student?.batch_id ??
      (user as any)?.studentProfile?.batch_id ??
      ""
  ).trim()
  const userClassId = String(
    (user as any)?.class_id ??
      (user as any)?.classId ??
      (user as any)?.class?.id ??
      (user as any)?.student?.class_id ??
      (user as any)?.studentProfile?.class_id ??
      ""
  ).trim()
  const userSection = String(
    (user as any)?.section ??
      (user as any)?.batch?.section ??
      (user as any)?.student?.section ??
      (user as any)?.studentProfile?.section ??
      ""
  )
    .trim()
    .toLowerCase()
  const defaultViewMode = initialViewMode ?? (isAdmin && !hideBuilder ? "builder" : "weekly")
  const [viewMode, setViewMode] = useState<ViewMode>(defaultViewMode)
  const [selectedBatchId, setSelectedBatchId] = useState("")
  const [routines, setRoutines] = useState<RoutineRecord[]>([])
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [entrySheetOpen, setEntrySheetOpen] = useState(false)
  const [entryDraft, setEntryDraft] = useState<EntryDraft>(buildDefaultDraft(""))
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null)
  const [entryErrors, setEntryErrors] = useState<Partial<Record<keyof EntryDraft, string>>>({})
  const [entryConflicts, setEntryConflicts] = useState<ConflictItem[]>([])
  const [conflictChecking, setConflictChecking] = useState(false)
  const [softConfirmOpen, setSoftConfirmOpen] = useState(false)
  const [publishDialogOpen, setPublishDialogOpen] = useState(false)
  const [overrideDialogOpen, setOverrideDialogOpen] = useState(false)
  const [overrideDraft, setOverrideDraft] = useState<OverrideDraft>({
    overrideDate: toDateInput(new Date()),
    newStartTime: "",
    newEndTime: "",
    newTeacherId: "",
    newMode: "",
    newRoomId: "",
    newLiveSessionRef: "",
    status: "UPDATED",
    reason: "",
  })
  const [overrideErrors, setOverrideErrors] = useState<Partial<Record<keyof OverrideDraft, string>>>({})
  const [overrideTarget, setOverrideTarget] = useState<ScheduleEntry | null>(null)
  const [overrideMode, setOverrideMode] = useState<"DATE_ONLY" | "FUTURE" | null>(null)
  const [entryDetail, setEntryDetail] = useState<ScheduleEntry | null>(null)
  const [entryActionTarget, setEntryActionTarget] = useState<ScheduleEntry | null>(null)
  const [currentWeekStart, setCurrentWeekStart] = useState(() => getWeekStart(new Date()))
  const [selectedDayIndex, setSelectedDayIndex] = useState(() => {
    const today = new Date().getDay()
    return today === 6 ? 0 : today === 0 ? 1 : Math.min(6, Math.max(0, today + 1))
  })
  const [filters, setFilters] = useState({
    classId: "ALL",
    batchId: "ALL",
    teacherId: "ALL",
    subjectId: "ALL",
    fromDate: toDateInput(getWeekStart(new Date())),
    toDate: toDateInput(addDays(getWeekStart(new Date()), 6)),
    status: "ALL",
  })

  const bootstrapQuery = useQuery({
    queryKey: ["schedule-workspace", tenantId],
    queryFn: () => loadScheduleBootstrap(tenantId),
  })

  const classesQuery = useQuery({
    queryKey: ["schedule-classes", tenantId],
    enabled: !!tenantId && tenantId !== "demo-tenant",
    queryFn: async () => {
      const response = await api.get(`/api/tenants/${tenantId}/classes`, {
        params: { page: 1, limit: 100 },
      })
      return getRawItems(response?.data)
        .map(mapScheduleClassOption)
        .filter((item:any): item is ClassOption => Boolean(item))
    },
    staleTime: 60_000,
  })

  const batchesQuery = useQuery({
    queryKey: ["schedule-batches", tenantId],
    enabled: !!tenantId && tenantId !== "demo-tenant",
    queryFn: async () => {
      const response = await api.get(`/api/tenants/${tenantId}/batches`, {
        params: { page: 1, limit: 100 },
      })
      return getRawItems(response?.data)
        .map(mapScheduleBatchOption)
        .filter((item:any): item is BatchOption => Boolean(item))
    },
    staleTime: 60_000,
  })

  const subjectsQuery = useQuery({
    queryKey: ["schedule-subjects", tenantId],
    enabled: !!tenantId && tenantId !== "demo-tenant",
    queryFn: async () => {
      const response = await api.get(`/api/tenants/${tenantId}/subjects`, {
        params: { page: 1, limit: 100, is_active: true },
      })
      return getRawItems(response?.data)
        .map(mapScheduleSubjectOption)
        .filter((item:any): item is SubjectOption => Boolean(item))
    },
    staleTime: 60_000,
  })

  const teachersQuery = useQuery({
    queryKey: ["schedule-teachers", tenantId],
    enabled: !!tenantId && tenantId !== "demo-tenant",
    queryFn: async () => {
      const response = await api.get(`/api/tenants/${tenantId}/teachers`, {
        params: { page: 1, limit: 100 },
      })
      return getRawItems(response?.data)
        .map(mapScheduleTeacherOption)
        .filter((item:any): item is TeacherOption => Boolean(item))
    },
    staleTime: 60_000,
  })

  const roomsQuery = useQuery({
    queryKey: ["schedule-rooms"],
    enabled: !!tenantId && tenantId !== "demo-tenant",
    queryFn: async () => {
      const response = await api.get("/api/rooms")
      return getRawItems(response?.data)
        .map(mapScheduleRoomOption)
        .filter((item: any): item is RoomOption => Boolean(item))
    },
    staleTime: 60_000,
  })

  useEffect(() => {
    if (!bootstrapQuery.data) return
    setNotifications(bootstrapQuery.data.notifications)
  }, [bootstrapQuery.data])

  useEffect(() => {
    if (!selectedBatchId) {
      setEntryDraft(buildDefaultDraft(""))
      return
    }
    setEntryDraft((current) => ({ ...current, batchId: selectedBatchId }))
  }, [selectedBatchId])

  useEffect(() => {
    if (hideBuilder && viewMode === "builder") {
      setViewMode(initialViewMode ?? "daily")
    }
  }, [hideBuilder, initialViewMode, viewMode])

  useEffect(() => {
    if (!showListView && viewMode === "list") {
      setViewMode("daily")
    }
  }, [showListView, viewMode])

  const batches = batchesQuery.data ?? bootstrapQuery.data?.batches ?? []
  const classes = classesQuery.data ?? bootstrapQuery.data?.classes ?? []
  const subjects =
    tenantId && tenantId !== "demo-tenant"
      ? (subjectsQuery.data ?? [])
      : (bootstrapQuery.data?.subjects ?? [])
  const rooms =
    tenantId && tenantId !== "demo-tenant"
      ? (roomsQuery.data ?? [])
      : (bootstrapQuery.data?.rooms ?? [])
  const availableBatches = useMemo(() => {
    if (!isRestrictedViewer) return batches

    if (userBatchId) {
      const exactMatches = batches.filter((batch: BatchOption) => batch.id === userBatchId)
      if (exactMatches.length > 0) return exactMatches
    }

    let scopedBatches = userClassId
      ? batches.filter((batch: BatchOption) => batch.classId === userClassId)
      : batches

    if (userSection) {
      const sectionMatches = scopedBatches.filter((batch: BatchOption) =>
        batch.name.toLowerCase().includes(userSection)
      )
      if (sectionMatches.length > 0) return sectionMatches
    }

    return scopedBatches.length > 0 ? [scopedBatches[0]] : []
  }, [batches, isRestrictedViewer, userBatchId, userClassId, userSection])
  useEffect(() => {
    const initialBatchId = availableBatches[0]?.id ?? ""

    if (!initialBatchId) return
    setSelectedBatchId((current) =>
      current && availableBatches.some((batch: BatchOption) => batch.id === current) ? current : initialBatchId
    )
  }, [availableBatches])

  const teachers =
    tenantId && tenantId !== "demo-tenant"
      ? (teachersQuery.data ?? [])
      : (bootstrapQuery.data?.teachers ?? [])

  const teacherFilterOptions = useMemo(
    () => [{ id: "ALL", name: teachersQuery.isLoading ? "Loading teachers..." : "All teachers" }, ...teachers],
    [teachers, teachersQuery.isLoading]
  )
  const subjectFilterOptions = useMemo(
    () => [{ id: "ALL", name: subjectsQuery.isLoading ? "Loading subjects..." : "All subjects" }, ...subjects],
    [subjects, subjectsQuery.isLoading]
  )

  const currentRoutine = useMemo(() => routines.find((routine) => routine.batchId === selectedBatchId), [routines, selectedBatchId])
  const currentRoutineEntries = currentRoutine?.entries ?? []
  const routineHardConflicts = useMemo(() => (currentRoutine ? computeRoutineConflicts(currentRoutine) : []), [currentRoutine])
  const debouncedDraft = useDebounce(entryDraft, 250)
  const conflictRequestRef = useRef(0)

  const reloadRoutines = useCallback(async () => {
    if (!tenantId || tenantId === "demo-tenant") {
      setRoutines(bootstrapQuery.data?.routines ?? FALLBACK_DATA.routines)
      return
    }

    if (normalizedRole === "teacher" && teacherScopeId) {
      try {
        const teacherRoutines = await fetchTeacherSchedule(teacherScopeId, batches)
        setRoutines(teacherRoutines)
        return
      } catch {
        setRoutines([])
        return
      }
    }

    if (availableBatches.length === 0) {
      setRoutines([])
      return
    }

    const results = await Promise.allSettled(
      availableBatches.map((batch: BatchOption) => fetchRoutineForBatch(batch.id, batches))
    )

    const nextRoutines = results
      .map((result) => (result.status === "fulfilled" ? result.value : null))
      .filter((routine): routine is RoutineRecord => Boolean(routine))

    setRoutines(nextRoutines)
  }, [tenantId, bootstrapQuery.data?.routines, normalizedRole, teacherScopeId, availableBatches, batches])

  useEffect(() => {
    void reloadRoutines()
  }, [reloadRoutines])

  useEffect(() => {
    const validationErrors = validateEntryDraft(debouncedDraft)
    setEntryErrors(validationErrors)
    if (!entrySheetOpen || !debouncedDraft.batchId || Object.keys(validationErrors).length > 0) {
      setEntryConflicts([])
      return
    }
    const requestId = conflictRequestRef.current + 1
    conflictRequestRef.current = requestId
    setConflictChecking(true)
    detectConflicts(debouncedDraft, routines, teachers, rooms, editingEntryId ?? undefined)
      .then((conflicts) => {
        if (conflictRequestRef.current === requestId) setEntryConflicts(conflicts)
      })
      .finally(() => {
        if (conflictRequestRef.current === requestId) setConflictChecking(false)
      })
  }, [debouncedDraft, entrySheetOpen, routines, teachers, rooms, editingEntryId])

  const saveEntryMutation = useMutation({
    mutationFn: async (payload: EntryDraft) => {
      const entryPayload = {
        day_of_week: dayOfWeekToApiValue(payload.dayOfWeek),
        start_time: payload.startTime,
        end_time: payload.endTime,
        ...(payload.subjectId ? { subject_id: payload.subjectId } : {}),
        teacher_id: payload.teacherId,
        delivery_mode: payload.deliveryMode,
        ...(payload.roomId ? { room_id: payload.roomId } : {}),
        ...(payload.liveSessionRef ? { live_session_ref: payload.liveSessionRef } : {}),
        ...(payload.notes ? { notes: payload.notes } : {}),
      }

      if (editingEntryId) {
        const response = await api.put(`/api/entries/${editingEntryId}`, entryPayload)
        const responsePayload = extractResponseData(response)
        const nextEntry = mapRoutineEntry(
          {
            ...(responsePayload?.entry ?? responsePayload),
            batch_id: payload.batchId,
          },
          currentRoutine?.status ?? "DRAFT"
        )
        return {
          batchId: payload.batchId,
          routineId: currentRoutine?.id ?? "",
          routineStatus: currentRoutine?.status ?? "DRAFT",
          entry: nextEntry,
        }
      }

      let routineId = currentRoutine?.id
      let routineStatus: RoutineStatus = currentRoutine?.status ?? "DRAFT"
      if (!routineId) {
        const response = await api.post("/api/routines", {
          batch_id: payload.batchId,
          ...getRoutineDateWindow(),
        })
        const routinePayload = extractResponseData(response)
        const createdRoutine = mapRoutineRecord(routinePayload, batches)
        routineId =
          createdRoutine?.id ??
          String(routinePayload?.routine?.id ?? routinePayload?.id ?? "").trim()
        routineStatus = createdRoutine?.status ?? routineStatus
      }

      if (!routineId) throw new Error("Failed to create routine for this batch")

      const response = await api.post(`/api/routines/${routineId}/entries`, entryPayload)
      const responsePayload = extractResponseData(response)
      const nextEntry = mapRoutineEntry(
        {
          ...(responsePayload?.entry ?? responsePayload),
          batch_id: payload.batchId,
        },
        routineStatus
      )

      return {
        batchId: payload.batchId,
        routineId,
        routineStatus,
        entry: nextEntry,
      }
    },
    onSuccess: (result) => {
      setRoutines((current) => {
        const next = [...current]
        const targetIndex = next.findIndex((routine) => routine.batchId === result.batchId)
        const batch = batches.find((item: BatchOption) => item.id === result.batchId)

        const existing =
          targetIndex >= 0
            ? next[targetIndex]
            : {
                id: result.routineId || `draft-routine-${result.batchId}`,
                batchId: result.batchId,
                batchName: batch?.name ?? result.batchId,
                status: result.routineStatus as RoutineStatus,
                entries: [] as ScheduleEntry[],
              }

        const dedupedEntries = result.entry
          ? [...existing.entries.filter((entry) => entry.id !== result.entry.id), result.entry]
          : existing.entries

        const updatedRoutine: RoutineRecord = {
          ...existing,
          id: result.routineId || existing.id,
          status: (result.routineStatus as RoutineStatus) ?? existing.status,
          entries: dedupedEntries,
        }

        if (targetIndex >= 0) {
          next[targetIndex] = updatedRoutine
        } else {
          next.push(updatedRoutine)
        }

        return next
      })
      toast.success(editingEntryId ? "Schedule entry updated" : "Class added to routine")
      setEntrySheetOpen(false)
      setEditingEntryId(null)
      setEntryConflicts([])
    },
  })

  const publishMutation = useMutation({
    mutationFn: async () => {
      if (!currentRoutine) throw new Error("Routine not found")
      await api.post(`/api/routines/${currentRoutine.id}/publish`)
      return currentRoutine.batchId
    },
    onSuccess: async () => {
      await reloadRoutines()
      toast.success("Routine published successfully")
      setPublishDialogOpen(false)
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to publish routine")
    },
  })

  const overrideMutation = useMutation({
    mutationFn: async () => {
      if (!overrideTarget) throw new Error("No entry selected")
      if (overrideMode === "FUTURE") {
        await api.put(`/api/entries/${overrideTarget.id}`, {
          day_of_week: dayOfWeekToApiValue(overrideTarget.dayOfWeek),
          start_time: overrideDraft.newStartTime || overrideTarget.startTime,
          end_time: overrideDraft.newEndTime || overrideTarget.endTime,
          subject_id: overrideTarget.subjectId,
          teacher_id: overrideDraft.newTeacherId || overrideTarget.teacherId,
          delivery_mode: overrideDraft.newMode || overrideTarget.deliveryMode,
          room_id: overrideDraft.newRoomId || overrideTarget.roomId,
          live_session_ref: overrideDraft.newLiveSessionRef || overrideTarget.liveSessionRef,
          notes: overrideDraft.reason || overrideTarget.notes,
        })
        return
      }

      await api.post(`/api/entries/${overrideTarget.id}/override`, {
        override_date: overrideDraft.overrideDate,
        start_time: overrideDraft.newStartTime || overrideTarget.startTime,
        end_time: overrideDraft.newEndTime || overrideTarget.endTime,
        teacher_id: overrideDraft.newTeacherId || overrideTarget.teacherId,
        delivery_mode: overrideDraft.newMode || overrideTarget.deliveryMode,
        room_id: overrideDraft.newRoomId || overrideTarget.roomId,
        live_session_ref: overrideDraft.newLiveSessionRef || overrideTarget.liveSessionRef,
        status: overrideDraft.status,
        reason: overrideDraft.reason,
      })
    },
    onSuccess: async () => {
      await reloadRoutines()
      toast.success(overrideMode === "FUTURE" ? "Future routine updated" : "Override saved")
      setOverrideDialogOpen(false)
      setOverrideTarget(null)
      setEntryActionTarget(null)
    },
  })

  const deleteEntryMutation = useMutation({
    mutationFn: async (entryId: string) => {
      await api.delete(`/api/entries/${entryId}`)
      return entryId
    },
    onSuccess: (entryId) => {
      setRoutines((current) =>
        current.map((routine) => ({
          ...routine,
          entries: routine.entries.filter(
            (entry) => entry.id !== entryId && !entry.id.startsWith(`${entryId}__override__`)
          ),
        }))
      )
      toast.success("Schedule entry deleted")
    },
  })

  const filteredBatches = useMemo(() => {
    if (filters.classId === "ALL") return batches
    return batches.filter((batch: any) => batch.classId === filters.classId)
  }, [batches, filters.classId])

  const weeklyReadEntries = useMemo(() => applyOverridesForWeek(currentRoutine, currentWeekStart), [currentRoutine, currentWeekStart])
  const selectedDailyDate = useMemo(() => getDateForDayIndex(currentWeekStart, selectedDayIndex), [currentWeekStart, selectedDayIndex])
  const selectedDailyDay = FULL_WEEK_DAYS[selectedDayIndex] ?? "SATURDAY"
  const dailyReadEntries = useMemo(
    () =>
      weeklyReadEntries
        .filter((entry) => (entry.overrideDate ? entry.overrideDate === selectedDailyDate : entry.dayOfWeek === selectedDailyDay))
        .sort((a, b) => parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime)),
    [weeklyReadEntries, selectedDailyDate, selectedDailyDay]
  )

  const listRows = useMemo(() => {
    const targetBatchIds = filters.batchId === "ALL" ? new Set(filteredBatches.map((batch: BatchOption) => batch.id)) : new Set([filters.batchId])
    return routines
      .filter((routine) => targetBatchIds.has(routine.batchId))
      .flatMap((routine) =>
        routine.entries.map((entry) => {
          const batch = batches.find((item: any) => item.id === routine.batchId)
          return {
            ...entry,
            routineStatus: routine.status,
            batchName: batch?.name ?? routine.batchName,
            className: batch?.className ?? "-",
          }
        })
      )
      .filter((entry) => {
        if (filters.teacherId !== "ALL" && entry.teacherId !== filters.teacherId) return false
        if (filters.subjectId !== "ALL" && entry.subjectId !== filters.subjectId) return false
        if (filters.status !== "ALL" && entry.status !== filters.status && entry.routineStatus !== filters.status) return false
        const dateValue = entry.overrideDate || toDateInput(addDays(getWeekStart(new Date()), FULL_WEEK_DAYS.indexOf(entry.dayOfWeek)))
        if (filters.fromDate && dateValue < filters.fromDate) return false
        if (filters.toDate && dateValue > filters.toDate) return false
        return true
      })
      .sort((a, b) => {
        const dayCompare = FULL_WEEK_DAYS.indexOf(a.dayOfWeek) - FULL_WEEK_DAYS.indexOf(b.dayOfWeek)
        if (dayCompare !== 0) return dayCompare
        return parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime)
      })
  }, [routines, batches, filteredBatches, filters])

  function openCreateSheet(dayOfWeek: DayOfWeek, startTime: string) {
    if (!selectedBatchId) return
    setEditingEntryId(null)
    setEntryDraft(buildDefaultDraft(selectedBatchId, dayOfWeek, startTime))
    setEntrySheetOpen(true)
  }

  function openEditSheet(entry: ScheduleEntry) {
    setEditingEntryId(entry.id)
    setEntryDraft({
      id: entry.id,
      batchId: entry.batchId,
      dayOfWeek: entry.dayOfWeek,
      startTime: entry.startTime,
      endTime: entry.endTime,
      subjectId: entry.subjectId,
      teacherId: entry.teacherId,
      deliveryMode: entry.deliveryMode,
      roomId: entry.roomId ?? "",
      liveSessionRef: entry.liveSessionRef ?? "",
      notes: entry.notes ?? "",
    })
    setEntrySheetOpen(true)
  }

  function handleCellAction(dayOfWeek: DayOfWeek, slotStart: string, entry?: ScheduleEntry) {
    if (!entry) {
      openCreateSheet(dayOfWeek, slotStart)
      return
    }
    if (!isAdmin) {
      setEntryDetail(entry)
      return
    }
    if (currentRoutine?.status === "PUBLISHED") {
      setEntryActionTarget(entry)
      return
    }
    openEditSheet(entry)
  }

  function handleSaveEntry() {
    const validationErrors = validateEntryDraft(entryDraft)
    setEntryErrors(validationErrors)
    const hasHardConflict = entryConflicts.some((conflict) => conflict.severity === "HARD")
    const hasSoftConflict = entryConflicts.some((conflict) => conflict.severity === "SOFT")
    if (Object.keys(validationErrors).length > 0 || hasHardConflict) return
    if (hasSoftConflict) {
      setSoftConfirmOpen(true)
      return
    }
    saveEntryMutation.mutate(entryDraft)
  }

  function handlePublishRoutine() {
    if (!currentRoutine || routineHardConflicts.length > 0) return
    setPublishDialogOpen(true)
  }

  function openOverrideFlow(mode: "DATE_ONLY" | "FUTURE") {
    if (!entryActionTarget) return
    setOverrideMode(mode)
    setOverrideTarget(entryActionTarget)
    setOverrideDraft({
      overrideDate: toDateInput(addDays(getWeekStart(new Date()), FULL_WEEK_DAYS.indexOf(entryActionTarget.dayOfWeek))),
      newStartTime: "",
      newEndTime: "",
      newTeacherId: "",
      newMode: "",
      newRoomId: "",
      newLiveSessionRef: "",
      status: "UPDATED",
      reason: "",
    })
    setOverrideErrors({})
    setOverrideDialogOpen(true)
  }

  function handleSaveOverride() {
    if (!overrideTarget) return
    const validationErrors = validateOverrideDraft(overrideDraft)
    setOverrideErrors(validationErrors)
    if (Object.keys(validationErrors).length > 0) return

    if (overrideMode === "DATE_ONLY" && overrideDraft.status !== "CANCELLED") {
      const draftForConflictCheck: EntryDraft = {
        batchId: overrideTarget.batchId,
        dayOfWeek: getDayFromDate(overrideDraft.overrideDate),
        startTime: overrideDraft.newStartTime || overrideTarget.startTime,
        endTime: overrideDraft.newEndTime || overrideTarget.endTime,
        subjectId: overrideTarget.subjectId,
        teacherId: overrideDraft.newTeacherId || overrideTarget.teacherId,
        deliveryMode: overrideDraft.newMode || overrideTarget.deliveryMode,
        roomId: overrideDraft.newRoomId || overrideTarget.roomId || "",
        liveSessionRef: overrideDraft.newLiveSessionRef || overrideTarget.liveSessionRef || "",
        notes: overrideDraft.reason,
      }
      detectConflicts(draftForConflictCheck, routines, teachers, rooms, overrideTarget.id).then((conflicts) => {
        const hardConflict = conflicts.find((item) => item.severity === "HARD")
        if (hardConflict) {
          toast.error(hardConflict.message)
          return
        }
        overrideMutation.mutate()
      })
      return
    }
    overrideMutation.mutate()
  }

  if (bootstrapQuery.isLoading) {
    return (
      <div className="space-y-6 p-4 md:p-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
          <Skeleton className="h-[220px] rounded-3xl" />
          <Skeleton className="h-[520px] rounded-3xl" />
        </div>
      </div>
    )
  }

  if (bootstrapQuery.isError) {
    return (
      <div className="space-y-4 p-4 md:p-6">
        <Alert variant="destructive">
          <AlertTitle>Could not load schedule workspace</AlertTitle>
          <AlertDescription className="flex items-center justify-between gap-3">
            <span>The scheduling UI could not fetch its initial data.</span>
            <Button variant="outline" size="sm" onClick={() => bootstrapQuery.refetch()}>
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="min-w-0 space-y-6 overflow-x-hidden p-4 md:p-6">
      {minimalView ? (
        <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2">
              <Badge variant="outline" className="w-fit">
                Bangladesh Standard Time (UTC+6)
              </Badge>
              <div className="space-y-1">
                <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{pageTitle}</h1>
                <p className="max-w-2xl text-sm text-slate-500">
                  {pageDescription}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {!hideBuilder ? (
                <Button
                  variant={viewMode === "builder" ? "secondary" : "outline"}
                  onClick={() => setViewMode("builder")}
                  disabled={!isAdmin}
                >
                  <LayoutGrid className="mr-2 h-4 w-4" />
                  Routine Builder
                </Button>
              ) : null}
              <Button
                variant={viewMode === "weekly" ? "secondary" : "outline"}
                onClick={() => setViewMode("weekly")}
              >
                <Eye className="mr-2 h-4 w-4" />
                Weekly View
              </Button>
              <Button
                variant={viewMode === "daily" ? "secondary" : "outline"}
                onClick={() => setViewMode("daily")}
              >
                <CalendarDays className="mr-2 h-4 w-4" />
                Daily View
              </Button>
              {showListView ? (
                <Button
                  variant={viewMode === "list" ? "secondary" : "outline"}
                  onClick={() => setViewMode("list")}
                >
                  <ListFilter className="mr-2 h-4 w-4" />
                  List View
                </Button>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}
      {!minimalView ? (
        <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-[linear-gradient(135deg,#0f172a_0%,#1d4ed8_58%,#38bdf8_100%)] text-white shadow-lg">
          <div className="grid gap-6 p-4 sm:p-6 lg:grid-cols-[1.3fr_0.7fr]">
            <div className="space-y-4">
              <Badge className="bg-white/15 text-white">Bangladesh Standard Time (UTC+6)</Badge>
              <div className="space-y-2">
                <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{pageTitle}</h1>
                <p className="max-w-2xl text-sm text-blue-100">
                  {pageDescription}
                </p>
              </div>
              <div className="grid gap-2 sm:flex sm:flex-wrap">
                {!hideBuilder ? (
                  <Button variant={viewMode === "builder" ? "secondary" : "outline"} className={cn("w-full border-white/20 sm:w-auto", viewMode === "builder" ? "" : "bg-white/10 text-white hover:bg-white/20")} onClick={() => setViewMode("builder")} disabled={!isAdmin}>
                    <LayoutGrid className="mr-2 h-4 w-4" />
                    Routine Builder
                  </Button>
                ) : null}
                <Button variant={viewMode === "weekly" ? "secondary" : "outline"} className={cn("w-full border-white/20 sm:w-auto", viewMode === "weekly" ? "" : "bg-white/10 text-white hover:bg-white/20")} onClick={() => setViewMode("weekly")}>
                  <Eye className="mr-2 h-4 w-4" />
                  Weekly View
                </Button>
                <Button variant={viewMode === "daily" ? "secondary" : "outline"} className={cn("w-full border-white/20 sm:w-auto", viewMode === "daily" ? "" : "bg-white/10 text-white hover:bg-white/20")} onClick={() => setViewMode("daily")}>
                  <CalendarDays className="mr-2 h-4 w-4" />
                  Daily View
                </Button>
                {showListView ? (
                  <Button variant={viewMode === "list" ? "secondary" : "outline"} className={cn("w-full border-white/20 sm:w-auto", viewMode === "list" ? "" : "bg-white/10 text-white hover:bg-white/20")} onClick={() => setViewMode("list")}>
                    <ListFilter className="mr-2 h-4 w-4" />
                    List View
                  </Button>
                ) : null}
              </div>
            </div>
            <div className="grid gap-3 rounded-[24px] bg-white/10 p-4 backdrop-blur">
              <div className="flex items-start justify-between gap-3 rounded-2xl bg-white/10 p-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-blue-100">Active Batch</p>
                  <p className="mt-1 text-lg font-semibold">{batches.find((batch: any) => batch.id === selectedBatchId)?.name ?? "Choose batch"}</p>
                </div>
                {currentRoutine ? <Badge {...getStatusBadgeProps(currentRoutine.status)}>{currentRoutine.status}</Badge> : <Badge variant="warning">No routine yet</Badge>}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-white/10 p-4">
                  <p className="text-xs text-blue-100">Unread schedule alerts</p>
                  <p className="mt-2 text-2xl font-semibold">{notifications.filter((item) => item.unread).length}</p>
                </div>
                <div className="rounded-2xl bg-white/10 p-4">
                  <p className="text-xs text-blue-100">Routine entries</p>
                  <p className="mt-2 text-2xl font-semibold">{currentRoutineEntries.filter((entry) => !entry.isOverride).length}</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      ) : null}
      <section className="space-y-6">
        {!minimalView && viewMode !== "list" ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 dark:border-slate-800 dark:bg-slate-950">
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_240px]">
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Routine Context</p>
                  <h2 className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">Batch Selection</h2>
                </div>
                <div>
                  <FieldLabel label="Batch" required />
                  <Select value={selectedBatchId} onValueChange={setSelectedBatchId} disabled={isRestrictedViewer}>
                    {availableBatches.map((batch: BatchOption) => (
                      <option key={batch.id} value={batch.id}>{batch.name} ({batch.className})</option>
                    ))}
                  </Select>
                </div>
                <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                  <p className="font-medium text-slate-900 dark:text-white">{batches.find((batch: any) => batch.id === selectedBatchId)?.name ?? "No batch selected"}</p>
                  <p className="mt-1">Active routine context</p>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Publish Flow</p>
                  <h3 className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">Publish Routine</h3>
                </div>
                <p className="text-xs leading-5 text-slate-600 dark:text-slate-300">
                  Make this routine visible to teachers and students.
                </p>
                {isAdmin ? (
                  <>
                    <Button
                      className="h-10 w-full"
                      onClick={handlePublishRoutine}
                      disabled={!currentRoutine || currentRoutine.status === "PUBLISHED" || routineHardConflicts.length > 0}
                    >
                      Publish Routine
                    </Button>
                    {routineHardConflicts.length > 0 ? (
                      <p className="text-xs text-red-600 dark:text-red-300">Resolve hard conflicts before publishing.</p>
                    ) : null}
                  </>
                ) : (
                  <p className="text-sm text-slate-500 dark:text-slate-400">Publishing is available for admin roles only.</p>
                )}
              </div>
            </div>
          </div>
        ) : null}

        {!minimalView && isAdmin && currentRoutine && routineHardConflicts.length > 0 ? (
          <Alert variant="destructive">
            <AlertTitle>Unresolved hard conflicts</AlertTitle>
            <AlertDescription className="space-y-2">
              {routineHardConflicts.map((conflict) => (
                <div key={`${conflict.entryId}-${conflict.message}`} className="flex items-start gap-2">
                  <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{conflict.message}</span>
                </div>
              ))}
            </AlertDescription>
          </Alert>
        ) : null}

        {viewMode === "builder" ? (
            <div className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">Weekly Routine Builder</h2>
                  <p className="text-sm text-slate-500">Sat-Thu planning grid with click-to-add cells and inline class cards.</p>
                </div>
                {currentRoutine ? <Badge {...getStatusBadgeProps(currentRoutine.status)}>{currentRoutine.status}</Badge> : <Badge variant="warning">No routine</Badge>}
              </div>
              {!currentRoutineEntries.length ? (
                <div className="rounded-[24px] border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 text-blue-700"><Sparkles className="h-6 w-6" /></div>
                  <h3 className="mt-4 text-lg font-semibold text-slate-900">Start building this routine</h3>
                  <p className="mt-2 text-sm text-slate-500">No routine exists yet for this batch. Each grid cell is ready for a new class.</p>
                </div>
              ) : null}
              {isMobile ? (
                <div className="mt-5 space-y-4">
                  {BUILDER_DAYS.map((day) => (
                    <div key={`mobile-builder-${day}`} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <h3 className="text-base font-semibold text-slate-900">{DAY_LONG_LABELS[day]}</h3>
                        <Badge variant="outline">{currentRoutineEntries.filter((entry) => !entry.isOverride && entry.dayOfWeek === day).length} classes</Badge>
                      </div>
                      <div className="space-y-3">
                        {TIME_SLOTS.map((slot) => {
                          const entry = currentRoutineEntries.find((item) => !item.isOverride && item.dayOfWeek === day && matchesSlot(item, slot))
                          return (
                            <div key={`${day}-${slot}-mobile`} className="rounded-2xl border border-dashed border-slate-200 bg-white p-3">
                              <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">{formatTime(slot)}</div>
                              {entry ? (
                                <ScheduleCard entry={entry} onClick={() => handleCellAction(day, slot, entry)} />
                              ) : (
                                <button type="button" onClick={() => handleCellAction(day, slot)} className="flex w-full items-center justify-between rounded-2xl border border-slate-200 px-3 py-3 text-left text-sm text-slate-600 transition hover:border-slate-300">
                                  <span>Add Class</span>
                                  <Plus className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
              <div className="mt-5 overflow-x-auto pb-2">
                <div className="min-w-[920px]">
                  <div className="grid grid-cols-[100px_repeat(6,minmax(140px,1fr))] gap-3">
                    <div />
                    {BUILDER_DAYS.map((day) => <div key={day} className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700">{DAY_LABELS[day]}</div>)}
                    {TIME_SLOTS.map((slot) => [
                      <div key={`${slot}-label`} className="rounded-2xl bg-slate-100 px-4 py-4 text-sm font-medium text-slate-600">{formatTime(slot)}</div>,
                      ...BUILDER_DAYS.map((day) => {
                        const entry = currentRoutineEntries.find((item) => !item.isOverride && item.dayOfWeek === day && matchesSlot(item, slot))
                        return (
                          <div key={`${day}-${slot}`} className="min-h-32 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-2">
                            {entry ? (
                              <ScheduleCard entry={entry} onClick={() => handleCellAction(day, slot, entry)} />
                            ) : (
                              <button type="button" onClick={() => handleCellAction(day, slot)} className="flex h-full min-h-28 w-full flex-col items-center justify-center rounded-2xl border border-transparent text-center text-slate-500 transition hover:border-slate-300 hover:bg-white">
                                <Plus className="mb-2 h-4 w-4" />
                                <span className="text-sm font-medium">Add Class</span>
                                <span className="text-xs">Click to schedule this slot</span>
                              </button>
                            )}
                          </div>
                        )
                      }),
                    ])}
                  </div>
                </div>
              </div>
              )}
            </div>
        ) : null}

        {viewMode === "weekly" ? (
            <div className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">Weekly Schedule View</h2>
                  <p className="text-sm text-slate-500">Read-only schedule for teachers and students with overrides applied automatically.</p>
                </div>
                <div className="flex w-full items-center gap-2 sm:w-auto">
                  <Button variant="outline" size="icon-sm" className="shrink-0" onClick={() => setCurrentWeekStart((value) => addDays(value, -7))}><ChevronLeft className="h-4 w-4" /></Button>
                  <div className="min-w-0 flex-1 rounded-2xl border border-slate-200 px-3 py-2 text-center text-sm font-medium text-slate-700 sm:flex-none sm:rounded-full sm:px-4">
                    <span className="block truncate sm:inline">{formatDateLabel(toDateInput(currentWeekStart))}</span>
                    <span className="hidden sm:inline"> - </span>
                    <span className="block truncate sm:inline">{formatDateLabel(toDateInput(addDays(currentWeekStart, 6)))}</span>
                  </div>
                  <Button variant="outline" size="icon-sm" className="shrink-0" onClick={() => setCurrentWeekStart((value) => addDays(value, 7))}><ChevronRight className="h-4 w-4" /></Button>
                </div>
              </div>
              <div className="mb-4 flex flex-wrap gap-2">
                {(["ON_SITE", "LIVE_ONLINE", "RECORDED_SUPPORT", "HYBRID"] as DeliveryMode[]).map((mode) => {
                  const badge = getModeBadgeProps(mode)
                  return <Badge key={mode} className={badge.className}>{badge.label}</Badge>
                })}
              </div>
              {isMobile ? (
                <div className="space-y-4">
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {FULL_WEEK_DAYS.map((day, index) => (
                      <button
                        key={`weekly-mobile-tab-${day}`}
                        type="button"
                        onClick={() => setSelectedDayIndex(index)}
                        className={cn(
                          "shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition",
                          selectedDayIndex === index ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-700"
                        )}
                      >
                        {DAY_LABELS[day]}
                      </button>
                    ))}
                  </div>
                  <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                    <div className="mb-4">
                      <h3 className="text-lg font-semibold text-slate-900">{DAY_LONG_LABELS[selectedDailyDay]}</h3>
                      <p className="text-sm text-slate-500">{formatDateLabel(selectedDailyDate)}</p>
                    </div>
                    <div className="space-y-3">
                      {TIME_SLOTS.map((slot) => {
                        const entry = dailyReadEntries.find((item) => matchesSlot(item, slot))
                        return (
                          <div key={`weekly-mobile-${slot}`} className="rounded-2xl border border-slate-200 bg-white p-3">
                            <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">{formatTime(slot)}</div>
                            {entry ? (
                              <ScheduleCard entry={entry} onClick={() => setEntryDetail(entry)} />
                            ) : (
                              <div className="rounded-2xl border border-dashed border-slate-200 px-3 py-4 text-center text-xs text-slate-400">No class</div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              ) : (
              <div className="overflow-x-auto pb-2">
                <div className="min-w-[1060px]">
                  <div className="grid grid-cols-[100px_repeat(7,minmax(140px,1fr))] gap-3">
                    <div />
                    {FULL_WEEK_DAYS.map((day, index) => (
                      <div key={day} className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700">
                        <div>{DAY_LABELS[day]}</div>
                        <div className="mt-1 text-xs font-normal text-slate-500">{formatDateLabel(toDateInput(addDays(currentWeekStart, index)))}</div>
                      </div>
                    ))}
                    {TIME_SLOTS.map((slot) => [
                      <div key={`${slot}-read-label`} className="rounded-2xl bg-slate-100 px-4 py-4 text-sm font-medium text-slate-600">{formatTime(slot)}</div>,
                      ...FULL_WEEK_DAYS.map((day, index) => {
                        const date = toDateInput(addDays(currentWeekStart, index))
                        const entry = weeklyReadEntries.find((item) => (item.overrideDate ? item.overrideDate === date : item.dayOfWeek === day) && matchesSlot(item, slot))
                        return (
                          <div key={`${day}-${slot}-read`} className="min-h-32 rounded-2xl border border-slate-200 bg-slate-50 p-2">
                            {entry ? <ScheduleCard entry={entry} onClick={() => setEntryDetail(entry)} /> : <div className="flex h-full min-h-28 items-center justify-center rounded-2xl border border-dashed border-slate-200 text-xs text-slate-400">No class</div>}
                          </div>
                        )
                      }),
                    ])}
                  </div>
                </div>
              </div>
              )}
            </div>
        ) : null}

        {viewMode === "daily" ? (
            <div className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">Daily Calendar View</h2>
                  <p className="text-sm text-slate-500">Single-day schedule timeline for quicker reading on desktop and mobile.</p>
                </div>
                <div className="flex w-full items-center gap-2 sm:w-auto">
                  <Button
                    variant="outline"
                    size="icon-sm"
                    className="shrink-0"
                    onClick={() => {
                      if (selectedDayIndex === 0) {
                        setCurrentWeekStart((value) => addDays(value, -7))
                        setSelectedDayIndex(6)
                        return
                      }
                      setSelectedDayIndex((value) => value - 1)
                    }}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <div className="min-w-0 flex-1 rounded-2xl border border-slate-200 px-3 py-2 text-center text-sm font-medium text-slate-700 sm:flex-none sm:rounded-full sm:px-4">
                    <span className="block truncate sm:inline">{DAY_LONG_LABELS[selectedDailyDay]}</span>
                    <span className="hidden sm:inline"> • </span>
                    <span className="block truncate sm:inline">{formatDateLabel(selectedDailyDate)}</span>
                  </div>
                  <Button
                    variant="outline"
                    size="icon-sm"
                    className="shrink-0"
                    onClick={() => {
                      if (selectedDayIndex === 6) {
                        setCurrentWeekStart((value) => addDays(value, 7))
                        setSelectedDayIndex(0)
                        return
                      }
                      setSelectedDayIndex((value) => value + 1)
                    }}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
                {FULL_WEEK_DAYS.map((day, index) => (
                  <button
                    key={`daily-tab-${day}`}
                    type="button"
                    onClick={() => setSelectedDayIndex(index)}
                    className={cn(
                      "shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition",
                      selectedDayIndex === index ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-700"
                    )}
                  >
                    {DAY_LABELS[day]}
                  </button>
                ))}
              </div>

              {dailyReadEntries.length === 0 ? (
                <div className="rounded-[24px] border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                    <CalendarDays className="h-5 w-5" />
                  </div>
                  <p className="mt-4 text-base font-semibold text-slate-900">No classes scheduled for this day</p>
                  <p className="mt-2 text-sm text-slate-500">Use the arrows or day pills to move through the week.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {minimalView
                    ? dailyReadEntries.map((entry) => (
                        <div key={entry.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-3">
                          <ScheduleCard entry={entry} onClick={() => setEntryDetail(entry)} />
                        </div>
                      ))
                    : TIME_SLOTS.map((slot) => {
                        const entry = dailyReadEntries.find((item) => matchesSlot(item, slot))
                        return (
                          <div key={`daily-${slot}`} className="grid gap-3 rounded-3xl border border-slate-200 bg-slate-50 p-3 md:grid-cols-[120px_1fr] md:items-start">
                            <div className="rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-700">
                              {formatTime(slot)}
                            </div>
                            {entry ? (
                              <ScheduleCard entry={entry} onClick={() => setEntryDetail(entry)} />
                            ) : (
                              <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-5 text-sm text-slate-400">
                                No class in this slot
                              </div>
                            )}
                          </div>
                        )
                      })}
                </div>
              )}
            </div>
        ) : null}

        {showListView && viewMode === "list" ? (
            <div className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">Schedule Entry List</h2>
                  <p className="text-sm text-slate-500">Filter by class, batch, teacher, subject, date range, and status.</p>
                </div>
                <Badge variant="muted">{listRows.length} results</Badge>
              </div>
              <div className="grid gap-3 rounded-[24px] border border-slate-200 bg-slate-50 p-4 md:grid-cols-2 xl:grid-cols-3">
                <div><FieldLabel label="Class" /><Select value={filters.classId} onValueChange={(value) => setFilters((current) => ({ ...current, classId: value, batchId: "ALL" }))}><option value="ALL">All classes</option>{classes.map((item: ClassOption) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select></div>
                <div><FieldLabel label="Batch" /><Select value={filters.batchId} onValueChange={(value) => setFilters((current) => ({ ...current, batchId: value }))}><option value="ALL">All batches</option>{filteredBatches.map((item: BatchOption) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select></div>
                <div>
                  <FieldLabel label="Teacher" />
                  <Select value={filters.teacherId} onValueChange={(value) => setFilters((current) => ({ ...current, teacherId: value || "ALL" }))}>
                    {teacherFilterOptions.map((option) => (
                      <option key={option.id} value={option.id}>{option.name}</option>
                    ))}
                  </Select>
                </div>
                <div>
                  <FieldLabel label="Subject" />
                  <Select value={filters.subjectId} onValueChange={(value) => setFilters((current) => ({ ...current, subjectId: value || "ALL" }))}>
                    {subjectFilterOptions.map((option) => (
                      <option key={option.id} value={option.id}>{option.name}</option>
                    ))}
                  </Select>
                </div>
                <div><FieldLabel label="From Date" /><Input type="date" value={filters.fromDate} onChange={(event) => setFilters((current) => ({ ...current, fromDate: event.target.value }))} /></div>
                <div><FieldLabel label="To Date" /><Input type="date" value={filters.toDate} onChange={(event) => setFilters((current) => ({ ...current, toDate: event.target.value }))} /></div>
                <div><FieldLabel label="Status" /><Select value={filters.status} onValueChange={(value) => setFilters((current) => ({ ...current, status: value }))}><option value="ALL">All statuses</option><option value="DRAFT">Draft</option><option value="PUBLISHED">Published</option><option value="CANCELLED">Cancelled</option></Select></div>
              </div>
            </div>
        ) : null}
      </section>
      {showListView && viewMode === "list" ? (
        <section className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="hidden overflow-hidden rounded-3xl border border-slate-200 lg:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Day</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Teacher</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead>Room/Link</TableHead>
                  <TableHead>Batch</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {listRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="py-14 text-center">
                      <div className="space-y-2">
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500"><CalendarDays className="h-5 w-5" /></div>
                        <p className="font-medium text-slate-900">No entries match the current filters</p>
                        <p className="text-sm text-slate-500">Adjust the filter set to see schedule entries again.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : listRows.map((row) => {
                  const modeBadge = getModeBadgeProps(row.deliveryMode)
                  const statusBadge = getStatusBadgeProps(row.status)
                  return (
                    <TableRow key={row.id} className="cursor-pointer hover:bg-slate-50" onClick={() => setEntryDetail(row)}>
                      <TableCell>{DAY_LABELS[row.dayOfWeek]}</TableCell>
                      <TableCell>{formatTime(row.startTime)} - {formatTime(row.endTime)}</TableCell>
                      <TableCell className="font-medium">{row.subjectName}</TableCell>
                      <TableCell>{row.teacherName}</TableCell>
                      <TableCell><Badge className={modeBadge.className}>{modeBadge.label}</Badge></TableCell>
                      <TableCell>{row.roomName ?? row.liveSessionRef ?? "-"}</TableCell>
                      <TableCell>{row.batchName}</TableCell>
                      <TableCell><Badge {...statusBadge}>{row.status}</Badge></TableCell>
                      <TableCell className="text-right">
                        {isAdmin ? (
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="icon-sm" onClick={(event) => { event.stopPropagation(); currentRoutine?.status === "PUBLISHED" ? setEntryActionTarget(row) : openEditSheet(row) }}><Pencil className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="sm" onClick={(event) => { event.stopPropagation(); setEntryActionTarget(row) }}>Override</Button>
                            <Button variant="ghost" size="sm" className="text-red-600" onClick={(event) => {
                              event.stopPropagation()
                              if (row.routineStatus === "PUBLISHED") {
                                setEntryActionTarget(row)
                                return
                              }
                              deleteEntryMutation.mutate(row.id)
                            }}>{deleteEntryMutation.isPending ? "Deleting..." : row.routineStatus === "PUBLISHED" ? "Override" : "Delete"}</Button>
                          </div>
                        ) : <Button variant="ghost" size="sm">View</Button>}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
          <div className="grid gap-3 lg:hidden">
            {listRows.length === 0 ? <div className="rounded-3xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500">No entries match the current filters.</div> : listRows.map((row) => {
              const modeBadge = getModeBadgeProps(row.deliveryMode)
              const statusBadge = getStatusBadgeProps(row.status)
              return (
                <button key={`card-${row.id}`} type="button" onClick={() => setEntryDetail(row)} className="rounded-3xl border border-slate-200 p-4 text-left shadow-sm transition hover:border-slate-300">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">{row.subjectName}</p>
                      <p className="text-sm text-slate-500">{row.teacherName}</p>
                    </div>
                    <Badge {...statusBadge}>{row.status}</Badge>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge className={modeBadge.className}>{modeBadge.label}</Badge>
                    <Badge variant="outline">{row.batchName}</Badge>
                  </div>
                  <p className="mt-3 text-sm text-slate-600">{DAY_LABELS[row.dayOfWeek]} • {formatTime(row.startTime)} - {formatTime(row.endTime)}</p>
                </button>
              )
            })}
          </div>
        </section>
      ) : null}

      <Sheet open={entrySheetOpen} onOpenChange={setEntrySheetOpen}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>{editingEntryId ? "Edit Schedule Entry" : "Add Schedule Entry"}</SheetTitle>
            <SheetDescription>{currentRoutine?.status === "PUBLISHED" ? "Future updates should use the override flow." : "Changes are checked for conflicts after every field update."}</SheetDescription>
          </SheetHeader>
            <div className="space-y-4 px-4 pb-4">
            {entryConflicts.some((item) => item.severity === "SOFT") ? <Alert className="border-amber-200 bg-amber-50 text-amber-950"><AlertTitle>Soft conflict detected</AlertTitle><AlertDescription className="space-y-2">{entryConflicts.filter((item) => item.severity === "SOFT").map((conflict) => <div key={conflict.id} className="flex items-start gap-2"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /><span>{conflict.message}</span></div>)}</AlertDescription></Alert> : null}
            {entryConflicts.some((item) => item.severity === "HARD") ? <Alert variant="destructive"><AlertTitle>Hard conflict detected</AlertTitle><AlertDescription className="space-y-2">{entryConflicts.filter((item) => item.severity === "HARD").map((conflict) => <div key={conflict.id} className="flex items-start gap-2"><XCircle className="mt-0.5 h-4 w-4 shrink-0" /><span>{conflict.message}</span></div>)}</AlertDescription></Alert> : null}
            <div className="grid gap-4 md:grid-cols-2">
              <div><FieldLabel label="Day of Week" required /><Select value={entryDraft.dayOfWeek} onValueChange={(value) => setEntryDraft((current) => ({ ...current, dayOfWeek: value as DayOfWeek }))}>{FULL_WEEK_DAYS.map((day) => <option key={day} value={day}>{DAY_LONG_LABELS[day]}</option>)}</Select><FieldError message={entryErrors.dayOfWeek} /></div>
              <div><FieldLabel label="Start Time" required /><Input type="time" value={entryDraft.startTime} onChange={(event) => setEntryDraft((current) => ({ ...current, startTime: event.target.value }))} /><FieldError message={entryErrors.startTime} /></div>
              <div><FieldLabel label="End Time" required /><Input type="time" value={entryDraft.endTime} onChange={(event) => setEntryDraft((current) => ({ ...current, endTime: event.target.value }))} /><FieldError message={entryErrors.endTime} /></div>
              <div><FieldLabel label="Subject" required /><SearchableInput listId="subject-options-list" value={entryDraft.subjectId} onChange={(value) => setEntryDraft((current) => ({ ...current, subjectId: value }))} options={subjects} placeholder="Search subject" /><FieldError message={entryErrors.subjectId} /></div>
              <div><FieldLabel label="Teacher" required /><SearchableInput listId="teacher-options-list" value={entryDraft.teacherId} onChange={(value) => setEntryDraft((current) => ({ ...current, teacherId: value }))} options={teachers} placeholder="Search teacher" /><FieldError message={entryErrors.teacherId} /></div>
              <div>
                <FieldLabel label="Delivery Mode" required />
                <div className="grid grid-cols-2 gap-2">
                  {(["ON_SITE", "LIVE_ONLINE", "RECORDED_SUPPORT", "HYBRID"] as DeliveryMode[]).map((mode) => {
                    const badge = getModeBadgeProps(mode)
                    return <button key={mode} type="button" onClick={() => setEntryDraft((current) => ({ ...current, deliveryMode: mode }))} className={cn("rounded-2xl border px-3 py-2 text-sm font-medium transition", entryDraft.deliveryMode === mode ? `border-slate-900 ${badge.className}` : "border-slate-200 bg-white text-slate-700 hover:border-slate-300")}>{badge.label}</button>
                  })}
                </div>
              </div>
              {entryDraft.deliveryMode === "ON_SITE" || entryDraft.deliveryMode === "HYBRID" ? <div><FieldLabel label="Room" required /><SearchableInput listId="room-options-list" value={entryDraft.roomId} onChange={(value) => setEntryDraft((current) => ({ ...current, roomId: value }))} options={rooms} placeholder="Search room by id" /><FieldError message={entryErrors.roomId} /></div> : null}
              {entryDraft.deliveryMode === "LIVE_ONLINE" || entryDraft.deliveryMode === "HYBRID" ? <div><FieldLabel label="Live Session URL" required /><Input type="url" value={entryDraft.liveSessionRef} onChange={(event) => setEntryDraft((current) => ({ ...current, liveSessionRef: event.target.value }))} placeholder="https://" /><FieldError message={entryErrors.liveSessionRef} /></div> : null}
            </div>
            <div><FieldLabel label="Notes" /><Textarea value={entryDraft.notes} onChange={(event) => setEntryDraft((current) => ({ ...current, notes: event.target.value }))} placeholder="Optional notes for the session" /></div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600"><div className="flex items-center gap-2 font-medium text-slate-800">{conflictChecking ? <Loader2 className="h-4 w-4 animate-spin" /> : <BellRing className="h-4 w-4" />}Instant conflict detection</div><p className="mt-2">The form checks batch overlaps, teacher double-booking, and room availability after each update.</p></div>
          </div>
          <SheetFooter>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="outline" onClick={() => setEntrySheetOpen(false)}>Cancel</Button>
              <Button onClick={handleSaveEntry} disabled={saveEntryMutation.isPending || entryConflicts.some((item) => item.severity === "HARD")}>{saveEntryMutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : "Save Entry"}</Button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Dialog open={softConfirmOpen} onOpenChange={setSoftConfirmOpen}><DialogContent><DialogHeader><DialogTitle>Save draft with soft conflict?</DialogTitle><DialogDescription>Soft conflicts can still be saved to draft. Review the warning and confirm if you want to continue.</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" onClick={() => setSoftConfirmOpen(false)}>Back</Button><Button onClick={() => { setSoftConfirmOpen(false); saveEntryMutation.mutate(entryDraft) }}>Save to Draft</Button></DialogFooter></DialogContent></Dialog>
      <Dialog open={publishDialogOpen} onOpenChange={setPublishDialogOpen}><DialogContent><DialogHeader><DialogTitle>Publish routine?</DialogTitle><DialogDescription>Publishing will make this routine visible to teachers and students. Proceed?</DialogDescription></DialogHeader><div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600"><p className="font-medium text-slate-900">Conflict summary</p>{routineHardConflicts.length === 0 ? <p>No unresolved hard conflicts remain. This routine is ready to publish.</p> : routineHardConflicts.map((conflict) => <p key={conflict.message}>{conflict.message}</p>)}</div><DialogFooter><Button variant="outline" onClick={() => setPublishDialogOpen(false)}>Cancel</Button><Button onClick={() => publishMutation.mutate()} disabled={publishMutation.isPending || routineHardConflicts.length > 0}>{publishMutation.isPending ? "Publishing..." : "Confirm Publish"}</Button></DialogFooter></DialogContent></Dialog>
      <Dialog open={!!entryActionTarget} onOpenChange={(open) => !open && setEntryActionTarget(null)}><DialogContent><DialogHeader><DialogTitle>Published Entry Actions</DialogTitle><DialogDescription>Base entries are locked after publish. Choose how you want to update this class.</DialogDescription></DialogHeader><div className="grid gap-3"><button type="button" onClick={() => openOverrideFlow("DATE_ONLY")} className="rounded-2xl border border-slate-200 p-4 text-left transition hover:border-slate-300 hover:bg-slate-50"><p className="font-medium text-slate-900">Edit this date only</p><p className="mt-1 text-sm text-slate-500">Create an override for one specific class date.</p></button><button type="button" onClick={() => openOverrideFlow("FUTURE")} className="rounded-2xl border border-slate-200 p-4 text-left transition hover:border-slate-300 hover:bg-slate-50"><p className="font-medium text-slate-900">Edit all future occurrences</p><p className="mt-1 text-sm text-slate-500">Update the underlying routine rule with a future update label.</p></button></div></DialogContent></Dialog>
      <Dialog open={overrideDialogOpen} onOpenChange={setOverrideDialogOpen}><DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>{overrideMode === "FUTURE" ? "Future Update" : "Override Form"}</DialogTitle><DialogDescription>{overrideMode === "FUTURE" ? "Update the recurring entry for all future occurrences." : "Create a one-date override with conflict checking on submit."}</DialogDescription></DialogHeader><div className="grid gap-4 md:grid-cols-2"><div><FieldLabel label="Override Date" required /><Input type="date" value={overrideDraft.overrideDate} onChange={(event) => setOverrideDraft((current) => ({ ...current, overrideDate: event.target.value }))} /><FieldError message={overrideErrors.overrideDate} /></div><div><FieldLabel label="Status" required /><div className="grid grid-cols-2 gap-2">{(["UPDATED", "CANCELLED"] as const).map((status) => <button key={status} type="button" onClick={() => setOverrideDraft((current) => ({ ...current, status }))} className={cn("rounded-2xl border px-3 py-2 text-sm font-medium transition", overrideDraft.status === status ? status === "UPDATED" ? "border-amber-300 bg-amber-100 text-amber-900" : "border-red-300 bg-red-100 text-red-900" : "border-slate-200 bg-white text-slate-700")}>{status}</button>)}</div></div><div><FieldLabel label="New Start Time" /><Input type="time" value={overrideDraft.newStartTime} onChange={(event) => setOverrideDraft((current) => ({ ...current, newStartTime: event.target.value }))} /><FieldError message={overrideErrors.newStartTime} /></div><div><FieldLabel label="New End Time" /><Input type="time" value={overrideDraft.newEndTime} onChange={(event) => setOverrideDraft((current) => ({ ...current, newEndTime: event.target.value }))} /><FieldError message={overrideErrors.newEndTime} /></div><div><FieldLabel label="New Teacher" /><SearchableInput listId="override-teacher-options-list" value={overrideDraft.newTeacherId} onChange={(value) => setOverrideDraft((current) => ({ ...current, newTeacherId: value }))} options={teachers} placeholder="Optional teacher id" /></div><div><FieldLabel label="New Mode" /><div className="grid grid-cols-2 gap-2">{(["ON_SITE", "LIVE_ONLINE", "RECORDED_SUPPORT", "HYBRID"] as DeliveryMode[]).map((mode) => { const badge = getModeBadgeProps(mode); return <button key={mode} type="button" onClick={() => setOverrideDraft((current) => ({ ...current, newMode: mode }))} className={cn("rounded-2xl border px-3 py-2 text-sm font-medium transition", overrideDraft.newMode === mode ? `border-slate-900 ${badge.className}` : "border-slate-200 bg-white text-slate-700")}>{badge.label}</button> })}</div></div>{overrideDraft.newMode === "ON_SITE" || overrideDraft.newMode === "HYBRID" ? <div><FieldLabel label="New Room" required /><SearchableInput listId="override-room-options-list" value={overrideDraft.newRoomId} onChange={(value) => setOverrideDraft((current) => ({ ...current, newRoomId: value }))} options={rooms} placeholder="Optional room id" /><FieldError message={overrideErrors.newRoomId} /></div> : null}{overrideDraft.newMode === "LIVE_ONLINE" || overrideDraft.newMode === "HYBRID" ? <div><FieldLabel label="New Live Session URL" required /><Input type="url" value={overrideDraft.newLiveSessionRef} onChange={(event) => setOverrideDraft((current) => ({ ...current, newLiveSessionRef: event.target.value }))} /><FieldError message={overrideErrors.newLiveSessionRef} /></div> : null}</div><div><FieldLabel label="Reason" /><Textarea value={overrideDraft.reason} onChange={(event) => setOverrideDraft((current) => ({ ...current, reason: event.target.value }))} placeholder="Optional override note" /></div><DialogFooter><Button variant="outline" onClick={() => setOverrideDialogOpen(false)}>Cancel</Button><Button onClick={handleSaveOverride} disabled={overrideMutation.isPending}>{overrideMutation.isPending ? "Saving..." : "Save Override"}</Button></DialogFooter></DialogContent></Dialog>
      <Dialog open={!!entryDetail} onOpenChange={(open) => !open && setEntryDetail(null)}><DialogContent><DialogHeader><DialogTitle>Schedule Entry Details</DialogTitle><DialogDescription>Read-only entry summary with applied override state.</DialogDescription></DialogHeader>{entryDetail ? <div className="space-y-3 text-sm text-slate-700"><div className="flex flex-wrap items-center gap-2"><Badge className={getModeBadgeProps(entryDetail.deliveryMode).className}>{getModeBadgeProps(entryDetail.deliveryMode).label}</Badge><Badge {...getStatusBadgeProps(entryDetail.status)}>{entryDetail.status}</Badge>{entryDetail.isOverride ? <Badge variant="warning">Modified</Badge> : null}</div><div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><p><span className="font-medium text-slate-900">Subject:</span> {entryDetail.subjectName}</p><p className="mt-2"><span className="font-medium text-slate-900">Teacher:</span> {entryDetail.teacherName}</p><p className="mt-2"><span className="font-medium text-slate-900">Time:</span> {DAY_LONG_LABELS[entryDetail.dayOfWeek]} • {formatTime(entryDetail.startTime)} - {formatTime(entryDetail.endTime)}</p><p className="mt-2"><span className="font-medium text-slate-900">Room/Link:</span> {entryDetail.roomName ?? entryDetail.liveSessionRef ?? "-"}</p>{entryDetail.overrideDate ? <p className="mt-2"><span className="font-medium text-slate-900">Override Date:</span> {formatDateLabel(entryDetail.overrideDate)}</p> : null}{entryDetail.reason ? <p className="mt-2"><span className="font-medium text-slate-900">Reason:</span> {entryDetail.reason}</p> : null}</div></div> : null}</DialogContent></Dialog>
    </div>
  )
}
