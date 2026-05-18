"use client"

import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  AlertCircle, Calendar, CheckCircle2, ChevronRight,
  ClipboardList, Eye, FilePlus2, FileText, Link2, Loader2, Monitor,
  Pencil, Plus, RefreshCw, Search, Star, Trash2, Upload, Video, X,
} from "lucide-react"
import toast from "react-hot-toast"

import { useAuth } from "@/context/AuthContext"
import api from "@/lib/api"
import { learningApi } from "@/features/learning/api"
import financeApi from "@/features/finance/api"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table-primitive"

// ─── Types ─────────────────────────────────────────────────────────────────────

type ListPayload<T> = T[] | { items?: T[]; data?: T[] }
type LookupOption = { id: string; name: string }

function asList<T>(payload: ListPayload<T> | undefined | null): T[] {
  if (!payload) return []
  if (Array.isArray(payload)) return payload
  return (payload.items ?? payload.data ?? []) as T[]
}

type AssessmentType = "ASSIGNMENT" | "QUIZ"
type PublishStatus = "DRAFT" | "PUBLISHED"

type Assessment = {
  id: string
  title: string
  description?: string
  assessment_type: AssessmentType
  class_id: string
  class_name?: string
  batch_id: string
  batch_name?: string
  subject_id: string
  subject_name?: string
  total_marks: number
  passing_marks: number
  visibility: string
  publish_status: PublishStatus
  instructions?: string
  deadline?: string
  submission_count?: number
  teacher?: { id: string; name: string } | null
  created_at: string
  // student-only fields (surfaced by the student listing endpoint)
  my_submitted?: boolean
  my_is_late?: boolean
  my_obtained_marks?: number | null
  my_result_status?: "NOT_SUBMITTED" | "NOT_MARKED" | "MARKED" | string
}

type Submission = {
  id: string
  student?: { id: string; name: string }
  file_url?: string
  answer_link?: string
  comment?: string
  submitted_at?: string
  marks_obtained?: number | null
  marks_feedback?: string | null
  is_marked?: boolean
  assessment?: { total_marks: number }
}

type CreateForm = {
  title: string
  description: string
  class_id: string   // UI only — for filtering batches, not sent to API
  batch_id: string
  subject_id: string
  assessment_type: AssessmentType
  marks: string
  submission_value: string
  submission_unit: "HOURS" | "DAYS"
  link: string
}

