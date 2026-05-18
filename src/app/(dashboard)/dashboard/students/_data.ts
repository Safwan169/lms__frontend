export type StudentStatus = "Active" | "Inactive" | "Transferred" | "Passed Out" | "Dropped"

export type AttendanceStatus = "present" | "absent" | "late" | "holiday"

export type ClassOption = {
  id: string
  name: string
  color: string
}

export type BatchOption = {
  id: string
  classId: string
  name: string
  capacity: number
}

export type StudentDocument = {
  id: string
  name: string
  type: "pdf" | "image"
  uploadedAt: string
  url: string
}

export type StatusHistoryEntry = {
  id: string
  oldStatus: StudentStatus
  newStatus: StudentStatus
  date: string
  changedBy: string
  reason?: string
}

export type PromotionEntry = {
  id: string
  fromClass: string
  fromBatch: string
  toClass: string
  toBatch: string
  date: string
  doneBy: string
}

export type Student = {
  id: string
  name: string
  studentId: string
  classId: string
  className: string
  batchId: string
  batchName: string
  session: string
  phone: string
  parentPhone: string
  email?: string
  gender: "Male" | "Female"
  dob: string
  address: string
  fatherName: string
  motherName: string
  parentNid?: string
  enrolledOn: string
  enrolledBy: string
  status: StudentStatus
  photoUrl?: string
  portalBlocked: boolean
  loginIdentifier: string
  lastLogin?: string
  passwordLastReset?: string
  admissionFee: {
    amount: number
    method: string
    transactionId: string
    date: string
    verifiedBy: string
    status: "Verified" | "Pending"
  }
  statusHistory: StatusHistoryEntry[]
  promotionHistory: PromotionEntry[]
  documents: StudentDocument[]
}

export const SESSIONS = ["2023-2024", "2024-2025", "2025-2026"]

export const CLASSES: ClassOption[] = [
  { id: "6", name: "Class 6", color: "bg-blue-100 text-blue-700" },
  { id: "7", name: "Class 7", color: "bg-emerald-100 text-emerald-700" },
  { id: "8", name: "Class 8", color: "bg-violet-100 text-violet-700" },
  { id: "9", name: "Class 9", color: "bg-amber-100 text-amber-700" },
  { id: "10", name: "Class 10", color: "bg-rose-100 text-rose-700" },
]

export const BATCHES: BatchOption[] = [
  { id: "b6-a", classId: "6", name: "Batch A", capacity: 40 },
  { id: "b6-b", classId: "6", name: "Batch B", capacity: 40 },
  { id: "b7-m", classId: "7", name: "Morning", capacity: 45 },
  { id: "b7-e", classId: "7", name: "Evening", capacity: 45 },
  { id: "b8-a", classId: "8", name: "Section A", capacity: 42 },
  { id: "b8-b", classId: "8", name: "Section B", capacity: 42 },
  { id: "b9-sci", classId: "9", name: "Science", capacity: 36 },
  { id: "b9-com", classId: "9", name: "Commerce", capacity: 34 },
  { id: "b10-sci", classId: "10", name: "Science", capacity: 34 },
  { id: "b10-art", classId: "10", name: "Arts", capacity: 30 },
]

