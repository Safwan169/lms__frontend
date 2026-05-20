"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import {
  BookOpen,
  CalendarDays,
  ClipboardList,
  Clock3,
  ExternalLink,
  FileText,
  Link2,
  Loader2,
  MapPin,
  Paperclip,
  Pencil,
  Plus,
  Save,
  Upload,
  Video,
  X,
} from "lucide-react"
import toast from "react-hot-toast"

import { cn } from "@/lib/utils"
import { learningApi, type SessionMaterials } from "@/features/learning/api"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"

type ClassType = "OFFLINE" | "ONLINE" | "HYBRID"

type MinimalEntry = {
  id: string
  subjectName: string
  teacherName: string
  dayOfWeek: string
  startTime: string
  endTime: string
  deliveryMode: string
  roomName?: string
  liveSessionRef?: string
  notes?: string
  status: string
  isOverride?: boolean
}

type ClassSessionModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  entry: MinimalEntry | null
  sessionDate: string
  tenantId: string | null
  role: "teacher" | "student" | "admin" | "other"
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function stripOverrideSuffix(id: string): string {
  const idx = id.indexOf("__override__")
  return idx === -1 ? id : id.slice(0, idx)
}

function deliveryModeToClassType(mode: string): ClassType {
  if (mode === "LIVE_ONLINE") return "ONLINE"
  if (mode === "HYBRID") return "HYBRID"
  return "OFFLINE"
}

function formatDateLong(iso: string) {
  if (!iso) return "—"
  try {
    return new Date(iso).toLocaleDateString("en-GB", {
      weekday: "long",
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
  } catch {
    return iso
  }
}

function formatDateTimeShort(iso?: string | null) {
  if (!iso) return "—"
  try {
    return new Date(iso).toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    })
  } catch {
    return iso
  }
}

