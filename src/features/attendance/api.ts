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
  normalizeDayView,
  normalizeLogEntries,
  normalizeMonthMatrix,
  normalizeSummaryItems,
  normalizeAttendanceRecord,
} from "@/features/attendance/utils"

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
  const items = Array.isArray(payload) ? payload : payload?.items ?? payload?.records ?? payload?.students ?? []
  return ensureArray<unknown>(items).map((item) => normalizeAttendanceRecord(item, params.batchId, params.date)) as AttendanceRecord[]
}

export async function saveAttendanceBulk(params: {
  batchId: string
  date: string
  records: AttendanceBulkSaveItem[]
}) {
  const response = await api.post(`/attendance/student/bulk/${params.batchId}/${params.date}`, {
    records: params.records,
  })
  return extractPayload<unknown>(response)
}

export async function sendAttendanceSms(payload: AttendanceSmsRequest) {
  const response = await api.post("/attendance/student/send-sms", payload)
  return extractPayload<unknown>(response)
}

export async function getAttendanceDayView(params: {
  batchId: string
  date: string
  status?: string
  source?: string
  search?: string
}) {
  const response = await api.get(`/attendance/batch/${params.batchId}/day`, {
    params: {
      date: params.date,
      status: params.status || undefined,
      source: params.source || undefined,
      search: params.search || undefined,
    },
  })
  return normalizeDayView(extractPayload<unknown>(response), params.batchId, params.date) as AttendanceDayView
}

export async function getAttendanceMonthMatrix(params: {
  batchId: string
  month: number
  year: number
}) {
  const response = await api.get(`/attendance/batch/${params.batchId}/month`, {
    params: {
      month: params.month,
      year: params.year,
    },
  })
  return normalizeMonthMatrix(extractPayload<unknown>(response), params.batchId, params.month, params.year) as AttendanceMonthMatrix
}

export async function getAttendanceLogs(params: {
  batchId?: string
  dateFrom?: string
  dateTo?: string
}) {
  const response = await api.get("/attendance/logs", {
    params: {
      batchId: params.batchId || undefined,
      dateFrom: params.dateFrom || undefined,
      dateTo: params.dateTo || undefined,
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
  const response = await api.get("/attendance/student/my-records", {
    params: {
      month: params?.month || undefined,
      year: params?.year || undefined,
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
  const monthStart = `${year}-${String(month).padStart(2, "0")}-01`
  const monthEnd = new Date(year, month, 0).toISOString().slice(0, 10)

  const response = await api.get("/attendance/student/self/date-status-list", {
    params: {
      batch_id: params?.batchId || undefined,
      start_date: monthStart,
      end_date: monthEnd,
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
