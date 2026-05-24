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
  Trash2,
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
  // Optional taxonomy ids used to deep-link into the assessments module with
  // class/batch/subject pre-selected when creating a new assessment from a
  // class session.
  batchId?: string
  subjectId?: string
  classId?: string
}

type ClassSessionModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  entry: MinimalEntry | null
  sessionDate: string
  tenantId: string | null
  role: "teacher" | "student" | "admin" | "other"
  /** When true, scroll the modal to the Attachments section once it opens. */
  focusAttachments?: boolean
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
  focusAttachments = false,
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

  // ── Mutation: upsert session materials (covers note/type/live + content) ─
  const upsertMut = useMutation({
    mutationFn: async (payload: Parameters<typeof learningApi.upsertSessionMaterials>[3]) => {
      if (!tenantId || !realEntryId) throw new Error("Missing tenant or schedule entry")
      return learningApi.upsertSessionMaterials(tenantId, realEntryId, sessionDate, payload)
    },
    onSuccess: () => {
      toast.success("Class updated")
      qc.invalidateQueries({ queryKey })
      setNoteEdit(false)
      setAddAttachmentOpen(false)
      setAttachmentTitle("")
      setAttachmentNote("")
      setAttachmentFile(null)
      setAttachmentExternalUrl("")
    },
    onError: () => toast.error("Could not save"),
  })

  const [isUploading, setIsUploading] = useState(false)

  // ── Teacher: edit/delete attachments and assessments ─────────────────────────
  type AttachmentRow = SessionMaterials["contents"][number]

  const [editAttachment, setEditAttachment] = useState<AttachmentRow | null>(null)
  const [editAttachmentForm, setEditAttachmentForm] = useState({
    title: "",
    description: "",
    external_url: "",
  })
  const [deleteAttachment, setDeleteAttachment] = useState<AttachmentRow | null>(null)

  function openEditAttachment(c: AttachmentRow) {
    setEditAttachmentForm({
      title: c.title ?? "",
      description: c.description ?? "",
      external_url: c.external_url ?? "",
    })
    setEditAttachment(c)
  }

  const updateAttachmentMut = useMutation({
    mutationFn: async (args: { id: string; hadExternalUrl: boolean }) => {
      if (!tenantId) throw new Error("Missing tenant")
      const payload: Record<string, unknown> = {
        title: editAttachmentForm.title,
        description: editAttachmentForm.description,
      }
      if (args.hadExternalUrl || editAttachmentForm.external_url) {
        payload.external_url = editAttachmentForm.external_url || null
      }
      return learningApi.updateContent(tenantId, args.id, payload)
    },
    onSuccess: () => {
      toast.success("Attachment updated")
      qc.invalidateQueries({ queryKey })
      setEditAttachment(null)
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message
      toast.error(Array.isArray(msg) ? msg.join(", ") : msg || "Could not update attachment")
    },
  })

  const deleteAttachmentMut = useMutation({
    mutationFn: async (id: string) => {
      if (!tenantId) throw new Error("Missing tenant")
      return learningApi.deleteContent(tenantId, id)
    },
    onSuccess: () => {
      toast.success("Attachment deleted")
      qc.invalidateQueries({ queryKey })
      setDeleteAttachment(null)
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message
      toast.error(Array.isArray(msg) ? msg.join(", ") : msg || "Could not delete attachment")
    },
  })

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

  const handleSaveTopMeta = () => {
    // Save note + classType + liveLink in one upsert
    if (!entry) return
    if (classTypeDraft !== "OFFLINE" && !liveLinkDraft.trim()) {
      return toast.error("Online/Hybrid class needs a meeting link")
    }
    const payload: Parameters<typeof learningApi.upsertSessionMaterials>[3] = {
      title: entry.subjectName || "Class session",
      class_type: classTypeDraft,
      note: noteText.trim() || undefined,
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

  const handleStartCreateAssessment = () => {
    if (!entry) return
    const params = new URLSearchParams({ create: "1" })
    if (entry.classId) params.set("class_id", entry.classId)
    if (entry.batchId) params.set("batch_id", entry.batchId)
    if (entry.subjectId) params.set("subject_id", entry.subjectId)
    // Link the new assessment back to this exact class session so it shows up
    // in the modal's "Linked assessments" list afterwards.
    if (realEntryId) params.set("schedule_entry_id", realEntryId)
    if (sessionDate) params.set("session_date", sessionDate)
    onOpenChange(false)
    router.push(`/dashboard/assessments?${params.toString()}`)
  }

  // ── Scroll to the Attachments section when opened via the dashboard
  //    "Attachments" button. Wait for materials to finish loading so the
  //    section has its final height before scrolling.
  const attachmentsRef = useRef<HTMLElement | null>(null)
  useEffect(() => {
    if (!open || !focusAttachments || materialsQuery.isLoading) return
    const id = window.setTimeout(() => {
      attachmentsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
    }, 80)
    return () => window.clearTimeout(id)
  }, [open, focusAttachments, materialsQuery.isLoading])

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
            <div>
              <label className="text-xs font-medium text-slate-600">Notes</label>
              <Textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Topic, reminders, or instructions for students…"
                rows={3}
                className="mt-1"
              />
            </div>
          </section>
        ) : (
          <>
            {liveLink ? (
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
            {noteText.trim() ? (
              <section className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
                <p className="text-sm font-semibold text-slate-900">Notes</p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{noteText}</p>
              </section>
            ) : null}
          </>
        )}

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
        <section ref={attachmentsRef} className="scroll-mt-4 space-y-3 rounded-2xl border border-slate-200 p-4">
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
                  <div className="flex shrink-0 items-center gap-1.5">
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
                    {isTeacher ? (
                      <>
                        <button
                          type="button"
                          onClick={() => openEditAttachment(c)}
                          title="Edit"
                          className="inline-flex items-center justify-center rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50 hover:text-indigo-600 transition-colors"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteAttachment(c)}
                          title="Delete"
                          className="inline-flex items-center justify-center rounded-lg border border-slate-200 p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </>
                    ) : null}
                  </div>
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
            {isTeacher ? (
              <Button
                variant="outline"
                size="sm"
                onClick={handleStartCreateAssessment}
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
                    
                    <button
                      type="button"
                      onClick={() => handleAssessmentClick(a.id)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-slate-700 transition-colors"
                    >
                      {isStudent ? "Submit" : <ExternalLink className="h-5 w-5" />
                      }
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

        </section>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="mr-1 h-4 w-4" />
            Close
          </Button>

        </DialogFooter>

        {/* Edit attachment dialog */}
        <Dialog open={Boolean(editAttachment)} onOpenChange={(o) => { if (!o) setEditAttachment(null) }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Pencil className="h-4 w-4" />
                Edit attachment
              </DialogTitle>
              <DialogDescription>
                Update the title, description, or link. The underlying file cannot be replaced — delete and re-upload to change the file.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-1">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Title</label>
                <Input
                  value={editAttachmentForm.title}
                  onChange={(e) => setEditAttachmentForm((p) => ({ ...p, title: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  rows={3}
                  value={editAttachmentForm.description}
                  onChange={(e) => setEditAttachmentForm((p) => ({ ...p, description: e.target.value }))}
                />
              </div>
              {editAttachment?.external_url ? (
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Link</label>
                  <Input
                    value={editAttachmentForm.external_url}
                    onChange={(e) => setEditAttachmentForm((p) => ({ ...p, external_url: e.target.value }))}
                    placeholder="https://…"
                  />
                </div>
              ) : null}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditAttachment(null)}>Cancel</Button>
              <Button
                onClick={() => {
                  if (editAttachment) {
                    updateAttachmentMut.mutate({
                      id: editAttachment.id,
                      hadExternalUrl: Boolean(editAttachment.external_url),
                    })
                  }
                }}
                disabled={!editAttachmentForm.title.trim() || updateAttachmentMut.isPending}
              >
                {updateAttachmentMut.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete attachment confirm */}
        <AlertDialog
          open={Boolean(deleteAttachment)}
          onOpenChange={(o) => { if (!o) setDeleteAttachment(null) }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this attachment?</AlertDialogTitle>
              <AlertDialogDescription>
                <span className="font-medium text-foreground">&quot;{deleteAttachment?.title}&quot;</span> will be permanently removed and students will lose access. This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault()
                  if (deleteAttachment) deleteAttachmentMut.mutate(deleteAttachment.id)
                }}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleteAttachmentMut.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

      </DialogContent>
    </Dialog>
  )
}
