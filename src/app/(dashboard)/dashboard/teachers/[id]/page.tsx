"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import {
  ArrowLeft,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  Eye,
  Key,
  MoreHorizontal,
  Pencil,
  Plus,
  Shield,
  X,
} from "lucide-react"
import toast from "react-hot-toast"
import api from "@/lib/api"

import { useAuth } from "@/context/AuthContext"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table-primitive"
import { Textarea } from "@/components/ui/textarea"

type TeacherStatus = "Active" | "On Leave" | "Resigned" | "Terminated" | "Retired"
type LeaveStatus = "Approved" | "Rejected" | "Pending"

type ApiTeacherGender = "MALE" | "FEMALE" | "OTHER"

type TeacherProfile = {
  id: string
  teacherId: string
  name: string
  designation: string
  department: string
  employmentType: "Full-time" | "Part-time" | "Guest"
  status: TeacherStatus
  phone: string
  email: string
  dob: string
  gender: "Male" | "Female" | "Other"
  address: string
  nid: string
  joiningDate: string
  shift: "Morning" | "Day" | "Evening"
  salary: number
  portalLogin: string
  portalBlocked: boolean
  lastLogin?: string
  passwordLastReset?: string
  photoUrl?: string
  classes: Array<{ id: string; className: string; subjects: string[] }>
  statusHistory: Array<{ id: string; oldStatus: TeacherStatus; newStatus: TeacherStatus; date: string; changedBy: string; reason?: string }>
  salaryHistory: Array<{ id: string; month: string; amount: number; method: string; paidOn: string; paidBy: string; status: "Paid" | "Pending" | "Partial" }>
  leaves: Array<{ id: string; type: string; from: string; to: string; days: number; reason: string; status: LeaveStatus }>
  documents: Array<{ id: string; name: string; uploadedAt: string; url: string; expiryDate?: string }>
}

const DUMMY_TEACHERS: TeacherProfile[] = [
  {
    id: "t-001",
    teacherId: "TR-1001",
    name: "Nabila Islam",
    designation: "Senior Teacher",
    department: "Science",
    employmentType: "Full-time",
    status: "Active",
    phone: "01710101010",
    email: "nabila.islam@example.com",
    dob: "1990-02-15",
    gender: "Female",
    address: "Dhanmondi, Dhaka",
    nid: "1990123456789",
    joiningDate: "2023-01-12",
    shift: "Morning",
    salary: 42000,
    portalLogin: "nabila.islam@example.com",
    portalBlocked: false,
    lastLogin: "2026-03-28T09:14:00Z",
    passwordLastReset: "2026-02-20T11:30:00Z",
    classes: [
      { id: "ca-1", className: "Class 9 A", subjects: ["Physics", "Math"] },
      { id: "ca-2", className: "Class 10 A", subjects: ["Chemistry"] },
    ],
    statusHistory: [
      { id: "sth-1", oldStatus: "On Leave", newStatus: "Active", date: "2025-10-01", changedBy: "Admin Rifat", reason: "Joined after leave" },
    ],
    salaryHistory: [
      { id: "sh-1", month: "2026-03", amount: 42000, method: "Bank", paidOn: "2026-03-05", paidBy: "Accounts", status: "Paid" },
      { id: "sh-2", month: "2026-02", amount: 42000, method: "Bank", paidOn: "2026-02-05", paidBy: "Accounts", status: "Paid" },
      { id: "sh-3", month: "2026-01", amount: 21000, method: "Cash", paidOn: "2026-01-09", paidBy: "Accounts", status: "Partial" },
    ],
    leaves: [
      { id: "lv-1", type: "Sick", from: "2025-09-20", to: "2025-09-24", days: 5, reason: "Fever", status: "Approved" },
      { id: "lv-2", type: "Casual", from: "2026-02-11", to: "2026-02-12", days: 2, reason: "Family event", status: "Approved" },
    ],
    documents: [
      { id: "doc-1", name: "NID-Copy.pdf", uploadedAt: "2023-01-10", url: "/docs/nid-copy.pdf", expiryDate: "2026-04-20" },
      { id: "doc-2", name: "Masters-Certificate.pdf", uploadedAt: "2023-01-10", url: "/docs/masters.pdf" },
    ],
  },
  {
    id: "t-002",
    teacherId: "TR-1002",
    name: "Fahim Karim",
    designation: "Assistant Teacher",
    department: "Commerce",
    employmentType: "Full-time",
    status: "On Leave",
    phone: "01820202020",
    email: "fahim.karim@example.com",
    dob: "1992-11-22",
    gender: "Male",
    address: "Mirpur, Dhaka",
    nid: "1992456789123",
    joiningDate: "2022-09-05",
    shift: "Day",
    salary: 36000,
    portalLogin: "01820202020",
    portalBlocked: true,
    classes: [{ id: "ca-3", className: "Class 11 Commerce", subjects: ["Accounting", "Finance"] }],
    statusHistory: [],
    salaryHistory: [{ id: "sh-10", month: "2026-03", amount: 36000, method: "Bank", paidOn: "2026-03-06", paidBy: "Accounts", status: "Pending" }],
    leaves: [{ id: "lv-10", type: "Annual", from: "2026-03-10", to: "2026-03-18", days: 9, reason: "Vacation", status: "Pending" }],
    documents: [],
  },
]

