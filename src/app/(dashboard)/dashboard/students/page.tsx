"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import {
  Download,
  Eye,
  FileText,
  Search,
  Users,
  X,
  Loader2,
  ArrowUpDown,
} from "lucide-react"
import toast from "react-hot-toast"

import api from "@/lib/api"
import { cn } from "@/lib/utils"
import { useAuth } from "@/context/AuthContext"
import { useGetStudentProfilesQuery } from "@/features/user/userApi"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table-primitive"
import {
  BATCHES,
  CLASSES,
  DUMMY_STUDENTS,
  Student,
  StudentStatus,
  filterStudents,
  formatDate,
  getBatchesByClass,
  getClassById,
  getStatusBadgeVariant,
  getStudentById,
  getStudentsStats,
  createAttendanceForMonth,
  attendanceColor,
} from "./_data"

const STATUSES = ["all", "Active", "Inactive", "Transferred", "Passed Out", "Dropped"] as const
const LIMITS = [10, 20, 50]
const COLUMN_OPTIONS = [
  { key: "studentId", label: "Student ID" },
  { key: "classBatch", label: "Class / Batch" },
  { key: "phone", label: "Phone" },
  { key: "parentPhone", label: "Parent Phone" },
  { key: "enrolledOn", label: "Enrolled On" },
  { key: "status", label: "Status" },
] as const

type ColumnKey = (typeof COLUMN_OPTIONS)[number]["key"]
type ClassOption = { id: string; name: string; color?: string }
type BatchOption = { id: string; classId: string; name: string; capacity?: number }

function useDebouncedValue(value: string, delay = 400) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timeout)
  }, [value, delay])
  return debounced
}

function todayIsoDate() {
  return new Date().toISOString().split("T")[0]
}

function getInitials(name: string) {
  const parts = name.split(" ").filter(Boolean)
  const first = parts[0]?.[0] ?? "S"
  const second = parts[1]?.[0] ?? ""
  return `${first}${second}`.toUpperCase()
}

