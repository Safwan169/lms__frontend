export type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE" | "EXCUSED"

export type AttendanceSource = "MACHINE" | "MANUAL"

export type AttendanceActionType = "CREATE" | "UPDATE" | "OVERRIDE"

export type AttendanceRecord = {
  id: string
  studentId: string
  batchId: string
  studentName: string
  rollNumber: string
  status: AttendanceStatus
  source: AttendanceSource
  firstEntry?: string | null
  lastExit?: string | null
  overridden: boolean
  overriddenBy?: string | null
  note?: string | null
  phone?: string | null
  parentPhone?: string | null
  date: string
}

export type AttendanceBulkSaveItem = {
  student_id: string
  batch_id: string
  date: string
  status: AttendanceStatus
  source: AttendanceSource
  first_entry?: string | null
  last_exit?: string | null
  overridden?: boolean
  overridden_by?: string | null
  note?: string | null
}

export type AttendanceBatchOption = {
  id: string
  name: string
  className?: string
  section?: string
  status?: string
}

export type AttendanceDayTotals = {
  total: number
  present: number
  absent: number
  late: number
  excused: number
  machine: number
  manual: number
}

export type AttendanceDayView = {
  batchId: string
  date: string
  totals: AttendanceDayTotals
  items: AttendanceRecord[]
}

export type AttendanceMonthMatrixRow = {
  studentId: string
  studentName: string
  rollNumber: string
  cells: Record<string, AttendanceStatus | null>
  summary: {
    present: number
    absent: number
    late: number
    excused: number
    percentage: number
  }
}

export type AttendanceMonthMatrix = {
  batchId: string
  month: number
  year: number
  days: string[]
  rows: AttendanceMonthMatrixRow[]
}

export type AttendanceLogEntry = {
  id: string
  studentId: string
  studentName: string
  batchId: string
  batchName?: string
  date: string
  source: AttendanceSource
  updatedBy?: string | null
  updatedAt?: string | null
  actionType: AttendanceActionType
  note?: string | null
}

export type AttendanceSummaryItem = {
  studentId?: string
  batchId: string
  batchName?: string
  className?: string | null
  subject?: string | null
  totalClasses: number
  attended: number
  absent: number
  attendancePercentage: number
}

export type AttendanceSummaryResponse = {
  summaries: AttendanceSummaryItem[]
}

export type AttendanceSelfRecordsResponse = {
  records: AttendanceRecord[]
}

export type AttendanceSmsRequest = {
  batchId?: string
  date?: string
  studentIds?: string[]
  recipients?: string[]
  note?: string
}