type ProfileTab = "overview" | "classes" | "schedule" | "attendance" | "salary" | "leaves" | "documents"

function tabLabel(tab: ProfileTab) {
  if (tab === "classes") return "Classes & Subjects"
  if (tab === "schedule") return "Schedule"
  if (tab === "attendance") return "Attendance"
  if (tab === "salary") return "Salary"
  if (tab === "leaves") return "Leave Records"
  if (tab === "documents") return "Documents"
  return "Overview"
}

function initials(name: string) {
  const parts = name.split(" ").filter(Boolean)
  return `${parts[0]?.[0] ?? "T"}${parts[1]?.[0] ?? ""}`.toUpperCase()
}

function formatDate(value?: string) {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "-"
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(date)
}

function formatDateTime(value?: string) {
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

function statusVariant(status: TeacherStatus) {
  if (status === "Active") return "default"
  if (status === "On Leave") return "warning"
  if (status === "Resigned") return "muted"
  if (status === "Retired") return "info"
  return "destructive"
}

function todayIsoDate() {
  return new Date().toISOString().split("T")[0]
}

function attendanceColor(status: "present" | "absent" | "late" | "leave" | "holiday") {
  if (status === "present") return "bg-emerald-500"
  if (status === "absent") return "bg-red-500"
  if (status === "late") return "bg-amber-400"
  if (status === "leave") return "bg-blue-500"
  return "bg-slate-200"
}

function makeAttendance(month: string) {
  const [y, m] = month.split("-").map(Number)
  const days = new Date(y, m, 0).getDate()
  const entries = Array.from({ length: days }, (_, i) => {
    const day = i + 1
    const date = new Date(y, m - 1, day)
    const weekDay = date.getDay()
    let status: "present" | "absent" | "late" | "leave" | "holiday" = "present"
    if (weekDay === 5 || weekDay === 6) status = "holiday"
    else if (day % 13 === 0) status = "leave"
    else if (day % 11 === 0) status = "absent"
    else if (day % 7 === 0) status = "late"
    return { date: `${y}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`, status }
  })

  return {
    entries,
    summary: {
      present: entries.filter((e) => e.status === "present").length,
      absent: entries.filter((e) => e.status === "absent").length,
      late: entries.filter((e) => e.status === "late").length,
      onLeave: entries.filter((e) => e.status === "leave").length,
      total: entries.filter((e) => e.status !== "holiday").length,
    },
  }
}

function toUiGender(gender?: ApiTeacherGender): TeacherProfile["gender"] {
  if (gender === "MALE") return "Male"
  if (gender === "FEMALE") return "Female"
  return "Other"
}

function toEmploymentType(payrollType?: string): TeacherProfile["employmentType"] {
  if (payrollType === "PER_CLASS" || payrollType === "PER_BATCH") return "Part-time"
  return "Full-time"
}

function toDepartment(subjects: string[]): string {
  const first = subjects[0]?.toLowerCase() ?? ""
  if (["physics", "chemistry", "biology", "math", "mathematics"].some((key) => first.includes(key))) return "Science"
  if (["accounting", "finance", "business", "economics"].some((key) => first.includes(key))) return "Commerce"
  if (["bangla", "english", "history", "civics"].some((key) => first.includes(key))) return "Arts"
  return "General"
}

function mapApiTeacherProfile(item: any): TeacherProfile {
  const subjects = Array.isArray(item?.speciality_subject)
    ? item.speciality_subject.filter((subject: unknown) => typeof subject === "string")
    : []

  const monthlySalary = Number(item?.monthly_salary ?? 0)

  return {
    id: String(item?.id ?? ""),
    teacherId: String(item?.teacher_id ?? item?.id ?? "-"),
    name: String(item?.name ?? "Unknown Teacher"),
    designation: String(item?.qualification ?? "Teacher"),
    department: toDepartment(subjects),
    employmentType: toEmploymentType(item?.payroll_type),
    status: "Active",
    phone: String(item?.phone ?? ""),
    email: String(item?.email ?? ""),
    dob: String(item?.date_of_birth ?? ""),
    gender: toUiGender(item?.gender),
    address: String(item?.address ?? ""),
    nid: String(item?.nid_number ?? ""),
    joiningDate: String(item?.joining_date ?? ""),
    shift: "Day",
    salary: Number.isFinite(monthlySalary) ? monthlySalary : 0,
    portalLogin: String(item?.email ?? item?.phone ?? ""),
    portalBlocked: false,
    lastLogin: undefined,
    passwordLastReset: undefined,
    photoUrl: undefined,
    classes: [],
    statusHistory: [],
    salaryHistory: [],
    leaves: [],
    documents: [],
  }
}

export default function TeacherProfilePage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()

  const teacherId = String(params?.id ?? "")
  const initialTab = (searchParams.get("tab") as ProfileTab) || "overview"

  const [activeTab, setActiveTab] = useState<ProfileTab>(initialTab)
  const [teacher, setTeacher] = useState<TeacherProfile | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)

  const [statusDialogOpen, setStatusDialogOpen] = useState(false)
  const [statusForm, setStatusForm] = useState<{ status: TeacherStatus; reason: string; effectiveDate: string }>({
    status: "Active",
    reason: "",
    effectiveDate: todayIsoDate(),
  })

  const [resetDialogOpen, setResetDialogOpen] = useState(false)
  const [resetType, setResetType] = useState<"auto" | "manual">("auto")
  const [manualPassword, setManualPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [notifyTeacher, setNotifyTeacher] = useState(true)
  const [generatedPassword, setGeneratedPassword] = useState("")

  const [portalDialogOpen, setPortalDialogOpen] = useState(false)
  const [sendLoginLoading, setSendLoginLoading] = useState(false)

  const [assignmentDialogOpen, setAssignmentDialogOpen] = useState(false)
  const [assignmentClass, setAssignmentClass] = useState("Class 8 A")
  const [assignmentSubjects, setAssignmentSubjects] = useState<string[]>([])

  const [addEditDialogOpen, setAddEditDialogOpen] = useState(false)
  const [editingTeacherId, setEditingTeacherId] = useState<string | null>(null)
  const [formValues, setFormValues] = useState({
    fullName: "",
    phone: "",
    email: "",
    department: "Science",
    shift: "Morning",
    designation: "Assistant Teacher",
  })

  const [attendanceMonth, setAttendanceMonth] = useState(new Date().toISOString().slice(0, 7))
  const [previewDoc, setPreviewDoc] = useState<{ name: string; url: string } | null>(null)

  const tenantId = useMemo(() => {
    return (user as any)?.tenant_id ?? (user as any)?.tenantId ?? (user as any)?.tenant?.id ?? "demo-tenant"
  }, [user])
  const tenantIdForApi = tenantId

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (!menuRef.current) return
      if (!menuRef.current.contains(event.target as Node)) setMenuOpen(false)
    }
    window.addEventListener("click", onClick)
    return () => window.removeEventListener("click", onClick)
  }, [])

  const profileQuery = useQuery({
    queryKey: ["teacher-profile", tenantIdForApi, teacherId],
    queryFn: async () => {
      try {
        const response = await api.get(`/api/tenants/${tenantIdForApi}/teachers/${teacherId}`)
        const payload = response?.data
        const data = payload?.data ?? payload
        if (!data) return null
        return mapApiTeacherProfile(data)
      } catch (error: any) {
        if (error?.response?.status === 404) return null
        throw error
      }
    },
  })

  const scheduleQuery = useQuery({
    queryKey: ["teacher-schedule", tenantId, teacherId],
    enabled: !!teacher,
    queryFn: async () => {
      // API implementation intentionally commented for frontend-only flow.
      // const res = await fetch(`/api/teachers/${teacherId}/schedule?tenant_id=${tenantId}`)
      // if (!res.ok) throw new Error("Failed to load schedule")
      // return await res.json()
      const columns = ["Sat", "Sun", "Mon", "Tue", "Wed", "Thu"]
      const rows = Array.from({ length: 8 }, (_, i) => ({
        period: `Period ${i + 1}`,
        slots: columns.map((day, idx) => {
          if ((i + idx) % 4 === 0) return null
          return idx % 2 === 0 ? "Class 9 A - Physics" : "Class 10 A - Chemistry"
        }),
      }))
      return { columns, rows }
    },
  })

  const attendanceQuery = useQuery({
    queryKey: ["teacher-attendance", tenantId, teacherId, attendanceMonth],
    enabled: !!teacher,
    queryFn: async () => {
      // API implementation intentionally commented for frontend-only flow.
      // const res = await fetch(`/api/teachers/${teacherId}/attendance?month=${attendanceMonth}&tenant_id=${tenantId}`)
      // if (!res.ok) throw new Error("Failed to load attendance")
      // return await res.json()
      return makeAttendance(attendanceMonth)
    },
  })

  useEffect(() => {
    setTeacher(profileQuery.data ?? null)
    if (profileQuery.data) {
      setStatusForm((prev) => ({ ...prev, status: profileQuery.data!.status }))
    }
  }, [profileQuery.data])

  const copyTeacherId = async () => {
    if (!teacher) return
    await navigator.clipboard.writeText(teacher.teacherId)
    toast.success("Teacher ID copied")
  }

  const updateStatus = () => {
    if (!teacher) return

    // API implementation intentionally commented for frontend-only flow.
    // await fetch(`/api/teachers/${teacher.id}/status`, {
    //   method: "PATCH",
    //   headers: { "Content-Type": "application/json" },
    //   body: JSON.stringify({ ...statusForm, tenant_id: tenantId }),
    // })

    setTeacher((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        status: statusForm.status,
        statusHistory: [
          ...prev.statusHistory,
          {
            id: `sth-${Date.now()}`,
            oldStatus: prev.status,
            newStatus: statusForm.status,
            date: statusForm.effectiveDate,
            changedBy: "Admin (Demo)",
            reason: statusForm.reason || undefined,
          },
        ],
      }
    })

    setStatusDialogOpen(false)
    toast.success("Status updated")
  }

  const sendLoginLink = async () => {
    if (!teacher) return
    setMenuOpen(false)
    setSendLoginLoading(true)
    try {
      // API implementation intentionally commented for frontend-only flow.
      // await fetch(`/api/teachers/${teacher.id}/send-login-link`, { method: "POST" })
      await new Promise((resolve) => setTimeout(resolve, 450))
      toast.success(`Login link sent to ${teacher.email || teacher.phone}`)
    } finally {
      setSendLoginLoading(false)
    }
  }

  const togglePortalAccess = async () => {
    if (!teacher) return

    // API implementation intentionally commented for frontend-only flow.
    // await fetch(`/api/teachers/${teacher.id}/portal-access`, {
    //   method: "PATCH",
    //   headers: { "Content-Type": "application/json" },
    //   body: JSON.stringify({ blocked: !teacher.portalBlocked, tenant_id: tenantId }),
    // })

    setTeacher((prev) => (prev ? { ...prev, portalBlocked: !prev.portalBlocked } : prev))
    toast.success(teacher.portalBlocked ? "Portal access restored" : "Portal access blocked")
  }

  const resetPassword = () => {
    if (!teacher) return

    if (resetType === "manual") {
      if (manualPassword.length < 8) {
        toast.error("Password must be at least 8 characters")
        return
      }
      if (manualPassword !== confirmPassword) {
        toast.error("Passwords do not match")
        return
      }
    }

    // API implementation intentionally commented for frontend-only flow.
    // await fetch(`/api/teachers/${teacher.id}/reset-password`, {
    //   method: "POST",
    //   headers: { "Content-Type": "application/json" },
    //   body: JSON.stringify({ type: resetType, password: manualPassword, notify: notifyTeacher, tenant_id: tenantId }),
    // })

    const generated = resetType === "auto" ? `${Math.random().toString(36).slice(-8)}A9!` : ""
    setGeneratedPassword(generated)
    setTeacher((prev) => (prev ? { ...prev, passwordLastReset: new Date().toISOString() } : prev))
    toast.success("Password reset successfully")
  }

  const addAssignment = () => {
    if (!teacher) return
    if (!assignmentClass || assignmentSubjects.length === 0) {
      toast.error("Select class and subjects")
      return
    }

    // API implementation intentionally commented for frontend-only flow.
    // await fetch(`/api/teachers/${teacher.id}/assignments`, { method: "POST", body: JSON.stringify(...) })

    setTeacher((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        classes: [...prev.classes, { id: `ca-${Date.now()}`, className: assignmentClass, subjects: assignmentSubjects }],
      }
    })

    setAssignmentDialogOpen(false)
    setAssignmentSubjects([])
    toast.success("Class assignment added")
  }

  const removeAssignment = (assignmentId: string) => {
    setTeacher((prev) => {
      if (!prev) return prev
      return { ...prev, classes: prev.classes.filter((item) => item.id !== assignmentId) }
    })
  }

  const uploadDocument = () => {
    if (!teacher) return

    // API implementation intentionally commented for frontend-only flow.
    // const formData = new FormData()
    // formData.append("file", file)
    // formData.append("tenant_id", String(tenantId))
    // await fetch(`/api/teachers/${teacher.id}/documents`, { method: "POST", body: formData })

    setTeacher((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        documents: [
          ...prev.documents,
          { id: `doc-${Date.now()}`, name: "New-Uploaded-Document.pdf", uploadedAt: todayIsoDate(), url: "/docs/new-upload.pdf" },
        ],
      }
    })

    toast.success("Document uploaded")
  }

  const downloadDocument = (name: string) => {
    const blob = new Blob([`Demo file for ${name}`], { type: "application/octet-stream" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = name
    a.click()
    URL.revokeObjectURL(url)
  }

  if (profileQuery.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-28" />
        <Skeleton className="h-10" />
        <Skeleton className="h-64" />
      </div>
    )
  }

  if (!teacher) {
    return (
      <Card className="mx-auto mt-10 max-w-xl">
        <CardContent className="space-y-3 p-6 text-center">
          <p className="text-lg font-semibold">Teacher not found</p>
          <p className="text-sm text-muted-foreground">No teacher profile found for this ID in demo data.</p>
          <Button asChild variant="outline">
            <Link href="/dashboard/teachers">
              <ArrowLeft className="mr-2 size-4" /> Back to Teacher List
            </Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  const tabs: ProfileTab[] = ["overview", "classes", "schedule", "attendance", "salary", "leaves", "documents"]

  return (
    <div className="adm-root space-y-4">
      <div className="rounded-xl border bg-card p-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex size-[90px] items-center justify-center rounded-full bg-primary/10 text-xl font-semibold text-primary">
              {initials(teacher.name)}
            </div>
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold">{teacher.name}</h1>
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <span>{teacher.teacherId}</span>
                <Button variant="ghost" size="icon-xs" onClick={copyTeacherId}><Copy className="size-4" /></Button>
              </div>
              <p className="text-sm text-muted-foreground">{teacher.designation} • {teacher.department}</p>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={statusVariant(teacher.status)}>{teacher.status}</Badge>
                <Badge variant="outline">{teacher.employmentType}</Badge>
                {teacher.portalBlocked ? <Badge variant="destructive">Portal Blocked</Badge> : null}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2" ref={menuRef}>
            <Button variant="outline" onClick={() => {
              setEditingTeacherId(teacher.id)
              setFormValues({
                fullName: teacher.name,
                phone: teacher.phone,
                email: teacher.email,
                department: teacher.department as any,
                shift: teacher.shift,
                designation: teacher.designation,
              })
              setAddEditDialogOpen(true)
            }}><Pencil className="mr-1 size-4" /> Edit</Button>
            <Button variant="outline" onClick={() => setResetDialogOpen(true)}><Key className="mr-1 size-4" /> Reset Password</Button>
            <div className="relative">
              <Button variant="outline" onClick={() => setMenuOpen((prev) => !prev)}>
                <MoreHorizontal className="mr-1 size-4" /> More
              </Button>
              {menuOpen ? (
                <div className="absolute right-0 top-10 z-30 w-56 rounded-lg border bg-background p-1 shadow">
                  <button className="block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-muted" onClick={() => { setMenuOpen(false); setStatusDialogOpen(true) }}>
                    Change Status
                  </button>
                  <button className="block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-muted disabled:opacity-60" disabled={sendLoginLoading} onClick={sendLoginLink}>
                    {sendLoginLoading ? "Sending..." : "Send Login Link"}
                  </button>
                  <button className="block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-muted" onClick={() => { setMenuOpen(false); setPortalDialogOpen(true) }}>
                    {teacher.portalBlocked ? "Unblock Portal Access" : "Block Portal Access"}
                  </button>
                  <button className="block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-muted" onClick={() => toast.success("Salary history is shown in Salary tab")}>View Salary History</button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <Button
            key={tab}
            size="sm"
            variant={activeTab === tab ? "default" : "outline"}
            onClick={() => {
              setActiveTab(tab)
              const params = new URLSearchParams(searchParams.toString())
              params.set("tab", tab)
              router.replace(`/dashboard/teachers/${teacher.id}?${params.toString()}`)
            }}
          >
            {tabLabel(tab)}
          </Button>
        ))}
      </div>

      {activeTab === "overview" ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>Personal Info</CardTitle></CardHeader>
            <CardContent className="space-y-1 text-sm">
              <p><span className="text-muted-foreground">Name:</span> {teacher.name}</p>
              <p><span className="text-muted-foreground">DOB:</span> {formatDate(teacher.dob)}</p>
              <p><span className="text-muted-foreground">Gender:</span> {teacher.gender}</p>
              <p><span className="text-muted-foreground">Phone:</span> {teacher.phone}</p>
              <p><span className="text-muted-foreground">Email:</span> {teacher.email}</p>
              <p><span className="text-muted-foreground">Address:</span> {teacher.address}</p>
              <p><span className="text-muted-foreground">NID:</span> {teacher.nid}</p>
              <p><span className="text-muted-foreground">Joining date:</span> {formatDate(teacher.joiningDate)}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Job Info</CardTitle></CardHeader>
            <CardContent className="space-y-1 text-sm">
              <p><span className="text-muted-foreground">Designation:</span> {teacher.designation}</p>
              <p><span className="text-muted-foreground">Department:</span> {teacher.department}</p>
              <p><span className="text-muted-foreground">Employment type:</span> {teacher.employmentType}</p>
              <p><span className="text-muted-foreground">Shift:</span> {teacher.shift}</p>
              <p><span className="text-muted-foreground">Salary:</span> BDT {teacher.salary.toLocaleString()}/month</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Account Info</CardTitle></CardHeader>
            <CardContent className="space-y-1 text-sm">
              <p><span className="text-muted-foreground">Portal login:</span> {teacher.portalLogin}</p>
              <p><span className="text-muted-foreground">Last login:</span> {formatDateTime(teacher.lastLogin)}</p>
              <p><span className="text-muted-foreground">Access status:</span> {teacher.portalBlocked ? "Blocked" : "Active"}</p>
              <p><span className="text-muted-foreground">Password last reset:</span> {formatDateTime(teacher.passwordLastReset)}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Quick Stats</CardTitle></CardHeader>
            <CardContent className="space-y-1 text-sm">
              <p><span className="text-muted-foreground">Total classes assigned:</span> {teacher.classes.length}</p>
              <p><span className="text-muted-foreground">Total subjects:</span> {new Set(teacher.classes.flatMap((c) => c.subjects)).size}</p>
              <p><span className="text-muted-foreground">Days present this month:</span> {attendanceQuery.data?.summary.present ?? 0}</p>
              <p><span className="text-muted-foreground">Leaves taken this year:</span> {teacher.leaves.filter((l) => l.status === "Approved").length}</p>
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader><CardTitle>Status History</CardTitle></CardHeader>
            <CardContent>
              <Collapsible>
                <CollapsibleTrigger asChild>
                  <Button variant="outline" size="sm">Toggle Status History <ChevronDown className="ml-1 size-4" /></Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-3 space-y-2">
                  {teacher.statusHistory.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No status changes yet.</p>
                  ) : (
                    teacher.statusHistory.map((item) => (
                      <div key={item.id} className="rounded-lg border p-3 text-sm">
                        <p className="font-medium">{item.oldStatus} → {item.newStatus}</p>
                        <p className="text-muted-foreground">{formatDate(item.date)} | {item.changedBy}</p>
                        <p className="text-muted-foreground">Reason: {item.reason ?? "-"}</p>
                      </div>
                    ))
                  )}
                </CollapsibleContent>
              </Collapsible>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {activeTab === "classes" ? (
        <Card>
          <CardHeader><CardTitle>Classes & Subjects</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {teacher.classes.length === 0 ? (
              <p className="text-sm text-muted-foreground">Not assigned to any class</p>
            ) : (
              teacher.classes.map((item) => (
                <Card key={item.id}>
                  <CardContent className="space-y-2 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium">{item.className}</p>
                      <AlertDialog>
                        <Button asChild variant="ghost" size="icon-sm">
                          <AlertDialogAction className="border-none bg-transparent p-0 text-foreground shadow-none hover:bg-transparent">
                            <X className="size-4" />
                          </AlertDialogAction>
                        </Button>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remove assignment?</AlertDialogTitle>
                            <AlertDialogDescription>This will remove class assignment for this teacher.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => removeAssignment(item.id)}>Remove</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {item.subjects.map((subject) => <Badge key={subject} variant="outline">{subject}</Badge>)}
                    </div>
                    <Button variant="outline" size="sm" onClick={() => { setAssignmentClass(item.className); setAssignmentSubjects(item.subjects); setAssignmentDialogOpen(true) }}>Edit Assignment</Button>
                  </CardContent>
                </Card>
              ))
            )}

            <Button variant="outline" onClick={() => setAssignmentDialogOpen(true)}><Plus className="mr-1 size-4" /> Add Class Assignment</Button>
          </CardContent>
        </Card>
      ) : null}

      {activeTab === "schedule" ? (
        <Card>
          <CardHeader><CardTitle>Weekly Timetable</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {scheduleQuery.isLoading ? (
              <Skeleton className="h-40" />
            ) : (
              <div className="overflow-x-auto rounded-lg border">
                <table className="min-w-[760px] text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40">
                      <th className="p-2 text-left">Period</th>
                      {scheduleQuery.data?.columns.map((col) => <th key={col} className="p-2 text-left">{col}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {scheduleQuery.data?.rows.map((row) => (
                      <tr key={row.period} className="border-b">
                        <td className="p-2 font-medium">{row.period}</td>
                        {row.slots.map((slot, i) => (
                          <td key={i} className="p-2">
                            {slot ? <span>{slot}</span> : <span className="rounded border border-dashed px-2 py-1 text-xs text-muted-foreground">Empty</span>}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <Alert>
              <AlertTitle>Info</AlertTitle>
              <AlertDescription>Schedule is managed in the Routine Module.</AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      ) : null}

      {activeTab === "attendance" ? (
        <div className="space-y-3">
          <Card>
            <CardContent className="space-y-3 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm">
                  Present <b>{attendanceQuery.data?.summary.present ?? 0}</b> | Absent <b>{attendanceQuery.data?.summary.absent ?? 0}</b> | Late <b>{attendanceQuery.data?.summary.late ?? 0}</b> | On Leave <b>{attendanceQuery.data?.summary.onLeave ?? 0}</b> | Total <b>{attendanceQuery.data?.summary.total ?? 0}</b>
                </p>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon-sm" onClick={() => {
                    const d = new Date(`${attendanceMonth}-01T00:00:00`)
                    d.setMonth(d.getMonth() - 1)
                    setAttendanceMonth(d.toISOString().slice(0, 7))
                  }}><ChevronLeft className="size-4" /></Button>
                  <span className="text-sm font-medium">{attendanceMonth}</span>
                  <Button variant="outline" size="icon-sm" onClick={() => {
                    const d = new Date(`${attendanceMonth}-01T00:00:00`)
                    d.setMonth(d.getMonth() + 1)
                    setAttendanceMonth(d.toISOString().slice(0, 7))
                  }}><ChevronRight className="size-4" /></Button>
                </div>
              </div>

              {attendanceQuery.isLoading ? (
                <Skeleton className="h-36" />
              ) : (
                <div className="grid grid-cols-7 gap-2 md:grid-cols-10 lg:grid-cols-14">
                  {attendanceQuery.data?.entries.map((item) => (
                    <div key={item.date} className="flex flex-col items-center gap-1 rounded-lg border p-1">
                      <div className={`size-4 rounded-sm ${attendanceColor(item.status)}`} />
                      <span className="text-[10px] text-muted-foreground">{item.date.slice(-2)}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Alert>
            <AlertTitle>Info</AlertTitle>
            <AlertDescription>Attendance is recorded in the Attendance Module.</AlertDescription>
          </Alert>
        </div>
      ) : null}

      {activeTab === "salary" ? (
        <div className="space-y-3">
          <Card>
            <CardContent className="grid gap-3 p-4 text-sm md:grid-cols-3">
              <div><p className="text-muted-foreground">Current salary</p><p className="text-lg font-semibold">BDT {teacher.salary.toLocaleString()}/month</p></div>
              <div><p className="text-muted-foreground">Employment type</p><p>{teacher.employmentType}</p></div>
              <div><p className="text-muted-foreground">Last paid</p><p>{formatDate(teacher.salaryHistory[0]?.paidOn)}</p></div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Salary History</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Month</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Payment Method</TableHead>
                      <TableHead>Paid On</TableHead>
                      <TableHead>Paid By</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {teacher.salaryHistory.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.month}</TableCell>
                        <TableCell>BDT {item.amount.toLocaleString()}</TableCell>
                        <TableCell>{item.method}</TableCell>
                        <TableCell>{formatDate(item.paidOn)}</TableCell>
                        <TableCell>{item.paidBy}</TableCell>
                        <TableCell>
                          <Badge variant={item.status === "Paid" ? "default" : item.status === "Pending" ? "warning" : "info"}>{item.status}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Alert>
            <AlertTitle>Info</AlertTitle>
            <AlertDescription>Full payroll management is in the Payroll Module.</AlertDescription>
          </Alert>
        </div>
      ) : null}

      {activeTab === "leaves" ? (
        <div className="space-y-3">
          <Card>
            <CardContent className="grid gap-3 p-4 text-sm md:grid-cols-3">
              <div>Sick Leave <b>2/12</b></div>
              <div>Casual <b>3/10</b></div>
              <div>Annual <b>4/20</b></div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Leave History</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>From</TableHead>
                      <TableHead>To</TableHead>
                      <TableHead>Days</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {teacher.leaves.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.type}</TableCell>
                        <TableCell>{formatDate(item.from)}</TableCell>
                        <TableCell>{formatDate(item.to)}</TableCell>
                        <TableCell>{item.days}</TableCell>
                        <TableCell>{item.reason}</TableCell>
                        <TableCell><Badge variant={item.status === "Approved" ? "default" : item.status === "Pending" ? "warning" : "destructive"}>{item.status}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Alert>
            <AlertTitle>Info</AlertTitle>
            <AlertDescription>Leave approval is managed in the Leave Module.</AlertDescription>
          </Alert>
        </div>
      ) : null}

      {activeTab === "documents" ? (
        <Card>
          <CardHeader>
            <CardTitle>Documents</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-end">
              <Button variant="outline" onClick={uploadDocument}><Plus className="mr-1 size-4" /> Upload New Document</Button>
            </div>

            {teacher.documents.length === 0 ? (
              <p className="text-sm text-muted-foreground">No documents uploaded</p>
            ) : (
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {teacher.documents.map((doc) => {
                  const expiringSoon = doc.expiryDate ? (new Date(doc.expiryDate).getTime() - Date.now()) / (1000 * 3600 * 24) <= 30 : false
                  return (
                    <Card key={doc.id}>
                      <CardContent className="space-y-2 p-3 text-sm">
                        <p className="font-medium">{doc.name}</p>
                        <p className="text-muted-foreground">Uploaded {formatDate(doc.uploadedAt)}</p>
                        {expiringSoon ? (
                          <Alert>
                            <AlertTitle>Expiring Soon</AlertTitle>
                            <AlertDescription>Document expires on {formatDate(doc.expiryDate)}</AlertDescription>
                          </Alert>
                        ) : null}
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" onClick={() => downloadDocument(doc.name)}>
                            <Download className="mr-1 size-4" /> Download
                          </Button>
                          <Button variant="ghost" size="icon-sm" onClick={() => setPreviewDoc({ name: doc.name, url: doc.url })}>
                            <Eye className="size-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}

      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Teacher Status</DialogTitle>
            <DialogDescription>Current status: {teacher.status}</DialogDescription>
          </DialogHeader>
          <RadioGroup value={statusForm.status} onValueChange={(value) => setStatusForm((prev) => ({ ...prev, status: value as TeacherStatus }))}>
            <RadioGroupItem id="ts-active" value="Active">Active - Currently employed and working</RadioGroupItem>
            <RadioGroupItem id="ts-leave" value="On Leave">On Leave - Temporarily on approved leave</RadioGroupItem>
            <RadioGroupItem id="ts-resigned" value="Resigned">Resigned - Voluntarily left the institution</RadioGroupItem>
            <RadioGroupItem id="ts-terminated" value="Terminated">Terminated - Employment ended by institution</RadioGroupItem>
            <RadioGroupItem id="ts-retired" value="Retired">Retired - Retired from service</RadioGroupItem>
          </RadioGroup>
          <Textarea value={statusForm.reason} onChange={(e) => setStatusForm((prev) => ({ ...prev, reason: e.target.value }))} placeholder="Reason (optional)" />
          <Input type="date" value={statusForm.effectiveDate} onChange={(e) => setStatusForm((prev) => ({ ...prev, effectiveDate: e.target.value }))} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusDialogOpen(false)}>Cancel</Button>
            <Button onClick={updateStatus}>Update Status</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Teacher Password</DialogTitle>
            <DialogDescription>{teacher.name}</DialogDescription>
          </DialogHeader>

          <RadioGroup value={resetType} onValueChange={(value) => setResetType(value as "auto" | "manual")}>
            <RadioGroupItem id="tp-auto" value="auto">Generate new password</RadioGroupItem>
            <RadioGroupItem id="tp-manual" value="manual">Set manual password</RadioGroupItem>
          </RadioGroup>

          {resetType === "manual" ? (
            <>
              <Input type="password" value={manualPassword} onChange={(e) => setManualPassword(e.target.value)} placeholder="New password (min 8 chars)" />
              <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm password" />
            </>
          ) : null}

          <div className="flex items-center justify-between rounded-lg border p-3 text-sm">
            <div>
              <p className="font-medium">Send new credentials via SMS/email</p>
              <p className="text-muted-foreground">Notify teacher immediately after reset</p>
            </div>
            <Switch checked={notifyTeacher} onCheckedChange={setNotifyTeacher} />
          </div>

          {generatedPassword ? (
            <Alert>
              <AlertTitle>Generated Password</AlertTitle>
              <AlertDescription className="flex items-center justify-between gap-2">
                <span>{generatedPassword}</span>
                <Button variant="outline" size="sm" onClick={async () => {
                  await navigator.clipboard.writeText(generatedPassword)
                  toast.success("Password copied")
                }}>
                  <Copy className="mr-1 size-4" /> Copy
                </Button>
              </AlertDescription>
            </Alert>
          ) : null}

          <DialogFooter>
            <Button variant="outline" onClick={() => setResetDialogOpen(false)}>Cancel</Button>
            <Button onClick={resetPassword}>Reset Password</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={portalDialogOpen} onOpenChange={setPortalDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{teacher.portalBlocked ? "Restore Portal Access" : "Block Portal Access"}</AlertDialogTitle>
            <AlertDialogDescription>
              {teacher.portalBlocked
                ? "This teacher will be able to log in again."
                : "This teacher will not be able to log in to portal. Their data will remain intact."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={togglePortalAccess}>{teacher.portalBlocked ? "Restore Access" : "Block Access"}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={assignmentDialogOpen} onOpenChange={setAssignmentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Class Assignment</DialogTitle>
            <DialogDescription>Select class and subjects for this teacher.</DialogDescription>
          </DialogHeader>

          <Select value={assignmentClass} onValueChange={setAssignmentClass}>
            <option value="Class 6 A">Class 6 A</option>
            <option value="Class 7 B">Class 7 B</option>
            <option value="Class 8 A">Class 8 A</option>
            <option value="Class 9 A">Class 9 A</option>
          </Select>

          <div className="space-y-2">
            <p className="text-sm font-medium">Subjects</p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {[
                "Math",
                "Physics",
                "Chemistry",
                "Biology",
                "English",
                "Bangla",
                "ICT",
                "Accounting",
              ].map((subject) => (
                <label key={subject} className="inline-flex items-center gap-2 rounded border px-2 py-1">
                  <input
                    type="checkbox"
                    checked={assignmentSubjects.includes(subject)}
                    onChange={(event) => {
                      if (event.target.checked) setAssignmentSubjects((prev) => Array.from(new Set([...prev, subject])))
                      else setAssignmentSubjects((prev) => prev.filter((s) => s !== subject))
                    }}
                  />
                  <span>{subject}</span>
                </label>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignmentDialogOpen(false)}>Cancel</Button>
            <Button onClick={addAssignment}>Save Assignment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!previewDoc} onOpenChange={(open) => !open && setPreviewDoc(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{previewDoc?.name}</DialogTitle>
            <DialogDescription>Document preview</DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border p-4 text-sm text-muted-foreground">
            Preview is in demo mode. Source: {previewDoc?.url}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewDoc(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={addEditDialogOpen} onOpenChange={setAddEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Teacher</DialogTitle>
            <DialogDescription>Update teacher information for frontend flow.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 md:grid-cols-2">
            <Input value={formValues.fullName} onChange={(e) => setFormValues((prev) => ({ ...prev, fullName: e.target.value }))} placeholder="Full name" />
            <Input value={formValues.phone} onChange={(e) => setFormValues((prev) => ({ ...prev, phone: e.target.value }))} placeholder="Phone" />
            <Input value={formValues.email} onChange={(e) => setFormValues((prev) => ({ ...prev, email: e.target.value }))} placeholder="Email" />
            <Input value={formValues.designation} onChange={(e) => setFormValues((prev) => ({ ...prev, designation: e.target.value }))} placeholder="Designation" />
            <Select value={formValues.department} onValueChange={(value) => setFormValues((prev) => ({ ...prev, department: value }))}>
              <option value="Science">Science</option>
              <option value="Commerce">Commerce</option>
              <option value="Arts">Arts</option>
              <option value="General">General</option>
            </Select>
            <Select value={formValues.shift} onValueChange={(value) => setFormValues((prev) => ({ ...prev, shift: value }))}>
              <option value="Morning">Morning</option>
              <option value="Day">Day</option>
              <option value="Evening">Evening</option>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddEditDialogOpen(false)}>Close</Button>
            <Button onClick={() => {
              setTeacher((prev) => prev ? {
                ...prev,
                name: formValues.fullName,
                phone: formValues.phone,
                email: formValues.email,
                designation: formValues.designation,
                department: formValues.department,
                shift: formValues.shift as any,
              } : prev)
              toast.success("Teacher updated successfully")
              setAddEditDialogOpen(false)
            }}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
