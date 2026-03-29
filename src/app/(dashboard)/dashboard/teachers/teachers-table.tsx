"use client"

import { useEffect, useMemo, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { Download, Eye, FileText, Pencil, Plus, Search, Users, X, ArrowUpDown, Loader2 } from "lucide-react"
import toast from "react-hot-toast"

import { useAuth } from "@/context/AuthContext"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select } from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
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

type TeacherStatus = "Active" | "On Leave" | "Resigned" | "Terminated" | "Retired"

type Teacher = {
  id: string
  teacherId: string
  fullName: string
  phone: string
  email: string
  department: "Science" | "Commerce" | "Arts" | "General"
  subjects: string[]
  shift: "Morning" | "Day" | "Evening"
  designation: string
  joinedOn: string
  status: TeacherStatus
  employmentType: "Full-time" | "Part-time" | "Guest"
  salary: number
  classes: string[]
}

const DEPARTMENTS = ["Science", "Commerce", "Arts", "General"] as const
const SHIFTS = ["Morning", "Day", "Evening"] as const
const STATUSES = ["Active", "On Leave", "Resigned", "Terminated", "Retired"] as const
const PAGE_SIZES = [10, 20, 50]

const SUBJECT_OPTIONS: Record<string, string[]> = {
  Science: ["Physics", "Chemistry", "Biology", "Math"],
  Commerce: ["Accounting", "Finance", "Business Studies", "Economics"],
  Arts: ["Bangla", "English", "History", "Civics"],
  General: ["ICT", "General Math", "General Science", "Religion"],
}

const DUMMY_TEACHERS: Teacher[] = [
  { id: "t-001", teacherId: "TR-1001", fullName: "Nabila Islam", phone: "01710101010", email: "nabila.islam@example.com", department: "Science", subjects: ["Physics", "Math", "Chemistry"], shift: "Morning", designation: "Senior Teacher", joinedOn: "2023-01-12", status: "Active", employmentType: "Full-time", salary: 42000, classes: ["Class 9 A", "Class 10 A"] },
  { id: "t-002", teacherId: "TR-1002", fullName: "Fahim Karim", phone: "01820202020", email: "fahim.karim@example.com", department: "Commerce", subjects: ["Accounting", "Finance"], shift: "Day", designation: "Assistant Teacher", joinedOn: "2022-09-05", status: "Active", employmentType: "Full-time", salary: 36000, classes: ["Class 11 Commerce"] },
  { id: "t-003", teacherId: "TR-1003", fullName: "Sadia Noor", phone: "01930303030", email: "sadia.noor@example.com", department: "Arts", subjects: ["English", "History"], shift: "Morning", designation: "Lecturer", joinedOn: "2021-04-17", status: "On Leave", employmentType: "Part-time", salary: 33000, classes: ["Class 10 Arts"] },
  { id: "t-004", teacherId: "TR-1004", fullName: "Raihan Ahmed", phone: "01640404040", email: "raihan.ahmed@example.com", department: "Science", subjects: ["Chemistry", "Biology"], shift: "Evening", designation: "Assistant Teacher", joinedOn: "2024-06-19", status: "Active", employmentType: "Full-time", salary: 39000, classes: ["Class 8 B"] },
  { id: "t-005", teacherId: "TR-1005", fullName: "Mitu Akter", phone: "01750505050", email: "mitu.akter@example.com", department: "General", subjects: ["ICT", "General Math"], shift: "Day", designation: "Head Teacher", joinedOn: "2020-11-01", status: "Retired", employmentType: "Guest", salary: 30000, classes: [] },
  { id: "t-006", teacherId: "TR-1006", fullName: "Hasan Mahmud", phone: "01860606060", email: "hasan.mahmud@example.com", department: "Arts", subjects: ["Bangla", "Civics"], shift: "Morning", designation: "Senior Teacher", joinedOn: "2022-03-09", status: "Resigned", employmentType: "Full-time", salary: 37000, classes: ["Class 7 A", "Class 8 A"] },
  { id: "t-007", teacherId: "TR-1007", fullName: "Tanima Sultana", phone: "01970707070", email: "tanima.sultana@example.com", department: "Science", subjects: ["Biology"], shift: "Morning", designation: "Assistant Teacher", joinedOn: "2026-03-10", status: "Active", employmentType: "Part-time", salary: 28000, classes: ["Class 6 C"] },
  { id: "t-008", teacherId: "TR-1008", fullName: "Shafiq Rahman", phone: "01680808080", email: "shafiq.rahman@example.com", department: "Commerce", subjects: ["Business Studies", "Economics"], shift: "Day", designation: "Senior Teacher", joinedOn: "2021-08-20", status: "Terminated", employmentType: "Full-time", salary: 41000, classes: ["Class 12 Commerce"] },
]

