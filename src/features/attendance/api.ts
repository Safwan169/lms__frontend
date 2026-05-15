import api from "@/lib/api"
import type {
  AttendanceBatchOption,
  AttendanceBulkSaveItem,
  AttendanceDayView,
  AttendanceLogDetail,
  AttendanceLogEntry,
  AttendanceMonthMatrix,
  AttendanceRecord,
  AttendanceSmsRequest,
  AttendanceSmsResponse,
  AttendanceSummaryItem,
  AttendanceStats,
  BatchPresentDate,
  MarkTeacherAttendanceDto,
  MachineImportResult,
  TeacherAttendanceRecord,
  UpdateAttendanceDto,
} from "@/features/attendance/types"
import {
  ensureArray,
  extractPayload,
  normalizeBatchOptions,
  normalizeLogEntries,
  normalizeMonthMatrix,
  normalizeSummaryItems,
  normalizeAttendanceRecord,
  computeAttendancePercentage,
} from "@/features/attendance/utils"

function getMonthDateRange(month: number, year: number) {
  const start = `${year}-${String(month).padStart(2, "0")}-01`
  const end = `${year}-${String(month).padStart(2, "0")}-${String(new Date(year, month, 0).getDate()).padStart(2, "0")}`
  return { start, end }
}

export async function getAttendanceBatches(tenantId: string | number) {
  const response = await api.get(`/api/tenants/${tenantId}/batches`, {
    params: { page: 1, limit: 100 },
  })
  const payload = extractPayload<Record<string, unknown> | unknown[]>(response)
  const items = Array.isArray(payload) ? payload : payload?.items ?? payload?.rows ?? payload ?? []
  return normalizeBatchOptions(items) as AttendanceBatchOption[]
}

// Teacher uses /teachers/me/classes → /teachers/me/classes/:classId/batches.
// The /tenants/:tenantId/batches endpoint is ADMIN-only.
export async function getTeacherAssignedBatches() {
  const classesResponse = await api.get("/teachers/me/classes")
  const classesPayload = extractPayload<Record<string, unknown>>(classesResponse)
  const classes = ensureArray<Record<string, unknown>>(classesPayload?.classes ?? [])
  if (classes.length === 0) return [] as AttendanceBatchOption[]

  const responses = await Promise.all(
    classes.map((cls) =>
      api
        .get(`/teachers/me/classes/${String(cls.class_id ?? "")}/batches`)
        .then((res) => ({ res, className: String(cls.class_name ?? "") }))
        .catch(() => null)
    )
  )

  const batches: AttendanceBatchOption[] = []
  for (const entry of responses) {
    if (!entry) continue
    const payload = extractPayload<Record<string, unknown>>(entry.res)
    const items = ensureArray<Record<string, unknown>>(payload?.batches ?? [])
    for (const item of items) {
      const id = String(item.batch_id ?? item.id ?? "").trim()
      if (!id) continue
      batches.push({
        id,
        name: String(item.batch_name ?? item.name ?? "Unnamed Batch").trim(),
        className: entry.className || undefined,
      })
    }
  }
  return batches
}

export async function getAttendanceRollCall(params: { batchId: string; date: string }) {
  const response = await api.get("/attendance/student/daily", {
    params: {
      batch_id: params.batchId,
      date: params.date,
    },
  })
  const payload = extractPayload<Record<string, unknown> | unknown[]>(response)
  const root = (Array.isArray(payload) ? {} : payload) as Record<string, unknown>
  const items = Array.isArray(payload) ? payload : root.items ?? root.records ?? root.students ?? []
  return ensureArray<unknown>(items).map((item) => normalizeAttendanceRecord(item, params.batchId, params.date)) as AttendanceRecord[]
}

export async function saveAttendanceBulk(params: {
  batchId: string
  date: string
  records: AttendanceBulkSaveItem[]
}) {
  const response = await api.post(
    `/attendance/student/bulk/${params.batchId}/${params.date}`,
    params.records.map((item) => ({
      student_id: item.student_id,
      status: item.status,
      note: item.note ?? undefined,
    }))
  )
  return extractPayload<unknown>(response)
}

export async function sendAttendanceSms(payload: AttendanceSmsRequest) {
  void payload
  const response: AttendanceSmsResponse = {
    available: false,
    message: "SMS endpoint is not available in backend attendance module yet.",
  }
  return response
}

