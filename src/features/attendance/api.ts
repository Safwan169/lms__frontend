import api from "@/lib/api"
import type {
  AttendanceBatchOption,
  AttendanceBulkSaveItem,
  AttendanceDayView,
  AttendanceLogEntry,
  AttendanceMonthMatrix,
  AttendanceRecord,
  AttendanceSmsRequest,
  AttendanceSummaryItem,
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
  throw new Error("SMS endpoint is not available in backend attendance module yet.")
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
