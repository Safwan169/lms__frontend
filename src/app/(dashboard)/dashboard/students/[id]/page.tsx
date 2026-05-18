"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import {
  ArrowLeft,
  Calendar,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  Eye,
  Key,
  Loader2,
  MoreHorizontal,
  Pencil,
  Send,
  Shield,
  X,
} from "lucide-react"
import toast from "react-hot-toast"

import { useAuth } from "@/context/AuthContext"
import { useGetStudentProfileQuery, useUpdateStudentProfileMutation } from "@/features/user/userApi"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Select } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
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
import {
  BATCHES,
  CLASSES,
  DUMMY_STUDENTS,
  Student,
  StudentStatus,
  attendanceColor,
  createAttendanceForMonth,
  formatDate,
  formatDateTime,
  getStatusBadgeVariant,
  getStudentById,
} from "../_data"

const DEMO_MODE = true

type ProfileTab = "overview" | "academic" | "documents" | "payment" | "attendance"

function getInitials(name: string) {
  const parts = name.split(" ").filter(Boolean)
  const first = parts[0]?.[0] ?? "S"
  const second = parts[1]?.[0] ?? ""
  return `${first}${second}`.toUpperCase()
}

function todayIsoDate() {
  return new Date().toISOString().split("T")[0]
}

export default function StudentProfilePage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()

  const studentId = String(params?.id ?? "")
  const initialTab = (searchParams.get("tab") as ProfileTab) || "overview"

  const [activeTab, setActiveTab] = useState<ProfileTab>(initialTab)
  const [student, setStudent] = useState<Student | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)

  const [statusDialogOpen, setStatusDialogOpen] = useState(false)
  const [statusForm, setStatusForm] = useState<{ status: StudentStatus; reason: string; effectiveDate: string }>({
    status: "Active",
    reason: "",
    effectiveDate: todayIsoDate(),
  })

  const [promoteDialogOpen, setPromoteDialogOpen] = useState(false)
  const [promotionForm, setPromotionForm] = useState({ toClassId: "", toBatchId: "", note: "" })

  const [resetDialogOpen, setResetDialogOpen] = useState(false)
  const [resetType, setResetType] = useState<"auto" | "manual">("auto")
  const [manualPassword, setManualPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [notifyStudent, setNotifyStudent] = useState(true)
  const [generatedPassword, setGeneratedPassword] = useState("")

  const [portalDialogOpen, setPortalDialogOpen] = useState(false)
  const [sendLinkLoading, setSendLinkLoading] = useState(false)

  const [attendanceMonth, setAttendanceMonth] = useState(new Date().toISOString().slice(0, 7))
  const [previewDoc, setPreviewDoc] = useState<{ name: string; url: string } | null>(null)

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

  useEffect(() => {
    const onClickOutside = (event: MouseEvent) => {
      if (!menuRef.current) return
      if (!menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false)
      }
    }

    window.addEventListener("click", onClickOutside)
    return () => window.removeEventListener("click", onClickOutside)
  }, [])

  const isDemo = !tenantId || tenantId === "demo-tenant"
  const [updateStudentProfileApi] = useUpdateStudentProfileMutation()

  const studentQuery = useGetStudentProfileQuery(
    { tenantId, profileId: studentId },
    { skip: isDemo || !studentId }
  )

  const mockStudentQuery = useQuery({
    queryKey: ["student-profile-mock", studentId],
    enabled: isDemo,
    queryFn: async () => {
      await new Promise((resolve) => setTimeout(resolve, 240))
      return getStudentById(studentId, DUMMY_STUDENTS) ?? null
    },
  })

  const rawStudentData = isDemo ? mockStudentQuery.data : studentQuery.data
  const studentApiData = isDemo ? null : studentQuery.data
  const resolvedStudent: Student | null = isDemo
    ? (rawStudentData as Student | null ?? null)
    : studentApiData
      ? ({
          id: String(studentApiData.id ?? studentApiData.user_id ?? ""),
          name: String(studentApiData.full_name ?? studentApiData.student_name ?? studentApiData.name ?? ""),
          rollNumber: String(studentApiData.student_id ?? studentApiData.roll_number ?? ""),
          studentId: String(studentApiData.student_id ?? studentApiData.roll_number ?? ""),
          classId: String(studentApiData.class_id ?? ""),
          batchId: String(studentApiData.batch_id ?? ""),
          session: String(studentApiData.session ?? ""),
          status: (studentApiData.status ?? "Active") as StudentStatus,
          phone: String(studentApiData.phone ?? studentApiData.student_phone ?? ""),
          email: String(studentApiData.email ?? studentApiData.student_email ?? ""),
          gender: (studentApiData.gender ?? "Male") as Student["gender"],
          dob: String(studentApiData.dob ?? ""),
          address: String(studentApiData.address ?? ""),
          fatherName: String(studentApiData.father_name ?? ""),
          motherName: String(studentApiData.mother_name ?? ""),
          parentPhone: String(studentApiData.parent_phone ?? ""),
          admittedAt: String(studentApiData.admitted_at ?? studentApiData.created_at ?? ""),
          photo: studentApiData.photo ?? undefined,
          loginIdentifier: String(studentApiData.email ?? studentApiData.student_email ?? studentApiData.phone ?? ""),
          statusHistory: studentApiData.status_history ?? [],
          documents: studentApiData.documents ?? [],
          payments: studentApiData.payments ?? [],
        } as unknown as Student)
      : null

  const historyQuery = useQuery({
    queryKey: ["student-status-history", tenantId, studentId],
    enabled: !!student,
    queryFn: async () => {
      // API implementation intentionally commented for frontend-only flow.
      // const res = await fetch(`/admin/students/${studentId}/status-history?tenant_id=${tenantId}`)
      // if (!res.ok) throw new Error("Failed to load status history")
      // return await res.json()
      return student?.statusHistory ?? []
    },
  })

  const attendanceQuery = useQuery({
    queryKey: ["student-attendance", tenantId, studentId, attendanceMonth],
    enabled: !!student,
    queryFn: async () => {
      // API implementation intentionally commented for frontend-only flow.
      // const res = await fetch(`/admin/students/${studentId}/attendance?month=${attendanceMonth}&tenant_id=${tenantId}`)
      // if (!res.ok) throw new Error("Failed to load attendance")
      // return await res.json()
      await new Promise((resolve) => setTimeout(resolve, 140))
      return createAttendanceForMonth(attendanceMonth)
    },
  })

  useEffect(() => {
    const loadedStudent = resolvedStudent
    if (!loadedStudent) {
      setStudent(null)
      return
    }
    setStudent(loadedStudent)
    setStatusForm((prev) => ({ ...prev, status: loadedStudent.status }))
  }, [resolvedStudent])

  const attendance = attendanceQuery.data

  const destinationBatches = useMemo(() => {
    if (!promotionForm.toClassId) return []
    return BATCHES.filter((item) => item.classId === promotionForm.toClassId)
  }, [promotionForm.toClassId])

  const tabs: Array<{ id: ProfileTab; label: string }> = [
    { id: "overview", label: "Overview" },
    { id: "academic", label: "Academic" },
    { id: "documents", label: "Documents" },
    { id: "payment", label: "Payment" },
    { id: "attendance", label: "Attendance" },
  ]

  const copyStudentId = async () => {
    if (!student) return
    await navigator.clipboard.writeText(student.studentId)
    toast.success("Student ID copied")
  }

  const sendLoginLink = async () => {
    if (!student) return
    setMenuOpen(false)
    setSendLinkLoading(true)
    try {
      // API implementation intentionally commented for frontend-only flow.
      // await fetch(`/admin/students/${student.id}/send-login-link`, { method: "POST" })
      await new Promise((resolve) => setTimeout(resolve, 500))
      toast.success(`Login link sent to ${student.loginIdentifier}`)
    } finally {
      setSendLinkLoading(false)
    }
  }

  const togglePortalAccess = async () => {
    if (!student) return

    // API implementation intentionally commented for frontend-only flow.
    // await fetch(`/admin/students/${student.id}/portal-access`, {
    //   method: "PATCH",
    //   headers: { "Content-Type": "application/json" },
    //   body: JSON.stringify({ blocked: !student.portalBlocked }),
    // })

    setStudent((prev) => {
      if (!prev) return prev
      return { ...prev, portalBlocked: !prev.portalBlocked }
    })

    toast.success(student.portalBlocked ? "Portal access restored" : "Portal access blocked")
  }

  const updateStatus = async () => {
    if (!student) return

    if (!isDemo) {
      try {
        await updateStudentProfileApi({
          tenantId,
          profileId: student.id,
          data: {
            status: statusForm.status,
            status_reason: statusForm.reason || undefined,
            status_effective_date: statusForm.effectiveDate,
          },
        }).unwrap()
      } catch (error: unknown) {
        const maybeError = error as { data?: { message?: string }; message?: string }
        toast.error(maybeError?.data?.message || maybeError?.message || "Failed to update status")
        return
      }
    }

    setStudent((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        status: statusForm.status,
        statusHistory: [
          ...prev.statusHistory,
          {
            id: `sh-${Date.now()}`,
            oldStatus: prev.status,
            newStatus: statusForm.status,
            date: statusForm.effectiveDate,
            changedBy: "Admin",
            reason: statusForm.reason || undefined,
          },
        ],
      }
    })

    setStatusDialogOpen(false)
    toast.success("Status updated")
  }

  const promoteStudent = () => {
    if (!student) return
    if (!promotionForm.toClassId || !promotionForm.toBatchId) {
      toast.error("Select destination class and batch")
      return
    }

    const classItem = CLASSES.find((item) => item.id === promotionForm.toClassId)
    const batchItem = BATCHES.find((item) => item.id === promotionForm.toBatchId)
    if (!classItem || !batchItem) return

    // API implementation intentionally commented for frontend-only flow.
    // await fetch(`/admin/students/${student.id}/promote`, { method: "POST", body: JSON.stringify(...) })

    setStudent((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        classId: classItem.id,
        className: classItem.name,
        batchId: batchItem.id,
        batchName: batchItem.name,
        promotionHistory: [
          ...prev.promotionHistory,
          {
            id: `ph-${Date.now()}`,
            fromClass: prev.className,
            fromBatch: prev.batchName,
            toClass: classItem.name,
            toBatch: batchItem.name,
            date: todayIsoDate(),
            doneBy: "Admin (Demo)",
          },
        ],
      }
    })

    setPromoteDialogOpen(false)
    toast.success("Student promoted successfully")
  }

  const resetPassword = () => {
    if (!student) return

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
    // await fetch(`/admin/students/${student.id}/reset-password`, {
    //   method: "POST",
    //   headers: { "Content-Type": "application/json" },
    //   body: JSON.stringify({ type: resetType, password: manualPassword, notify: notifyStudent }),
    // })

    const generated = resetType === "auto" ? Math.random().toString(36).slice(-10) + "A9!" : ""
    setGeneratedPassword(generated)

    setStudent((prev) => {
      if (!prev) return prev
      return { ...prev, passwordLastReset: new Date().toISOString() }
    })

    toast.success("Password reset successfully")
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

  if (studentQuery.isLoading) {
    return (
      <div className="adm-root space-y-4">
        <Skeleton className="h-28" />
        <Skeleton className="h-10" />
        <Skeleton className="h-64" />
      </div>
    )
  }

  if (!student) {
    return (
      <div className="adm-root">
        <Card className="mx-auto mt-10 max-w-xl">
          <CardContent className="space-y-3 p-6 text-center">
            <p className="text-lg font-semibold">Student not found</p>
            <p className="text-sm text-muted-foreground">We could not find this student profile in demo data.</p>
            <Button asChild variant="outline">
              <Link href="/dashboard/students">
                <ArrowLeft className="mr-2 size-4" /> Back to Student List
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="adm-root space-y-4">
      <div className="rounded-xl border bg-card p-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex size-20 items-center justify-center rounded-full bg-primary/10 text-lg font-semibold text-primary">
              {getInitials(student.name)}
            </div>
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold">{student.name}</h1>
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <span>{student.studentId}</span>
                <Button variant="ghost" size="icon-xs" onClick={copyStudentId}><Copy className="size-4" /></Button>
                <Badge variant={getStatusBadgeVariant(student.status)}>{student.status}</Badge>
                {student.portalBlocked ? <Badge variant="destructive">Portal Blocked</Badge> : null}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2" ref={menuRef}>
            <Button variant="outline"><Pencil className="mr-1 size-4" /> Edit Profile</Button>
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
                  <button className="block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-muted" onClick={() => { setMenuOpen(false); setPromoteDialogOpen(true) }}>
                    Promote Batch
                  </button>
                  <button className="block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-muted" onClick={() => { setMenuOpen(false); setPortalDialogOpen(true) }}>
                    {student.portalBlocked ? "Unblock Portal Access" : "Block Portal Access"}
                  </button>
                  <button className="block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-muted disabled:opacity-60" onClick={sendLoginLink} disabled={sendLinkLoading}>
                    {sendLinkLoading ? "Sending..." : "Send Login Link"}
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <Button
            key={tab.id}
            variant={activeTab === tab.id ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setActiveTab(tab.id)
              const qp = new URLSearchParams(searchParams.toString())
              qp.set("tab", tab.id)
              router.replace(`/dashboard/students/${student.id}?${qp.toString()}`)
            }}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {activeTab === "overview" ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>Personal Info</CardTitle></CardHeader>
            <CardContent className="space-y-1 text-sm">
              <p><span className="text-muted-foreground">Full name:</span> {student.name}</p>
              <p><span className="text-muted-foreground">Date of birth:</span> {formatDate(student.dob)}</p>
              <p><span className="text-muted-foreground">Gender:</span> {student.gender}</p>
              <p><span className="text-muted-foreground">Address:</span> {student.address}</p>
              <p><span className="text-muted-foreground">Phone:</span> {student.phone}</p>
              <p><span className="text-muted-foreground">Email:</span> {student.email ?? "-"}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Parent Info</CardTitle></CardHeader>
            <CardContent className="space-y-1 text-sm">
              <p><span className="text-muted-foreground">Father name:</span> {student.fatherName}</p>
              <p><span className="text-muted-foreground">Mother name:</span> {student.motherName}</p>
              <p><span className="text-muted-foreground">Parent phone:</span> {student.parentPhone}</p>
              <p><span className="text-muted-foreground">Parent NID:</span> {student.parentNid ?? "-"}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Enrollment Info</CardTitle></CardHeader>
            <CardContent className="space-y-1 text-sm">
              <p><span className="text-muted-foreground">Class:</span> {student.className}</p>
              <p><span className="text-muted-foreground">Batch:</span> {student.batchName}</p>
              <p><span className="text-muted-foreground">Session:</span> {student.session}</p>
              <p><span className="text-muted-foreground">Enrolled on:</span> {formatDate(student.enrolledOn)}</p>
              <p><span className="text-muted-foreground">Enrolled by:</span> {student.enrolledBy}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Account Info</CardTitle></CardHeader>
            <CardContent className="space-y-1 text-sm">
              <p><span className="text-muted-foreground">Login identifier:</span> {student.loginIdentifier}</p>
              <p>
                <span className="text-muted-foreground">Portal status:</span>{" "}
                <Badge variant={student.portalBlocked ? "destructive" : "default"}>
                  {student.portalBlocked ? "Blocked" : "Active"}
                </Badge>
              </p>
              <p><span className="text-muted-foreground">Last login:</span> {formatDateTime(student.lastLogin)}</p>
              <p><span className="text-muted-foreground">Password last reset:</span> {formatDateTime(student.passwordLastReset)}</p>
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader><CardTitle>Status History</CardTitle></CardHeader>
            <CardContent>
              <Collapsible>
                <CollapsibleTrigger asChild>
                  <Button variant="outline" size="sm">
                    Toggle Status History
                    <ChevronDown className="ml-1 size-4" />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-3 space-y-2">
                  {(historyQuery.data ?? student.statusHistory).length === 0 ? (
                    <p className="text-sm text-muted-foreground">No status changes yet.</p>
                  ) : (
                    (historyQuery.data ?? student.statusHistory).map((entry) => (
                      <div key={entry.id} className="rounded-lg border p-3 text-sm">
                        <p className="font-medium">{entry.oldStatus} → {entry.newStatus}</p>
                        <p className="text-muted-foreground">{formatDate(entry.date)} | {entry.changedBy}</p>
                        <p className="text-muted-foreground">Reason: {entry.reason ?? "-"}</p>
                      </div>
                    ))
                  )}
                </CollapsibleContent>
              </Collapsible>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {activeTab === "academic" ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>Current Placement</CardTitle></CardHeader>
            <CardContent className="space-y-1 text-sm">
              <p><span className="text-muted-foreground">Class:</span> {student.className}</p>
              <p><span className="text-muted-foreground">Batch:</span> {student.batchName}</p>
              <p><span className="text-muted-foreground">Shift:</span> {student.batchName.includes("Morning") ? "Morning" : "General"}</p>
              <p><span className="text-muted-foreground">Capacity:</span> {BATCHES.find((item) => item.id === student.batchId)?.capacity ?? "-"}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Promotion History</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              {student.promotionHistory.length === 0 ? (
                <p className="text-muted-foreground">No promotions yet</p>
              ) : (
                student.promotionHistory.map((entry) => (
                  <div key={entry.id} className="rounded-lg border p-3">
                    <p className="font-medium">Promoted from {entry.fromClass} / {entry.fromBatch} → {entry.toClass} / {entry.toBatch}</p>
                    <p className="text-muted-foreground">{formatDate(entry.date)} | by {entry.doneBy}</p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}

      {activeTab === "documents" ? (
        <Card>
          <CardHeader><CardTitle>Documents</CardTitle></CardHeader>
          <CardContent>
            {student.documents.length === 0 ? (
              <p className="text-sm text-muted-foreground">No documents uploaded</p>
            ) : (
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {student.documents.map((doc) => (
                  <Card key={doc.id}>
                    <CardContent className="space-y-2 p-3 text-sm">
                      <p className="font-medium">{doc.name}</p>
                      <p className="text-muted-foreground">{doc.type.toUpperCase()} | Uploaded {formatDate(doc.uploadedAt)}</p>
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
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}

      {activeTab === "payment" ? (
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Admission Fee</CardTitle></CardHeader>
            <CardContent className="space-y-1 text-sm">
              <p><span className="text-muted-foreground">Amount:</span> {student.admissionFee.amount}</p>
              <p><span className="text-muted-foreground">Method:</span> {student.admissionFee.method}</p>
              <p><span className="text-muted-foreground">Transaction ID:</span> {student.admissionFee.transactionId}</p>
              <p><span className="text-muted-foreground">Date:</span> {formatDate(student.admissionFee.date)}</p>
              <p><span className="text-muted-foreground">Verified by:</span> {student.admissionFee.verifiedBy}</p>
              <p>
                <span className="text-muted-foreground">Status:</span>{" "}
                <Badge variant={student.admissionFee.status === "Verified" ? "default" : "warning"}>{student.admissionFee.status}</Badge>
              </p>
            </CardContent>
          </Card>

          <Alert>
            <AlertTitle>Info</AlertTitle>
            <AlertDescription>Monthly fee records are managed in the Payment Module.</AlertDescription>
          </Alert>
        </div>
      ) : null}

      {activeTab === "attendance" ? (
        <div className="space-y-4">
          <Card>
            <CardContent className="space-y-3 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-sm">
                  Present <b>{attendance?.summary.present ?? 0}</b> | Absent <b>{attendance?.summary.absent ?? 0}</b> | Late <b>{attendance?.summary.late ?? 0}</b> | Total <b>{attendance?.summary.total ?? 0}</b> days
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon-sm"
                    onClick={() => {
                      const date = new Date(`${attendanceMonth}-01T00:00:00`)
                      date.setMonth(date.getMonth() - 1)
                      setAttendanceMonth(date.toISOString().slice(0, 7))
                    }}
                  >
                    <ChevronLeft className="size-4" />
                  </Button>
                  <span className="text-sm font-medium">{attendanceMonth}</span>
                  <Button
                    variant="outline"
                    size="icon-sm"
                    onClick={() => {
                      const date = new Date(`${attendanceMonth}-01T00:00:00`)
                      date.setMonth(date.getMonth() + 1)
                      setAttendanceMonth(date.toISOString().slice(0, 7))
                    }}
                  >
                    <ChevronRight className="size-4" />
                  </Button>
                </div>
              </div>

              {attendanceQuery.isLoading ? (
                <Skeleton className="h-32" />
              ) : (
                <div className="grid grid-cols-7 gap-2 md:grid-cols-10 lg:grid-cols-14">
                  {attendance?.entries.map((item) => (
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

      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Student Status</DialogTitle>
            <DialogDescription>Current status: {student.status}</DialogDescription>
          </DialogHeader>
          <RadioGroup value={statusForm.status} onValueChange={(value) => setStatusForm((prev) => ({ ...prev, status: value as StudentStatus }))}>
            <RadioGroupItem id="status-active" value="Active">Active - Currently enrolled and attending</RadioGroupItem>
            <RadioGroupItem id="status-inactive" value="Inactive">Inactive - Temporarily inactive</RadioGroupItem>
            <RadioGroupItem id="status-transferred" value="Transferred">Transferred - Moved to another institution</RadioGroupItem>
            <RadioGroupItem id="status-passed" value="Passed Out">Passed Out - Completed studies</RadioGroupItem>
            <RadioGroupItem id="status-dropped" value="Dropped">Dropped - Left without completing</RadioGroupItem>
          </RadioGroup>
          <Textarea value={statusForm.reason} onChange={(event) => setStatusForm((prev) => ({ ...prev, reason: event.target.value }))} placeholder="Reason for status change (optional)" />
          <Input type="date" value={statusForm.effectiveDate} onChange={(event) => setStatusForm((prev) => ({ ...prev, effectiveDate: event.target.value }))} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusDialogOpen(false)}>Cancel</Button>
            <Button onClick={updateStatus}>Update Status</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={promoteDialogOpen} onOpenChange={setPromoteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Promote Student</DialogTitle>
            <DialogDescription>Currently in {student.className} / {student.batchName}</DialogDescription>
          </DialogHeader>
          <Select value={promotionForm.toClassId} onValueChange={(value) => setPromotionForm((prev) => ({ ...prev, toClassId: value, toBatchId: "" }))}>
            <option value="">Promote to Class</option>
            {CLASSES.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </Select>
          <Select value={promotionForm.toBatchId} disabled={!promotionForm.toClassId} onValueChange={(value) => setPromotionForm((prev) => ({ ...prev, toBatchId: value }))}>
            <option value="">Select Batch</option>
            {destinationBatches.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </Select>
          <Input value={promotionForm.note} onChange={(event) => setPromotionForm((prev) => ({ ...prev, note: event.target.value }))} placeholder="Promotion note (optional)" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setPromoteDialogOpen(false)}>Cancel</Button>
            <Button onClick={promoteStudent}>Promote</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Student Password</DialogTitle>
            <DialogDescription>{student.name}</DialogDescription>
          </DialogHeader>

          <RadioGroup value={resetType} onValueChange={(value) => setResetType(value as "auto" | "manual")}>
            <RadioGroupItem id="pwd-auto" value="auto">Generate new password</RadioGroupItem>
            <RadioGroupItem id="pwd-manual" value="manual">Set manual password</RadioGroupItem>
          </RadioGroup>

          {resetType === "manual" ? (
            <>
              <Input type="password" value={manualPassword} onChange={(event) => setManualPassword(event.target.value)} placeholder="New password (min 8 chars)" />
              <Input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Confirm password" />
            </>
          ) : null}

          <div className="flex items-center justify-between rounded-lg border p-3 text-sm">
            <div>
              <p className="font-medium">Send new credentials via SMS/email</p>
              <p className="text-muted-foreground">Shown because notification channels are configured in demo mode.</p>
            </div>
            <Switch checked={notifyStudent} onCheckedChange={setNotifyStudent} />
          </div>

          {generatedPassword ? (
            <Alert>
              <AlertTitle>Generated Password</AlertTitle>
              <AlertDescription className="flex items-center justify-between gap-2">
                <span>{generatedPassword}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    await navigator.clipboard.writeText(generatedPassword)
                    toast.success("Password copied")
                  }}
                >
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
            <AlertDialogTitle>{student.portalBlocked ? "Restore Portal Access" : "Block Portal Access"}</AlertDialogTitle>
            <AlertDialogDescription>
              {student.portalBlocked
                ? "This student will be able to log in again."
                : "This student will not be able to log in to the student portal. Their data will not be deleted."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={togglePortalAccess}>{student.portalBlocked ? "Restore Access" : "Block Access"}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
    </div>
  )
}