export const DUMMY_STUDENTS: Student[] = [
  {
    id: "stu-001",
    name: "Ayesha Rahman",
    studentId: "ST-24001",
    classId: "8",
    className: "Class 8",
    batchId: "b8-a",
    batchName: "Section A",
    session: "2025-2026",
    phone: "01711111111",
    parentPhone: "01720000001",
    email: "ayesha.rahman@example.com",
    gender: "Female",
    dob: "2011-02-12",
    address: "Dhanmondi, Dhaka",
    fatherName: "Fahim Rahman",
    motherName: "Nadia Rahman",
    parentNid: "1987654321123",
    enrolledOn: "2025-01-10",
    enrolledBy: "Admin Rifat",
    status: "Active",
    portalBlocked: false,
    loginIdentifier: "01711111111",
    lastLogin: "2026-03-25T09:20:00Z",
    passwordLastReset: "2026-01-18T10:10:00Z",
    admissionFee: {
      amount: 6000,
      method: "Bank Transfer",
      transactionId: "TXN-10001",
      date: "2025-01-10",
      verifiedBy: "Cashier Mina",
      status: "Verified",
    },
    statusHistory: [
      { id: "sh-1", oldStatus: "Inactive", newStatus: "Active", date: "2025-01-11", changedBy: "Admin Rifat", reason: "Documents completed" },
    ],
    promotionHistory: [
      { id: "ph-1", fromClass: "Class 7", fromBatch: "Morning", toClass: "Class 8", toBatch: "Section A", date: "2026-01-05", doneBy: "Admin Rifat" },
    ],
    documents: [
      { id: "doc-1", name: "Birth-Certificate.pdf", type: "pdf", uploadedAt: "2025-01-08", url: "/docs/birth-certificate.pdf" },
      { id: "doc-2", name: "Student-Photo.jpg", type: "image", uploadedAt: "2025-01-08", url: "/logo.png" },
    ],
  },
  {
    id: "stu-002",
    name: "Tanvir Hasan",
    studentId: "ST-24002",
    classId: "9",
    className: "Class 9",
    batchId: "b9-sci",
    batchName: "Science",
    session: "2025-2026",
    phone: "01822222222",
    parentPhone: "01820000002",
    gender: "Male",
    dob: "2010-11-20",
    address: "Mirpur, Dhaka",
    fatherName: "Jahid Hasan",
    motherName: "Rumana Hasan",
    enrolledOn: "2025-01-12",
    enrolledBy: "Admin Nabila",
    status: "Active",
    portalBlocked: false,
    loginIdentifier: "tanvir.hasan@example.com",
    email: "tanvir.hasan@example.com",
    lastLogin: "2026-03-27T15:10:00Z",
    admissionFee: {
      amount: 6500,
      method: "Mobile Banking",
      transactionId: "TXN-10002",
      date: "2025-01-12",
      verifiedBy: "Cashier Mina",
      status: "Verified",
    },
    statusHistory: [],
    promotionHistory: [],
    documents: [],
  },
  {
    id: "stu-003",
    name: "Nusrat Jahan",
    studentId: "ST-24003",
    classId: "10",
    className: "Class 10",
    batchId: "b10-sci",
    batchName: "Science",
    session: "2024-2025",
    phone: "01933333333",
    parentPhone: "01920000003",
    gender: "Female",
    dob: "2009-04-09",
    address: "Uttara, Dhaka",
    fatherName: "Rezaul Karim",
    motherName: "Morsheda Begum",
    enrolledOn: "2024-02-02",
    enrolledBy: "Admin Nabila",
    status: "Inactive",
    portalBlocked: true,
    loginIdentifier: "01933333333",
    lastLogin: "2026-02-02T18:00:00Z",
    passwordLastReset: "2025-12-15T10:00:00Z",
    admissionFee: {
      amount: 7000,
      method: "Cash",
      transactionId: "TXN-10003",
      date: "2024-02-02",
      verifiedBy: "Cashier Rana",
      status: "Verified",
    },
    statusHistory: [
      { id: "sh-2", oldStatus: "Active", newStatus: "Inactive", date: "2026-02-10", changedBy: "Admin Rifat", reason: "Medical leave" },
    ],
    promotionHistory: [
      { id: "ph-2", fromClass: "Class 9", fromBatch: "Science", toClass: "Class 10", toBatch: "Science", date: "2025-01-07", doneBy: "Admin Nabila" },
    ],
    documents: [{ id: "doc-3", name: "Transfer-Certificate.pdf", type: "pdf", uploadedAt: "2026-02-10", url: "/docs/transfer-certificate.pdf" }],
  },
  {
    id: "stu-004",
    name: "Shafin Ahmed",
    studentId: "ST-24004",
    classId: "9",
    className: "Class 9",
    batchId: "b9-com",
    batchName: "Commerce",
    session: "2025-2026",
    phone: "01644444444",
    parentPhone: "01620000004",
    gender: "Male",
    dob: "2010-07-14",
    address: "Mohammadpur, Dhaka",
    fatherName: "Aziz Ahmed",
    motherName: "Shanta Ahmed",
    enrolledOn: "2025-01-18",
    enrolledBy: "Admin Sadi",
    status: "Transferred",
    portalBlocked: false,
    loginIdentifier: "01644444444",
    admissionFee: {
      amount: 6400,
      method: "Cash",
      transactionId: "TXN-10004",
      date: "2025-01-18",
      verifiedBy: "Cashier Rana",
      status: "Pending",
    },
    statusHistory: [
      { id: "sh-3", oldStatus: "Active", newStatus: "Transferred", date: "2026-03-02", changedBy: "Admin Sadi", reason: "Moved city" },
    ],
    promotionHistory: [],
    documents: [],
  },
  {
    id: "stu-005",
    name: "Maliha Akter",
    studentId: "ST-24005",
    classId: "7",
    className: "Class 7",
    batchId: "b7-m",
    batchName: "Morning",
    session: "2025-2026",
    phone: "01755555555",
    parentPhone: "01720000005",
    gender: "Female",
    dob: "2012-05-01",
    address: "Banani, Dhaka",
    fatherName: "Mamun Akter",
    motherName: "Fariha Akter",
    enrolledOn: "2026-03-08",
    enrolledBy: "Admin Sadi",
    status: "Active",
    portalBlocked: false,
    loginIdentifier: "maliha.akter@example.com",
    email: "maliha.akter@example.com",
    lastLogin: "2026-03-28T08:10:00Z",
    admissionFee: {
      amount: 5600,
      method: "Mobile Banking",
      transactionId: "TXN-10005",
      date: "2026-03-08",
      verifiedBy: "Cashier Mina",
      status: "Verified",
    },
    statusHistory: [],
    promotionHistory: [],
    documents: [{ id: "doc-5", name: "Guardian-NID.jpg", type: "image", uploadedAt: "2026-03-08", url: "/logo.png" }],
  },
  {
    id: "stu-006",
    name: "Rakib Chowdhury",
    studentId: "ST-24006",
    classId: "6",
    className: "Class 6",
    batchId: "b6-b",
    batchName: "Batch B",
    session: "2024-2025",
    phone: "01866666666",
    parentPhone: "01820000006",
    gender: "Male",
    dob: "2013-01-22",
    address: "Khilgaon, Dhaka",
    fatherName: "Shamim Chowdhury",
    motherName: "Rubina Chowdhury",
    enrolledOn: "2024-01-06",
    enrolledBy: "Admin Rifat",
    status: "Dropped",
    portalBlocked: true,
    loginIdentifier: "01866666666",
    admissionFee: {
      amount: 5000,
      method: "Cash",
      transactionId: "TXN-10006",
      date: "2024-01-06",
      verifiedBy: "Cashier Rana",
      status: "Verified",
    },
    statusHistory: [
      { id: "sh-6", oldStatus: "Active", newStatus: "Dropped", date: "2025-09-10", changedBy: "Admin Rifat", reason: "Long absence" },
    ],
    promotionHistory: [],
    documents: [],
  },
]