function useDebouncedValue(value: string, delay = 400) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}

function statusVariant(status: TeacherStatus) {
  if (status === "Active") return "default"
  if (status === "On Leave") return "warning"
  if (status === "Resigned") return "muted"
  if (status === "Retired") return "info"
  return "destructive"
}

function departmentTone(department: Teacher["department"]) {
  if (department === "Science") return "bg-blue-100 text-blue-700"
  if (department === "Commerce") return "bg-emerald-100 text-emerald-700"
  if (department === "Arts") return "bg-amber-100 text-amber-700"
  return "bg-violet-100 text-violet-700"
}

function initials(name: string) {
  const parts = name.split(" ").filter(Boolean)
  return `${parts[0]?.[0] ?? "T"}${parts[1]?.[0] ?? ""}`.toUpperCase()
}

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "-"
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(date)
}

function currentIsoDate() {
  return new Date().toISOString().split("T")[0]
}

export default function TeachersTable() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { user } = useAuth()

  const [teachers, setTeachers] = useState<Teacher[]>(DUMMY_TEACHERS)
  const [searchInput, setSearchInput] = useState(searchParams.get("search") ?? "")
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [drawerTeacherId, setDrawerTeacherId] = useState<string | null>(null)

  const [statusDialogOpen, setStatusDialogOpen] = useState(false)
  const [statusForm, setStatusForm] = useState<{ status: TeacherStatus; reason: string; effectiveDate: string }>({
    status: "Active",
    reason: "",
    effectiveDate: currentIsoDate(),
  })

  const [addEditDialogOpen, setAddEditDialogOpen] = useState(false)
  const [editingTeacherId, setEditingTeacherId] = useState<string | null>(null)
  const [formValues, setFormValues] = useState({
    fullName: "",
    phone: "",
    email: "",
    department: "Science",
    shift: "Morning",
    designation: "Assistant Teacher",
    status: "Active" as TeacherStatus,
  })

  // Guard implementation intentionally commented for frontend-only flow.
  // const isAdmin = useMemo(() => {
  //   if (!user) return false
  //   const role = String((user as any)?.role ?? "").toLowerCase()
  //   return role === "admin" || role === "rektor"
  // }, [user])
  //
  // useEffect(() => {
  //   if (!isAdmin) router.push("/dashboard")
  // }, [isAdmin, router])

  const tenantId = useMemo(() => {
    return (user as any)?.tenant_id ?? (user as any)?.tenantId ?? (user as any)?.tenant?.id ?? "demo-tenant"
  }, [user])

  const department = searchParams.get("department") ?? "all"
  const subject = searchParams.get("subject") ?? "all"
  const shift = searchParams.get("shift") ?? "all"
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
      const remove = asString.length === 0 || asString === "all"
      if (remove) params.delete(key)
      else params.set(key, asString)
    })

    const qs = params.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname)
  }

  useEffect(() => {
    updateQuery({ search: debouncedSearch, page: 1 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch])

  const subjectsByDepartment = useMemo(() => {
    if (department === "all") return Array.from(new Set(Object.values(SUBJECT_OPTIONS).flat()))
    return SUBJECT_OPTIONS[department] ?? []
  }, [department])

  const listQuery = useQuery({
    queryKey: ["teachers-list", tenantId, teachers, debouncedSearch, department, subject, shift, status, page, limit],
    queryFn: async () => {
      // API implementation intentionally commented for frontend-only flow.
      // const params = new URLSearchParams({ tenant_id: String(tenantId) })
      // if (debouncedSearch) params.set("search", debouncedSearch)
      // if (department !== "all") params.set("department", department)
      // if (subject !== "all") params.set("subject", subject)
      // if (shift !== "all") params.set("shift", shift)
      // if (status !== "all") params.set("status", status)
      // params.set("page", String(page))
      // params.set("limit", String(limit))
      // const res = await fetch(`/api/teachers?${params.toString()}`, { cache: "no-store" })
      // if (!res.ok) throw new Error("Failed to load teachers")
      // return await res.json()

      await new Promise((resolve) => setTimeout(resolve, 180))

      const q = debouncedSearch.trim().toLowerCase()
      const filtered = teachers.filter((item) => {
        const searchMatch =
          q.length === 0 ||
          item.fullName.toLowerCase().includes(q) ||
          item.phone.toLowerCase().includes(q) ||
          item.teacherId.toLowerCase().includes(q)

        const depMatch = department === "all" || item.department === department
        const subjMatch = subject === "all" || item.subjects.includes(subject)
        const shiftMatch = shift === "all" || item.shift === shift
        const statusMatch = status === "all" || item.status === status

        return searchMatch && depMatch && subjMatch && shiftMatch && statusMatch
      })

      const total = filtered.length
      const totalPages = Math.max(1, Math.ceil(total / limit))
      const safePage = Math.min(page, totalPages)
      const start = (safePage - 1) * limit
      const items = filtered.slice(start, start + limit)

      return { items, total, totalPages, page: safePage, all: filtered }
    },
    placeholderData: (previous) => previous,
  })

  const statsQuery = useQuery({
    queryKey: ["teachers-stats", tenantId, teachers],
    queryFn: async () => {
      // API implementation intentionally commented for frontend-only flow.
      // const res = await fetch(`/api/teachers/stats?tenant_id=${tenantId}`, { cache: "no-store" })
      // if (!res.ok) throw new Error("Failed to load stats")
      // return await res.json()

      await new Promise((resolve) => setTimeout(resolve, 160))

      const now = new Date()
      const month = now.getMonth()
      const year = now.getFullYear()

      return {
        total: teachers.length,
        active: teachers.filter((item) => item.status === "Active").length,
        onLeave: teachers.filter((item) => item.status === "On Leave").length,
        joinedThisMonth: teachers.filter((item) => {
          const joined = new Date(item.joinedOn)
          return joined.getMonth() === month && joined.getFullYear() === year
        }).length,
      }
    },
  })

  const summaryQuery = useQuery({
    queryKey: ["teacher-summary", tenantId, drawerTeacherId, teachers],
    enabled: !!drawerTeacherId,
    queryFn: async () => {
      // API implementation intentionally commented for frontend-only flow.
      // const res = await fetch(`/api/teachers/${drawerTeacherId}/summary?tenant_id=${tenantId}`)
      // if (!res.ok) throw new Error("Failed to load teacher summary")
      // return await res.json()

      await new Promise((resolve) => setTimeout(resolve, 120))
      const teacher = teachers.find((item) => item.id === drawerTeacherId)
      if (!teacher) return null
      return {
        teacher,
        monthSummary: { present: 21, absent: 2, onLeave: 1 },
      }
    },
  })

  const rows = listQuery.data?.items ?? []
  const total = listQuery.data?.total ?? 0
  const totalPages = listQuery.data?.totalPages ?? 1
  const safePage = listQuery.data?.page ?? 1

  const allCheckedOnPage = rows.length > 0 && rows.every((row) => selectedIds.includes(row.id))

  const resetFilters = () => {
    setSearchInput("")
    setSelectedIds([])
    router.replace(pathname)
  }

  const exportTeachers = (format: "xlsx" | "pdf", onlySelected = false) => {
    const source =
      onlySelected
        ? (listQuery.data?.all ?? []).filter((item) => selectedIds.includes(item.id))
        : listQuery.data?.all ?? []

    // API implementation intentionally commented for frontend-only flow.
    // const params = new URLSearchParams({ tenant_id: String(tenantId), format })
    // if (onlySelected) params.set("teacher_ids", selectedIds.join(","))
    // ...append filters
    // const res = await fetch(`/api/teachers/export?${params.toString()}`)
    // const blob = await res.blob()

    const content =
      format === "xlsx"
        ? [
            "Teacher ID,Name,Department,Shift,Phone,Status",
            ...source.map((item) => `${item.teacherId},${item.fullName},${item.department},${item.shift},${item.phone},${item.status}`),
          ].join("\n")
        : `Teacher report (${onlySelected ? "selected" : "all"})\nTotal: ${source.length}`

    const blob = new Blob([content], { type: format === "xlsx" ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" : "application/pdf" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = onlySelected ? `teachers-selected.${format}` : `teachers.${format}`
    a.click()
    URL.revokeObjectURL(url)
  }

  const openAddTeacher = () => {
    setEditingTeacherId(null)
    setFormValues({
      fullName: "",
      phone: "",
      email: "",
      department: "Science",
      shift: "Morning",
      designation: "Assistant Teacher",
      status: "Active",
    })
    setAddEditDialogOpen(true)
  }

  const openEditTeacher = (teacher: Teacher) => {
    setEditingTeacherId(teacher.id)
    setFormValues({
      fullName: teacher.fullName,
      phone: teacher.phone,
      email: teacher.email,
      department: teacher.department,
      shift: teacher.shift,
      designation: teacher.designation,
      status: teacher.status,
    })
    setAddEditDialogOpen(true)
  }

  const submitTeacherForm = () => {
    if (!formValues.fullName.trim() || !formValues.phone.trim()) {
      toast.error("Name and phone are required")
      return
    }

    if (editingTeacherId) {
      // API implementation intentionally commented for frontend-only flow.
      // const formData = new FormData()
      // ...append fields and tenant_id
      // await fetch(`/api/teachers/${editingTeacherId}`, { method: "PUT", body: formData })

      setTeachers((prev) =>
        prev.map((item) =>
          item.id === editingTeacherId
            ? {
                ...item,
                fullName: formValues.fullName,
                phone: formValues.phone,
                email: formValues.email,
                department: formValues.department as Teacher["department"],
                shift: formValues.shift as Teacher["shift"],
                designation: formValues.designation,
                status: formValues.status,
              }
            : item
        )
      )

      toast.success("Teacher updated successfully")
    } else {
      const nextId = `t-${Date.now()}`

      // API implementation intentionally commented for frontend-only flow.
      // const formData = new FormData()
      // ...append fields and tenant_id
      // await fetch(`/api/teachers`, { method: "POST", body: formData })

      setTeachers((prev) => [
        {
          id: nextId,
          teacherId: `TR-${Math.floor(Math.random() * 9000) + 1000}`,
          fullName: formValues.fullName,
          phone: formValues.phone,
          email: formValues.email,
          department: formValues.department as Teacher["department"],
          subjects: SUBJECT_OPTIONS[formValues.department]?.slice(0, 2) ?? ["General"],
          shift: formValues.shift as Teacher["shift"],
          designation: formValues.designation,
          joinedOn: currentIsoDate(),
          status: formValues.status,
          employmentType: "Full-time",
          salary: 35000,
          classes: [],
        },
        ...prev,
      ])

      toast.success("Teacher added successfully")
    }

    setAddEditDialogOpen(false)
  }

  const openBulkStatusDialog = () => {
    setStatusForm({ status: "Active", reason: "", effectiveDate: currentIsoDate() })
    setStatusDialogOpen(true)
  }

  const applyBulkStatusChange = () => {
    // API implementation intentionally commented for frontend-only flow.
    // await fetch(`/api/teachers/bulk-status`, {
    //   method: "PATCH",
    //   headers: { "Content-Type": "application/json" },
    //   body: JSON.stringify({
    //     teacherIds: selectedIds,
    //     status: statusForm.status,
    //     reason: statusForm.reason,
    //     effective_date: statusForm.effectiveDate,
    //     tenant_id: tenantId,
    //   }),
    // })

    setTeachers((prev) => prev.map((item) => (selectedIds.includes(item.id) ? { ...item, status: statusForm.status } : item)))
    setSelectedIds([])
    setStatusDialogOpen(false)
    toast.success("Teachers status updated")
  }

  return (
    <div className="adm-root space-y-4">
      <div className="adm-topbar">
        <div className="adm-topbar-left">
          <h1>Teacher Management</h1>
          <p>Manage and monitor all teachers with quick actions</p>
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
              <div className="adm-stat-icon" style={{ background: "#e0e7ff" }}>👩‍🏫</div>
              <div className="adm-stat-val">{statsQuery.data?.total ?? 0}</div>
              <div className="adm-stat-label">Total Teachers</div>
              <div className="adm-stat-corner" style={{ background: "#6366f1" }} />
            </div>
            <div className="adm-stat">
              <div className="adm-stat-icon" style={{ background: "#dcfce7" }}>✓</div>
              <div className="adm-stat-val">{statsQuery.data?.active ?? 0}</div>
              <div className="adm-stat-label">Active Teachers</div>
              <div className="adm-stat-corner" style={{ background: "#10b981" }} />
            </div>
            <div className="adm-stat">
              <div className="adm-stat-icon" style={{ background: "#fef3c7" }}>⊝</div>
              <div className="adm-stat-val">{statsQuery.data?.onLeave ?? 0}</div>
              <div className="adm-stat-label">On Leave</div>
              <div className="adm-stat-corner" style={{ background: "#f59e0b" }} />
            </div>
            <div className="adm-stat">
              <div className="adm-stat-icon" style={{ background: "#fee2e2" }}>✦</div>
              <div className="adm-stat-val">{statsQuery.data?.joinedThisMonth ?? 0}</div>
              <div className="adm-stat-label">Joined This Month</div>
              <div className="adm-stat-corner" style={{ background: "#ef4444" }} />
            </div>
          </>
        )}
      </div>

      <div className="adm-card">
        <div className="adm-card-header">
          <span className="adm-card-title">All Teachers</span>
        </div>
        <div className="space-y-3 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[260px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Search by name, phone, teacher ID"
                className="pl-9"
              />
            </div>

            <Select value={department} onValueChange={(value) => updateQuery({ department: value, subject: "all", page: 1 })} className="w-40">
              <option value="all">All Departments</option>
              {DEPARTMENTS.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </Select>

            <Select value={subject} onValueChange={(value) => updateQuery({ subject: value, page: 1 })} className="w-40">
              <option value="all">All Subjects</option>
              {subjectsByDepartment.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </Select>

            <Select value={shift} onValueChange={(value) => updateQuery({ shift: value, page: 1 })} className="w-32">
              <option value="all">All Shift</option>
              {SHIFTS.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </Select>

            <Select value={status} onValueChange={(value) => updateQuery({ status: value, page: 1 })} className="w-36">
              <option value="all">All Status</option>
              {STATUSES.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </Select>

            <Button variant="ghost" onClick={resetFilters}>
              <X className="mr-1 size-4" /> Reset filters
            </Button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">{total} teachers found</p>
            <div className="flex items-center gap-2">
              <Button onClick={openAddTeacher}><Plus className="mr-1 size-4" /> Add Teacher</Button>
              <Button variant="outline" onClick={() => exportTeachers("xlsx")}><Download className="mr-1 size-4" /> Export Excel</Button>
              <Button variant="outline" onClick={() => exportTeachers("pdf")}><FileText className="mr-1 size-4" /> Export PDF</Button>
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
                      rows.forEach((item) => next.add(item.id))
                      setSelectedIds(Array.from(next))
                    } else {
                      setSelectedIds((prev) => prev.filter((id) => !rows.some((item) => item.id === id)))
                    }
                  }}
                />
              </TableHead>
              <TableHead>Teacher</TableHead>
              <TableHead>Teacher ID</TableHead>
              <TableHead>Department / Subject(s)</TableHead>
              <TableHead>Shift</TableHead>
              <TableHead>Designation</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Joined On</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[90px]">Actions</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {listQuery.isLoading ? (
              Array.from({ length: 8 }).map((_, index) => (
                <TableRow key={`sk-${index}`}>
                  {Array.from({ length: 10 }).map((__, cell) => (
                    <TableCell key={cell}><Skeleton className="h-5 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10}>
                  <div className="flex flex-col items-center gap-3 py-10 text-center">
                    <Users className="size-10 text-muted-foreground" />
                    <div>
                      <p className="font-medium">No teachers found</p>
                      <p className="text-sm text-muted-foreground">Try adjusting filters or reset everything.</p>
                    </div>
                    <Button variant="outline" onClick={resetFilters}>Reset filters</Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow
                  key={row.id}
                  className="cursor-pointer"
                  onClick={() => setDrawerTeacherId(row.id)}
                >
                  <TableCell onClick={(event) => event.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(row.id)}
                      onChange={(event) => {
                        if (event.target.checked) setSelectedIds((prev) => Array.from(new Set([...prev, row.id])))
                        else setSelectedIds((prev) => prev.filter((id) => id !== row.id))
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className={`flex size-8 items-center justify-center rounded-full text-xs font-semibold ${departmentTone(row.department)}`}>
                        {initials(row.fullName)}
                      </div>
                      <div>
                        <p className="font-medium">{row.fullName}</p>
                        <p className="text-xs text-muted-foreground">{row.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{row.teacherId}</TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <p>{row.department}</p>
                      <div className="flex flex-wrap gap-1">
                        {row.subjects.slice(0, 2).map((item) => (
                          <Badge key={item} variant="outline">{item}</Badge>
                        ))}
                        {row.subjects.length > 2 ? <Badge variant="outline">+{row.subjects.length - 2} more</Badge> : null}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{row.shift}</TableCell>
                  <TableCell>{row.designation}</TableCell>
                  <TableCell>{row.phone}</TableCell>
                  <TableCell>{formatDate(row.joinedOn)}</TableCell>
                  <TableCell><Badge variant={statusVariant(row.status)}>{row.status}</Badge></TableCell>
                  <TableCell onClick={(event) => event.stopPropagation()}>
                    <div className="flex items-center gap-1">
                      <Button asChild variant="ghost" size="icon-sm">
                        <a href={`/dashboard/teachers/${row.id}`}><Eye className="size-4" /></a>
                      </Button>
                      <Button variant="ghost" size="icon-sm" onClick={() => openEditTeacher(row)}>
                        <Pencil className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Rows per page</span>
          <Select value={String(limit)} onValueChange={(value) => updateQuery({ limit: value, page: 1 })} className="w-[90px]">
            {PAGE_SIZES.map((size) => (
              <option key={size} value={String(size)}>{size}</option>
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
                  if (safePage > 1) updateQuery({ page: safePage - 1 })
                }}
              />
            </PaginationItem>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <PaginationItem key={p}>
                <PaginationLink
                  href="#"
                  isActive={safePage === p}
                  onClick={(event) => {
                    event.preventDefault()
                    updateQuery({ page: p })
                  }}
                >
                  {p}
                </PaginationLink>
              </PaginationItem>
            ))}
            <PaginationItem>
              <PaginationNext
                href="#"
                onClick={(event) => {
                  event.preventDefault()
                  if (safePage < totalPages) updateQuery({ page: safePage + 1 })
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
          <p className="text-sm">{selectedIds.length} teachers selected</p>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={openBulkStatusDialog}>
              <ArrowUpDown className="mr-1 size-4" /> Change Status
            </Button>
            <Button variant="outline" size="sm" onClick={() => exportTeachers("xlsx", true)}>
              Export Selected
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setSelectedIds([])}>
              Deselect All
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Status for {selectedIds.length} Teachers</DialogTitle>
            <DialogDescription>Apply one status to all selected teachers.</DialogDescription>
          </DialogHeader>

          <RadioGroup value={statusForm.status} onValueChange={(value) => setStatusForm((prev) => ({ ...prev, status: value as TeacherStatus }))}>
            <RadioGroupItem id="status-active" value="Active">Active - Currently employed and working</RadioGroupItem>
            <RadioGroupItem id="status-leave" value="On Leave">On Leave - Temporarily on approved leave</RadioGroupItem>
            <RadioGroupItem id="status-resigned" value="Resigned">Resigned - Voluntarily left</RadioGroupItem>
            <RadioGroupItem id="status-terminated" value="Terminated">Terminated - Employment ended by institution</RadioGroupItem>
            <RadioGroupItem id="status-retired" value="Retired">Retired - Retired from service</RadioGroupItem>
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
            <Button onClick={applyBulkStatusChange}>Update Status</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={addEditDialogOpen} onOpenChange={setAddEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTeacherId ? "Edit Teacher" : "Add Teacher"}</DialogTitle>
            <DialogDescription>{editingTeacherId ? "Update teacher details" : "Create a new teacher profile"}</DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 md:grid-cols-2">
            <Input placeholder="Full name" value={formValues.fullName} onChange={(event) => setFormValues((prev) => ({ ...prev, fullName: event.target.value }))} />
            <Input placeholder="Phone" value={formValues.phone} onChange={(event) => setFormValues((prev) => ({ ...prev, phone: event.target.value }))} />
            <Input placeholder="Email" value={formValues.email} onChange={(event) => setFormValues((prev) => ({ ...prev, email: event.target.value }))} />
            <Input placeholder="Designation" value={formValues.designation} onChange={(event) => setFormValues((prev) => ({ ...prev, designation: event.target.value }))} />

            <Select value={formValues.department} onValueChange={(value) => setFormValues((prev) => ({ ...prev, department: value }))}>
              {DEPARTMENTS.map((item) => <option key={item} value={item}>{item}</option>)}
            </Select>

            <Select value={formValues.shift} onValueChange={(value) => setFormValues((prev) => ({ ...prev, shift: value }))}>
              {SHIFTS.map((item) => <option key={item} value={item}>{item}</option>)}
            </Select>

            <Select value={formValues.status} onValueChange={(value) => setFormValues((prev) => ({ ...prev, status: value as TeacherStatus }))}>
              {STATUSES.map((item) => <option key={item} value={item}>{item}</option>)}
            </Select>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={submitTeacherForm}>{editingTeacherId ? "Update" : "Add"} Teacher</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Sheet open={!!drawerTeacherId} onOpenChange={(open) => !open && setDrawerTeacherId(null)}>
        <SheetContent side="right" className="w-full sm:max-w-[480px]">
          <SheetHeader>
            <SheetTitle>Quick Teacher View</SheetTitle>
            <SheetDescription>Teacher summary without leaving the list page</SheetDescription>
          </SheetHeader>

          {summaryQuery.isLoading ? (
            <div className="space-y-3 p-4">
              <Skeleton className="h-16" />
              <Skeleton className="h-40" />
              <Skeleton className="h-28" />
            </div>
          ) : !summaryQuery.data ? (
            <div className="p-4 text-sm text-muted-foreground">Teacher summary not available.</div>
          ) : (
            <div className="space-y-4 overflow-y-auto p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`flex size-10 items-center justify-center rounded-full text-xs font-semibold ${departmentTone(summaryQuery.data.teacher.department)}`}>
                    {initials(summaryQuery.data.teacher.fullName)}
                  </div>
                  <div>
                    <p className="font-medium">{summaryQuery.data.teacher.fullName}</p>
                    <p className="text-sm text-muted-foreground">{summaryQuery.data.teacher.designation}</p>
                    <Badge variant={statusVariant(summaryQuery.data.teacher.status)}>{summaryQuery.data.teacher.status}</Badge>
                  </div>
                </div>
                <Button asChild variant="outline" size="sm">
                  <a href={`/dashboard/teachers/${summaryQuery.data.teacher.id}`}>View Full Profile</a>
                </Button>
              </div>

              <Card>
                <CardContent className="grid grid-cols-2 gap-3 p-3 text-sm">
                  <div><p className="text-muted-foreground">Teacher ID</p><p>{summaryQuery.data.teacher.teacherId}</p></div>
                  <div><p className="text-muted-foreground">Department</p><p>{summaryQuery.data.teacher.department}</p></div>
                  <div><p className="text-muted-foreground">Phone</p><p>{summaryQuery.data.teacher.phone}</p></div>
                  <div><p className="text-muted-foreground">Email</p><p>{summaryQuery.data.teacher.email}</p></div>
                  <div><p className="text-muted-foreground">Shift</p><p>{summaryQuery.data.teacher.shift}</p></div>
                  <div><p className="text-muted-foreground">Employment</p><p>{summaryQuery.data.teacher.employmentType}</p></div>
                  <div><p className="text-muted-foreground">Joined On</p><p>{formatDate(summaryQuery.data.teacher.joinedOn)}</p></div>
                  <div><p className="text-muted-foreground">Salary</p><p>BDT {summaryQuery.data.teacher.salary.toLocaleString()}</p></div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="space-y-2 p-3 text-sm">
                  <p className="font-medium">Classes & Subjects</p>
                  {summaryQuery.data.teacher.classes.length === 0 ? (
                    <p className="text-muted-foreground">Not assigned to any class</p>
                  ) : (
                    summaryQuery.data.teacher.classes.map((item) => (
                      <div key={item} className="rounded-md border p-2">{item}</div>
                    ))
                  )}
                  <div className="flex flex-wrap gap-1">
                    {summaryQuery.data.teacher.subjects.map((item) => <Badge key={item} variant="outline">{item}</Badge>)}
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-3 gap-2">
                <Card><CardContent className="p-3 text-center text-sm"><p className="text-lg font-semibold">{summaryQuery.data.monthSummary.present}</p><p className="text-muted-foreground">Present</p></CardContent></Card>
                <Card><CardContent className="p-3 text-center text-sm"><p className="text-lg font-semibold">{summaryQuery.data.monthSummary.absent}</p><p className="text-muted-foreground">Absent</p></CardContent></Card>
                <Card><CardContent className="p-3 text-center text-sm"><p className="text-lg font-semibold">{summaryQuery.data.monthSummary.onLeave}</p><p className="text-muted-foreground">On Leave</p></CardContent></Card>
              </div>

              <div className="grid grid-cols-1 gap-2">
                <Button variant="outline" size="sm" onClick={() => toast.success("Password reset flow is ready in frontend demo")}>Reset Password</Button>
                <Button variant="outline" size="sm" onClick={() => toast.success(`Login link sent to ${summaryQuery.data?.teacher.email}`)}>Send Login Link</Button>
                <Button variant="outline" size="sm" onClick={() => {
                  setSelectedIds([summaryQuery.data!.teacher.id])
                  openBulkStatusDialog()
                }}>Change Status</Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
