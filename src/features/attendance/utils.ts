import type {
  AttendanceActionType,
  AttendanceBatchOption,
  AttendanceDayView,
  AttendanceLogEntry,
  AttendanceMonthMatrix,
  AttendanceMonthMatrixRow,
  AttendanceRecord,
  AttendanceSource,
  AttendanceStatus,
  AttendanceSummaryItem,
} from "@/features/attendance/types"

type UnknownRecord = Record<string, unknown>

function asObject(value: unknown): UnknownRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {}
  return value as UnknownRecord
}

export function extractPayload<T>(value: unknown): T {
  const root = asObject(value)
  const data = asObject(root.data)
  const nested = asObject(data.data)
  return ((Object.keys(nested).length > 0 ? nested : Object.keys(data).length > 0 ? data : root) as unknown) as T
}

export function getErrorMessage(error: unknown) {
  const root = asObject(error)
  const response = asObject(root.response)
  const data = asObject(response.data)
  return String(data.message ?? root.message ?? "Something went wrong")
}

export function ensureArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : []
}

export function todayIsoDate() {
  return new Date().toISOString().split("T")[0] ?? ""
}

export function isFutureDate(value: string) {
  if (!value) return false
  return value > todayIsoDate()
}

export function formatDateLabel(value?: string | null) {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date)
}