function formatTime(value: string) {
  if (!value) return "—"
  const [hStr, mStr] = value.split(":")
  const h = Number(hStr)
  if (Number.isNaN(h)) return value
  const period = h >= 12 ? "PM" : "AM"
  const hour12 = h % 12 === 0 ? 12 : h % 12
  return `${hour12}:${mStr ?? "00"} ${period}`
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function ClassSessionModal({
  open,
  onOpenChange,
  entry,
  sessionDate,
  tenantId,
  role,
}: ClassSessionModalProps) {
  const router = useRouter()
  const qc = useQueryClient()
  const isTeacher = role === "teacher" || role === "admin"
  const isStudent = role === "student"
  const realEntryId = entry ? stripOverrideSuffix(entry.id) : ""

  const queryKey = useMemo(
    () => ["session-materials", tenantId, realEntryId, sessionDate, role],
    [tenantId, realEntryId, sessionDate, role]
  )

  const materialsQuery = useQuery({
    queryKey,
    enabled: Boolean(open && tenantId && realEntryId && sessionDate),
    queryFn: async () => {
      if (!tenantId || !realEntryId) return null
      const res = isStudent
        ? await learningApi.getStudentSessionMaterials(tenantId, realEntryId, sessionDate)
        : await learningApi.getTeacherSessionMaterials(tenantId, realEntryId, sessionDate)
      return (res?.data ?? null) as SessionMaterials | null
    },
  })

  const materials = materialsQuery.data
  const baseClassType: ClassType = entry
    ? deliveryModeToClassType((materials?.delivery_mode ?? entry.deliveryMode) || "")
    : "OFFLINE"
  const liveLink = materials?.meet_url ?? entry?.liveSessionRef ?? null

  // ── Teacher: edit class metadata (note + class_type + live link) ─────────────
  const [noteEdit, setNoteEdit] = useState(false)
  const [noteText, setNoteText] = useState("")
  const [classTypeDraft, setClassTypeDraft] = useState<ClassType>(baseClassType)
  const [liveLinkDraft, setLiveLinkDraft] = useState("")

  // Re-sync drafts when entry/materials change.
  // The backend doesn't persist a session-level note; it stores the teacher's
  // note as `description` on the content/assessment row created in the same
  // upsert. On reopen, fall back to that description so the note reappears.
  useEffect(() => {
    const persistedNote =
      materials?.contents?.find((c) => c.description?.trim())?.description ??
      materials?.assessments?.find((a) => a.description?.trim())?.description ??
      entry?.notes ??
      ""
    setNoteText(persistedNote)
    setClassTypeDraft(baseClassType)
    setLiveLinkDraft(liveLink ?? "")
  }, [entry?.id, sessionDate, materials?.schedule_entry_id, materials?.contents, materials?.assessments]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Teacher: add attachment (content) ─────────────────────────────────────────
  const [addAttachmentOpen, setAddAttachmentOpen] = useState(false)
  const [attachmentTitle, setAttachmentTitle] = useState("")
  const [attachmentNote, setAttachmentNote] = useState("")
  const [attachmentMode, setAttachmentMode] = useState<"FILE" | "LINK">("FILE")
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null)
  const [attachmentExternalUrl, setAttachmentExternalUrl] = useState("")
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // ── Teacher: create assessment inline ────────────────────────────────────────
  const [assessmentOpen, setAssessmentOpen] = useState(false)
  const [assessTitle, setAssessTitle] = useState("")
  const [assessNote, setAssessNote] = useState("")
  const [assessType, setAssessType] = useState<"ASSIGNMENT" | "QUIZ">("ASSIGNMENT")
  const [assessLink, setAssessLink] = useState("")
  const [assessTotalMarks, setAssessTotalMarks] = useState("100")
  const [assessDeadline, setAssessDeadline] = useState("")

  // ── Mutation: upsert session materials (covers note/type/live + content + assessment) ─
  const upsertMut = useMutation({
    mutationFn: async (payload: Parameters<typeof learningApi.upsertSessionMaterials>[3]) => {
      if (!tenantId || !realEntryId) throw new Error("Missing tenant or schedule entry")
      return learningApi.upsertSessionMaterials(tenantId, realEntryId, sessionDate, payload)
    },
    onSuccess: () => {
      toast.success("Class updated")
      qc.invalidateQueries({ queryKey })
      // Reset transient states
      setNoteEdit(false)
      setAddAttachmentOpen(false)
      setAttachmentTitle("")
      setAttachmentNote("")
      setAttachmentFile(null)
      setAttachmentExternalUrl("")
      setAssessmentOpen(false)
      setAssessTitle("")
      setAssessNote("")
      setAssessLink("")
      setAssessTotalMarks("100")
      setAssessDeadline("")
    },
    onError: () => toast.error("Could not save"),
  })

  const [isUploading, setIsUploading] = useState(false)

  // ── Open uploaded PDF/file ────────────────────────────────────────────────
  // The session-materials endpoint returns only `file_id` (no URL). Fetch the
  // content detail by id to get the underlying Media's secure URL and open it
  // in a new tab so the user can view or download the PDF.
  const [openingFileId, setOpeningFileId] = useState<string | null>(null)
  const handleOpenContentFile = async (contentId: string) => {
    if (!tenantId) return
    setOpeningFileId(contentId)
    try {
      const res = isStudent
        ? await learningApi.getStudentContentById(tenantId, contentId)
        : await learningApi.getTeacherContentById(tenantId, contentId)
      const data = (res as any)?.data ?? {}
      const url: string | undefined =
        data?.file?.url ?? data?.file?.secure_url ?? data?.external_url
      if (!url) {
        toast.error("File URL not available")
        return
      }
      window.open(url, "_blank", "noopener,noreferrer")
    } catch {
      toast.error("Could not open the file")
    } finally {
      setOpeningFileId(null)
    }
  }
  const openContentFile = handleOpenContentFile

  const handleUploadAttachment = async () => {
    if (!tenantId) return toast.error("Tenant context missing")
    if (!attachmentTitle.trim()) return toast.error("Title required")

    let fileId: string | undefined
    if (attachmentMode === "FILE") {
      if (!attachmentFile) return toast.error("Choose a file")
      try {
        setIsUploading(true)
        const res = await learningApi.uploadMedia(tenantId, attachmentFile)
        fileId = (res?.data as any)?.id
        if (!fileId) {
          toast.error("Upload failed — please try again")
          return
        }
      } catch {
        toast.error("File upload failed — please try again")
        return
      } finally {
        setIsUploading(false)
      }
    } else {
      if (!attachmentExternalUrl.trim()) return toast.error("Link required")
    }

    const payload: Parameters<typeof learningApi.upsertSessionMaterials>[3] = {
      title: attachmentTitle.trim(),
      note: attachmentNote.trim() || undefined,
      class_type: classTypeDraft,
      content:
        attachmentMode === "FILE"
          ? { content_type: "PDF", file_id: fileId! }
          : { content_type: "VIDEO_LINK", external_url: attachmentExternalUrl.trim() },
    }
    if (classTypeDraft !== "OFFLINE" && liveLinkDraft.trim()) {
      payload.meet_url = liveLinkDraft.trim()
    }
    upsertMut.mutate(payload)
  }

  const handleCreateAssessment = () => {
    if (!assessTitle.trim()) return toast.error("Title required")
    if (!assessLink.trim()) return toast.error("Question paper link required")
    if (!assessDeadline) return toast.error("Submission deadline required")

    const payload: Parameters<typeof learningApi.upsertSessionMaterials>[3] = {
      title: assessTitle.trim(),
      class_type: classTypeDraft,
      assessment: {
        assessment_type: assessType,
        link: assessLink.trim(),
        total_marks: assessTotalMarks ? Number(assessTotalMarks) : undefined,
        submission_date: assessDeadline,
      },
    }
    if (classTypeDraft !== "OFFLINE" && liveLinkDraft.trim()) {
      payload.meet_url = liveLinkDraft.trim()
    }
    upsertMut.mutate(payload)
  }

  const handleSaveTopMeta = () => {
    // Save note + classType + liveLink in one upsert
    if (!entry) return
    if (classTypeDraft !== "OFFLINE" && !liveLinkDraft.trim()) {
      return toast.error("Online/Hybrid class needs a meeting link")
    }
    const payload: Parameters<typeof learningApi.upsertSessionMaterials>[3] = {
      title: entry.subjectName || "Class session",
      class_type: classTypeDraft,
    }
    if (classTypeDraft !== "OFFLINE" && liveLinkDraft.trim()) {
      payload.meet_url = liveLinkDraft.trim()
    }
    upsertMut.mutate(payload)
  }

  const handleAssessmentClick = (assessmentId: string) => {
    onOpenChange(false)
    router.push(`/dashboard/assessments?focus=${assessmentId}`)
  }

  if (!entry) return null

  const loading = materialsQuery.isLoading
  const contents = materials?.contents ?? []
  const assessments = materials?.assessments ?? []
  const hasAssessment = assessments.length > 0
  const hasAttachment = contents.length > 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto space-y-4">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-slate-600" />
            {entry.subjectName}
          </DialogTitle>
          <DialogDescription>
            {entry.teacherName} • {formatDateLong(sessionDate)} • {formatTime(entry.startTime)} – {formatTime(entry.endTime)}
          </DialogDescription>
        </DialogHeader>

        {/* Summary chips */}
        <div className="flex flex-wrap items-center gap-2">
          <Badge className="bg-slate-100 text-slate-700">
            <Clock3 className="mr-1 h-3 w-3" />
            {formatTime(entry.startTime)} – {formatTime(entry.endTime)}
          </Badge>
          {entry.roomName ? (
            <Badge variant="muted">
              <MapPin className="mr-1 h-3 w-3" />
              {entry.roomName}
            </Badge>
          ) : null}
          <Badge
            className={cn(
              classTypeDraft === "ONLINE"
                ? "bg-indigo-100 text-indigo-800"
                : classTypeDraft === "HYBRID"
                  ? "bg-purple-100 text-purple-800"
                  : "bg-emerald-100 text-emerald-800"
            )}
          >
            {classTypeDraft}
          </Badge>
          {entry.isOverride ? <Badge variant="warning">Override</Badge> : null}
          {hasAttachment ? (
            <Badge className="bg-amber-100 text-amber-800">
              <Paperclip className="mr-1 h-3 w-3" />
              {contents.length} attachment{contents.length === 1 ? "" : "s"}
            </Badge>
          ) : null}
          {hasAssessment ? (
            <Badge className="bg-sky-100 text-sky-800">
              <ClipboardList className="mr-1 h-3 w-3" />
              {assessments.length} assessment{assessments.length === 1 ? "" : "s"}
            </Badge>
          ) : null}
        </div>

        {/* Teacher: class type + live link control */}
        {isTeacher ? (
          <section className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
            <p className="text-sm font-semibold text-slate-900">Class type & live link</p>
            <div className="flex flex-wrap gap-2">
              {(["OFFLINE", "ONLINE", "HYBRID"] as ClassType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setClassTypeDraft(t)}
                  className={cn(
                    "rounded-2xl border px-3 py-1.5 text-xs font-medium transition",
                    classTypeDraft === t
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
            {classTypeDraft !== "OFFLINE" ? (
              <div>
                <label className="text-xs font-medium text-slate-600">Meeting link</label>
                <Input
                  value={liveLinkDraft}
                  onChange={(e) => setLiveLinkDraft(e.target.value)}
                  placeholder="https://meet.google.com/…"
                  className="mt-1"
                />
              </div>
            ) : null}
          </section>
        ) : liveLink ? (
          <section className="flex items-center justify-between gap-3 rounded-2xl border border-indigo-200 bg-indigo-50/60 p-4">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-100">
                <Video className="h-4 w-4 text-indigo-700" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-indigo-900">Live class link</p>
                <p className="truncate text-xs text-indigo-700/70">{liveLink}</p>
              </div>
            </div>
            <a
              href={liveLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors"
            >
              <Video className="h-3.5 w-3.5" />
              Join class
            </a>
          </section>
        ) : null}

        {/* Teacher: persistent save bar for class type + link */}
        {isTeacher ? (
          <div className="flex justify-end">
            <Button
              size="sm"
              onClick={handleSaveTopMeta}
              disabled={upsertMut.isPending}
            >
              {upsertMut.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save class details
            </Button>
          </div>
        ) : null}

        {/* Attachments */}
        <section className="space-y-3 rounded-2xl border border-slate-200 p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-900">
              <Paperclip className="mr-1 inline h-4 w-4" />
              Attachments
            </p>
            {isTeacher ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAddAttachmentOpen((v) => !v)}
                disabled={upsertMut.isPending}
              >
                <Plus className="mr-1 h-3.5 w-3.5" />
                Add
              </Button>
            ) : null}
          </div>

          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
            </div>
          ) : contents.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 py-6 text-center">
              <Paperclip className="h-5 w-5 text-slate-300" />
              <p className="mt-1.5 text-sm text-slate-500">No attachments yet</p>
              {isStudent ? (
                <p className="text-xs text-slate-400">Your teacher hasn't shared any materials</p>
              ) : null}
            </div>
          ) : (
            <ul className="space-y-2">
              {contents.map((c) => (
                <li
                  key={c.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3.5 py-3"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100">
                      {c.content_type === "VIDEO_LINK" ? (
                        <Video className="h-4 w-4 text-slate-500" />
                      ) : (
                        <FileText className="h-4 w-4 text-slate-500" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900">{c.title}</p>
                      {c.description ? (
                        <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">{c.description}</p>
                      ) : null}
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        <Badge variant="muted" className="text-xs">
                          {c.content_type === "VIDEO_LINK" ? "VIDEO" : c.content_type}
                        </Badge>
                        {c.publish_status === "DRAFT" ? (
                          <Badge className="bg-amber-100 text-amber-800 text-xs">Draft</Badge>
                        ) : null}
                      </div>
                    </div>
                  </div>
                  {c.external_url ? (
                    <a
                      href={c.external_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Open
                    </a>
                  ) : c.file_id && tenantId ? (
                    <button
                      type="button"
                      onClick={() => openContentFile(c.id)}
                      disabled={openingFileId === c.id}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60 transition-colors"
                    >
                      {openingFileId === c.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <FileText className="h-3 w-3" />
                      )}
                      Open file
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}

          {/* Inline add-attachment form */}
          {isTeacher && addAttachmentOpen ? (
            <div className="space-y-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4">
              {/* Mode toggle */}
              <div className="flex gap-2">
                {(["FILE", "LINK"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    disabled={isUploading || upsertMut.isPending}
                    onClick={() => setAttachmentMode(m)}
                    className={cn(
                      "rounded-lg border px-3 py-1.5 text-xs font-medium transition",
                      attachmentMode === m
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-300",
                      (isUploading || upsertMut.isPending) && "pointer-events-none opacity-60"
                    )}
                  >
                    {m === "FILE" ? "PDF / file" : "Video / external link"}
                  </button>
                ))}
              </div>

              <Input
                placeholder="Attachment title (e.g. Chapter 3 PDF)"
                value={attachmentTitle}
                disabled={isUploading || upsertMut.isPending}
                onChange={(e) => setAttachmentTitle(e.target.value)}
              />
              <Textarea
                placeholder="Optional note for students"
                rows={2}
                value={attachmentNote}
                disabled={isUploading || upsertMut.isPending}
                onChange={(e) => setAttachmentNote(e.target.value)}
              />

              {attachmentMode === "FILE" ? (
                <div className="space-y-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.png,.jpg,.jpeg"
                    className="hidden"
                    onChange={(e) => setAttachmentFile(e.target.files?.[0] ?? null)}
                  />
                  {attachmentFile ? (
                    <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <FileText className="h-4 w-4 shrink-0 text-slate-500" />
                        <div className="min-w-0">
                          <p className="truncate text-xs font-medium text-slate-800">{attachmentFile.name}</p>
                          <p className="text-xs text-slate-400">{formatFileSize(attachmentFile.size)}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={isUploading || upsertMut.isPending}
                        onClick={() => {
                          setAttachmentFile(null)
                          if (fileInputRef.current) fileInputRef.current.value = ""
                        }}
                        className="shrink-0 rounded p-0.5 text-slate-400 hover:text-slate-600 disabled:opacity-40"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={isUploading || upsertMut.isPending}
                      onClick={() => fileInputRef.current?.click()}
                      className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-200 bg-white py-4 text-sm text-slate-500 transition hover:border-slate-400 hover:text-slate-700 disabled:opacity-60"
                    >
                      <Upload className="h-4 w-4" />
                      Click to choose a file
                    </button>
                  )}
                  {attachmentFile ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={isUploading || upsertMut.isPending}
                      onClick={() => fileInputRef.current?.click()}
                      className="text-xs"
                    >
                      Change file
                    </Button>
                  ) : null}
                </div>
              ) : (
                <Input
                  placeholder="https://youtu.be/… or https://drive.google.com/…"
                  value={attachmentExternalUrl}
                  disabled={isUploading || upsertMut.isPending}
                  onChange={(e) => setAttachmentExternalUrl(e.target.value)}
                />
              )}

              {/* Upload progress feedback */}
              {(isUploading || upsertMut.isPending) ? (
                <div className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-600">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-500" />
                  {isUploading ? "Uploading file… please wait" : "Saving attachment…"}
                </div>
              ) : null}

              <div className="flex justify-end gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={isUploading || upsertMut.isPending}
                  onClick={() => {
                    setAddAttachmentOpen(false)
                    setAttachmentFile(null)
                    setAttachmentExternalUrl("")
                    setAttachmentTitle("")
                    setAttachmentNote("")
                  }}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleUploadAttachment}
                  disabled={isUploading || upsertMut.isPending}
                >
                  {isUploading || upsertMut.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="mr-2 h-4 w-4" />
                  )}
                  {isUploading ? "Uploading…" : upsertMut.isPending ? "Saving…" : "Upload"}
                </Button>
              </div>
            </div>
          ) : null}
        </section>

        {/* Linked assessments */}
        <section className="space-y-3 rounded-2xl border border-slate-200 p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-900">
              <ClipboardList className="mr-1 inline h-4 w-4" />
              Linked assessments
            </p>
            {isTeacher && !assessmentOpen ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAssessmentOpen(true)}
                disabled={upsertMut.isPending}
              >
                <Plus className="mr-1 h-3.5 w-3.5" />
                {hasAssessment ? "Add another" : "Create assessment"}
              </Button>
            ) : null}
          </div>

          {loading ? (
            <Skeleton className="h-12 w-full" />
          ) : assessments.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 py-6 text-center">
              <ClipboardList className="h-5 w-5 text-slate-300" />
              <p className="mt-1.5 text-sm text-slate-500">No assessment linked yet</p>
              {isStudent ? (
                <p className="text-xs text-slate-400">Check back later</p>
              ) : null}
            </div>
          ) : (
            <ul className="space-y-2">
              {assessments.map((a) => (
                <li
                  key={a.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3.5 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900">{a.title}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                      <span>{a.assessment_type}</span>
                      <span className="inline-flex items-center gap-1">
                        <CalendarDays className="h-3 w-3" />
                        Due {formatDateTimeShort(a.deadline_at)}
                      </span>
                      {typeof a.marks === "number" ? <span>{a.marks} marks</span> : null}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    {a.link ? (
                      <a
                        href={a.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Paper
                      </a>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => handleAssessmentClick(a.id)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-slate-700 transition-colors"
                    >
                      {isStudent ? "Submit" : "Open"}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {/* Inline create-assessment form */}
          {isTeacher && assessmentOpen ? (
            <div className="space-y-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3">
              <div className="flex gap-2">
                {(["ASSIGNMENT", "QUIZ"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setAssessType(t)}
                    className={cn(
                      "rounded-lg border px-3 py-1 text-xs font-medium transition",
                      assessType === t
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-200 bg-white text-slate-700"
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <Input
                placeholder="Assessment title"
                value={assessTitle}
                onChange={(e) => setAssessTitle(e.target.value)}
              />
              <Textarea
                placeholder="Instructions / note"
                rows={2}
                value={assessNote}
                onChange={(e) => setAssessNote(e.target.value)}
              />
              <Input
                placeholder="Question paper link (drive / docs URL)"
                value={assessLink}
                onChange={(e) => setAssessLink(e.target.value)}
              />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-600">Total marks</label>
                  <Input
                    type="number"
                    min={0}
                    value={assessTotalMarks}
                    onChange={(e) => setAssessTotalMarks(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600">Submission deadline</label>
                  <Input
                    type="date"
                    value={assessDeadline}
                    onChange={(e) => setAssessDeadline(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setAssessmentOpen(false)
                    setAssessTitle("")
                    setAssessNote("")
                    setAssessLink("")
                    setAssessTotalMarks("100")
                    setAssessDeadline("")
                  }}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleCreateAssessment}
                  disabled={upsertMut.isPending}
                >
                  {upsertMut.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Create
                </Button>
              </div>
            </div>
          ) : null}
        </section>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="mr-1 h-4 w-4" />
            Close
          </Button>
          {hasAssessment ? (
            <Button
              onClick={() => router.push("/dashboard/assessments")}
            >
              <Link2 className="mr-2 h-4 w-4" />
              Go to assessments
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
