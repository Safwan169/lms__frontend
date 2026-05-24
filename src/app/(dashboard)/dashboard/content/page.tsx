"use client"

import { Suspense, useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  BookOpen, CheckCircle2, Clock, Eye, FilePlus2, FileText, Globe,
  Link2, Loader2, Monitor, Paperclip, Pencil, Plus, RefreshCw, Save, Search,
  Trash2, Video, X, AlertCircle, Upload, ExternalLink,
} from "lucide-react"
import toast from "react-hot-toast"

import { useAuth } from "@/context/AuthContext"
import { learningApi } from "@/features/learning/api"
import financeApi from "@/features/finance/api"
import api from "@/lib/api"
import { cn } from "@/lib/utils"
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

// ─── Types ────────────────────────────────────────────────────────────────────

type ContentType = "PDF" | "VIDEO_LINK" | "ONLINE_CLASS"
type Visibility = "BATCH_ONLY" | "CLASS_ALL_BATCHES"
type PublishStatus = "DRAFT" | "PUBLISHED"
type ListPayload<T> = T[] | { items?: T[]; data?: T[] }
type LookupOption = { id: string; name: string }

type ContentItem = {
  id: string
  title: string
  description?: string
  content_type: ContentType
  class_id: string
  class_name?: string
  batch_id: string
  batch_name?: string
  subject_id: string
  subject_name?: string
  file?: { id: string; url: string; mime_type: string } | null
  file_url?: string | null
  external_url?: string | null
  meet_link?: string | null
  start_at?: string | null
  end_at?: string | null
  visibility: Visibility
  publish_status: PublishStatus
  teacher?: { id: string; name: string } | null
  created_at: string
}

type CreateForm = {
  title: string
  description: string
  class_id: string
  batch_id: string
  subject_id: string
  content_type: ContentType
  visibility: Visibility
  publish_status: PublishStatus
  external_url: string
  meet_link: string
  start_at: string
  end_at: string
}