export async function getAttendanceDayView(params: {
  batchId: string
  date: string
  status?: string
  source?: string
  search?: string
}) {
  const rows = await getAttendanceRollCall({ batchId: params.batchId, date: params.date })
  const normalizedStatus = String(params.status ?? "").toUpperCase()
  const normalizedSource = String(params.source ?? "").toUpperCase()
  const normalizedSearch = String(params.search ?? "").toLowerCase().trim()

  const filteredRows = rows.filter((row) => {
    const statusPass = !normalizedStatus || normalizedStatus === "ALL" || row.status === normalizedStatus
    const sourcePass = !normalizedSource || normalizedSource === "ALL" || row.source === normalizedSource
    const searchPass =
      !normalizedSearch ||
      row.studentName.toLowerCase().includes(normalizedSearch) ||
      row.rollNumber.toLowerCase().includes(normalizedSearch)
    return statusPass && sourcePass && searchPass
  })

  return {
    batchId: params.batchId,
    date: params.date,
    items: filteredRows,
    totals: {
      total: filteredRows.length,
      present: filteredRows.filter((row) => row.status === "PRESENT").length,
      absent: filteredRows.filter((row) => row.status === "ABSENT").length,
      late: filteredRows.filter((row) => row.status === "LATE").length,
      excused: filteredRows.filter((row) => row.status === "EXCUSED").length,
      machine: filteredRows.filter((row) => row.source === "MACHINE").length,
      manual: filteredRows.filter((row) => row.source === "MANUAL").length,
    },
  } as AttendanceDayView
}

export async function getAttendanceMonthMatrix(params: {
  batchId: string
  month: number
  year: number
}) {
  const range = getMonthDateRange(params.month, params.year)

  const [summaryResponse, attendanceResponse] = await Promise.all([
    api.get(`/attendance/batch/${params.batchId}/student-summary`),
    api.get("/attendance/student/date-status-list", {
      params: {
        batch_id: params.batchId,
        start_date: range.start,
        end_date: range.end,
      },
    }),
  ])

  const summaryPayload = extractPayload<Record<string, unknown>>(summaryResponse)
  const attendancePayload = extractPayload<Record<string, unknown>>(attendanceResponse)

  const summaryStudents = ensureArray<Record<string, unknown>>(summaryPayload.students ?? [])
  const attendanceStudents = ensureArray<Record<string, unknown>>(attendancePayload.students ?? [])

  const days = Array.from({ length: new Date(params.year, params.month, 0).getDate() }, (_, index) =>
    `${params.year}-${String(params.month).padStart(2, "0")}-${String(index + 1).padStart(2, "0")}`
  )

  const attendanceMap = new Map<string, Record<string, unknown>>(
    attendanceStudents.map((student) => [String(student.student_id ?? ""), student])
  )

  const rowsFromSummary = summaryStudents.map((student) => {
    const studentId = String(student.student_id ?? "")
    const studentAttendance = attendanceMap.get(studentId) ?? {}
    const entries = ensureArray<Record<string, unknown>>((studentAttendance as Record<string, unknown>).attendance_entries ?? [])
    const cells = days.reduce<Record<string, "PRESENT" | "ABSENT" | "LATE" | "EXCUSED" | null>>((acc, day) => {
      const entry = entries.find((item) => String(item.date ?? "") === day)
      const status = String(entry?.status ?? "").toUpperCase()
      acc[day] =
        status === "PRESENT" || status === "ABSENT" || status === "LATE" || status === "EXCUSED"
          ? (status as "PRESENT" | "ABSENT" | "LATE" | "EXCUSED")
          : null
      return acc
    }, {})

    const present = Object.values(cells).filter((value) => value === "PRESENT").length
    const absent = Object.values(cells).filter((value) => value === "ABSENT").length
    const late = Object.values(cells).filter((value) => value === "LATE").length
    const excused = Object.values(cells).filter((value) => value === "EXCUSED").length
    const totalClasses = present + absent + late + excused

    return {
      studentId,
      studentName: String(student.student_name ?? "Unknown Student"),
      rollNumber: String(student.student_roll ?? ""),
      cells,
      summary: {
        present,
        absent,
        late,
        excused,
        percentage: Number(student.attendance_percentage ?? computeAttendancePercentage(present, totalClasses)),
      },
    }
  })

  const summaryIds = new Set(rowsFromSummary.map((row) => row.studentId))
  const missingRows = attendanceStudents
    .filter((student) => !summaryIds.has(String(student.student_id ?? "")))
    .map((student) => {
      const entries = ensureArray<Record<string, unknown>>(student.attendance_entries ?? [])
      const cells = days.reduce<Record<string, "PRESENT" | "ABSENT" | "LATE" | "EXCUSED" | null>>((acc, day) => {
        const entry = entries.find((item) => String(item.date ?? "") === day)
        const status = String(entry?.status ?? "").toUpperCase()
        acc[day] =
          status === "PRESENT" || status === "ABSENT" || status === "LATE" || status === "EXCUSED"
            ? (status as "PRESENT" | "ABSENT" | "LATE" | "EXCUSED")
            : null
        return acc
      }, {})
      const present = Object.values(cells).filter((value) => value === "PRESENT").length
      const absent = Object.values(cells).filter((value) => value === "ABSENT").length
      const late = Object.values(cells).filter((value) => value === "LATE").length
      const excused = Object.values(cells).filter((value) => value === "EXCUSED").length
      const totalClasses = present + absent + late + excused
      return {
        studentId: String(student.student_id ?? ""),
        studentName: String(student.student_name ?? "Unknown Student"),
        rollNumber: String(student.student_roll ?? ""),
        cells,
        summary: {
          present,
          absent,
          late,
          excused,
          percentage: Number(student.attendance_percentage ?? computeAttendancePercentage(present, totalClasses)),
        },
      }
    })

  return normalizeMonthMatrix(
    {
      days,
      rows: [...rowsFromSummary, ...missingRows],
    },
    params.batchId,
    params.month,
    params.year
  ) as AttendanceMonthMatrix
}

