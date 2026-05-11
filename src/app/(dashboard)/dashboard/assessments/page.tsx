"use client"

import { useMemo, useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  AlertCircle, BookCheck, Calendar, CheckCircle2, ChevronRight,
  ClipboardList, Eye, FilePlus2, FileText, Link2, Loader2, Monitor,
  Pencil, Plus, RefreshCw, Search, Star, Trash2, Upload, Video, X,
} from "lucide-react"
import toast from "react-hot-toast"

import { useAuth } from "@/context/AuthContext"
import { learningApi } from "@/features/learning/api"
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

type AssessmentType = "ASSIGNMENT" | "QUIZ" | "EXAM"
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
  class_id: string
  batch_id: string
  subject_id: string
  assessment_type: AssessmentType
  total_marks: string
  passing_marks: string
  instructions: string
  deadline: string
  visibility: string
  publish_status: PublishStatus
}

const EMPTY_FORM: CreateForm = {
  title: "",
  description: "",
  class_id: "",
  batch_id: "",
  subject_id: "",
  assessment_type: "ASSIGNMENT",
  total_marks: "100",
  passing_marks: "40",
  instructions: "",
  deadline: "",
  visibility: "BATCH_ONLY",
  publish_status: "DRAFT",
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function typeIcon(type: AssessmentType) {
  if (type === "QUIZ") return <ClipboardList className="h-4 w-4 text-sky-500" />
  if (type === "EXAM") return <BookCheck className="h-4 w-4 text-rose-500" />
  return <FileText className="h-4 w-4 text-amber-500" />
}

function typeLabel(type: AssessmentType) {
  if (type === "QUIZ") return "Quiz"
  if (type === "EXAM") return "Exam"
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

  const listKey = isStudent ? ["student-assessments", tenantId] : ["teacher-assessments", tenantId]

  const { data: listData, isLoading, isError, refetch } = useQuery({
    queryKey: listKey,
    queryFn: async () => {
      if (!tenantId) return { items: [], meta: { total: 0 } }
      const res = isStudent
        ? await learningApi.getStudentAssessments(tenantId, { limit: 50 })
        : await learningApi.getTeacherAssessments(tenantId, { limit: 50 })
      return res.data
    },
    enabled: Boolean(tenantId),
  })

  // Submissions for selected assessment (teacher)
  const { data: subsData, isLoading: subsLoading, refetch: refetchSubs } = useQuery({
    queryKey: ["submissions", tenantId, viewAssessment?.id],
    queryFn: async () => {
      if (!tenantId || !viewAssessment) return { submissions: [] }
      const res = await learningApi.getSubmissions(tenantId, viewAssessment.id)
      return res.data
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

  // ─── Mutations ──────────────────────────────────────────────────────────────

  const createMut = useMutation({
    mutationFn: async () => {
      if (!tenantId) throw new Error("Tenant ID missing")
      const payload: Record<string, unknown> = {
        class_id: form.class_id,
        batch_id: form.batch_id,
        subject_id: form.subject_id,
        title: form.title,
        description: form.description,
        assessment_type: form.assessment_type,
        total_marks: Number(form.total_marks),
        passing_marks: Number(form.passing_marks),
        instructions: form.instructions || null,
        deadline: form.deadline ? new Date(form.deadline).toISOString() : null,
        visibility: form.visibility,
        publish_status: form.publish_status,
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
      const payload: Record<string, unknown> = {
        answer_link: submitLink || null,
        comment: submitComment || null,
        file_id: uploadedFileUrl ? uploadedFileUrl : null,
      }
      return learningApi.submitAssessment(tenantId, submitTarget.id, payload)
    },
    onSuccess: () => {
      toast.success("Answer submitted!")
      qc.invalidateQueries({ queryKey: listKey })
      setSubmitTarget(null)
      setSubmitLink("")
      setSubmitComment("")
      setSubmitFile(null)
      setUploadedFileUrl("")
    },
    onError: () => toast.error("Failed to submit"),
  })

  // Teacher mark submission
  const markMut = useMutation({
    mutationFn: async () => {
      if (!tenantId || !viewAssessment || !markDialogSub) throw new Error()
      const payload = { marks_obtained: Number(markScore), feedback: markFeedback || null }
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

  // File upload for student submit
  const handleUploadFile = async (file: File) => {
    if (!tenantId) return
    setUploading(true)
    try {
      const res = await learningApi.uploadMedia(tenantId, file)
      const url = (res.data as any)?.url ?? (res.data as any)?.id ?? ""
      setUploadedFileUrl(String(url))
      toast.success("File uploaded")
    } catch {
      toast.error("File upload failed")
    } finally {
      setUploading(false)
    }
  }

  // ─── Filtered list ──────────────────────────────────────────────────────────

  const allItems: Assessment[] = useMemo(() => {
    const raw = (listData as any)?.items ?? []
    return raw.filter((item: Assessment) => {
      if (filterType !== "ALL" && item.assessment_type !== filterType) return false
      if (filterStatus !== "ALL" && item.publish_status !== filterStatus) return false
      if (search && !`${item.title} ${item.description ?? ""}`.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
  }, [listData, filterType, filterStatus, search])

  const totalItems = (listData as any)?.meta?.total ?? allItems.length
  const allSubsList: Submission[] = (subsData as any)?.submissions ?? []

  const canCreate = useMemo(() =>
    Boolean(form.title.trim() && form.class_id.trim() && form.batch_id.trim() && form.subject_id.trim() && Number(form.total_marks) > 0),
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
          <option value="EXAM">Exam</option>
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
                          <span className="font-medium">{item.class_name ?? item.class_id}</span>
                          {item.batch_name && <span className="text-muted-foreground"> / {item.batch_name}</span>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-mono">{item.total_marks} <span className="text-muted-foreground text-xs">/ pass {item.passing_marks}</span></span>
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
              {(["ASSIGNMENT", "QUIZ", "EXAM"] as AssessmentType[]).map(at => (
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
                <label className="text-xs font-medium">Class ID *</label>
                <Input placeholder="class-uuid" value={form.class_id} onChange={e => f("class_id", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Batch ID *</label>
                <Input placeholder="batch-uuid" value={form.batch_id} onChange={e => f("batch_id", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Subject ID *</label>
                <Input placeholder="sub-uuid" value={form.subject_id} onChange={e => f("subject_id", e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Total Marks *</label>
                <Input type="number" min="1" value={form.total_marks} onChange={e => f("total_marks", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Passing Marks</label>
                <Input type="number" min="0" value={form.passing_marks} onChange={e => f("passing_marks", e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Visibility</label>
                <select
                  value={form.visibility}
                  onChange={e => f("visibility", e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="BATCH_ONLY">Batch Only</option>
                  <option value="CLASS_ALL_BATCHES">All Batches</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Status</label>
                <select
                  value={form.publish_status}
                  onChange={e => f("publish_status", e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="DRAFT">Draft</option>
                  <option value="PUBLISHED">Published</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium">Deadline</label>
              <Input type="datetime-local" value={form.deadline} onChange={e => f("deadline", e.target.value)} />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Instructions</label>
              <Textarea
                placeholder="Write instructions for students..."
                value={form.instructions}
                onChange={e => f("instructions", e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Description</label>
              <Textarea
                placeholder="Brief description of this assessment..."
                value={form.description}
                onChange={e => f("description", e.target.value)}
                rows={2}
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
                                {(sub.file_url || sub.answer_link) && (
                                  <a
                                    href={sub.file_url ?? sub.answer_link ?? "#"}
                                    target="_blank"
                                    rel="noopener noreferrer"
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

                {/* Comment */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Comment (optional)</label>
                  <Textarea
                    placeholder="Leave a note for your teacher..."
                    value={submitComment}
                    onChange={e => setSubmitComment(e.target.value)}
                    rows={2}
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
                ) : myMarkData ? (
                  <div className="space-y-4">
                    <div className="flex flex-col items-center justify-center gap-2 py-4">
                      <div className="text-5xl font-bold text-primary">
                        {(myMarkData as any)?.marks_obtained ?? "—"}
                      </div>
                      <div className="text-muted-foreground text-sm">
                        / {markTarget.total_marks} marks
                      </div>
                      {(myMarkData as any)?.marks_obtained >= markTarget.passing_marks
                        ? <Badge className="bg-emerald-100 text-emerald-700 mt-1">Passed ✓</Badge>
                        : <Badge className="bg-rose-100 text-rose-700 mt-1">Failed</Badge>
                      }
                    </div>
                    {(myMarkData as any)?.marks_feedback && (
                      <div className="rounded-lg border bg-muted/30 p-3 text-sm">
                        <p className="text-muted-foreground text-xs mb-1">Teacher's Feedback</p>
                        <p>{(myMarkData as any).marks_feedback}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-24 gap-2 text-muted-foreground">
                    <CheckCircle2 className="h-8 w-8 opacity-30" />
                    <p className="text-sm">Not marked yet.</p>
                  </div>
                )}
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