export function formatTimeLabel(value?: string | null) {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

export function formatMonthLabel(year: number, month: number) {
  const date = new Date(year, month - 1, 1)
  return new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" }).format(date)
}

export function statusVariant(status: AttendanceStatus) {
  if (status === "PRESENT") return "default"
  if (status === "LATE") return "warning"
  if (status === "EXCUSED") return "info"
  return "destructive"
}

export function sourceVariant(source: AttendanceSource) {
  return source === "MACHINE" ? "secondary" : "outline"
}

export function normalizeRole(user: unknown) {
  const root = asObject(user)
  return String(
    root.role ??
      (Array.isArray(root.roles) ? root.roles[0] : root.roles) ??
      ""
  ).toLowerCase()
}

export function resolveTenantId(user: unknown) {
  const root = asObject(user)
  const tenant = asObject(root.tenant)
  return (
    root.tenant_id ??
    root.tenantId ??
    tenant.id ??
    tenant.tenant_id ??
    null
  )
}

export function resolveUserDisplayName(user: unknown) {
  const root = asObject(user)
  return String(
    root.name ??
      root.full_name ??
      root.fullName ??
      root.username ??
      "System"
  )
}

export function resolveAssignedBatchIds(user: unknown): string[] {
  const root = asObject(user)
  const profile = asObject(root.profile)
  const teacherProfile = asObject(root.teacherProfile)
  const candidateLists = [
    root.assigned_batch_ids,
    root.batch_ids,
    profile?.assigned_batch_ids,
    profile?.batch_ids,
    teacherProfile?.assigned_batch_ids,
    teacherProfile?.batch_ids,
    teacherProfile?.assignedBatches,
    teacherProfile?.batches,
  ]

  const ids = candidateLists.flatMap((list) =>
    ensureArray<unknown>(list).map((item) =>
      typeof item === "string" || typeof item === "number"
        ? String(item)
        : String(asObject(item).id ?? asObject(item).batch_id ?? "")
    )
  )

  return Array.from(new Set(ids.filter(Boolean)))
}

export function computeAttendancePercentage(present: number, totalClasses: number) {
  if (!Number.isFinite(totalClasses) || totalClasses <= 0) return 0
  return Number(((present / totalClasses) * 100).toFixed(2))
}

function asNullableString(value: unknown) {
  if (typeof value === "string") return value
  if (typeof value === "number") return String(value)
  return null
}

export function normalizeStatus(value: unknown): AttendanceStatus {
  const normalized = String(value ?? "ABSENT").toUpperCase()
  if (normalized === "PRESENT" || normalized === "LATE" || normalized === "EXCUSED") return normalized
  return "ABSENT"
}

export function normalizeSource(value: unknown): AttendanceSource {
  return String(value ?? "").toUpperCase() === "MANUAL" ? "MANUAL" : "MACHINE"
}

export function normalizeActionType(value: unknown): AttendanceActionType {
  const normalized = String(value ?? "UPDATE").toUpperCase()
  if (normalized === "CREATE" || normalized === "OVERRIDE") return normalized
  return "UPDATE"
}

export function normalizeBatchOptions(value: unknown): AttendanceBatchOption[] {
  return ensureArray<unknown>(value)
    .map((item) => ({
      id: String(asObject(item).id ?? asObject(item).batch_id ?? "").trim(),
      name: String(asObject(item).batch_name ?? asObject(item).name ?? "Unnamed Batch").trim(),
      className: String(asObject(item).class_name ?? asObject(asObject(item).class).name ?? "").trim() || undefined,
      section: String(asObject(item).section ?? "").trim() || undefined,
      status: String(asObject(item).status ?? "").trim() || undefined,
    }))
    .filter((item) => item.id.length > 0)
}

export function normalizeAttendanceRecord(value: unknown, fallbackBatchId = "", fallbackDate = ""): AttendanceRecord {
  const root = asObject(value)
  const student = asObject(root.student)
  const profile = asObject(root.student_profile)
  const batch = asObject(root.batch)

  return {
    id: String(root.id ?? root.attendance_id ?? `${root.student_id ?? student.id ?? ""}-${fallbackDate}`).trim(),
    studentId: String(root.student_id ?? student.id ?? profile.student_id ?? "").trim(),
    batchId: String(root.batch_id ?? batch.id ?? fallbackBatchId).trim(),
    studentName: String(
      root.student_name ??
        student.name ??
        profile.full_name ??
        profile.student_name ??
        "Unknown Student"
    ).trim(),
    rollNumber: String(
      root.roll_no ??
        root.rollNumber ??
        profile.student_id ??
        student.student_id ??
        student.roll_number ??
        ""
    ).trim(),
    status: normalizeStatus(root.status),
    source: normalizeSource(root.source),
    firstEntry: asNullableString(root.first_entry ?? root.firstEntry),
    lastExit: asNullableString(root.last_exit ?? root.lastExit),
    overridden: Boolean(root.overridden),
    overriddenBy: asNullableString(root.overridden_by ?? root.overriddenBy),
    note: asNullableString(root.note),
    phone: asNullableString(root.phone ?? student.phone ?? profile.phone),
    parentPhone: asNullableString(root.parent_phone ?? profile.parent_phone),
    date: String(root.date ?? fallbackDate).trim(),
  }
}

export function normalizeDayView(payload: unknown, batchId: string, date: string): AttendanceDayView {
  const root = asObject(payload)
  const itemsSource =
    root?.items ??
    root?.records ??
    root?.students ??
    root?.attendance ??
    payload

  const items = ensureArray<unknown>(itemsSource).map((item) => normalizeAttendanceRecord(item, batchId, date))

  const totalsSource = asObject(root?.totals ?? root?.summary ?? {})
  const total = Number(totalsSource?.total ?? items.length)
  const present = Number(totalsSource?.present ?? items.filter((item) => item.status === "PRESENT").length)
  const absent = Number(totalsSource?.absent ?? items.filter((item) => item.status === "ABSENT").length)
  const late = Number(totalsSource?.late ?? items.filter((item) => item.status === "LATE").length)
  const excused = Number(totalsSource?.excused ?? items.filter((item) => item.status === "EXCUSED").length)
  const machine = Number(totalsSource?.machine ?? items.filter((item) => item.source === "MACHINE").length)
  const manual = Number(totalsSource?.manual ?? items.filter((item) => item.source === "MANUAL").length)

  return {
    batchId,
    date,
    items,
    totals: {
      total,
      present,
      absent,
      late,
      excused,
      machine,
      manual,
    },
  }
}

function normalizeMatrixRow(value: unknown, days: string[]): AttendanceMonthMatrixRow {
  const root = asObject(value)
  const attendanceMap = asObject(root.attendance ?? root.matrix ?? root.days ?? {})
  const cells = days.reduce<Record<string, AttendanceStatus | null>>((acc, day) => {
    const rawValue = attendanceMap[day] ?? attendanceMap[day.slice(-2)] ?? null
    const rawRecord = asObject(rawValue)
    acc[day] = rawValue ? normalizeStatus(rawRecord.status ?? rawValue) : null
    return acc
  }, {})

  const present = Object.values(cells).filter((item) => item === "PRESENT").length
  const absent = Object.values(cells).filter((item) => item === "ABSENT").length
  const late = Object.values(cells).filter((item) => item === "LATE").length
  const excused = Object.values(cells).filter((item) => item === "EXCUSED").length
  const totalClasses = present + absent + late + excused

  return {
    studentId: String(root.student_id ?? root.id ?? "").trim(),
    studentName: String(root.student_name ?? root.name ?? "Unknown Student").trim(),
    rollNumber: String(root.roll_no ?? root.rollNumber ?? "").trim(),
    cells,
    summary: {
      present,
      absent,
      late,
      excused,
      percentage: computeAttendancePercentage(present, totalClasses),
    },
  }
}

export function normalizeMonthMatrix(payload: unknown, batchId: string, month: number, year: number): AttendanceMonthMatrix {
  const root = asObject(payload)
  const rawDays = ensureArray<unknown>(root?.days)
  const days =
    rawDays.length > 0
      ? rawDays.map((day) => String(day))
      : Array.from({ length: new Date(year, month, 0).getDate() }, (_, index) =>
          `${year}-${String(month).padStart(2, "0")}-${String(index + 1).padStart(2, "0")}`
        )

  const rowsSource = root?.rows ?? root?.students ?? root?.items ?? []

  return {
    batchId,
    month,
    year,
    days,
    rows: ensureArray<unknown>(rowsSource).map((item) => normalizeMatrixRow(item, days)),
  }
}

export function normalizeLogEntries(payload: unknown): AttendanceLogEntry[] {
  return ensureArray<unknown>(payload)
    .map((item) => ({
      id: String(asObject(item).id ?? asObject(item).log_id ?? `${asObject(item).student_id ?? ""}-${asObject(item).date ?? ""}`).trim(),
      studentId: String(asObject(item).student_id ?? "").trim(),
      studentName: String(asObject(item).student_name ?? asObject(asObject(item).student).name ?? "Unknown Student").trim(),
      batchId: String(asObject(item).batch_id ?? "").trim(),
      batchName: String(asObject(item).batch_name ?? asObject(asObject(item).batch).name ?? "").trim() || undefined,
      date: String(asObject(item).date ?? "").trim(),
      source: normalizeSource(asObject(item).source),
      updatedBy: asNullableString(asObject(item).updated_by ?? asObject(item).updatedBy),
      updatedAt: asNullableString(asObject(item).updated_at ?? asObject(item).updatedAt),
      actionType: normalizeActionType(asObject(item).action_type ?? asObject(item).actionType),
      note: asNullableString(asObject(item).note),
    }))
    .filter((item) => item.id.length > 0)
}

export function normalizeSummaryItems(payload: unknown): AttendanceSummaryItem[] {
  return ensureArray<unknown>(payload)
    .map((item) => {
      const root = asObject(item)
      const present = Number(root.present ?? 0)
      const totalClasses = Number(root.total_classes ?? root.totalClasses ?? 0)
      return {
        studentId: String(root.student_id ?? root.studentId ?? "").trim(),
        batchId: String(root.batch_id ?? root.batchId ?? "").trim(),
        batchName: String(root.batch_name ?? root.batchName ?? "").trim() || undefined,
        month: Number(root.month ?? 0),
        year: Number(root.year ?? 0),
        totalClasses,
        present,
        absent: Number(root.absent ?? 0),
        late: Number(root.late ?? 0),
        excused: Number(root.excused ?? 0),
        percentage: Number(root.percentage ?? computeAttendancePercentage(present, totalClasses)),
      }
    })
    .filter((item) => item.batchId.length > 0 || item.studentId.length > 0)
}

export function makeBulkDraftRecord(record: AttendanceRecord, nextStatus: AttendanceStatus, updatedBy: string) {
  const manualOverride = record.source === "MACHINE" && record.status !== nextStatus
  return {
    student_id: record.studentId,
    batch_id: record.batchId,
    date: record.date,
    status: nextStatus,
    source: "MANUAL" as const,
    first_entry: record.firstEntry ?? null,
    last_exit: record.lastExit ?? null,
    overridden: manualOverride || record.overridden,
    overridden_by: manualOverride ? updatedBy : record.overriddenBy ?? null,
    note: record.note ?? null,
  }
}