export type StudentsFilter = {
  search?: string
  classId?: string
  batchId?: string
  status?: string
  session?: string
  page?: number
  limit?: number
}

export function getClassById(id: string) {
  return CLASSES.find((item) => item.id === id)
}

export function getBatchesByClass(classId?: string) {
  if (!classId || classId === "all") return BATCHES
  return BATCHES.filter((item) => item.classId === classId)
}

export function filterStudents(filters: StudentsFilter, source = DUMMY_STUDENTS) {
  const search = (filters.search ?? "").trim().toLowerCase()
  const classId = filters.classId ?? "all"
  const batchId = filters.batchId ?? "all"
  const status = filters.status ?? "all"
  const session = filters.session ?? "all"

  const filtered = source.filter((student) => {
    const searchMatch =
      search.length === 0 ||
      student.name.toLowerCase().includes(search) ||
      student.phone.toLowerCase().includes(search) ||
      student.studentId.toLowerCase().includes(search)
    const classMatch = classId === "all" || student.classId === classId
    const batchMatch = batchId === "all" || student.batchId === batchId
    const statusMatch = status === "all" || student.status === status
    const sessionMatch = session === "all" || student.session === session
    return searchMatch && classMatch && batchMatch && statusMatch && sessionMatch
  })

  const limit = Number(filters.limit ?? 20)
  const page = Math.max(1, Number(filters.page ?? 1))
  const total = filtered.length
  const totalPages = Math.max(1, Math.ceil(total / limit))
  const safePage = Math.min(page, totalPages)
  const start = (safePage - 1) * limit
  const items = filtered.slice(start, start + limit)

  return { items, total, totalPages, page: safePage, all: filtered }
}

export function getStudentById(id: string, source = DUMMY_STUDENTS) {
  return source.find((student) => student.id === id)
}

export function getStudentsStats(source = DUMMY_STUDENTS) {
  const now = new Date()
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()

  const total = source.length
  const active = source.filter((student) => student.status === "Active").length
  const inactive = source.filter((student) => student.status === "Inactive").length
  const newThisMonth = source.filter((student) => {
    const enrolled = new Date(student.enrolledOn)
    return enrolled.getMonth() === currentMonth && enrolled.getFullYear() === currentYear
  }).length

  return { total, active, inactive, newThisMonth }
}

export function getStatusBadgeVariant(status: StudentStatus) {
  if (status === "Active") return "default"
  if (status === "Inactive") return "warning"
  if (status === "Transferred") return "info"
  if (status === "Passed Out") return "muted"
  return "destructive"
}

export function formatDate(value?: string) {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "-"
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date)
}

export function formatDateTime(value?: string) {
  if (!value) return "Never"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Never"
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

export function createAttendanceForMonth(month: string) {
  const [yearStr, monthStr] = month.split("-")
  const year = Number(yearStr)
  const monthIndex = Number(monthStr) - 1
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate()

  const entries = Array.from({ length: daysInMonth }, (_, index) => {
    const day = index + 1
    const date = new Date(year, monthIndex, day)
    const weekDay = date.getDay()

    let status: AttendanceStatus = "present"
    if (weekDay === 0 || weekDay === 5) {
      status = "holiday"
    } else if (day % 11 === 0) {
      status = "absent"
    } else if (day % 7 === 0) {
      status = "late"
    }

    return {
      date: `${yearStr}-${monthStr}-${String(day).padStart(2, "0")}`,
      status,
    }
  })

  const present = entries.filter((item) => item.status === "present").length
  const absent = entries.filter((item) => item.status === "absent").length
  const late = entries.filter((item) => item.status === "late").length

  return {
    entries,
    summary: {
      present,
      absent,
      late,
      total: present + absent + late,
    },
  }
}

export function attendanceColor(status: AttendanceStatus) {
  if (status === "present") return "bg-emerald-500"
  if (status === "absent") return "bg-red-500"
  if (status === "late") return "bg-amber-400"
  return "bg-slate-200"
}