const EMPTY_FORM: CreateForm = {
  title: "",
  description: "",
  class_id: "",
  batch_id: "",
  subject_id: "",
  content_type: "PDF",
  visibility: "BATCH_ONLY",
  publish_status: "DRAFT",
  external_url: "",
  meet_link: "",
  start_at: "",
  end_at: "",
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CONTENT_TYPE_CONFIG = {
  PDF: {
    icon: FileText,
    label: "PDF",
    color: "text-amber-500",
    bg: "bg-amber-50",
    border: "border-amber-200",
    badge: "bg-amber-100 text-amber-700 border-amber-200",
    gradient: "from-amber-500 to-orange-500",
  },
  VIDEO_LINK: {
    icon: Video,
    label: "Video",
    color: "text-violet-500",
    bg: "bg-violet-50",
    border: "border-violet-200",
    badge: "bg-violet-100 text-violet-700 border-violet-200",
    gradient: "from-violet-500 to-purple-600",
  },
  ONLINE_CLASS: {
    icon: Monitor,
    label: "Online Class",
    color: "text-sky-500",
    bg: "bg-sky-50",
    border: "border-sky-200",
    badge: "bg-sky-100 text-sky-700 border-sky-200",
    gradient: "from-sky-500 to-blue-600",
  },
} as const

function ContentTypeIcon({ type, className }: { type: ContentType; className?: string }) {
  const Cfg = CONTENT_TYPE_CONFIG[type]
  const Icon = Cfg.icon
  return <Icon className={cn(Cfg.color, className ?? "h-4 w-4")} />
}

function ContentTypeBadge({ type }: { type: ContentType }) {
  const Cfg = CONTENT_TYPE_CONFIG[type]
  const Icon = Cfg.icon
  return (
    <Badge className={cn("gap-1 border text-xs font-medium", Cfg.badge)}>
      <Icon className="h-3 w-3" />
      {Cfg.label}
    </Badge>
  )
}

function PublishBadge({ status }: { status: PublishStatus }) {
  return status === "PUBLISHED" ? (
    <Badge className="gap-1 border bg-emerald-100 text-emerald-700 border-emerald-200 text-xs">
      <CheckCircle2 className="h-3 w-3" />
      Published
    </Badge>
  ) : (
    <Badge className="gap-1 border bg-amber-100 text-amber-700 border-amber-200 text-xs">
      <Clock className="h-3 w-3" />
      Draft
    </Badge>
  )
}

function resourceUrl(item: ContentItem) {
  return item.file?.url ?? item.file_url ?? item.external_url ?? item.meet_link ?? null
}

function formatDate(iso?: string | null) {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function asList<T>(payload: ListPayload<T> | null | undefined): T[] {
  if (!payload) return []
  if (Array.isArray(payload)) return payload
  if (Array.isArray((payload as any).items)) return (payload as any).items
  if (Array.isArray((payload as any).data)) return (payload as any).data
  return []
}

// ─── Subcomponents ────────────────────────────────────────────────────────────

function StatCard({
  label, value, icon: Icon, colorClass, bgClass, loading,
}: { label: string; value: number; icon: React.ElementType; colorClass: string; bgClass: string; loading: boolean }) {
  return (
    <Card className="border">
      <CardContent className="px-4 pt-4 pb-3">
        <div className="flex items-start justify-between">
          <div>
            <p className={cn("text-2xl font-bold", colorClass)}>{loading ? "—" : value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
          </div>
          <div className={cn("rounded-xl p-2 mt-0.5", bgClass)}>
            <Icon className={cn("h-4 w-4", colorClass)} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function ContentPageInner() {
  const { user } = useAuth()
  const tenantId = user?.tenant_id ?? user?.tenant?.id ?? null
  const role = String(user?.role ?? (Array.isArray(user?.roles) ? user?.roles[0] : user?.roles) ?? "").toLowerCase()
  const isStudent = role === "student"
  const isAdmin = role === "admin" || role === "superadmin"
  const isTeacherOrAdmin = role === "teacher" || isAdmin

  const qc = useQueryClient()

  // ── state ──
  const [search, setSearch] = useState("")
  const [filterType, setFilterType] = useState<ContentType | "ALL">("ALL")
  const [filterStatus, setFilterStatus] = useState<PublishStatus | "ALL">("ALL")
  const [filterClassId, setFilterClassId] = useState<string>("ALL")
  const [filterBatchId, setFilterBatchId] = useState<string>("ALL")
  const [filterSubjectId, setFilterSubjectId] = useState<string>("ALL")
  const [createOpen, setCreateOpen] = useState(false)
  const [viewItem, setViewItem] = useState<ContentItem | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ContentItem | null>(null)
  const [editTarget, setEditTarget] = useState<ContentItem | null>(null)
  const [editForm, setEditForm] = useState<{
    title: string
    description: string
    visibility: Visibility
    publish_status: PublishStatus
    external_url: string
    meet_link: string
    start_at: string
    end_at: string
  }>({
    title: "",
    description: "",
    visibility: "BATCH_ONLY",
    publish_status: "DRAFT",
    external_url: "",
    meet_link: "",
    start_at: "",
    end_at: "",
  })
  const [uploadedFileId, setUploadedFileId] = useState("")
  const [uploadedFileName, setUploadedFileName] = useState("")
  const [uploadedFileSize, setUploadedFileSize] = useState(0)
  const [uploading, setUploading] = useState(false)
  const [form, setForm] = useState<CreateForm>(EMPTY_FORM)

  const f = (k: keyof CreateForm, v: string) => setForm(p => ({ ...p, [k]: v }))

  // Open the create dialog automatically when arrived here from the teacher
  // dashboard "Material" button (e.g. /dashboard/content?create=1&subject=…&batch=…).
  const searchParams = useSearchParams()
  useEffect(() => {
    if (searchParams.get("create") !== "1") return
    setForm({
      ...EMPTY_FORM,
      subject_id: searchParams.get("subject") ?? "",
      batch_id: searchParams.get("batch") ?? "",
    })
    setCreateOpen(true)
  }, [searchParams])

  // ── queries ──
  const listKey = isStudent ? ["student-content", tenantId] : ["teacher-content", tenantId]

  const { data: listData, isLoading, isError, refetch } = useQuery({
    queryKey: listKey,
    queryFn: async () => {
      if (!tenantId) return { items: [], meta: { total: 0 } }
      const res = isStudent
        ? await learningApi.getStudentContent(tenantId, { limit: 50 })
        : await learningApi.getTeacherContent(tenantId, { limit: 50 })
      return res.data
    },
    enabled: Boolean(tenantId),
  })

  const classesLookupQuery = useQuery({
    queryKey: ["content", "classes", tenantId],
    enabled: Boolean(tenantId) && isTeacherOrAdmin,
    queryFn: () => financeApi.listTenantClasses(String(tenantId), { page: 1, limit: 20 }),
  })

  const batchesLookupQuery = useQuery({
    queryKey: ["content", "batches", tenantId, form.class_id],
    enabled: Boolean(tenantId) && isTeacherOrAdmin,
    queryFn: () =>
      financeApi.listTenantBatches(String(tenantId), { page: 1, limit: 20, class_id: form.class_id || undefined }),
  })

  const subjectsLookupQuery = useQuery({
    queryKey: ["content", "subjects", tenantId],
    enabled: Boolean(tenantId) && isTeacherOrAdmin,
    queryFn: async () => {
      const response = await api.get(`/tenants/${tenantId}/subjects`, { params: { page: 1, limit: 20 } })
      return response.data
    },
  })

  const classOptions = useMemo(() => {
    const rows = asList<Record<string, unknown>>(classesLookupQuery.data as ListPayload<Record<string, unknown>>)
    return rows
      .map<LookupOption>(row => ({ id: String(row.id ?? "").trim(), name: String(row.name ?? row.class_name ?? "Unnamed Class").trim() }))
      .filter(row => row.id.length > 0)
  }, [classesLookupQuery.data])

  const batchOptions = useMemo(() => {
    const rows = asList<Record<string, unknown>>(batchesLookupQuery.data as ListPayload<Record<string, unknown>>)
    return rows
      .map<LookupOption>(row => ({ id: String(row.id ?? row.batch_id ?? "").trim(), name: String(row.name ?? row.batch_name ?? row.section ?? "Unnamed Batch").trim() }))
      .filter(row => row.id.length > 0)
  }, [batchesLookupQuery.data])

  const subjectOptions = useMemo(() => {
    const rows = asList<Record<string, unknown>>(subjectsLookupQuery.data as ListPayload<Record<string, unknown>>)
    return rows
      .map<LookupOption>(row => ({ id: String(row.id ?? row.subject_id ?? "").trim(), name: String(row.name ?? row.subject_name ?? "Unnamed Subject").trim() }))
      .filter(row => row.id.length > 0)
  }, [subjectsLookupQuery.data])

  // ── mutations ──
  const uploadMut = async (file: File) => {
    if (!tenantId) return
    setUploading(true)
    try {
      const res = await learningApi.uploadMedia(tenantId, file)
      const id = (res.data as any)?.id ?? ""
      setUploadedFileId(String(id))
      setUploadedFileName(file.name)
      setUploadedFileSize(file.size)
      toast.success("File uploaded")
    } catch {
      toast.error("File upload failed")
    } finally {
      setUploading(false)
    }
  }

  const createMut = useMutation({
    mutationFn: async () => {
      if (!tenantId) throw new Error("Tenant ID missing")
      const isVideo = form.content_type === "VIDEO_LINK"
      const isOnline = form.content_type === "ONLINE_CLASS"
      const payload: Record<string, unknown> = {
        batch_id: form.batch_id,
        subject_id: form.subject_id,
        title: form.title,
        description: form.description,
        content_type: form.content_type,
        visibility: form.visibility,
        publish_status: form.publish_status,
        file_id: uploadedFileId || null,
        external_url: isVideo ? form.external_url || null : null,
        meet_link: isOnline ? form.meet_link || null : null,
        start_at: isOnline && form.start_at ? new Date(form.start_at).toISOString() : null,
        end_at: isOnline && form.end_at ? new Date(form.end_at).toISOString() : null,
      }
      return learningApi.createContent(tenantId, payload)
    },
    onSuccess: () => {
      toast.success("Content created successfully")
      qc.invalidateQueries({ queryKey: listKey })
      setCreateOpen(false)
      setForm(EMPTY_FORM)
      setUploadedFileId("")
      setUploadedFileName("")
      setUploadedFileSize(0)
    },
    onError: () => toast.error("Failed to create content"),
  })

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      if (!tenantId) throw new Error()
      return learningApi.deleteContent(tenantId, id)
    },
    onSuccess: () => {
      toast.success("Content deleted")
      qc.invalidateQueries({ queryKey: listKey })
      setDeleteTarget(null)
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message
      toast.error(Array.isArray(msg) ? msg.join(", ") : msg || "Failed to delete")
    },
  })

  const updateMut = useMutation({
    mutationFn: async () => {
      if (!tenantId || !editTarget) throw new Error("Missing context")
      const isVideo = editTarget.content_type === "VIDEO_LINK"
      const isOnline = editTarget.content_type === "ONLINE_CLASS"
      const payload: Record<string, unknown> = {
        title: editForm.title,
        description: editForm.description,
        visibility: editForm.visibility,
        publish_status: editForm.publish_status,
      }
      if (isVideo) payload.external_url = editForm.external_url || null
      if (isOnline) {
        payload.meet_link = editForm.meet_link || null
        payload.start_at = editForm.start_at ? new Date(editForm.start_at).toISOString() : null
        payload.end_at = editForm.end_at ? new Date(editForm.end_at).toISOString() : null
      }
      return learningApi.updateContent(tenantId, editTarget.id, payload)
    },
    onSuccess: () => {
      toast.success("Content updated")
      qc.invalidateQueries({ queryKey: listKey })
      setEditTarget(null)
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message
      toast.error(Array.isArray(msg) ? msg.join(", ") : msg || "Failed to update")
    },
  })

  function openEdit(item: ContentItem) {
    const toLocalInput = (iso?: string | null) => {
      if (!iso) return ""
      const d = new Date(iso)
      if (Number.isNaN(d.getTime())) return ""
      const off = d.getTimezoneOffset() * 60000
      return new Date(d.getTime() - off).toISOString().slice(0, 16)
    }
    setEditForm({
      title: item.title ?? "",
      description: item.description ?? "",
      visibility: item.visibility ?? "BATCH_ONLY",
      publish_status: item.publish_status ?? "DRAFT",
      external_url: item.external_url ?? "",
      meet_link: item.meet_link ?? "",
      start_at: toLocalInput(item.start_at),
      end_at: toLocalInput(item.end_at),
    })
    setEditTarget(item)
  }

  // ── filtered list ──
  const allItems: ContentItem[] = useMemo(() => {
    const raw = (listData as any)?.items ?? []
    return raw.filter((item: ContentItem) => {
      if (filterType !== "ALL" && item.content_type !== filterType) return false
      if (filterStatus !== "ALL" && item.publish_status !== filterStatus) return false
      if (filterClassId !== "ALL" && item.class_id !== filterClassId) return false
      if (filterBatchId !== "ALL" && item.batch_id !== filterBatchId) return false
      if (filterSubjectId !== "ALL" && item.subject_id !== filterSubjectId) return false
      if (search && !`${item.title} ${item.description ?? ""}`.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
  }, [listData, filterType, filterStatus, filterClassId, filterBatchId, filterSubjectId, search])

  const rawItems: ContentItem[] = useMemo(() => ((listData as any)?.items ?? []) as ContentItem[], [listData])

  const filterClassOptions = useMemo(() => {
    const map = new Map<string, string>()
    rawItems.forEach(i => { if (i.class_id) map.set(i.class_id, i.class_name || i.class_id) })
    return Array.from(map, ([id, name]) => ({ id, name }))
  }, [rawItems])

  const filterBatchOptions = useMemo(() => {
    const map = new Map<string, string>()
    rawItems.forEach(i => {
      if (!i.batch_id) return
      if (filterClassId !== "ALL" && i.class_id !== filterClassId) return
      map.set(i.batch_id, i.batch_name || i.batch_id)
    })
    return Array.from(map, ([id, name]) => ({ id, name }))
  }, [rawItems, filterClassId])

  const filterSubjectOptions = useMemo(() => {
    const map = new Map<string, string>()
    rawItems.forEach(i => { if (i.subject_id) map.set(i.subject_id, i.subject_name || i.subject_id) })
    return Array.from(map, ([id, name]) => ({ id, name }))
  }, [rawItems])

  useEffect(() => {
    if (filterBatchId !== "ALL" && !filterBatchOptions.some(o => o.id === filterBatchId)) {
      setFilterBatchId("ALL")
    }
  }, [filterBatchId, filterBatchOptions])

  const canCreate = useMemo(() => {
    if (!form.title.trim() || !form.class_id.trim() || !form.batch_id.trim() || !form.subject_id.trim()) return false
    if (form.content_type === "PDF") return Boolean(uploadedFileId)
    if (form.content_type === "VIDEO_LINK") return Boolean(form.external_url.trim())
    if (form.content_type === "ONLINE_CLASS") return Boolean(form.meet_link.trim() && form.start_at && form.end_at)
    return false
  }, [form, uploadedFileId])

  const totalItems = (listData as any)?.meta?.total ?? allItems.length
  const allRaw: ContentItem[] = (listData as any)?.items ?? []

  const activeFilterCount = [
    filterType !== "ALL", filterStatus !== "ALL",
    filterClassId !== "ALL", filterBatchId !== "ALL",
    filterSubjectId !== "ALL", search.length > 0,
  ].filter(Boolean).length

  if (!tenantId) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <AlertCircle className="h-10 w-10 text-muted-foreground" />
        <p className="text-muted-foreground text-sm">Tenant ID not found. Please log in again.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6 adm-root">
      {/* ─── Header ─── */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between adm-topbar-left">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" />
            Learning Content
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isStudent ? "Browse all learning materials available to your batch" : "Create, publish and manage learning content"}
          </p>
        </div>
        {isTeacherOrAdmin && (
          <Button onClick={() => setCreateOpen(true)} className="gap-2 self-start sm:self-auto mt-1">
            <Plus className="h-4 w-4" />
            New Content
          </Button>
        )}
      </div>

      {/* ─── Stats row ─── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Total Content" value={totalItems} icon={BookOpen} colorClass="text-blue-600" bgClass="bg-blue-100" loading={isLoading} />
        <StatCard label="Published" value={allRaw.filter(i => i.publish_status === "PUBLISHED").length} icon={CheckCircle2} colorClass="text-emerald-600" bgClass="bg-emerald-100" loading={isLoading} />
        <StatCard label="Draft" value={allRaw.filter(i => i.publish_status === "DRAFT").length} icon={Clock} colorClass="text-amber-600" bgClass="bg-amber-100" loading={isLoading} />
        <StatCard label="Videos" value={allRaw.filter(i => i.content_type === "VIDEO_LINK").length} icon={Video} colorClass="text-violet-600" bgClass="bg-violet-100" loading={isLoading} />
      </div>

      {/* ─── Filters ─── */}
      <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search content..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 bg-white"
            />
          </div>

          {(
            [
              { value: filterType, setter: setFilterType, options: [{ value: "ALL", label: "All Types" }, { value: "PDF", label: "PDF" }, { value: "VIDEO_LINK", label: "Video" }, { value: "ONLINE_CLASS", label: "Online Class" }] },
              ...(!isStudent ? [{ value: filterStatus, setter: setFilterStatus, options: [{ value: "ALL", label: "All Status" }, { value: "PUBLISHED", label: "Published" }, { value: "DRAFT", label: "Draft" }] }] : []),
              { value: filterClassId, setter: setFilterClassId, options: [{ value: "ALL", label: "All Classes" }, ...filterClassOptions.map(o => ({ value: o.id, label: o.name }))] },
              { value: filterBatchId, setter: setFilterBatchId, options: [{ value: "ALL", label: "All Batches" }, ...filterBatchOptions.map(o => ({ value: o.id, label: o.name }))] },
              { value: filterSubjectId, setter: setFilterSubjectId, options: [{ value: "ALL", label: "All Subjects" }, ...filterSubjectOptions.map(o => ({ value: o.id, label: o.name }))] },
            ] as { value: string; setter: (v: any) => void; options: { value: string; label: string }[] }[]
          ).map((filter, idx) => (
            <div key={idx} className="relative">
              <select
                value={filter.value}
                onChange={e => filter.setter(e.target.value)}
                className={cn(
                  "h-9 rounded-lg border bg-white px-3 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-ring appearance-none",
                  filter.value !== "ALL" ? "border-primary text-primary font-medium" : "border-input text-foreground"
                )}
              >
                {filter.options.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <div className="pointer-events-none absolute right-2.5 top-2.5 text-muted-foreground">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </div>
            </div>
          ))}

          <div className="flex items-center gap-2">
            {activeFilterCount > 0 && (
              <button
                onClick={() => { setSearch(""); setFilterType("ALL"); setFilterStatus("ALL"); setFilterClassId("ALL"); setFilterBatchId("ALL"); setFilterSubjectId("ALL") }}
                className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
              >
                <X className="h-3 w-3" />
                Clear ({activeFilterCount})
              </button>
            )}
            <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-1.5 bg-white">
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* ─── Table ─── */}
      <Card className="border overflow-hidden">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}
            </div>
          ) : isError ? (
            <div className="flex flex-col items-center justify-center h-48 gap-2">
              <AlertCircle className="h-8 w-8 text-destructive" />
              <p className="text-sm text-muted-foreground">Failed to load content.</p>
              <Button variant="outline" size="sm" onClick={() => refetch()}>Retry</Button>
            </div>
          ) : allItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-56 gap-3 text-muted-foreground">
              <div className="rounded-full bg-slate-100 p-4">
                <BookOpen className="h-8 w-8 opacity-40" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-slate-700">No content found</p>
                <p className="text-xs text-slate-400 mt-0.5">{activeFilterCount > 0 ? "Try adjusting your filters" : "Get started by creating your first content"}</p>
              </div>
              {isTeacherOrAdmin && activeFilterCount === 0 && (
                <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-1.5 mt-1">
                  <Plus className="h-3.5 w-3.5" />
                  Create First Content
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent bg-slate-50/80">
                    <TableHead className="font-semibold">Title</TableHead>
                    <TableHead className="font-semibold">Type</TableHead>
                    <TableHead className="font-semibold">Class / Batch</TableHead>
                    <TableHead className="font-semibold">Subject</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold">Date</TableHead>
                    <TableHead className="text-right font-semibold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allItems.map(item => (
                    <TableRow
                      key={item.id}
                      className="cursor-pointer group hover:bg-slate-50/80 transition-colors"
                      onClick={() => setViewItem(item)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <div className={cn("rounded-lg p-1.5 shrink-0", CONTENT_TYPE_CONFIG[item.content_type].bg)}>
                            <ContentTypeIcon type={item.content_type} className="h-3.5 w-3.5" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate max-w-[160px] group-hover:text-primary transition-colors">{item.title}</p>
                            {item.description && (
                              <p className="text-xs text-muted-foreground truncate max-w-[160px]">{item.description}</p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <ContentTypeBadge type={item.content_type} />
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <span className="font-medium">{item.class_name ?? item.class_id}</span>
                          {item.batch_name && <span className="text-muted-foreground"> / {item.batch_name}</span>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">{item.subject_name ?? item.subject_id}</span>
                      </TableCell>
                      <TableCell>
                        <PublishBadge status={item.publish_status} />
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{formatDate(item.created_at)}</TableCell>
                      <TableCell>
                        <div className="flex justify-end items-center gap-0.5" onClick={e => e.stopPropagation()}>
                          <button
                            onClick={() => setViewItem(item)}
                            title="View details"
                            className="rounded-lg p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                          {resourceUrl(item) && (
                            <a
                              href={resourceUrl(item)!}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Open resource"
                              className="rounded-lg p-1.5 text-sky-400 hover:text-sky-600 hover:bg-sky-50 transition-colors"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          )}
                          {isTeacherOrAdmin && (
                            <button
                              onClick={() => openEdit(item)}
                              title="Edit"
                              className="rounded-lg p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                          )}
                          {isTeacherOrAdmin && (
                            <button
                              onClick={() => setDeleteTarget(item)}
                              title="Delete"
                              className="rounded-lg p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
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

      {/* ─── Create Dialog ─── */}
      <Dialog
        open={createOpen}
        onOpenChange={open => {
          setCreateOpen(open)
          if (!open) { setForm(EMPTY_FORM); setUploadedFileId(""); setUploadedFileName(""); setUploadedFileSize(0) }
        }}
      >
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FilePlus2 className="h-5 w-5 text-primary" />
              Create New Content
            </DialogTitle>
            <DialogDescription>
              Add a PDF, video link, or schedule an online class for your students.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-5 py-2">

            {/* Title */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Title <span className="text-red-500">*</span></label>
              <Input placeholder="e.g. Chapter 5 — Newton's Laws" value={form.title} onChange={e => f("title", e.target.value)} />
            </div>

            {/* Class / Batch / Subject */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Assign to <span className="text-red-500">*</span></label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  {
                    label: "Class", key: "class_id" as const, value: form.class_id,
                    options: classOptions, loading: classesLookupQuery.isLoading,
                    onChange: (v: string) => { f("class_id", v); f("batch_id", ""); f("subject_id", "") },
                  },
                  {
                    label: "Batch", key: "batch_id" as const, value: form.batch_id,
                    options: batchOptions, loading: batchesLookupQuery.isLoading,
                    onChange: (v: string) => f("batch_id", v),
                  },
                  {
                    label: "Subject", key: "subject_id" as const, value: form.subject_id,
                    options: subjectOptions, loading: subjectsLookupQuery.isLoading,
                    onChange: (v: string) => f("subject_id", v),
                  },
                ].map(sel => (
                  <div key={sel.key} className="space-y-1">
                    <label className="text-xs text-muted-foreground">{sel.label}</label>
                    <div className="relative">
                      <select
                        value={sel.value}
                        onChange={e => sel.onChange(e.target.value)}
                        disabled={sel.loading}
                        className="w-full h-9 rounded-lg border border-input bg-background px-3 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60 appearance-none"
                      >
                        <option value="">Select…</option>
                        {sel.options.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                      </select>
                      <div className="pointer-events-none absolute right-2.5 top-2.5 text-muted-foreground">
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {(classesLookupQuery.isError || batchesLookupQuery.isError || subjectsLookupQuery.isError) && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Could not load dropdown options. Check your connection and try again.
                </p>
              )}
            </div>

            {/* Visibility & Status */}
            <div className="grid grid-cols-2 gap-3">
              {[
                {
                  label: "Visibility", key: "visibility" as const, value: form.visibility,
                  options: [{ value: "BATCH_ONLY", label: "Batch Only" }, { value: "CLASS_ALL_BATCHES", label: "All Batches" }],
                },
                {
                  label: "Publish Status", key: "publish_status" as const, value: form.publish_status,
                  options: [{ value: "DRAFT", label: "Draft" }, { value: "PUBLISHED", label: "Published" }],
                },
              ].map(sel => (
                <div key={sel.key} className="space-y-1.5">
                  <label className="text-sm font-medium">{sel.label}</label>
                  <div className="relative">
                    <select
                      value={sel.value}
                      onChange={e => f(sel.key, e.target.value)}
                      className="w-full h-9 rounded-lg border border-input bg-background px-3 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-ring appearance-none"
                    >
                      {sel.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                    <div className="pointer-events-none absolute right-2.5 top-2.5 text-muted-foreground">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Content Type Selector */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Content Type <span className="text-red-500">*</span></label>
              <div className="grid grid-cols-3 gap-2">
                {(["PDF", "VIDEO_LINK", "ONLINE_CLASS"] as ContentType[]).map(type => {
                  const Cfg = CONTENT_TYPE_CONFIG[type]
                  const Icon = Cfg.icon
                  const isActive = form.content_type === type
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => { f("content_type", type); setUploadedFileId(""); setUploadedFileName(""); setUploadedFileSize(0) }}
                      className={cn(
                        "flex flex-col items-center gap-1.5 rounded-xl border-2 p-3 text-xs font-medium transition-all",
                        isActive
                          ? cn("border-transparent text-white bg-gradient-to-br", Cfg.gradient)
                          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                      )}
                    >
                      <Icon className="h-5 w-5" />
                      {Cfg.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* PDF Upload */}
            {form.content_type === "PDF" && (
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Upload File <span className="text-red-500">*</span>
                  <span className="ml-1 text-xs font-normal text-muted-foreground">(PDF / Image, max 10 MB)</span>
                </label>
                <input
                  id="content-file-input"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                  className="hidden"
                  disabled={uploading}
                  onChange={e => { const file = e.target.files?.[0]; if (file) uploadMut(file) }}
                />
                {uploadedFileId ? (
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                      <div className="min-w-0">
                        <p className="truncate text-xs font-medium text-emerald-800">{uploadedFileName}</p>
                        <p className="text-xs text-emerald-600">{formatFileSize(uploadedFileSize)} · Uploaded</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setUploadedFileId(""); setUploadedFileName(""); setUploadedFileSize(0); const el = document.getElementById("content-file-input") as HTMLInputElement | null; if (el) el.value = "" }}
                      className="shrink-0 rounded-lg p-1 text-emerald-500 hover:bg-emerald-100"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <label
                    htmlFor="content-file-input"
                    className={cn(
                      "flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 cursor-pointer transition-colors",
                      uploading
                        ? "border-primary/40 bg-primary/5 pointer-events-none"
                        : "border-slate-200 bg-slate-50 hover:border-primary/50 hover:bg-primary/5"
                    )}
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        <span className="text-xs text-primary font-medium">Uploading…</span>
                      </>
                    ) : (
                      <>
                        <Upload className="h-6 w-6 text-slate-400" />
                        <span className="text-sm text-slate-500">Click to choose a file</span>
                        <span className="text-xs text-slate-400">PDF, JPG, PNG, WebP</span>
                      </>
                    )}
                  </label>
                )}
              </div>
            )}

            {/* Video URL */}
            {form.content_type === "VIDEO_LINK" && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Video URL <span className="text-red-500">*</span></label>
                <Input
                  placeholder="https://youtube.com/watch?v=…"
                  value={form.external_url}
                  onChange={e => f("external_url", e.target.value)}
                />
              </div>
            )}

            {/* Online Class fields */}
            {form.content_type === "ONLINE_CLASS" && (
              <div className="space-y-3 rounded-xl border border-sky-200 bg-sky-50/50 p-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Meet Link <span className="text-red-500">*</span></label>
                  <Input
                    placeholder="https://meet.google.com/…"
                    value={form.meet_link}
                    onChange={e => f("meet_link", e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-600">Start Time <span className="text-red-500">*</span></label>
                    <Input type="datetime-local" value={form.start_at} onChange={e => f("start_at", e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-600">End Time <span className="text-red-500">*</span></label>
                    <Input type="datetime-local" value={form.end_at} onChange={e => f("end_at", e.target.value)} />
                  </div>
                </div>
              </div>
            )}

            {/* Description */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Description <span className="text-xs font-normal text-muted-foreground">(optional)</span></label>
              <Textarea
                placeholder="Brief description of this content…"
                value={form.description}
                onChange={e => f("description", e.target.value)}
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button
              onClick={() => createMut.mutate()}
              disabled={!canCreate || createMut.isPending || uploading}
              className="gap-2 min-w-[100px]"
            >
              {createMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FilePlus2 className="h-4 w-4" />}
              {createMut.isPending ? "Creating…" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── View Dialog ─── */}
      <Dialog open={Boolean(viewItem)} onOpenChange={open => { if (!open) setViewItem(null) }}>
        <DialogContent className="max-w-md">
          {viewItem && (() => {
            const Cfg = CONTENT_TYPE_CONFIG[viewItem.content_type]
            const url = resourceUrl(viewItem)
            return (
              <>
                <DialogHeader>
                  {/* Title row with small type icon */}
                  <div className="flex items-start gap-3">
                    <div className={cn("rounded-xl p-2.5 shrink-0 mt-0.5 border", Cfg.bg, Cfg.border)}>
                      <ContentTypeIcon type={viewItem.content_type} className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 pt-0.5">
                      <DialogTitle className="text-base font-semibold leading-snug">{viewItem.title}</DialogTitle>
                      {viewItem.description
                        ? <DialogDescription className="mt-0.5 line-clamp-2">{viewItem.description}</DialogDescription>
                        : <DialogDescription className="mt-0.5 text-slate-400 italic text-xs">No description</DialogDescription>
                      }
                    </div>
                  </div>
                </DialogHeader>

                {/* Detail rows */}
                <div className="divide-y divide-slate-100 rounded-xl border border-slate-100 overflow-hidden mt-1">
                  {[
                    { label: "Type",       value: <ContentTypeBadge type={viewItem.content_type} /> },
                    { label: "Class",      value: <span className="text-sm font-medium text-slate-800">{viewItem.class_name ?? viewItem.class_id}</span> },
                    { label: "Batch",      value: <span className="text-sm text-slate-700">{viewItem.batch_name ?? viewItem.batch_id}</span> },
                    { label: "Subject",    value: <span className="text-sm text-slate-700">{viewItem.subject_name ?? viewItem.subject_id}</span> },
                    { label: "Visibility", value: <Badge variant="outline" className="text-xs font-normal">{viewItem.visibility === "BATCH_ONLY" ? "Batch Only" : "All Batches"}</Badge> },
                    { label: "Status",     value: <PublishBadge status={viewItem.publish_status} /> },
                    ...(viewItem.teacher ? [{ label: "Teacher", value: <span className="text-sm text-slate-700">{viewItem.teacher.name}</span> }] : []),
                    ...(viewItem.start_at ? [{ label: "Schedule", value: <span className="text-sm text-slate-700">{formatDate(viewItem.start_at)} – {formatDate(viewItem.end_at)}</span> }] : []),
                    { label: "Added",      value: <span className="text-sm text-muted-foreground">{formatDate(viewItem.created_at)}</span> },
                  ].map((row, i) => (
                    <div key={i} className="flex items-center justify-between px-4 py-2.5 bg-white">
                      <span className="text-sm text-muted-foreground">{row.label}</span>
                      {row.value}
                    </div>
                  ))}
                </div>

                <DialogFooter className="mt-2 gap-2 flex-row">
                  <Button variant="outline" className="flex-1" onClick={() => setViewItem(null)}>
                    Close
                  </Button>
                  {url && (
                    <a href={url} target="_blank" rel="noopener noreferrer" className="flex-1">
                      <Button className="w-full gap-2">
                        <ExternalLink className="h-4 w-4" />
                        {viewItem.content_type === "ONLINE_CLASS" ? "Join Class" : "Open Resource"}
                      </Button>
                    </a>
                  )}
                </DialogFooter>
              </>
            )
          })()}
        </DialogContent>
      </Dialog>

      {/* ─── Edit Dialog ─── */}
      <Dialog open={Boolean(editTarget)} onOpenChange={open => { if (!open) setEditTarget(null) }}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          {editTarget && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Pencil className="h-5 w-5 text-primary" />
                  Edit Content
                </DialogTitle>
                <DialogDescription>
                  Update the title, description, visibility and publishing status.
                  Class / batch / subject and file cannot be changed — delete and recreate to move content.
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-5 py-2">
                {/* Title */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Title <span className="text-red-500">*</span></label>
                  <Input
                    value={editForm.title}
                    onChange={e => setEditForm(p => ({ ...p, title: e.target.value }))}
                  />
                </div>

                {/* Read-only assignment */}
                <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 text-xs text-slate-600 space-y-0.5">
                  <div><span className="font-medium">Class:</span> {editTarget.class_name ?? editTarget.class_id}</div>
                  <div><span className="font-medium">Batch:</span> {editTarget.batch_name ?? editTarget.batch_id}</div>
                  <div><span className="font-medium">Subject:</span> {editTarget.subject_name ?? editTarget.subject_id}</div>
                  <div><span className="font-medium">Type:</span> {CONTENT_TYPE_CONFIG[editTarget.content_type].label}</div>
                </div>

                {/* Visibility & Status */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Visibility</label>
                    <div className="relative">
                      <select
                        value={editForm.visibility}
                        onChange={e => setEditForm(p => ({ ...p, visibility: e.target.value as Visibility }))}
                        className="w-full h-9 rounded-lg border border-input bg-background px-3 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-ring appearance-none"
                      >
                        <option value="BATCH_ONLY">Batch Only</option>
                        <option value="CLASS_ALL_BATCHES">All Batches</option>
                      </select>
                      <div className="pointer-events-none absolute right-2.5 top-2.5 text-muted-foreground">
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Publish Status</label>
                    <div className="relative">
                      <select
                        value={editForm.publish_status}
                        onChange={e => setEditForm(p => ({ ...p, publish_status: e.target.value as PublishStatus }))}
                        className="w-full h-9 rounded-lg border border-input bg-background px-3 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-ring appearance-none"
                      >
                        <option value="DRAFT">Draft</option>
                        <option value="PUBLISHED">Published</option>
                      </select>
                      <div className="pointer-events-none absolute right-2.5 top-2.5 text-muted-foreground">
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Video URL */}
                {editTarget.content_type === "VIDEO_LINK" && (
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Video URL <span className="text-red-500">*</span></label>
                    <Input
                      placeholder="https://youtube.com/watch?v=…"
                      value={editForm.external_url}
                      onChange={e => setEditForm(p => ({ ...p, external_url: e.target.value }))}
                    />
                  </div>
                )}

                {/* Online Class fields */}
                {editTarget.content_type === "ONLINE_CLASS" && (
                  <div className="space-y-3 rounded-xl border border-sky-200 bg-sky-50/50 p-3">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium">Meet Link <span className="text-red-500">*</span></label>
                      <Input
                        placeholder="https://meet.google.com/…"
                        value={editForm.meet_link}
                        onChange={e => setEditForm(p => ({ ...p, meet_link: e.target.value }))}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-slate-600">Start Time</label>
                        <Input
                          type="datetime-local"
                          value={editForm.start_at}
                          onChange={e => setEditForm(p => ({ ...p, start_at: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-slate-600">End Time</label>
                        <Input
                          type="datetime-local"
                          value={editForm.end_at}
                          onChange={e => setEditForm(p => ({ ...p, end_at: e.target.value }))}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* PDF — no editable file. Show current attachment for context. */}
                {editTarget.content_type === "PDF" && editTarget.file?.url && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 flex items-center gap-2 text-xs">
                    <FileText className="h-4 w-4 text-slate-500" />
                    <span className="text-slate-700">Current file attached</span>
                    <a
                      href={editTarget.file.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-auto text-indigo-600 hover:underline inline-flex items-center gap-1"
                    >
                      <ExternalLink className="h-3 w-3" /> Open
                    </a>
                  </div>
                )}

                {/* Description */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Description</label>
                  <Textarea
                    rows={3}
                    value={editForm.description}
                    onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setEditTarget(null)}>Cancel</Button>
                <Button
                  onClick={() => updateMut.mutate()}
                  disabled={
                    !editForm.title.trim() ||
                    (editTarget.content_type === "VIDEO_LINK" && !editForm.external_url.trim()) ||
                    (editTarget.content_type === "ONLINE_CLASS" && !editForm.meet_link.trim()) ||
                    updateMut.isPending
                  }
                  className="gap-2 min-w-[100px]"
                >
                  {updateMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {updateMut.isPending ? "Saving…" : "Save"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── Delete Confirm ─── */}
      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={open => { if (!open) setDeleteTarget(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this content?</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-medium text-foreground">&quot;{deleteTarget?.title}&quot;</span> will be permanently deleted and students will lose access. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && deleteMut.mutate(deleteTarget.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-2"
            >
              {deleteMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              {deleteMut.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default function ContentPage() {
  return (
    <Suspense fallback={null}>
      <ContentPageInner />
    </Suspense>
  )
}