export async function getAttendanceLogs(params: {
  status?: string
  deviceSerial?: string
  skip?: number
  take?: number
}) {
  const response = await api.get("/attendance/logs", {
    params: {
      status: params.status || undefined,
      deviceSerial: params.deviceSerial || undefined,
      skip: Number.isFinite(params.skip) ? params.skip : undefined,
      take: Number.isFinite(params.take) ? params.take : undefined,
    },
  })
  const payload = extractPayload<Record<string, unknown> | unknown[]>(response)
  const items = Array.isArray(payload) ? payload : payload?.items ?? payload?.records ?? payload?.logs ?? []
  return normalizeLogEntries(items) as AttendanceLogEntry[]
}

export async function getMyAttendanceSummary() {
  const response = await api.get("/attendance/student/my-summary")
  const payload = extractPayload<Record<string, unknown> | unknown[]>(response)
  const items = Array.isArray(payload) ? payload : payload?.items ?? payload?.summaries ?? payload?.summary ?? []
  return normalizeSummaryItems(items) as AttendanceSummaryItem[]
}

export async function getMyAttendanceRecords(params?: {
  month?: number
  year?: number
  sort?: "ASC" | "DESC"
}) {
  const month = params?.month
  const year = params?.year
  const hasMonthFilter = Number.isFinite(month) && Number.isFinite(year)
  const range = hasMonthFilter ? getMonthDateRange(Number(month), Number(year)) : null

  const response = await api.get("/attendance/student", {
    params: {
      start_date: range?.start,
      end_date: range?.end,
      sort: params?.sort || "DESC",
    },
  })
  const payload = extractPayload<Record<string, unknown> | unknown[]>(response)
  const items = Array.isArray(payload) ? payload : payload?.items ?? payload?.records ?? payload ?? []
  return ensureArray<unknown>(items).map((item) => normalizeAttendanceRecord(item)) as AttendanceRecord[]
}

export async function getMyAttendanceDateStatusList(params?: {
  month?: number
  year?: number
  batchId?: string
}) {
  const month = params?.month ?? new Date().getMonth() + 1
  const year = params?.year ?? new Date().getFullYear()
  const range = getMonthDateRange(month, year)

  const response = await api.get("/attendance/student/self/date-status-list", {
    params: {
      batch_id: params?.batchId || undefined,
      start_date: range.start,
      end_date: range.end,
    },
  })

  const payload = extractPayload<Record<string, unknown>>(response)
  const studentId = String(payload?.student_id ?? "").trim()
  const batchId = String(payload?.batch_id ?? params?.batchId ?? "").trim()
  const entries = ensureArray<unknown>(payload?.attendance_entries ?? payload?.records ?? payload?.items ?? [])

  return entries.map((item, index) =>
    normalizeAttendanceRecord(
      {
        ...((item ?? {}) as Record<string, unknown>),
        id: String(((item ?? {}) as Record<string, unknown>).id ?? `${studentId}-${batchId}-${index}`),
        student_id: ((item ?? {}) as Record<string, unknown>).student_id ?? studentId,
        batch_id: ((item ?? {}) as Record<string, unknown>).batch_id ?? batchId,
      },
      batchId,
      String(((item ?? {}) as Record<string, unknown>).date ?? "")
    )
  ) as AttendanceRecord[]
}

// ─── Student single-record CRUD ─────────────────────────────────────────────

export async function markStudentAttendance(data: {
  batch_id: string
  student_id: string
  date: string
  status: string
  note?: string
}) {
  const response = await api.post("/attendance/student", data)
  return extractPayload<unknown>(response)
}