export default function StudentsListPage() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { user } = useAuth()

  const [students, setStudents] = useState<Student[]>(DUMMY_STUDENTS)
  const [searchInput, setSearchInput] = useState(searchParams.get("search") ?? "")
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [quickViewId, setQuickViewId] = useState<string | null>(null)
  const [columnDialogOpen, setColumnDialogOpen] = useState(false)
  const [visibleColumns, setVisibleColumns] = useState<Record<ColumnKey, boolean>>({
    studentId: true,
    classBatch: true,
    phone: true,
    parentPhone: true,
    enrolledOn: true,
    status: true,
  })

  const [statusDialogOpen, setStatusDialogOpen] = useState(false)
  const [statusTargetIds, setStatusTargetIds] = useState<string[]>([])
  const [statusForm, setStatusForm] = useState<{ status: StudentStatus; reason: string; effectiveDate: string }>({
    status: "Active",
    reason: "",
    effectiveDate: todayIsoDate(),
  })

  const [promoteDialogOpen, setPromoteDialogOpen] = useState(false)
  const [promoteTargetIds, setPromoteTargetIds] = useState<string[]>([])
  const [promotionForm, setPromotionForm] = useState<{ toClassId: string; toBatchId: string; note: string }>({
    toClassId: "",
    toBatchId: "",
    note: "",
  })

  // Guard implementation intentionally commented for frontend-only flow.
  // const isAdmin = useMemo(() => {
  //   if (!user) return false
  //   const role = String((user as any)?.role ?? "").toLowerCase()
  //   return role === "admin" || role === "rektor"
  // }, [user])
  //
  // useEffect(() => {
  //   if (!DEMO_MODE && !isAdmin) router.push("/dashboard")
  // }, [isAdmin, router])

  const tenantId = useMemo(() => {
    return (
      (user as any)?.tenant_id ??
      (user as any)?.tenantId ??
      (user as any)?.tenant?.id ??
      "demo-tenant"
    )
  }, [user])

  const classId = searchParams.get("classId") ?? "all"
  const batchId = searchParams.get("batchId") ?? "all"
  const status = searchParams.get("status") ?? "all"
  const page = Number(searchParams.get("page") ?? "1")
  const limit = Number(searchParams.get("limit") ?? "20")

  const debouncedSearch = useDebouncedValue(searchInput, 400)

  useEffect(() => {
    setSearchInput(searchParams.get("search") ?? "")
  }, [searchParams])

  const updateQuery = (next: Record<string, string | number | undefined>) => {
    const params = new URLSearchParams(searchParams.toString())

    Object.entries(next).forEach(([key, value]) => {
      const asString = value == null ? "" : String(value)
      const shouldRemove = asString.length === 0 || asString === "all"
      if (shouldRemove) {
        params.delete(key)
      } else {
        params.set(key, asString)
      }
    })

    const qs = params.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname)
  }

  useEffect(() => {
    updateQuery({ search: debouncedSearch, page: 1 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch])

  const classesQuery = useQuery({
    queryKey: ["student-classes", tenantId],
    queryFn: async () => {
      if (!tenantId || tenantId === "demo-tenant") return CLASSES

      const response = await api.get(`/api/tenants/${tenantId}/classes`, {
        params: { page: 1, limit: 100 },
      })
      const payload = response?.data
      const rawItems = Array.isArray(payload?.data) ? payload.data : Array.isArray(payload) ? payload : []

      return rawItems
        .map((item: any, index: number) => ({
          id: String(item?.id ?? item?.class_id ?? "").trim(),
          name: String(item?.class_name ?? item?.name ?? "").trim(),
          color: CLASSES[index % CLASSES.length]?.color ?? "bg-slate-100 text-slate-700",
        }))
        .filter((item: any) => item.id.length > 0)
    },
    staleTime: 60_000,
  })

  const batchesQuery = useQuery({
    queryKey: ["student-batches", tenantId, classId],
    queryFn: async () => {
      if (!tenantId || tenantId === "demo-tenant") return getBatchesByClass(classId)

      const params: Record<string, string | number> = { page: 1, limit: 100 }
      if (classId !== "all") params.class_id = classId

      const response = await api.get(`/api/tenants/${tenantId}/batches`, { params })
      const payload = response?.data
      const rawItems = Array.isArray(payload?.data) ? payload.data : Array.isArray(payload) ? payload : []

      return rawItems
        .map((item: any) => ({
          id: String(item?.id ?? item?.batch_id ?? "").trim(),
          classId: String(item?.class_id ?? item?.class?.id ?? "").trim(),
          name: String(item?.batch_name ?? item?.name ?? item?.section ?? "").trim(),
          capacity: Number(item?.capacity ?? 0),
        }))
        .filter((item: any) => item.id.length > 0)
    },
    staleTime: 60_000,
  })

  const statsQuery = useQuery({
    queryKey: ["students-stats", tenantId, students],
    queryFn: async () => {
      // API implementation intentionally commented for frontend-only flow.
      // const res = await fetch(`/admin/students/stats?tenant_id=${tenantId}`, { cache: "no-store" })
      // if (!res.ok) throw new Error("Failed to load stats")
      // return await res.json()
      await new Promise((resolve) => setTimeout(resolve, 180))
      return getStudentsStats(students)
    },
  })

  const listQuery = useGetStudentProfilesQuery(
    {
      tenantId,
      page,
      limit,
      search: debouncedSearch || undefined,
    },
    { skip: !tenantId || tenantId === "demo-tenant" }
  )

  const apiRows: Student[] = (listQuery.data?.data ?? listQuery.data?.items ?? []).map((item: any) => ({
    id: String(item.id ?? item.user_id ?? ""),
    name: String(item.full_name ?? item.student_name ?? item.name ?? ""),
    studentId: String(item.student_id ?? item.roll_number ?? ""),
    classId: String(item.class_id ?? item.class?.id ?? ""),
    className: String(item.class?.name ?? item.class_name ?? ""),
    batchId: String(item.batch_id ?? item.batch?.id ?? ""),
    batchName: String(item.batch?.name ?? item.batch_name ?? ""),
    session: String(item.session ?? ""),
    status: (item.status ?? "Active") as Student["status"],
    phone: String(item.phone ?? item.student_phone ?? ""),
    parentPhone: String(item.parent_phone ?? ""),
    email: String(item.email ?? item.student_email ?? ""),
    gender: (item.gender ?? "Male") as Student["gender"],
    dob: String(item.dob ?? ""),
    address: String(item.address ?? ""),
    fatherName: String(item.father_name ?? ""),
    motherName: String(item.mother_name ?? ""),
    enrolledOn: String(item.admitted_at ?? item.created_at ?? ""),
    enrolledBy: String(item.enrolled_by ?? "System"),
    portalBlocked: Boolean(item.portal_blocked ?? false),
    loginIdentifier: String(item.phone ?? item.student_phone ?? item.email ?? item.student_email ?? ""),
    photoUrl: item.photo ?? item.photo_url ?? undefined,
    admissionFee: {
      amount: Number(item.payment?.amount ?? 0),
      method: String(item.payment?.method ?? "-"),
      transactionId: String(item.payment?.transaction_id ?? "-"),
      date: String(item.payment?.paid_at ?? item.payment?.created_at ?? ""),
      verifiedBy: String(item.payment?.verified_by ?? "System"),
      status: String(item.payment?.payment_status ?? "").toUpperCase() === "COMPLETED" ? "Verified" : "Pending",
    },
    statusHistory: [],
    promotionHistory: [],
    documents: [],
  }))

  const useApiData = !(!tenantId || tenantId === "demo-tenant") && listQuery.data != null

  const fallbackList = useMemo(
    () =>
      filterStudents(
        {
          search: debouncedSearch,
          classId,
          batchId,
          status,
          page,
          limit,
        },
        students
      ),
    [debouncedSearch, classId, batchId, status, page, limit, students]
  )

  const classes: ClassOption[] = (classesQuery.data ?? CLASSES) as ClassOption[]
  const batchOptions: BatchOption[] = (batchesQuery.data ?? getBatchesByClass(classId)) as BatchOption[]
  const baseRows: Student[] = useApiData ? apiRows : ((listQuery as any).data?.items ?? fallbackList.items)
  const rows = useMemo(() => {
    return baseRows.filter((row) => {
      const classMatch = classId === "all" ? true : row.classId === classId
      const batchMatch = batchId === "all" ? true : row.batchId === batchId
      const statusMatch = status === "all" ? true : row.status === status
      return classMatch && batchMatch && statusMatch
    })
  }, [baseRows, classId, batchId, status])
  const total = useApiData ? rows.length : (listQuery as any).data?.total ?? fallbackList.total
  const totalPages = useApiData ? 1 : (listQuery as any).data?.totalPages ?? fallbackList.totalPages
  const currentPage = useApiData ? page : (listQuery as any).data?.page ?? fallbackList.page

  const summaryQuery = useQuery({
    queryKey: ["student-summary", tenantId, quickViewId, rows, students],
    enabled: !!quickViewId,
    queryFn: async () => {
      // API implementation intentionally commented for frontend-only flow.
      // const res = await fetch(`/admin/students/${quickViewId}/summary?tenant_id=${tenantId}`)
      // if (!res.ok) throw new Error("Failed to load student summary")
      // return await res.json()
      await new Promise((resolve) => setTimeout(resolve, 140))
      const student =
        rows.find((item) => item.id === String(quickViewId)) ??
        getStudentById(String(quickViewId), students)
      if (!student) return null
      const attendance = createAttendanceForMonth(new Date().toISOString().slice(0, 7))
      return {
        student,
        attendanceSummary: attendance.summary,
        recentDays: attendance.entries.slice(-7),
      }
    },
  })

  useEffect(() => {
    setSelectedIds((prev) => {
      const next = prev.filter((id) => rows.some((row: Student) => row.id === id) || students.some((s: Student) => s.id === id))
      if (next.length === prev.length && next.every((id, index) => id === prev[index])) {
        return prev
      }
      return next
    })
  }, [rows, students])

  const allCheckedOnPage = rows.length > 0 && rows.every((row) => selectedIds.includes(row.id))

  const selectedStudents = useMemo(() => {
    const map = new Map([...students, ...rows].map((item) => [item.id, item]))
    return selectedIds.map((id) => map.get(id)).filter(Boolean) as Student[]
  }, [selectedIds, students, rows])

  const resetFilters = () => {
    setSearchInput("")
    setSelectedIds([])
    router.replace(pathname)
  }

  const toggleColumn = (key: ColumnKey) => {
    setVisibleColumns((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const columnClassName = (key: ColumnKey) => {
    const hiddenByUser = !visibleColumns[key]
    const responsiveDefaults: Record<ColumnKey, string> = {
      studentId: "hidden xl:table-cell",
      classBatch: "hidden sm:table-cell",
      phone: "hidden lg:table-cell",
      parentPhone: "hidden xl:table-cell",
      enrolledOn: "hidden md:table-cell",
      status: "",
    }

    return cn(responsiveDefaults[key], hiddenByUser && "!hidden")
  }

  const downloadFile = (format: "xlsx" | "pdf") => {
    const name = format === "xlsx" ? "students.xlsx" : "students.pdf"

    // API implementation intentionally commented for frontend-only flow.
    // const params = new URLSearchParams({ format, tenant_id: String(tenantId) })
    // ...append all filters then fetch(`/admin/students/export?${params.toString()}`)
    // const blob = await res.blob()

    const content =
      format === "xlsx"
        ? [
            "Student Name,Student ID,Class,Batch,Phone,Status",
            ...(listQuery.data?.all ?? []).map(
              (item: Student) => `${item.name},${item.studentId},${item.className},${item.batchName},${item.phone},${item.status}`
            ),
          ].join("\n")
        : `Student Report\nTotal: ${total}\nGenerated at: ${new Date().toLocaleString()}`

    const blob = new Blob([content], {
      type: format === "xlsx" ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" : "application/pdf",
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = name
    a.click()
    URL.revokeObjectURL(url)
    toast.success(`${format.toUpperCase()} export started`)
  }

  const openStatusDialogFor = (ids: string[]) => {
    if (ids.length === 0) return
    setStatusTargetIds(ids)
    const first = students.find((item) => item.id === ids[0])
    setStatusForm({
      status: first?.status ?? "Active",
      reason: "",
      effectiveDate: todayIsoDate(),
    })
    setStatusDialogOpen(true)
  }

  const applyStatusUpdate = () => {
    // API implementation intentionally commented for frontend-only flow.
    // if (statusTargetIds.length === 1) {
    //   await fetch(`/admin/students/${statusTargetIds[0]}/status`, { method: "PATCH", body: JSON.stringify(...) })
    // } else {
    //   await fetch(`/admin/students/bulk-status`, { method: "PATCH", body: JSON.stringify(...) })
    // }

    setStudents((prev) =>
      prev.map((item) => {
        if (!statusTargetIds.includes(item.id)) return item
        const nextHistory = [
          ...item.statusHistory,
          {
            id: `sh-${Date.now()}-${item.id}`,
            oldStatus: item.status,
            newStatus: statusForm.status,
            date: statusForm.effectiveDate,
            changedBy: "Admin (Demo)",
            reason: statusForm.reason || undefined,
          },
        ]
        return {
          ...item,
          status: statusForm.status,
          statusHistory: nextHistory,
        }
      })
    )

    toast.success(
      statusTargetIds.length === 1
        ? "Status updated"
        : `${statusTargetIds.length} students updated`
    )

    setStatusDialogOpen(false)
    setStatusTargetIds([])
  }

  const openPromoteDialogFor = (ids: string[]) => {
    if (ids.length === 0) return
    setPromoteTargetIds(ids)
    setPromotionForm({ toClassId: "", toBatchId: "", note: "" })
    setPromoteDialogOpen(true)
  }

  const promoteTargetBatches: BatchOption[] = ((batchesQuery.data ?? BATCHES) as BatchOption[]).filter(
    (item) => item.classId === promotionForm.toClassId
  )

  const applyPromotion = () => {
    if (!promotionForm.toClassId || !promotionForm.toBatchId) {
      toast.error("Select destination class and batch")
      return
    }

    const nextClass = CLASSES.find((item) => item.id === promotionForm.toClassId)
    const nextBatch = BATCHES.find((item) => item.id === promotionForm.toBatchId)
    if (!nextClass || !nextBatch) return

    // API implementation intentionally commented for frontend-only flow.
    // if (promoteTargetIds.length === 1) {
    //   await fetch(`/admin/students/${promoteTargetIds[0]}/promote`, { method: "POST", body: JSON.stringify(...) })
    // } else {
    //   await fetch(`/admin/students/bulk-promote`, { method: "POST", body: JSON.stringify(...) })
    // }

    setStudents((prev) =>
      prev.map((item) => {
        if (!promoteTargetIds.includes(item.id)) return item
        return {
          ...item,
          classId: nextClass.id,
          className: nextClass.name,
          batchId: nextBatch.id,
          batchName: nextBatch.name,
          promotionHistory: [
            ...item.promotionHistory,
            {
              id: `ph-${Date.now()}-${item.id}`,
              fromClass: item.className,
              fromBatch: item.batchName,
              toClass: nextClass.name,
              toBatch: nextBatch.name,
              date: todayIsoDate(),
              doneBy: "Admin (Demo)",
            },
          ],
        }
      })
    )

    toast.success(
      promoteTargetIds.length === 1 ? "Student promoted successfully" : `${promoteTargetIds.length} students promoted`
    )

    setPromoteDialogOpen(false)
    setPromoteTargetIds([])
  }

  const quickResetPassword = (student: Student) => {
    // API implementation intentionally commented for frontend-only flow.
    // await fetch(`/admin/students/${student.id}/reset-password`, { method: "POST", ... })
    toast.success(`Password reset link prepared for ${student.name}`)
  }

  const quickSendLoginLink = (student: Student) => {
    // API implementation intentionally commented for frontend-only flow.
    // await fetch(`/admin/students/${student.id}/send-login-link`, { method: "POST" })
    toast.success(`Login link sent to ${student.loginIdentifier}`)
  }

  return (
    <div className="adm-root space-y-4">
      <div className="adm-topbar">
        <div className="adm-topbar-left">
          <h1>Student Management</h1>
          <p>Manage and monitor all students with shareable filter links and quick actions</p>
        </div>
      </div>

      <div className="adm-stats">
        {statsQuery.isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="adm-stat">
              <Skeleton className="h-[88px]" />
            </div>
          ))
        ) : (
          <>
            <div className="adm-stat">
              <div className="adm-stat-icon" style={{ background: "#e0e7ff" }}>👥</div>
              <div className="adm-stat-val">{statsQuery.data?.total ?? 0}</div>
              <div className="adm-stat-label">Total Students</div>
              <div className="adm-stat-corner" style={{ background: "#6366f1" }} />
            </div>
            <div className="adm-stat">
              <div className="adm-stat-icon" style={{ background: "#dcfce7" }}>✓</div>
              <div className="adm-stat-val">{statsQuery.data?.active ?? 0}</div>
              <div className="adm-stat-label">Active Students</div>
              <div className="adm-stat-corner" style={{ background: "#10b981" }} />
            </div>
            <div className="adm-stat">
              <div className="adm-stat-icon" style={{ background: "#fef3c7" }}>⊝</div>
              <div className="adm-stat-val">{statsQuery.data?.inactive ?? 0}</div>
              <div className="adm-stat-label">Inactive Students</div>
              <div className="adm-stat-corner" style={{ background: "#f59e0b" }} />
            </div>
            <div className="adm-stat">
              <div className="adm-stat-icon" style={{ background: "#fee2e2" }}>✦</div>
              <div className="adm-stat-val">{statsQuery.data?.newThisMonth ?? 0}</div>
              <div className="adm-stat-label">New This Month</div>
              <div className="adm-stat-corner" style={{ background: "#ef4444" }} />
            </div>
          </>
        )}
      </div>

      <div className="adm-card">
        <div className="adm-card-header">
          <span className="adm-card-title">All Students</span>
        </div>
        <div className="space-y-3 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[260px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Search by name, phone, student ID"
                className="pl-9"
              />
            </div>

            <Select
              value={classId}
              onValueChange={(value) => updateQuery({ classId: value, batchId: "all", page: 1 })}
              className="w-[170px]"
            >
              <option value="all">All Classes</option>
              {classes.map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </Select>

            <Select
              value={batchId}
              onValueChange={(value) => updateQuery({ batchId: value, page: 1 })}
              className="w-[170px]"
            >
              <option value="all">All Batches</option>
              {batchOptions.map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </Select>

            <Select
              value={status}
              onValueChange={(value) => updateQuery({ status: value, page: 1 })}
              className="w-[170px]"
            >
              {STATUSES.map((item) => (
                <option key={item} value={item}>{item === "all" ? "All Status" : item}</option>
              ))}
            </Select>

            <Button variant="outline" onClick={() => setColumnDialogOpen(true)}>
              Columns
            </Button>

            <Button variant="ghost" onClick={resetFilters}>
              <X className="mr-1 size-4" /> Reset filters
            </Button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">{total} students found</p>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => downloadFile("xlsx")}>
                <Download className="mr-1 size-4" /> Export Excel
              </Button>
              <Button variant="outline" onClick={() => downloadFile("pdf")}>
                <FileText className="mr-1 size-4" /> Export PDF
              </Button>
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <input
                      type="checkbox"
                      checked={allCheckedOnPage}
                      onChange={(event) => {
                        if (event.target.checked) {
                          const next = new Set(selectedIds)
                          rows.forEach((row) => next.add(row.id))
                          setSelectedIds(Array.from(next))
                        } else {
                          setSelectedIds((prev) => prev.filter((id) => !rows.some((row) => row.id === id)))
                        }
                      }}
                    />
                  </TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead className={columnClassName("studentId")}>Student ID</TableHead>
                  <TableHead className={columnClassName("classBatch")}>Class / Batch</TableHead>
                  <TableHead className={columnClassName("phone")}>Phone</TableHead>
                  <TableHead className={columnClassName("parentPhone")}>Parent Phone</TableHead>
                  <TableHead className={columnClassName("enrolledOn")}>Enrolled On</TableHead>
                  <TableHead className={columnClassName("status")}>Status</TableHead>
                  <TableHead className="w-[60px]">Actions</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {listQuery.isLoading ? (
                  Array.from({ length: 8 }).map((_, index) => (
                    <TableRow key={`sk-${index}`}>
                      {Array.from({ length: 9 }).map((__, cell) => (
                        <TableCell key={cell}><Skeleton className="h-5 w-full" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9}>
                      <div className="flex flex-col items-center gap-3 py-10 text-center">
                        <Users className="size-10 text-muted-foreground" />
                        <div>
                          <p className="font-medium">No students found</p>
                          <p className="text-sm text-muted-foreground">Try adjusting filters or reset everything.</p>
                        </div>
                        <Button variant="outline" onClick={resetFilters}>Reset filters</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((row) => {
                    const classItem = getClassById(row.classId)
                    const selected = selectedIds.includes(row.id)
                    return (
                      <TableRow
                        key={row.id}
                        className="cursor-pointer"
                        onClick={() => setQuickViewId(row.id)}
                      >
                        <TableCell onClick={(event) => event.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={(event) => {
                              if (event.target.checked) {
                                setSelectedIds((prev) => Array.from(new Set([...prev, row.id])))
                              } else {
                                setSelectedIds((prev) => prev.filter((id) => id !== row.id))
                              }
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className={`flex size-8 items-center justify-center rounded-full text-xs font-semibold ${classItem?.color ?? "bg-slate-100 text-slate-700"}`}>
                              {getInitials(row.name)}
                            </div>
                            <span className="font-medium">{row.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className={columnClassName("studentId")}>{row.studentId}</TableCell>
                        <TableCell className={columnClassName("classBatch")}>{row.className} / {row.batchName}</TableCell>
                        <TableCell className={columnClassName("phone")}>{row.phone}</TableCell>
                        <TableCell className={columnClassName("parentPhone")}>{row.parentPhone}</TableCell>
                        <TableCell className={columnClassName("enrolledOn")}>{formatDate(row.enrolledOn)}</TableCell>
                        <TableCell className={columnClassName("status")}>
                          <Badge variant={getStatusBadgeVariant(row.status)}>{row.status}</Badge>
                        </TableCell>
                        <TableCell onClick={(event) => event.stopPropagation()}>
                          <Button asChild variant="ghost" size="icon-sm">
                            <Link href={`/dashboard/students/${row.id}`}>
                              <Eye className="size-4" />
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Rows per page</span>
              <Select value={String(limit)} className="w-[90px]" onValueChange={(value) => updateQuery({ limit: value, page: 1 })}>
                {LIMITS.map((item) => (
                  <option key={item} value={String(item)}>{item}</option>
                ))}
              </Select>
              {listQuery.isFetching ? <Loader2 className="size-4 animate-spin" /> : null}
            </div>

            <Pagination className="mx-0 w-auto justify-end">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href="#"
                    onClick={(event) => {
                      event.preventDefault()
                      if (currentPage > 1) updateQuery({ page: currentPage - 1 })
                    }}
                  />
                </PaginationItem>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map((item) => (
                  <PaginationItem key={item}>
                    <PaginationLink
                      href="#"
                      isActive={currentPage === item}
                      onClick={(event) => {
                        event.preventDefault()
                        updateQuery({ page: item })
                      }}
                    >
                      {item}
                    </PaginationLink>
                  </PaginationItem>
                ))}

                <PaginationItem>
                  <PaginationNext
                    href="#"
                    onClick={(event) => {
                      event.preventDefault()
                      if (currentPage < totalPages) updateQuery({ page: currentPage + 1 })
                    }}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        </div>
      </div>

      <div className={`fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 p-3 backdrop-blur transition-transform duration-300 ${selectedIds.length > 0 ? "translate-y-0" : "translate-y-full"}`}>
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-2">
          <p className="text-sm">{selectedIds.length} students selected</p>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => openStatusDialogFor(selectedIds)}>
              <ArrowUpDown className="mr-1 size-4" /> Change Status
            </Button>
            <Button variant="outline" size="sm" onClick={() => openPromoteDialogFor(selectedIds)}>
              Promote Batch
            </Button>
            <Button variant="destructive" size="sm" onClick={() => setSelectedIds([])}>
              Deselect All
            </Button>
          </div>
        </div>
      </div>

      <Sheet open={!!quickViewId} onOpenChange={(open) => !open && setQuickViewId(null)}>
        <SheetContent side="right" className="w-full sm:max-w-[480px]">
          <SheetHeader>
            <SheetTitle>Quick Student View</SheetTitle>
            <SheetDescription>Lightweight preview without leaving list page</SheetDescription>
          </SheetHeader>

          {summaryQuery.isLoading ? (
            <div className="space-y-3 p-4">
              <Skeleton className="h-14" />
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
            </div>
          ) : !summaryQuery.data ? (
            <div className="p-4"><Alert><AlertTitle>No data</AlertTitle><AlertDescription>Student summary is not available.</AlertDescription></Alert></div>
          ) : (
            <div className="space-y-4 overflow-y-auto p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                    {getInitials(summaryQuery.data.student.name)}
                  </div>
                  <div>
                    <p className="font-medium">{summaryQuery.data.student.name}</p>
                    <Badge variant={getStatusBadgeVariant(summaryQuery.data.student.status)}>{summaryQuery.data.student.status}</Badge>
                  </div>
                </div>
                <Button asChild variant="outline" size="sm">
                  <Link href={`/dashboard/students/${summaryQuery.data.student.id}`}>View Full Profile</Link>
                </Button>
              </div>

              <Card>
                <CardContent className="grid grid-cols-2 gap-3 p-3 text-sm">
                  <div><p className="text-muted-foreground">Student ID</p><p>{summaryQuery.data.student.studentId}</p></div>
                  <div><p className="text-muted-foreground">Class / Batch</p><p>{summaryQuery.data.student.className} / {summaryQuery.data.student.batchName}</p></div>
                  <div><p className="text-muted-foreground">Phone</p><p>{summaryQuery.data.student.phone}</p></div>
                  <div><p className="text-muted-foreground">Parent Phone</p><p>{summaryQuery.data.student.parentPhone}</p></div>
                  <div><p className="text-muted-foreground">Gender</p><p>{summaryQuery.data.student.gender}</p></div>
                  <div><p className="text-muted-foreground">Date of Birth</p><p>{formatDate(summaryQuery.data.student.dob)}</p></div>
                  <div><p className="text-muted-foreground">Enrolled</p><p>{formatDate(summaryQuery.data.student.enrolledOn)}</p></div>
                  <div><p className="text-muted-foreground">Session</p><p>{summaryQuery.data.student.session}</p></div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="space-y-2 p-3 text-sm">
                  <p className="font-medium">Parent Info</p>
                  <p><span className="text-muted-foreground">Father:</span> {summaryQuery.data.student.fatherName}</p>
                  <p><span className="text-muted-foreground">Mother:</span> {summaryQuery.data.student.motherName}</p>
                  <p><span className="text-muted-foreground">NID:</span> {summaryQuery.data.student.parentNid ?? "-"}</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="space-y-2 p-3 text-sm">
                  <p className="font-medium">Recent Attendance</p>
                  <p className="text-muted-foreground">This month: Present {summaryQuery.data.attendanceSummary.present} | Absent {summaryQuery.data.attendanceSummary.absent} | Late {summaryQuery.data.attendanceSummary.late}</p>
                  <div className="flex gap-1">
                    {summaryQuery.data.recentDays.map((item) => (
                      <div key={item.date} className={`size-5 rounded-full ${attendanceColor(item.status)}`} title={`${item.date} - ${item.status}`} />
                    ))}
                  </div>
                  <Button asChild variant="link" className="px-0">
                    <Link href={`/dashboard/students/${summaryQuery.data.student.id}?tab=attendance`}>View full attendance</Link>
                  </Button>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 gap-2">
                <Button variant="outline" size="sm" onClick={() => quickResetPassword(summaryQuery.data!.student)}>Reset Password</Button>
                <Button variant="outline" size="sm" onClick={() => quickSendLoginLink(summaryQuery.data!.student)}>Send Login Link</Button>
                <Button variant="outline" size="sm" onClick={() => openStatusDialogFor([summaryQuery.data!.student.id])}>Change Status</Button>
                <Button variant="outline" size="sm" onClick={() => openPromoteDialogFor([summaryQuery.data!.student.id])}>Promote Batch</Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {statusTargetIds.length === 1 ? "Change Student Status" : `Change Status for ${statusTargetIds.length} Students`}
            </DialogTitle>
            <DialogDescription>
              {statusTargetIds.length === 1 ? "Update this student's current status." : "Update all selected students together."}
            </DialogDescription>
          </DialogHeader>

          {statusTargetIds.length > 1 ? (
            <div className="max-h-32 overflow-y-auto rounded-md border p-2 text-sm">
              {selectedStudents.map((item) => (
                <p key={item.id}>{item.name}</p>
              ))}
            </div>
          ) : null}

          <RadioGroup value={statusForm.status} onValueChange={(value) => setStatusForm((prev) => ({ ...prev, status: value as StudentStatus }))}>
            <RadioGroupItem id="st-active" value="Active">Active - Currently enrolled and attending</RadioGroupItem>
            <RadioGroupItem id="st-inactive" value="Inactive">Inactive - Temporarily inactive</RadioGroupItem>
            <RadioGroupItem id="st-transferred" value="Transferred">Transferred - Moved to another institution</RadioGroupItem>
            <RadioGroupItem id="st-passed" value="Passed Out">Passed Out - Completed studies</RadioGroupItem>
            <RadioGroupItem id="st-dropped" value="Dropped">Dropped - Left without completing</RadioGroupItem>
          </RadioGroup>

          <Textarea
            value={statusForm.reason}
            onChange={(event) => setStatusForm((prev) => ({ ...prev, reason: event.target.value }))}
            placeholder="Reason for status change (optional)"
          />
          <Input
            type="date"
            value={statusForm.effectiveDate}
            onChange={(event) => setStatusForm((prev) => ({ ...prev, effectiveDate: event.target.value }))}
          />

          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusDialogOpen(false)}>Cancel</Button>
            <Button onClick={applyStatusUpdate}>Update Status</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={columnDialogOpen} onOpenChange={setColumnDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Column Controls</DialogTitle>
            <DialogDescription>Choose which columns stay visible. Smaller screens will still prioritize compact layout.</DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {COLUMN_OPTIONS.map((column) => (
              <label key={column.key} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
                <span>{column.label}</span>
                <input
                  type="checkbox"
                  checked={visibleColumns[column.key]}
                  onChange={() => toggleColumn(column.key)}
                />
              </label>
            ))}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setVisibleColumns({
                  studentId: true,
                  classBatch: true,
                  phone: true,
                  parentPhone: true,
                  enrolledOn: true,
                  status: true,
                })
              }
            >
              Reset Columns
            </Button>
            <Button onClick={() => setColumnDialogOpen(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={promoteDialogOpen} onOpenChange={setPromoteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{promoteTargetIds.length === 1 ? "Promote Student" : `Promote ${promoteTargetIds.length} Students`}</DialogTitle>
            <DialogDescription>Select destination class and batch.</DialogDescription>
          </DialogHeader>

          <Select
            value={promotionForm.toClassId}
            onValueChange={(value) => setPromotionForm((prev) => ({ ...prev, toClassId: value, toBatchId: "" }))}
          >
            <option value="">Promote to Class</option>
            {CLASSES.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </Select>

          <Select
            value={promotionForm.toBatchId}
            disabled={!promotionForm.toClassId}
            onValueChange={(value) => setPromotionForm((prev) => ({ ...prev, toBatchId: value }))}
          >
            <option value="">Select Batch</option>
            {promoteTargetBatches.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </Select>

          <Input
            value={promotionForm.note}
            onChange={(event) => setPromotionForm((prev) => ({ ...prev, note: event.target.value }))}
            placeholder="Promotion note (optional)"
          />

          <DialogFooter>
            <Button variant="outline" onClick={() => setPromoteDialogOpen(false)}>Cancel</Button>
            <Button onClick={applyPromotion}>Promote</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
