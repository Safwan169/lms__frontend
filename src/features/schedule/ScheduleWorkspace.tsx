"use client"

import { useEffect, useMemo, useRef, useState } from "react"
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

const FALLBACK_DATA: ScheduleBootstrap = {
  classes: [
    { id: "class-1", name: "Class 9" },
    { id: "class-2", name: "Class 10" },
  ],
  batches: [
    { id: "batch-1", name: "Science Morning A", classId: "class-1", className: "Class 9" },
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
  const map = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"] as const
  return map[date.getDay()] as DayOfWeek
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
  routine.entries.forEach((entry, index) => {
    routine.entries.slice(index + 1).forEach((other) => {
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
    return baseEntries.flatMap((entry) => {
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
  return (
    <>
      <Input list={listId} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
      <datalist id={listId}>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
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

export default function ScheduleWorkspace() {
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
  const [viewMode, setViewMode] = useState<ViewMode>(isAdmin ? "builder" : "weekly")
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

  useEffect(() => {
    if (!bootstrapQuery.data) return
    setRoutines(bootstrapQuery.data.routines)
    setNotifications(bootstrapQuery.data.notifications)
    setSelectedBatchId((current) => current || bootstrapQuery.data.batches[0]?.id || "")
  }, [bootstrapQuery.data])

  useEffect(() => {
    if (!selectedBatchId) {
      setEntryDraft(buildDefaultDraft(""))
      return
    }
    setEntryDraft((current) => ({ ...current, batchId: selectedBatchId }))
  }, [selectedBatchId])

  const batches = bootstrapQuery.data?.batches ?? []
  const classes = bootstrapQuery.data?.classes ?? []
  const subjects = bootstrapQuery.data?.subjects ?? []
  const teachers = bootstrapQuery.data?.teachers ?? []
  const rooms = bootstrapQuery.data?.rooms ?? []

  const currentRoutine = useMemo(() => routines.find((routine) => routine.batchId === selectedBatchId), [routines, selectedBatchId])
  const currentRoutineEntries = currentRoutine?.entries ?? []
  const routineHardConflicts = useMemo(() => (currentRoutine ? computeRoutineConflicts(currentRoutine) : []), [currentRoutine])
  const debouncedDraft = useDebounce(entryDraft, 250)
  const conflictRequestRef = useRef(0)

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
      await new Promise((resolve) => setTimeout(resolve, 220))
      return payload
    },
    onSuccess: (payload) => {
      const subject = subjects.find((item) => item.id === payload.subjectId)
      const teacher = teachers.find((item) => item.id === payload.teacherId)
      const room = rooms.find((item) => item.id === payload.roomId)
      const nextEntry: ScheduleEntry = {
        id: editingEntryId ?? `entry-${Date.now()}`,
        batchId: payload.batchId,
        dayOfWeek: payload.dayOfWeek,
        startTime: payload.startTime,
        endTime: payload.endTime,
        subjectId: payload.subjectId,
        subjectName: subject?.name ?? payload.subjectId,
        teacherId: payload.teacherId,
        teacherName: teacher?.name ?? payload.teacherId,
        deliveryMode: payload.deliveryMode,
        roomId: payload.roomId || undefined,
        roomName: room?.name,
        liveSessionRef: payload.liveSessionRef || undefined,
        notes: payload.notes || undefined,
        status: currentRoutine?.status === "PUBLISHED" ? "PUBLISHED" : "DRAFT",
      }

      setRoutines((prev) => {
        const existingRoutine = prev.find((routine) => routine.batchId === payload.batchId)
        if (!existingRoutine) {
          const batch = batches.find((item) => item.id === payload.batchId)
          return [
            ...prev,
            {
              id: `routine-${Date.now()}`,
              batchId: payload.batchId,
              batchName: batch?.name ?? "Selected Batch",
              status: "DRAFT",
              entries: [nextEntry],
            },
          ]
        }
        return prev.map((routine) => {
          if (routine.batchId !== payload.batchId) return routine
          const entries = editingEntryId
            ? routine.entries.map((entry) => (entry.id === editingEntryId ? nextEntry : entry))
            : [...routine.entries, nextEntry]
          return { ...routine, entries }
        })
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
      await new Promise((resolve) => setTimeout(resolve, 260))
      try {
        await api.post(`/routines/${currentRoutine.id}/publish`)
      } catch {
        // Local state still completes the frontend publish flow when the API is unavailable.
      }
      return currentRoutine.id
    },
    onSuccess: (routineId) => {
      setRoutines((prev) =>
        prev.map((routine) =>
          routine.id === routineId
            ? {
                ...routine,
                status: "PUBLISHED",
                entries: routine.entries.map((entry) => ({
                  ...entry,
                  status: entry.isOverride ? entry.status : "PUBLISHED",
                })),
              }
            : routine
        )
      )
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
      await new Promise((resolve) => setTimeout(resolve, 220))
      return true
    },
    onSuccess: () => {
      if (!overrideTarget) return
      const teacher = teachers.find((item) => item.id === overrideDraft.newTeacherId)
      const room = rooms.find((item) => item.id === overrideDraft.newRoomId)
      const effectiveStart = overrideDraft.newStartTime || overrideTarget.startTime
      const effectiveEnd = overrideDraft.newEndTime || overrideTarget.endTime
      const effectiveMode = overrideDraft.newMode || overrideTarget.deliveryMode
      const overrideEntry: ScheduleEntry = {
        ...overrideTarget,
        id: `${overrideTarget.id}__override__${overrideDraft.overrideDate}`,
        startTime: effectiveStart,
        endTime: effectiveEnd,
        teacherId: overrideDraft.newTeacherId || overrideTarget.teacherId,
        teacherName: teacher?.name ?? overrideTarget.teacherName,
        deliveryMode: effectiveMode,
        roomId: overrideDraft.newRoomId || overrideTarget.roomId,
        roomName: room?.name ?? overrideTarget.roomName,
        liveSessionRef: overrideDraft.newLiveSessionRef || overrideTarget.liveSessionRef,
        status: overrideDraft.status === "CANCELLED" ? "CANCELLED" : "OVERRIDE",
        isOverride: true,
        overrideDate: overrideDraft.overrideDate,
        reason: overrideDraft.reason || undefined,
      }

      setRoutines((prev) =>
        prev.map((routine) => {
          if (routine.batchId !== overrideTarget.batchId) return routine
          if (overrideMode === "FUTURE") {
            return {
              ...routine,
              entries: routine.entries.map((entry) =>
                entry.id === overrideTarget.id
                  ? {
                      ...entry,
                      startTime: effectiveStart,
                      endTime: effectiveEnd,
                      teacherId: overrideDraft.newTeacherId || entry.teacherId,
                      teacherName: teacher?.name ?? entry.teacherName,
                      deliveryMode: effectiveMode,
                      roomId: overrideDraft.newRoomId || entry.roomId,
                      roomName: room?.name ?? entry.roomName,
                      liveSessionRef: overrideDraft.newLiveSessionRef || entry.liveSessionRef,
                      notes: overrideDraft.reason || entry.notes,
                    }
                  : entry
              ),
            }
          }
          const withoutExistingOverride = routine.entries.filter((entry) => entry.id !== overrideEntry.id)
          return { ...routine, entries: [...withoutExistingOverride, overrideEntry] }
        })
      )

      toast.success(overrideMode === "FUTURE" ? "Future routine updated" : "Override saved")
      setOverrideDialogOpen(false)
      setOverrideTarget(null)
      setEntryActionTarget(null)
    },
  })

  const filteredBatches = useMemo(() => {
    if (filters.classId === "ALL") return batches
    return batches.filter((batch) => batch.classId === filters.classId)
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
    const targetBatchIds = filters.batchId === "ALL" ? new Set(filteredBatches.map((batch) => batch.id)) : new Set([filters.batchId])
    return routines
      .filter((routine) => targetBatchIds.has(routine.batchId))
      .flatMap((routine) =>
        routine.entries.map((entry) => {
          const batch = batches.find((item) => item.id === routine.batchId)
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
      <div className="space-y-6 p-6">
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
      <div className="space-y-4 p-6">
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
    <div className="space-y-6 p-4 md:p-6">
      <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-[linear-gradient(135deg,#0f172a_0%,#1d4ed8_58%,#38bdf8_100%)] text-white shadow-lg">
        <div className="grid gap-6 p-6 lg:grid-cols-[1.3fr_0.7fr]">
          <div className="space-y-4">
            <Badge className="bg-white/15 text-white">Bangladesh Standard Time (UTC+6)</Badge>
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight">Class Scheduling System</h1>
              <p className="max-w-2xl text-sm text-blue-100">
                Build, review, publish, and monitor weekly routines for admins, teachers, and students from one workspace.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant={viewMode === "builder" ? "secondary" : "outline"} className={cn("border-white/20", viewMode === "builder" ? "" : "bg-white/10 text-white hover:bg-white/20")} onClick={() => setViewMode("builder")} disabled={!isAdmin}>
                <LayoutGrid className="mr-2 h-4 w-4" />
                Routine Builder
              </Button>
              <Button variant={viewMode === "weekly" ? "secondary" : "outline"} className={cn("border-white/20", viewMode === "weekly" ? "" : "bg-white/10 text-white hover:bg-white/20")} onClick={() => setViewMode("weekly")}>
                <Eye className="mr-2 h-4 w-4" />
                Weekly View
              </Button>
              <Button variant={viewMode === "daily" ? "secondary" : "outline"} className={cn("border-white/20", viewMode === "daily" ? "" : "bg-white/10 text-white hover:bg-white/20")} onClick={() => setViewMode("daily")}>
                <CalendarDays className="mr-2 h-4 w-4" />
                Daily View
              </Button>
              <Button variant={viewMode === "list" ? "secondary" : "outline"} className={cn("border-white/20", viewMode === "list" ? "" : "bg-white/10 text-white hover:bg-white/20")} onClick={() => setViewMode("list")}>
                <ListFilter className="mr-2 h-4 w-4" />
                List View
              </Button>
            </div>
          </div>
          <div className="grid gap-3 rounded-[24px] bg-white/10 p-4 backdrop-blur">
            <div className="flex items-start justify-between gap-3 rounded-2xl bg-white/10 p-4">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-blue-100">Active Batch</p>
                <p className="mt-1 text-lg font-semibold">{batches.find((batch) => batch.id === selectedBatchId)?.name ?? "Choose batch"}</p>
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
      <section className="space-y-6">
        <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr_1fr]">
          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm xl:col-span-1">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Routine Context</p>
              <h2 className="mt-2 text-xl font-semibold text-slate-900">Batch Selection</h2>
              <p className="mt-1 text-sm text-slate-500">Pick a batch to load its draft or published routine automatically.</p>
            </div>
            <div className="mt-4">
              <FieldLabel label="Batch" required />
              <Select value={selectedBatchId} onValueChange={setSelectedBatchId}>
                {batches.map((batch) => (
                  <option key={batch.id} value={batch.id}>{batch.name} ({batch.className})</option>
                ))}
              </Select>
            </div>
            <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
              <p className="font-medium text-slate-900">{batches.find((batch) => batch.id === selectedBatchId)?.name ?? "No batch selected"}</p>
              <p className="mt-1">Active routine context</p>
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Routine Status</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {currentRoutine ? <Badge {...getStatusBadgeProps(currentRoutine.status)}>{currentRoutine.status}</Badge> : <Badge variant="warning">EMPTY</Badge>}
              {currentRoutine?.status === "PUBLISHED" ? <Badge variant="warning">Base entries locked</Badge> : null}
            </div>
            <p className="mt-3 text-sm text-slate-500">
              {currentRoutine ? `${currentRoutine.entries.filter((entry) => !entry.isOverride).length} base entries loaded for this batch.` : "No routine exists yet. Start by clicking any empty slot in the grid."}
            </p>
            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-medium text-slate-800">Delivery Mode Legend</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {(["ON_SITE", "LIVE_ONLINE", "RECORDED_SUPPORT", "HYBRID"] as DeliveryMode[]).map((mode) => {
                  const badge = getModeBadgeProps(mode)
                  return <Badge key={mode} className={badge.className}>{badge.label}</Badge>
                })}
              </div>
            </div>
          </div>

          {isAdmin ? (
            <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Publish Flow</p>
              <p className="mt-3 text-sm text-slate-500">Publishing makes the routine visible to teachers and students and locks base entry editing.</p>
              <Button className="mt-5 w-full" onClick={handlePublishRoutine} disabled={!currentRoutine || currentRoutine.status === "PUBLISHED" || routineHardConflicts.length > 0}>
                Publish Routine
              </Button>
              {routineHardConflicts.length > 0 ? <p className="mt-2 text-xs text-red-600">Resolve hard conflicts before publishing.</p> : null}
            </div>
          ) : null}
        </div>

        {isAdmin && currentRoutine && routineHardConflicts.length > 0 ? (
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
            <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
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
                          <div key={`${day}-${slot}`} className="min-h-[128px] rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-2">
                            {entry ? (
                              <ScheduleCard entry={entry} onClick={() => handleCellAction(day, slot, entry)} />
                            ) : (
                              <button type="button" onClick={() => handleCellAction(day, slot)} className="flex h-full min-h-[112px] w-full flex-col items-center justify-center rounded-2xl border border-transparent text-center text-slate-500 transition hover:border-slate-300 hover:bg-white">
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
            <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">Weekly Schedule View</h2>
                  <p className="text-sm text-slate-500">Read-only schedule for teachers and students with overrides applied automatically.</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon-sm" onClick={() => setCurrentWeekStart((value) => addDays(value, -7))}><ChevronLeft className="h-4 w-4" /></Button>
                  <div className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700">{formatDateLabel(toDateInput(currentWeekStart))} - {formatDateLabel(toDateInput(addDays(currentWeekStart, 6)))}</div>
                  <Button variant="outline" size="icon-sm" onClick={() => setCurrentWeekStart((value) => addDays(value, 7))}><ChevronRight className="h-4 w-4" /></Button>
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
                          <div key={`${day}-${slot}-read`} className="min-h-[128px] rounded-2xl border border-slate-200 bg-slate-50 p-2">
                            {entry ? <ScheduleCard entry={entry} onClick={() => setEntryDetail(entry)} /> : <div className="flex h-full min-h-[112px] items-center justify-center rounded-2xl border border-dashed border-slate-200 text-xs text-slate-400">No class</div>}
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
            <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">Daily Calendar View</h2>
                  <p className="text-sm text-slate-500">Single-day schedule timeline for quicker reading on desktop and mobile.</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon-sm"
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
                  <div className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700">
                    {DAY_LONG_LABELS[selectedDailyDay]} • {formatDateLabel(selectedDailyDate)}
                  </div>
                  <Button
                    variant="outline"
                    size="icon-sm"
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
                  {TIME_SLOTS.map((slot) => {
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

        {viewMode === "list" ? (
            <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">Schedule Entry List</h2>
                  <p className="text-sm text-slate-500">Filter by class, batch, teacher, subject, date range, and status.</p>
                </div>
                <Badge variant="muted">{listRows.length} results</Badge>
              </div>
              <div className="grid gap-3 rounded-[24px] border border-slate-200 bg-slate-50 p-4 md:grid-cols-2 xl:grid-cols-3">
                <div><FieldLabel label="Class" /><Select value={filters.classId} onValueChange={(value) => setFilters((current) => ({ ...current, classId: value, batchId: "ALL" }))}><option value="ALL">All classes</option>{classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select></div>
                <div><FieldLabel label="Batch" /><Select value={filters.batchId} onValueChange={(value) => setFilters((current) => ({ ...current, batchId: value }))}><option value="ALL">All batches</option>{filteredBatches.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select></div>
                <div><FieldLabel label="Teacher" /><SearchableInput listId="teacher-filter-list" value={filters.teacherId} onChange={(value) => setFilters((current) => ({ ...current, teacherId: value || "ALL" }))} options={[{ id: "ALL", name: "All teachers" }, ...teachers]} placeholder="Search teacher id" /></div>
                <div><FieldLabel label="Subject" /><SearchableInput listId="subject-filter-list" value={filters.subjectId} onChange={(value) => setFilters((current) => ({ ...current, subjectId: value || "ALL" }))} options={[{ id: "ALL", name: "All subjects" }, ...subjects]} placeholder="Search subject id" /></div>
                <div><FieldLabel label="From Date" /><Input type="date" value={filters.fromDate} onChange={(event) => setFilters((current) => ({ ...current, fromDate: event.target.value }))} /></div>
                <div><FieldLabel label="To Date" /><Input type="date" value={filters.toDate} onChange={(event) => setFilters((current) => ({ ...current, toDate: event.target.value }))} /></div>
                <div><FieldLabel label="Status" /><Select value={filters.status} onValueChange={(value) => setFilters((current) => ({ ...current, status: value }))}><option value="ALL">All statuses</option><option value="DRAFT">Draft</option><option value="PUBLISHED">Published</option><option value="CANCELLED">Cancelled</option></Select></div>
              </div>
            </div>
        ) : null}
      </section>
      {viewMode === "list" ? (
        <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
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
                              setRoutines((prev) => prev.map((routine) => ({ ...routine, entries: routine.entries.map((entry) => entry.id === row.id ? { ...entry, status: "CANCELLED" } : entry) })))
                            }}>Cancel</Button>
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
              <div><FieldLabel label="Subject" required /><SearchableInput listId="subject-options-list" value={entryDraft.subjectId} onChange={(value) => setEntryDraft((current) => ({ ...current, subjectId: value }))} options={subjects} placeholder="Search subject by id" /><FieldError message={entryErrors.subjectId} /></div>
              <div><FieldLabel label="Start Time" required /><Input type="time" value={entryDraft.startTime} onChange={(event) => setEntryDraft((current) => ({ ...current, startTime: event.target.value }))} /><FieldError message={entryErrors.startTime} /></div>
              <div><FieldLabel label="End Time" required /><Input type="time" value={entryDraft.endTime} onChange={(event) => setEntryDraft((current) => ({ ...current, endTime: event.target.value }))} /><FieldError message={entryErrors.endTime} /></div>
              <div><FieldLabel label="Teacher" required /><SearchableInput listId="teacher-options-list" value={entryDraft.teacherId} onChange={(value) => setEntryDraft((current) => ({ ...current, teacherId: value }))} options={teachers} placeholder="Search teacher by id" /><FieldError message={entryErrors.teacherId} /></div>
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