export async function updateStudentAttendance(id: string, data: UpdateAttendanceDto) {
  const response = await api.put(`/attendance/student/${id}`, data)
  return extractPayload<unknown>(response)
}

export async function deleteStudentAttendance(id: string) {
  const response = await api.delete(`/attendance/student/${id}`)
  return extractPayload<unknown>(response)
}

export async function updateBulkStudentAttendance(params: {
  batchId: string
  date: string
  records: AttendanceBulkSaveItem[]
}) {
  const response = await api.put(
    `/attendance/student/bulk/${params.batchId}/${params.date}`,
    params.records.map((item) => ({
      student_id: item.student_id,
      status: item.status,
      note: item.note ?? undefined,
    }))
  )
  return extractPayload<unknown>(response)
}

// ─── Teacher attendance ──────────────────────────────────────────────────────

export async function markTeacherAttendance(data: MarkTeacherAttendanceDto) {
  const response = await api.post("/attendance/teacher", data)
  return extractPayload<unknown>(response)
}

export async function getTeacherAttendance(params?: {
  teacher_id?: string
  date?: string
  start_date?: string
  end_date?: string
}) {
  const response = await api.get("/attendance/teacher", { params })
  const payload = extractPayload<unknown[] | Record<string, unknown>>(response)
  const items = Array.isArray(payload) ? payload : []
  return items.map((item) => {
    const r = item as Record<string, unknown>
    const teacher = (r.teacher ?? {}) as Record<string, unknown>
    return {
      id: String(r.id ?? ""),
      teacherId: String(r.teacher_id ?? teacher.id ?? ""),
      teacherName: String(r.teacher_name ?? teacher.name ?? "Unknown Teacher"),
      teacherEmail: String(r.teacher_email ?? teacher.email ?? "") || null,
      date: String(r.date ?? "").slice(0, 10),
      checkIn: r.check_in ? String(r.check_in) : null,
      checkOut: r.check_out ? String(r.check_out) : null,
      status: String(r.status ?? "ABSENT").toUpperCase() as TeacherAttendanceRecord["status"],
      note: r.note ? String(r.note) : null,
    } as TeacherAttendanceRecord
  })
}

export async function updateTeacherAttendance(id: string, data: UpdateAttendanceDto) {
  const response = await api.put(`/attendance/teacher/${id}`, data)
  return extractPayload<unknown>(response)
}

export async function deleteTeacherAttendance(id: string) {
  const response = await api.delete(`/attendance/teacher/${id}`)
  return extractPayload<unknown>(response)
}

// ─── Machine import ──────────────────────────────────────────────────────────

export async function importMachineAttendance(payload: string) {
  const response = await api.post("/attendance/machine", { payload })
  return extractPayload<MachineImportResult>(response)
}

// ─── Stats ───────────────────────────────────────────────────────────────────

export async function getAttendanceStats(params?: {
  batch_id?: string
  student_id?: string
  teacher_id?: string
  date?: string
  start_date?: string
  end_date?: string
}) {
  const response = await api.get("/attendance/stats", { params })
  return extractPayload<AttendanceStats>(response)
}

// ─── Log detail ──────────────────────────────────────────────────────────────

export async function getAttendanceLogDetail(logId: string) {
  const response = await api.get(`/attendance/logs/${logId}`)
  const r = extractPayload<Record<string, unknown>>(response)
  return {
    id: String(r.id ?? ""),
    deviceSerial: r.device_serial ? String(r.device_serial) : null,
    rawData: String(r.raw_data ?? ""),
    parsedCount: Number(r.parsed_count ?? 0),
    processedCount: Number(r.processed_count ?? 0),
    failedCount: Number(r.failed_count ?? 0),
    errorMessage: r.error_message ? String(r.error_message) : null,
    status: String(r.status ?? ""),
    createdAt: String(r.created_at ?? ""),
    processedAt: r.processed_at ? String(r.processed_at) : null,
  } as AttendanceLogDetail
}

// ─── Batch present dates ─────────────────────────────────────────────────────

export async function getBatchPresentDates(batchId: string) {
  const response = await api.get(`/attendance/batch/${batchId}/present-dates`)
  const payload = extractPayload<unknown[] | Record<string, unknown>>(response)
  const items = Array.isArray(payload) ? payload : []
  return items.map((item) => {
    const r = item as Record<string, unknown>
    return {
      student_id: String(r.student_id ?? ""),
      student_name: String(r.student_name ?? "Unknown"),
      dates: ((r.dates ?? []) as Record<string, unknown>[]).map((d) => ({
        date: String(d.date ?? ""),
        check_in_time: d.check_in_time ? String(d.check_in_time) : null,
      })),
    } as BatchPresentDate
  })
}