const EMPTY_FORM: CreateForm = {
  title: "",
  description: "",
  class_id: "",
  batch_id: "",
  subject_id: "",
  assessment_type: "ASSIGNMENT",
  marks: "",
  submission_value: "7",
  submission_unit: "DAYS",
  link: "",
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function typeIcon(type: AssessmentType) {
  if (type === "QUIZ") return <ClipboardList className="h-4 w-4 text-sky-500" />
  return <FileText className="h-4 w-4 text-amber-500" />
}

function typeLabel(type: AssessmentType) {
  if (type === "QUIZ") return "Quiz"
  return "Assignment"
}

function publishBadge(status: PublishStatus) {
  return status === "PUBLISHED"
    ? <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400">Published</Badge>
    : <Badge className="bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400">Draft</Badge>
}

function markedBadge(isMarked?: boolean) {
  return isMarked
    ? <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 gap-1"><CheckCircle2 className="h-3 w-3" />Marked</Badge>
    : <Badge className="bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400">Pending</Badge>
}

function formatDate(iso?: string | null) {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
}

function formatDateTime(iso?: string | null) {
  if (!iso) return "—"
  return new Date(iso).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function AssessmentsPage() {
  const { user } = useAuth()
  const tenantId = user?.tenant_id ?? user?.tenant?.id ?? null
  const role = String(user?.role ?? (Array.isArray(user?.roles) ? user?.roles[0] : user?.roles) ?? "").toLowerCase()
  const isStudent = role === "student"
  const isTeacherOrAdmin = role === "teacher" || role === "admin" || role === "superadmin"

  const qc = useQueryClient()
  const searchParams = useSearchParams()
  const focusId = searchParams?.get("focus") ?? null

  // ── List state ──
  const [search, setSearch] = useState("")
  const [filterType, setFilterType] = useState<AssessmentType | "ALL">("ALL")
  const [filterStatus, setFilterStatus] = useState<PublishStatus | "ALL">("ALL")

  // ── Create dialog ──
  const [createOpen, setCreateOpen] = useState(false)
  const [form, setForm] = useState<CreateForm>(EMPTY_FORM)
  const f = (k: keyof CreateForm, v: string) => setForm(p => ({ ...p, [k]: v }))

  // ── View / Submissions sheet ──
  const [viewAssessment, setViewAssessment] = useState<Assessment | null>(null)
  const [markDialogSub, setMarkDialogSub] = useState<Submission | null>(null)
  const [markScore, setMarkScore] = useState("")
  const [markFeedback, setMarkFeedback] = useState("")

  // ── Student: Submit Dialog ──
  const [submitTarget, setSubmitTarget] = useState<Assessment | null>(null)
  const [submitLink, setSubmitLink] = useState("")
  const [submitComment, setSubmitComment] = useState("")
  const [submitFile, setSubmitFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadedFileUrl, setUploadedFileUrl] = useState("")

  // ── Student: My Mark Dialog ──
  const [markTarget, setMarkTarget] = useState<Assessment | null>(null)

  // ── Delete ──
  const [deleteTarget, setDeleteTarget] = useState<Assessment | null>(null)

  // ─── Queries ────────────────────────────────────────────────────────────────

  // Resolve student's enrolled batch_id — required by the backend's
  // /tenants/:tenantId/student/assessments?batch_id=... endpoint.
  const userBatchId = String(
    (user as any)?.batch_id ??
      (user as any)?.batchId ??
      (user as any)?.batch?.id ??
      (user as any)?.student?.batch_id ??
      (user as any)?.studentProfile?.batch_id ??
      ""
  ).trim()

  const studentClassesQuery = useQuery({
    queryKey: ["student-my-classes", tenantId],
    enabled: Boolean(tenantId) && isStudent && !userBatchId,
    queryFn: async () => {
      const res = await api.get("/api/students/me/classes")
      const payload = res?.data?.data ?? res?.data ?? null
      const classes: Array<{ batch_id?: string }> = Array.isArray(payload?.classes)
        ? payload.classes
        : []
      return classes
    },
  })

  const studentBatchId =
    userBatchId ||
    String(studentClassesQuery.data?.[0]?.batch_id ?? "").trim()

  const listKey = isStudent
    ? ["student-assessments", tenantId, studentBatchId]
    : ["teacher-assessments", tenantId]

  const { data: listData, isLoading, isError, refetch } = useQuery({
    queryKey: listKey,
    queryFn: async () => {
      if (!tenantId) return { items: [], meta: { total: 0 } }
      const res = isStudent
        ? await learningApi.getStudentAssessments(tenantId, {
            limit: 50,
            batch_id: studentBatchId,
          })
        : await learningApi.getTeacherAssessments(tenantId, { limit: 50 })
      return res.data
    },
    enabled: Boolean(tenantId) && (!isStudent || Boolean(studentBatchId)),
  })

  // Submissions for selected assessment (teacher).
  // Backend returns { assessment, items: [...] } with each item using
  // `obtained_marks` / `feedback` / `file.url` / `link` — normalize here so
  // the submissions table and the mark dialog can read the values they expect
  // (`marks_obtained` / `marks_feedback` / `file_url` / `answer_link` /
  // `is_marked`).
  const { data: subsData, isLoading: subsLoading, refetch: refetchSubs } = useQuery({
    queryKey: ["submissions", tenantId, viewAssessment?.id],
    queryFn: async () => {
      if (!tenantId || !viewAssessment) return { submissions: [] }
      const res = await learningApi.getSubmissions(tenantId, viewAssessment.id)
      const raw = (res?.data as any) ?? {}
      const rawItems: any[] = Array.isArray(raw?.items)
        ? raw.items
        : Array.isArray(raw?.submissions)
          ? raw.submissions
          : []
      const submissions: Submission[] = rawItems.map((s: any) => ({
        id: s.id,
        student: s.student
          ? { id: s.student.id, name: s.student.name }
          : undefined,
        file_url: s.file_url ?? s.file?.url ?? s.file?.secure_url ?? undefined,
        answer_link: s.answer_link ?? s.link ?? undefined,
        comment: s.comment ?? s.note ?? undefined,
        submitted_at: s.submitted_at ?? s.first_submitted_at ?? undefined,
        marks_obtained:
          s.marks_obtained ?? s.obtained_marks ?? null,
        marks_feedback:
          s.marks_feedback ?? s.feedback ?? null,
        is_marked:
          s.is_marked ??
          (s.obtained_marks !== null && s.obtained_marks !== undefined) ??
          false,
        assessment: s.assessment,
      }))
      return { submissions, assessment: raw.assessment }
    },
    enabled: Boolean(tenantId) && Boolean(viewAssessment) && isTeacherOrAdmin,
  })

  // My mark for selected assessment (student)
  const { data: myMarkData, isLoading: markLoading } = useQuery({
    queryKey: ["my-mark", tenantId, markTarget?.id],
    queryFn: async () => {
      if (!tenantId || !markTarget) return null
      const res = await learningApi.getStudentMark(tenantId, markTarget.id)
      return res.data
    },
    enabled: Boolean(tenantId) && Boolean(markTarget) && isStudent,
  })


  // ─── Lookup queries (classes / batches / subjects for create form) ───────────

  const classesQuery = useQuery({
    queryKey: ["assessment", "classes", tenantId],
    enabled: Boolean(tenantId) && isTeacherOrAdmin,
    queryFn: () => financeApi.listTenantClasses(String(tenantId), { page: 1, limit: 50 }),
  })

  const batchesQuery = useQuery({
    queryKey: ["assessment", "batches", tenantId, form.class_id],
    enabled: Boolean(tenantId) && isTeacherOrAdmin,
    queryFn: () =>
      financeApi.listTenantBatches(String(tenantId), {
        page: 1,
        limit: 50,
        class_id: form.class_id || undefined,
      }),
  })

  const subjectsQuery = useQuery({
    queryKey: ["assessment", "subjects", tenantId],
    enabled: Boolean(tenantId) && isTeacherOrAdmin,
    queryFn: async () => {
      const res = await api.get(`/tenants/${tenantId}/subjects`, { params: { page: 1, limit: 50 } })
      return res.data
    },
  })

  const classOptions = useMemo<LookupOption[]>(() => {
    return asList<Record<string, unknown>>(classesQuery.data as ListPayload<Record<string, unknown>>)
      .map(r => ({ id: String(r.id ?? "").trim(), name: String(r.name ?? r.class_name ?? "Unnamed").trim() }))
      .filter(r => r.id.length > 0)
  }, [classesQuery.data])

  const batchOptions = useMemo<LookupOption[]>(() => {
    return asList<Record<string, unknown>>(batchesQuery.data as ListPayload<Record<string, unknown>>)
      .map(r => ({ id: String(r.id ?? r.batch_id ?? "").trim(), name: String(r.name ?? r.batch_name ?? r.section ?? "Unnamed").trim() }))
      .filter(r => r.id.length > 0)
  }, [batchesQuery.data])

  const subjectOptions = useMemo<LookupOption[]>(() => {
    return asList<Record<string, unknown>>(subjectsQuery.data as ListPayload<Record<string, unknown>>)
      .map(r => ({ id: String(r.id ?? r.subject_id ?? "").trim(), name: String(r.name ?? r.subject_name ?? "Unnamed").trim() }))
      .filter(r => r.id.length > 0)
  }, [subjectsQuery.data])

  // ─── Mutations ──────────────────────────────────────────────────────────────

  const createMut = useMutation({
    mutationFn: async () => {
      if (!tenantId) throw new Error("Tenant ID missing")
      const payload: Record<string, unknown> = {
        batch_id: form.batch_id,
        subject_id: form.subject_id,
        title: form.title || undefined,
        description: form.description,
        assessment_type: form.assessment_type,
        submission_value: Number(form.submission_value),
        submission_unit: form.submission_unit,
        ...(form.marks && Number(form.marks) > 0 ? { marks: Number(form.marks) } : {}),
        ...(form.link.trim() ? { link: form.link.trim() } : {}),
      }
      return learningApi.createAssessment(tenantId, payload)
    },
    onSuccess: () => {
      toast.success("Assessment created")
      qc.invalidateQueries({ queryKey: listKey })
      setCreateOpen(false)
      setForm(EMPTY_FORM)
    },
    onError: () => toast.error("Failed to create"),
  })

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      if (!tenantId) throw new Error()
      return learningApi.deleteAssessment(tenantId, id)
    },
    onSuccess: () => {
      toast.success("Assessment deleted")
      qc.invalidateQueries({ queryKey: listKey })
      setDeleteTarget(null)
    },
    onError: () => toast.error("Failed to delete"),
  })

  // Student submit
  const submitMut = useMutation({
    mutationFn: async () => {
      if (!tenantId || !submitTarget) throw new Error()
      // Backend's SubmitAssessmentDto is whitelisted to exactly
      // `answer_file_id` (UUID) and `answer_link` (URL). Any extra key
      // (e.g. the old `file_id`, `comment`) is rejected with
      // "property X should not exist". Sending `null` for a URL/UUID also
      // fails validation, so omit empty fields entirely.
      const payload: Record<string, unknown> = {}
      if (uploadedFileUrl) payload.answer_file_id = uploadedFileUrl
      if (submitLink.trim()) payload.answer_link = submitLink.trim()
      return learningApi.submitAssessment(tenantId, submitTarget.id, payload)
    },
    onSuccess: () => {
      toast.success("Answer submitted!")
      // Persist what the student just submitted so they can recall it from
      // the "My Result" dialog (the backend's mark endpoint doesn't return
      // the student's own file/link).
      if (submitTarget) {
        writeSubmittedAnswer(submitTarget.id, {
          file_url: uploadedFileMeta?.url || undefined,
          file_name: uploadedFileMeta?.name || undefined,
          answer_link: submitLink.trim() || undefined,
          submitted_at: new Date().toISOString(),
        })
      }
      qc.invalidateQueries({ queryKey: listKey })
      setSubmitTarget(null)
      setSubmitLink("")
      setSubmitComment("")
      setSubmitFile(null)
      setUploadedFileMeta(null)
      setUploadedFileUrl("")
    },
    onError: () => toast.error("Failed to submit"),
  })

  // Teacher mark submission. Backend DTO expects `obtained_marks`, not
  // `marks_obtained` — send both so older mock paths still work, but the real
  // backend reads the canonical field.
  const markMut = useMutation({
    mutationFn: async () => {
      if (!tenantId || !viewAssessment || !markDialogSub) throw new Error()
      const score = Number(markScore)
      // Backend's MarkAssessmentSubmissionDto is whitelisted to exactly
      // `obtained_marks` (int) and optional `feedback` (string). Sending any
      // other key (e.g. the legacy `marks_obtained`) is rejected with
      // "property X should not exist".
      const payload: any = { obtained_marks: score }
      if (markFeedback.trim()) payload.feedback = markFeedback.trim()
      if (markDialogSub.is_marked) {
        return learningApi.updateMark(tenantId, viewAssessment.id, markDialogSub.id, payload)
      }
      return learningApi.markSubmission(tenantId, viewAssessment.id, markDialogSub.id, payload)
    },
    onSuccess: () => {
      toast.success("Mark saved")
      qc.invalidateQueries({ queryKey: ["submissions", tenantId, viewAssessment?.id] })
      setMarkDialogSub(null)
      setMarkScore("")
      setMarkFeedback("")
    },
    onError: () => toast.error("Failed to save mark"),
  })

  // ── Submitted-answer recall (localStorage) ─────────────────────────────────
  // The backend's student-side endpoints don't return what the student actually
  // submitted (file URL or answer link). To let the student see their own
  // submission after the fact, persist a tiny snapshot at submit-time and
  // recall it inside the "My Result" dialog.
  const studentId = String((user as any)?.id ?? (user as any)?.user_id ?? "")
  const submittedAnswerKey = (assessmentId: string) =>
    `submitted-answer:${tenantId ?? "nt"}:${studentId || "anon"}:${assessmentId}`
  type SubmittedAnswerSnapshot = {
    file_url?: string
    file_name?: string
    answer_link?: string
    submitted_at: string
  }
  const readSubmittedAnswer = (assessmentId: string): SubmittedAnswerSnapshot | null => {
    if (typeof window === "undefined") return null
    try {
      const raw = window.localStorage.getItem(submittedAnswerKey(assessmentId))
      return raw ? (JSON.parse(raw) as SubmittedAnswerSnapshot) : null
    } catch {
      return null
    }
  }
  const writeSubmittedAnswer = (assessmentId: string, snap: SubmittedAnswerSnapshot) => {
    if (typeof window === "undefined") return
    try {
      window.localStorage.setItem(submittedAnswerKey(assessmentId), JSON.stringify(snap))
    } catch { /* quota / private mode — ignore */ }
  }

  // Snapshot of the most recent successful upload, so we can persist its public
  // URL (not just the file_id) at submit-time.
  const [uploadedFileMeta, setUploadedFileMeta] = useState<{ id: string; url: string; name: string } | null>(null)

  // File upload for student submit
  const handleUploadFile = async (file: File) => {
    if (!tenantId) return
    setUploading(true)
    try {
      const res = await learningApi.uploadMedia(tenantId, file)
      const data = (res.data as any) ?? {}
      // Backend's submit endpoint expects `answer_file_id` to be the Media
      // row's UUID. We additionally remember the URL + original name so we
      // can show the student what they submitted later.
      const fileId = String(data?.id ?? "")
      if (!fileId) throw new Error("Upload returned no file id")
      setUploadedFileUrl(fileId)
      setUploadedFileMeta({
        id: fileId,
        url: String(data?.url ?? data?.secure_url ?? ""),
        name: String(data?.original_name ?? data?.file_name ?? file.name ?? ""),
      })
      toast.success("File uploaded")
    } catch {
      toast.error("File upload failed")
    } finally {
      setUploading(false)
    }
  }

  // ─── Filtered list ──────────────────────────────────────────────────────────

  // Backend response uses `marks` / `deadline_at` / no `passing_marks` etc.
  // Normalize each row into the frontend's Assessment shape so the list row,
  // view dialog, submit dialog and mark dialog all read the right values.
  const normalizeAssessment = (raw: any): Assessment => ({
    ...raw,
    total_marks:
      raw?.total_marks ??
      raw?.marks ??
      0,
    passing_marks:
      raw?.passing_marks ??
      raw?.pass_marks ??
      0,
    deadline:
      raw?.deadline ??
      raw?.deadline_at ??
      undefined,
    submission_count:
      raw?.submission_count ??
      raw?.total_submissions ??
      0,
    class_id: raw?.class_id ?? "",
    class_name: raw?.class_name ?? undefined,
    batch_id: raw?.batch_id ?? "",
    batch_name: raw?.batch_name ?? undefined,
    my_submitted: raw?.my_submission?.submitted,
    my_is_late: raw?.my_submission?.is_late,
    my_obtained_marks: raw?.my_submission?.obtained_marks ?? null,
    my_result_status: raw?.my_submission?.result_status,
  })

  const allItems: Assessment[] = useMemo(() => {
    const raw = (listData as any)?.items ?? []
    return raw
      .map((item: any) => normalizeAssessment(item))
      .filter((item: Assessment) => {
        if (filterType !== "ALL" && item.assessment_type !== filterType) return false
        if (filterStatus !== "ALL" && item.publish_status !== filterStatus) return false
        if (search && !`${item.title} ${item.description ?? ""}`.toLowerCase().includes(search.toLowerCase())) return false
        return true
      })
  }, [listData, filterType, filterStatus, search])

  const totalItems = (listData as any)?.meta?.total ?? allItems.length

  // Auto-open focused assessment (from class-session modal). Placed after
  // `allItems` is declared to avoid a TDZ "Cannot access 'allItems' before
  // initialization" error.
  useEffect(() => {
    if (!focusId) return
    const target = allItems.find((a) => a.id === focusId)
    if (!target) return
    if (isStudent) {
      setSubmitTarget(target)
    } else if (isTeacherOrAdmin) {
      setViewAssessment(target)
    }
  }, [focusId, allItems, isStudent, isTeacherOrAdmin])
  const allSubsList: Submission[] = (subsData as any)?.submissions ?? []

  const canCreate = useMemo(() =>
    Boolean(form.class_id.trim() && form.batch_id.trim() && form.subject_id.trim() && form.description.trim() && Number(form.submission_value) >= 1),
    [form]
  )

  if (!tenantId) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <AlertCircle className="h-10 w-10 text-muted-foreground" />
        <p className="text-muted-foreground text-sm">Tenant ID not found. Please log in again.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      {/* ─── Header ─── */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <ClipboardList className="h-6 w-6 text-primary" />
            Assessments
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isStudent ? "View and submit your assignments, quizzes and exams" : "Create, publish and mark student submissions"}
          </p>
        </div>
        {isTeacherOrAdmin && (
          <Button onClick={() => setCreateOpen(true)} className="gap-2 self-start sm:self-auto">
            <Plus className="h-4 w-4" />
            New Assessment
          </Button>
        )}
      </div>

      {/* ─── Stats ─── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Total", value: totalItems, color: "text-primary" },
          { label: "Published", value: ((listData as any)?.items ?? []).filter((i: Assessment) => i.publish_status === "PUBLISHED").length, color: "text-emerald-600" },
          { label: "Draft", value: ((listData as any)?.items ?? []).filter((i: Assessment) => i.publish_status === "DRAFT").length, color: "text-amber-600" },
          {
            label: isTeacherOrAdmin ? "Total Submissions" : "Quiz / Exam",
            value: isTeacherOrAdmin
              ? ((listData as any)?.items ?? []).reduce((acc: number, i: Assessment) => acc + (i.submission_count ?? 0), 0)
              : ((listData as any)?.items ?? []).filter((i: Assessment) => i.assessment_type !== "ASSIGNMENT").length,
            color: "text-violet-600"
          },
        ].map(stat => (
          <Card key={stat.label} className="border">
            <CardContent className="pt-4 pb-3 px-4">
              <p className={`text-2xl font-bold ${stat.color}`}>{isLoading ? "—" : stat.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ─── Filters ─── */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search assessments..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          value={filterType}
          onChange={e => setFilterType(e.target.value as any)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="ALL">All Types</option>
          <option value="ASSIGNMENT">Assignment</option>
          <option value="QUIZ">Quiz</option>
        </select>
        {!isStudent && (
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value as any)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="ALL">All Status</option>
            <option value="PUBLISHED">Published</option>
            <option value="DRAFT">Draft</option>
          </select>
        )}
        <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-1.5">
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </Button>
      </div>

      {/* ─── Table ─── */}
      <Card className="border">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
            </div>
          ) : isError ? (
            <div className="flex flex-col items-center justify-center h-48 gap-2">
              <AlertCircle className="h-8 w-8 text-destructive" />
              <p className="text-sm text-muted-foreground">Failed to load data.</p>
              <Button variant="outline" size="sm" onClick={() => refetch()}>Retry</Button>
            </div>
          ) : allItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 gap-2 text-muted-foreground">
              <ClipboardList className="h-10 w-10 opacity-30" />
              <p className="text-sm">No assessments found.</p>
              {isTeacherOrAdmin && (
                <Button size="sm" onClick={() => setCreateOpen(true)} className="mt-1 gap-1.5">
                  <Plus className="h-3.5 w-3.5" />
                  Create First Assessment
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Title</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Class / Batch</TableHead>
                    <TableHead>Marks</TableHead>
                    <TableHead>Deadline</TableHead>
                    {isTeacherOrAdmin && <TableHead className="text-center">Submissions</TableHead>}
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {typeIcon(item.assessment_type)}
                          <span className="font-medium text-sm max-w-40 truncate">{item.title}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs gap-1">
                          {typeIcon(item.assessment_type)}
                          {typeLabel(item.assessment_type)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {item.class_name || item.batch_name || item.subject_name ? (
                            <>
                              {item.class_name ? (
                                <span className="font-medium">{item.class_name}</span>
                              ) : null}
                              {item.batch_name ? (
                                <span className="text-muted-foreground">
                                  {item.class_name ? " / " : ""}
                                  {item.batch_name}
                                </span>
                              ) : null}
                              {!item.class_name && !item.batch_name && item.subject_name ? (
                                <span className="font-medium">{item.subject_name}</span>
                              ) : null}
                            </>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {isStudent ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="text-sm font-mono">
                              {item.my_result_status === "MARKED"
                                ? (
                                  <>
                                    <span className="font-semibold text-primary">{item.my_obtained_marks}</span>
                                    <span className="text-muted-foreground"> / {item.total_marks}</span>
                                  </>
                                )
                                : (
                                  <span className="text-muted-foreground">— / {item.total_marks || "—"}</span>
                                )
                              }
                            </span>
                            {item.my_result_status === "MARKED" ? (
                              <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-[10px] w-fit">Marked</Badge>
                            ) : item.my_result_status === "NOT_MARKED" ? (
                              <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-[10px] w-fit">Submitted</Badge>
                            ) : (
                              <Badge className="bg-slate-100 text-slate-600 border-slate-200 text-[10px] w-fit">Not submitted</Badge>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm font-mono">
                            {item.total_marks || "—"}
                            {item.passing_marks ? (
                              <span className="text-muted-foreground text-xs"> / pass {item.passing_marks}</span>
                            ) : null}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          {item.deadline
                            ? <><Calendar className="h-3 w-3" />{formatDate(item.deadline)}</>
                            : "—"
                          }
                        </span>
                      </TableCell>
                      {isTeacherOrAdmin && (
                        <TableCell className="text-center">
                          <Badge variant="outline" className="text-xs">{item.submission_count ?? 0}</Badge>
                        </TableCell>
                      )}
                      <TableCell>{publishBadge(item.publish_status)}</TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          {isTeacherOrAdmin && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => setViewAssessment(item)}
                              title="View Submissions"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {isStudent && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => setSubmitTarget(item)}
                                title="Submit Answer"
                              >
                                <Upload className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => setMarkTarget(item)}
                                title="View My Mark"
                              >
                                <Star className="h-3.5 w-3.5 text-amber-500" />
                              </Button>
                            </>
                          )}
                          {isTeacherOrAdmin && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() => setDeleteTarget(item)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ═══════════════════════════════════════════════════════════════════════
          TEACHER: Create Assessment Dialog
         ═══════════════════════════════════════════════════════════════════════ */}
      <Dialog open={createOpen} onOpenChange={open => { setCreateOpen(open); if (!open) setForm(EMPTY_FORM) }}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FilePlus2 className="h-5 w-5" />
              Create New Assessment
            </DialogTitle>
            <DialogDescription>Add an assignment, quiz or exam.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            {/* Type selector */}
            <div className="grid grid-cols-3 gap-2">
              {(["ASSIGNMENT", "QUIZ"] as AssessmentType[]).map(at => (
                <button
                  key={at}
                  type="button"
                  onClick={() => f("assessment_type", at)}
                  className={`flex flex-col items-center gap-1.5 rounded-lg border-2 p-3 text-xs font-medium transition-colors ${
                    form.assessment_type === at
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  {typeIcon(at)}
                  {typeLabel(at)}
                </button>
              ))}
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Title *</label>
              <Input placeholder="e.g. Mid-Term Assignment" value={form.title} onChange={e => f("title", e.target.value)} />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Class *</label>
                <select
                  value={form.class_id}
                  onChange={e => setForm(p => ({ ...p, class_id: e.target.value, batch_id: "", subject_id: "" }))}
                  disabled={classesQuery.isLoading}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                >
                  <option value="">Select class</option>
                  {classOptions.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Batch *</label>
                <select
                  value={form.batch_id}
                  onChange={e => f("batch_id", e.target.value)}
                  disabled={batchesQuery.isLoading || !form.class_id}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                >
                  <option value="">Select batch</option>
                  {batchOptions.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Subject *</label>
                <select
                  value={form.subject_id}
                  onChange={e => f("subject_id", e.target.value)}
                  disabled={subjectsQuery.isLoading}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                >
                  <option value="">Select subject</option>
                  {subjectOptions.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Description *</label>
              <Textarea
                placeholder="Brief description of this assessment..."
                value={form.description}
                onChange={e => f("description", e.target.value)}
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Submission Window *</label>
                <Input
                  type="number"
                  min="1"
                  value={form.submission_value}
                  onChange={e => f("submission_value", e.target.value)}
                  placeholder="e.g. 7"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Unit *</label>
                <select
                  value={form.submission_unit}
                  onChange={e => f("submission_unit", e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="DAYS">Days</option>
                  <option value="HOURS">Hours</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium">Marks (optional)</label>
              <Input
                type="number"
                min="1"
                max="10000"
                placeholder="e.g. 100"
                value={form.marks}
                onChange={e => f("marks", e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium">Answer Link (optional)</label>
              <Input
                placeholder="https://docs.google.com/..."
                value={form.link}
                onChange={e => f("link", e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={() => createMut.mutate()} disabled={!canCreate || createMut.isPending} className="gap-2">
              {createMut.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════════════════════
          TEACHER: View Submissions Dialog
         ═══════════════════════════════════════════════════════════════════════ */}
      <Dialog open={Boolean(viewAssessment)} onOpenChange={open => { if (!open) setViewAssessment(null) }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {viewAssessment && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {typeIcon(viewAssessment.assessment_type)}
                  {viewAssessment.title}
                </DialogTitle>
                <DialogDescription>
                  {viewAssessment.description || "No description provided."}
                </DialogDescription>
              </DialogHeader>

              {/* Assessment details */}
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm py-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Type</span>
                  <Badge variant="outline">{typeLabel(viewAssessment.assessment_type)}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Marks</span>
                  <span className="font-mono">{viewAssessment.total_marks} (pass: {viewAssessment.passing_marks})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Deadline</span>
                  <span>{formatDateTime(viewAssessment.deadline)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  {publishBadge(viewAssessment.publish_status)}
                </div>
              </div>

              {viewAssessment.instructions && (
                <div className="rounded-lg border bg-muted/30 p-3 text-sm">
                  <p className="font-medium text-muted-foreground mb-1">Instructions</p>
                  <p>{viewAssessment.instructions}</p>
                </div>
              )}

              {/* Submissions table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm">Submissions ({allSubsList.length})</h3>
                  <Button variant="ghost" size="sm" onClick={() => refetchSubs()} className="gap-1.5">
                    <RefreshCw className="h-3.5 w-3.5" />
                  </Button>
                </div>
                {subsLoading ? (
                  <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
                ) : allSubsList.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-24 text-muted-foreground">
                    <p className="text-sm">No submissions yet.</p>
                  </div>
                ) : (
                  <div className="rounded-lg border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead>Student</TableHead>
                          <TableHead>Submitted At</TableHead>
                          <TableHead>Marks</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {allSubsList.map((sub) => (
                          <TableRow key={sub.id}>
                            <TableCell>
                              <span className="font-medium text-sm">{sub.student?.name ?? "Unknown"}</span>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">{formatDateTime(sub.submitted_at)}</TableCell>
                            <TableCell>
                              {sub.is_marked
                                ? <span className="font-mono text-sm">{sub.marks_obtained} / {viewAssessment.total_marks}</span>
                                : <span className="text-muted-foreground text-xs">—</span>
                              }
                            </TableCell>
                            <TableCell>{markedBadge(sub.is_marked)}</TableCell>
                            <TableCell>
                              <div className="flex justify-end gap-1">
                                {sub.file_url && (
                                  <a
                                    href={sub.file_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    title="Open uploaded file"
                                  >
                                    <Button variant="ghost" size="icon" className="h-7 w-7">
                                      <FileText className="h-3.5 w-3.5" />
                                    </Button>
                                  </a>
                                )}
                                {sub.answer_link && (
                                  <a
                                    href={sub.answer_link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    title="Open answer link"
                                  >
                                    <Button variant="ghost" size="icon" className="h-7 w-7">
                                      <Link2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </a>
                                )}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 text-xs gap-1"
                                  onClick={() => {
                                    setMarkDialogSub(sub)
                                    setMarkScore(String(sub.marks_obtained ?? ""))
                                    setMarkFeedback(sub.marks_feedback ?? "")
                                  }}
                                >
                                  {sub.is_marked ? <><Pencil className="h-3 w-3" /> Update</> : <><Star className="h-3 w-3" /> Mark</>}
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════════════════════
          TEACHER: Mark / Update Mark Dialog
         ═══════════════════════════════════════════════════════════════════════ */}
      <Dialog open={Boolean(markDialogSub)} onOpenChange={open => { if (!open) { setMarkDialogSub(null); setMarkScore(""); setMarkFeedback("") } }}>
        <DialogContent className="max-w-sm">
          {markDialogSub && viewAssessment && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5 text-amber-500" />
                  {markDialogSub.is_marked ? "Update Mark" : "Give Mark"}
                </DialogTitle>
                <DialogDescription>
                  {markDialogSub.student?.name} — Max marks: {viewAssessment.total_marks}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 py-2">
                {markDialogSub.comment && (
                  <div className="rounded-lg border bg-muted/30 p-3 text-sm">
                    <p className="text-muted-foreground text-xs mb-1">Student's Comment</p>
                    <p>{markDialogSub.comment}</p>
                  </div>
                )}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Marks Obtained *</label>
                  <Input
                    type="number"
                    min="0"
                    max={viewAssessment.total_marks}
                    placeholder={`0 - ${viewAssessment.total_marks}`}
                    value={markScore}
                    onChange={e => setMarkScore(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Feedback (optional)</label>
                  <Textarea
                    placeholder="Leave a comment for the student..."
                    value={markFeedback}
                    onChange={e => setMarkFeedback(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setMarkDialogSub(null)}>Cancel</Button>
                <Button
                  onClick={() => markMut.mutate()}
                  disabled={!markScore || markMut.isPending}
                  className="gap-2"
                >
                  {markMut.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  Save
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════════════════════
          STUDENT: Submit Assignment Dialog
         ═══════════════════════════════════════════════════════════════════════ */}
      <Dialog open={Boolean(submitTarget)} onOpenChange={open => {
        if (!open) { setSubmitTarget(null); setSubmitLink(""); setSubmitComment(""); setUploadedFileUrl("") }
      }}>
        <DialogContent className="max-w-md">
          {submitTarget && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Submit Answer
                </DialogTitle>
                <DialogDescription>
                  {submitTarget.title} — Total: {submitTarget.total_marks} marks
                </DialogDescription>
              </DialogHeader>

              {submitTarget.instructions && (
                <div className="rounded-lg border bg-muted/30 p-3 text-sm">
                  <p className="font-medium text-muted-foreground text-xs mb-1">Instructions</p>
                  <p>{submitTarget.instructions}</p>
                </div>
              )}

              <div className="space-y-4 py-2">
                {/* File upload */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Upload File (optional)</label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="file"
                      disabled={uploading}
                      onChange={e => { const file = e.target.files?.[0]; if (file) { setSubmitFile(file); handleUploadFile(file) } }}
                      className="flex-1"
                    />
                    {uploading && <Loader2 className="h-4 w-4 animate-spin" />}
                  </div>
                  {uploadedFileUrl && (
                    <p className="text-xs text-emerald-600">✓ Upload complete</p>
                  )}
                </div>

                {/* Answer link */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Answer Link (optional)</label>
                  <Input
                    placeholder="https://docs.google.com/..."
                    value={submitLink}
                    onChange={e => setSubmitLink(e.target.value)}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setSubmitTarget(null)}>Cancel</Button>
                <Button
                  onClick={() => submitMut.mutate()}
                  disabled={(!submitLink && !uploadedFileUrl) || submitMut.isPending || uploading}
                  className="gap-2"
                >
                  {submitMut.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  Submit
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════════════════════
          STUDENT: My Mark Dialog
         ═══════════════════════════════════════════════════════════════════════ */}
      <Dialog open={Boolean(markTarget)} onOpenChange={open => { if (!open) setMarkTarget(null) }}>
        <DialogContent className="max-w-sm">
          {markTarget && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5 text-amber-500" />
                  My Result
                </DialogTitle>
                <DialogDescription>{markTarget.title}</DialogDescription>
              </DialogHeader>
              <div className="py-4">
                {markLoading ? (
                  <Skeleton className="h-24 w-full rounded-lg" />
                ) : (() => {
                  const m = (myMarkData as any) ?? {}
                  const obtained = m.obtained_marks ?? m.marks_obtained ?? null
                  const feedback = m.feedback ?? m.marks_feedback ?? null
                  const totalMarks = m.total_marks ?? markTarget.total_marks
                  const resultStatus = m.result_status as string | undefined
                  const submitted = m.submitted ?? Boolean(m.submission?.submitted_at)
                  const sub = m.submission ?? {}
                  const isMarked = resultStatus === "MARKED" || obtained !== null

                  if (!submitted) {
                    return (
                      <div className="flex flex-col items-center justify-center h-24 gap-2 text-muted-foreground">
                        <CheckCircle2 className="h-8 w-8 opacity-30" />
                        <p className="text-sm">Not submitted yet.</p>
                      </div>
                    )
                  }

                  return (
                    <div className="space-y-4">
                      <div className="flex flex-col items-center justify-center gap-2 py-2">
                        <div className="text-5xl font-bold text-primary">
                          {isMarked ? obtained : "—"}
                        </div>
                        <div className="text-muted-foreground text-sm">
                          / {totalMarks} marks
                        </div>
                        {isMarked ? (
                          <Badge className="bg-emerald-100 text-emerald-700 mt-1">Marked ✓</Badge>
                        ) : (
                          <Badge className="bg-amber-100 text-amber-700 mt-1">Awaiting teacher's review</Badge>
                        )}
                      </div>

                      <div className="rounded-lg border bg-muted/30 p-3 text-xs space-y-1">
                        {sub.submitted_at && (
                          <div className="flex justify-between gap-3">
                            <span className="text-muted-foreground">Submitted at</span>
                            <span className="font-medium">{formatDateTime(sub.submitted_at)}</span>
                          </div>
                        )}
                        {typeof sub.submission_count === "number" && sub.submission_count > 0 && (
                          <div className="flex justify-between gap-3">
                            <span className="text-muted-foreground">Submission count</span>
                            <span className="font-medium">{sub.submission_count}</span>
                          </div>
                        )}
                        {sub.deadline_at && (
                          <div className="flex justify-between gap-3">
                            <span className="text-muted-foreground">Deadline</span>
                            <span className="font-medium">{formatDateTime(sub.deadline_at)}</span>
                          </div>
                        )}
                        {sub.is_late !== undefined && (
                          <div className="flex justify-between gap-3">
                            <span className="text-muted-foreground">Late submission</span>
                            <span className={sub.is_late ? "text-rose-600 font-medium" : "text-emerald-600 font-medium"}>
                              {sub.is_late ? "Yes" : "No"}
                            </span>
                          </div>
                        )}
                        {m.marked_at && (
                          <div className="flex justify-between gap-3">
                            <span className="text-muted-foreground">Marked at</span>
                            <span className="font-medium">{formatDateTime(m.marked_at)}</span>
                          </div>
                        )}
                      </div>

                      {feedback && (
                        <div className="rounded-lg border bg-muted/30 p-3 text-sm">
                          <p className="text-muted-foreground text-xs mb-1">Teacher's Feedback</p>
                          <p>{feedback}</p>
                        </div>
                      )}

                      {(() => {
                        // Recall what the student submitted from localStorage.
                        // Backend doesn't return this on the student endpoints,
                        // so we cache it at submit-time and read it back here.
                        const mySub = readSubmittedAnswer(markTarget.id)
                        if (!mySub || (!mySub.file_url && !mySub.answer_link)) return null
                        return (
                          <div className="rounded-lg border bg-muted/30 p-3 text-sm space-y-2">
                            <p className="text-muted-foreground text-xs">Your submission</p>
                            {mySub.file_url && (
                              <a
                                href={mySub.file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs font-medium hover:bg-background"
                              >
                                <FileText className="h-3.5 w-3.5" />
                                <span className="truncate max-w-[220px]">
                                  {mySub.file_name || "Open uploaded file"}
                                </span>
                              </a>
                            )}
                            {mySub.answer_link && (
                              <a
                                href={mySub.answer_link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs font-medium hover:bg-background"
                              >
                                <Link2 className="h-3.5 w-3.5" />
                                <span className="truncate max-w-[220px]">
                                  {mySub.answer_link}
                                </span>
                              </a>
                            )}
                          </div>
                        )
                      })()}
                    </div>
                  )
                })()}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════════════════════
          Delete Confirm
         ═══════════════════════════════════════════════════════════════════════ */}
      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={open => { if (!open) setDeleteTarget(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Assessment?</AlertDialogTitle>
            <AlertDialogDescription>
              "{deleteTarget?.title}" and all its submissions will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && deleteMut.mutate(deleteTarget.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
