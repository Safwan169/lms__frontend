"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  BookOpen, Eye, FilePlus2, FileText, Globe, Link2, Loader2,
  MoreHorizontal, Pencil, Plus, Search, Trash2, Video, X,
  Monitor, RefreshCw, AlertCircle,
} from "lucide-react"
import toast from "react-hot-toast"

import { useAuth } from "@/context/AuthContext"
import { learningApi } from "@/features/learning/api"
import financeApi from "@/features/finance/api"
import api from "@/lib/api"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
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
import { Select } from "@/components/ui/select"
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

function contentTypeIcon(type: ContentType) {
  if (type === "VIDEO_LINK") return <Video className="h-4 w-4 text-violet-500" />
  if (type === "ONLINE_CLASS") return <Monitor className="h-4 w-4 text-sky-500" />
  return <FileText className="h-4 w-4 text-amber-500" />
}

function contentTypeLabel(type: ContentType) {
  if (type === "VIDEO_LINK") return "Video"
  if (type === "ONLINE_CLASS") return "Online Class"
  return "PDF"
}

function publishBadge(status: PublishStatus) {
  return status === "PUBLISHED"
    ? <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400">Published</Badge>
    : <Badge className="bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400">Draft</Badge>
}

function resourceUrl(item: ContentItem) {
  return item.file?.url ?? item.file_url ?? item.external_url ?? item.meet_link ?? null
}

function formatDate(iso?: string | null) {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
}

function asList<T>(payload: ListPayload<T> | null | undefined): T[] {
  if (!payload) return []
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload.items)) return payload.items
  if (Array.isArray(payload.data)) return payload.data
  return []
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ContentPage() {
  const { user } = useAuth()
  const tenantId = user?.tenant_id ?? user?.tenant?.id ?? null
  const role = String(user?.role ?? (Array.isArray(user?.roles) ? user?.roles[0] : user?.roles) ?? "").toLowerCase()
  const isStudent = role === "student"
  const isTeacherOrAdmin = role === "teacher" || role === "admin" || role === "superadmin"

  const qc = useQueryClient()

  // ── state ──
  const [search, setSearch] = useState("")
  const [filterType, setFilterType] = useState<ContentType | "ALL">("ALL")
  const [filterStatus, setFilterStatus] = useState<PublishStatus | "ALL">("ALL")
  const [createOpen, setCreateOpen] = useState(false)
  const [viewItem, setViewItem] = useState<ContentItem | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ContentItem | null>(null)
  const [uploadedFileId, setUploadedFileId] = useState("")
  const [uploading, setUploading] = useState(false)
  const [form, setForm] = useState<CreateForm>(EMPTY_FORM)

  const f = (k: keyof CreateForm, v: string) => setForm(p => ({ ...p, [k]: v }))

  // ── queries ──
  const listKey = isStudent
    ? ["student-content", tenantId]
    : ["teacher-content", tenantId]

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
      financeApi.listTenantBatches(String(tenantId), {
        page: 1,
        limit: 20,
        class_id: form.class_id || undefined,
      }),
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
      .map<LookupOption>((row) => ({
        id: String(row.id ?? "").trim(),
        name: String(row.name ?? row.class_name ?? "Unnamed Class").trim(),
      }))
      .filter((row) => row.id.length > 0)
  }, [classesLookupQuery.data])

  const batchOptions = useMemo(() => {
    const rows = asList<Record<string, unknown>>(batchesLookupQuery.data as ListPayload<Record<string, unknown>>)
    return rows
      .map<LookupOption>((row) => ({
        id: String(row.id ?? row.batch_id ?? "").trim(),
        name: String(row.name ?? row.batch_name ?? row.section ?? "Unnamed Batch").trim(),
      }))
      .filter((row) => row.id.length > 0)
  }, [batchesLookupQuery.data])

  const subjectOptions = useMemo(() => {
    const rows = asList<Record<string, unknown>>(subjectsLookupQuery.data as ListPayload<Record<string, unknown>>)
    return rows
      .map<LookupOption>((row) => ({
        id: String(row.id ?? row.subject_id ?? "").trim(),
        name: String(row.name ?? row.subject_name ?? "Unnamed Subject").trim(),
      }))
      .filter((row) => row.id.length > 0)
  }, [subjectsLookupQuery.data])

  // ── mutations ──
  const uploadMut = async (file: File) => {
    if (!tenantId) return
    setUploading(true)
    try {
      const res = await learningApi.uploadMedia(tenantId, file)
      const id = (res.data as any)?.id ?? ""
      setUploadedFileId(String(id))
      toast.success("File uploaded successfully")
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
        class_id: form.class_id,
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
      toast.success("Content created")
      qc.invalidateQueries({ queryKey: listKey })
      setCreateOpen(false)
      setForm(EMPTY_FORM)
      setUploadedFileId("")
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
    onError: () => toast.error("Failed to delete"),
  })

  // ── filtered list ──
  const allItems: ContentItem[] = useMemo(() => {
    const raw = (listData as any)?.items ?? []
    return raw.filter((item: ContentItem) => {
      if (filterType !== "ALL" && item.content_type !== filterType) return false
      if (filterStatus !== "ALL" && item.publish_status !== filterStatus) return false
      if (search && !`${item.title} ${item.description ?? ""}`.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
  }, [listData, filterType, filterStatus, search])

  // ── create validation ──
  const canCreate = useMemo(() => {
    if (!form.title.trim() || !form.class_id.trim() || !form.batch_id.trim() || !form.subject_id.trim()) return false
    if (form.content_type === "PDF") return Boolean(uploadedFileId)
    if (form.content_type === "VIDEO_LINK") return Boolean(form.external_url.trim())
    if (form.content_type === "ONLINE_CLASS") return Boolean(form.meet_link.trim() && form.start_at && form.end_at)
    return false
  }, [form, uploadedFileId])

  const totalItems = (listData as any)?.meta?.total ?? allItems.length

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
            <BookOpen className="h-6 w-6 text-primary" />
            Learning Content
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isStudent ? "Browse all learning materials available to your batch" : "Create, publish and manage learning content"}
          </p>
        </div>
        {isTeacherOrAdmin && (
          <Button onClick={() => setCreateOpen(true)} className="gap-2 self-start sm:self-auto">
            <Plus className="h-4 w-4" />
            New Content
          </Button>
        )}
      </div>

      {/* ─── Stats row ─── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Total Content", value: totalItems, color: "text-primary" },
          { label: "Published", value: ((listData as any)?.items ?? []).filter((i: ContentItem) => i.publish_status === "PUBLISHED").length, color: "text-emerald-600" },
          { label: "Draft", value: ((listData as any)?.items ?? []).filter((i: ContentItem) => i.publish_status === "DRAFT").length, color: "text-amber-600" },
          { label: "Video", value: ((listData as any)?.items ?? []).filter((i: ContentItem) => i.content_type === "VIDEO_LINK").length, color: "text-violet-600" },
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
            placeholder="Search content..."
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
          <option value="PDF">PDF</option>
          <option value="VIDEO_LINK">Video</option>
          <option value="ONLINE_CLASS">Online Class</option>
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
              <BookOpen className="h-10 w-10 opacity-30" />
              <p className="text-sm">No content found.</p>
              {isTeacherOrAdmin && (
                <Button size="sm" onClick={() => setCreateOpen(true)} className="mt-1 gap-1.5">
                  <Plus className="h-3.5 w-3.5" />
                  Create First Content
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
                    <TableHead>Subject</TableHead>
                    <TableHead>Visibility</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allItems.map((item) => (
                    <TableRow key={item.id} className="cursor-pointer" onClick={() => setViewItem(item)}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {contentTypeIcon(item.content_type)}
                          <span className="font-medium text-sm max-w-[180px] truncate">{item.title}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs gap-1">
                          {contentTypeIcon(item.content_type)}
                          {contentTypeLabel(item.content_type)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <span className="font-medium">{item.class_name ?? item.class_id}</span>
                          {item.batch_name && <span className="text-muted-foreground"> / {item.batch_name}</span>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{item.subject_name ?? item.subject_id}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {item.visibility === "BATCH_ONLY" ? "Batch Only" : "All Batches"}
                        </Badge>
                      </TableCell>
                      <TableCell>{publishBadge(item.publish_status)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{formatDate(item.created_at)}</TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1" onClick={e => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setViewItem(item)}>
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
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
                          {resourceUrl(item) && (
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-sky-500" asChild>
                              <a href={resourceUrl(item)!} target="_blank" rel="noopener noreferrer">
                                <Link2 className="h-3.5 w-3.5" />
                              </a>
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

      {/* ─── Create Dialog ─── */}
      <Dialog open={createOpen} onOpenChange={open => { setCreateOpen(open); if (!open) { setForm(EMPTY_FORM); setUploadedFileId("") } }}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FilePlus2 className="h-5 w-5" />
              Create New Content
            </DialogTitle>
            <DialogDescription>
              PDF is default. Turn on Video Link or Online Class mode when needed.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">

            {/* Title */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Title *</label>
              <Input placeholder="e.g. Chapter 5 Notes" value={form.title} onChange={e => f("title", e.target.value)} />
            </div>

            {/* Class / Batch / Subject */}
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Class *</label>
                <select
                  value={form.class_id}
                  onChange={e => {
                    const classId = e.target.value
                    f("class_id", classId)
                    f("batch_id", "")
                    f("subject_id", "")
                  }}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Select class</option>
                  {classOptions.map((option) => (
                    <option key={option.id} value={option.id}>{option.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Batch *</label>
                <select
                  value={form.batch_id}
                  onChange={e => f("batch_id", e.target.value)}
                  disabled={batchesLookupQuery.isLoading}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
                >
                  <option value="">Select batch</option>
                  {batchOptions.map((option) => (
                    <option key={option.id} value={option.id}>{option.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Subject *</label>
                <select
                  value={form.subject_id}
                  onChange={e => f("subject_id", e.target.value)}
                  disabled={subjectsLookupQuery.isLoading}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
                >
                  <option value="">Select subject</option>
                  {subjectOptions.map((option) => (
                    <option key={option.id} value={option.id}>{option.name}</option>
                  ))}
                </select>
              </div>
            </div>
            {(classesLookupQuery.isError || batchesLookupQuery.isError || subjectsLookupQuery.isError) ? (
              <p className="text-xs text-destructive">Dropdown data load হয়নি। API permission বা tenant data check করুন।</p>
            ) : null}

            {/* Visibility & Publish Status */}
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

            {/* Content Mode Toggle */}
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Content mode (default PDF)</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const nextType = form.content_type === "VIDEO_LINK" ? "PDF" : "VIDEO_LINK"
                    f("content_type", nextType)
                    setUploadedFileId("")
                  }}
                  className={`flex items-center justify-center gap-1.5 rounded-lg border-2 p-2 text-xs font-medium transition-colors ${
                    form.content_type === "VIDEO_LINK"
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <Video className="h-4 w-4" />
                  Video Link {form.content_type === "VIDEO_LINK" ? "(On)" : "(Off)"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const nextType = form.content_type === "ONLINE_CLASS" ? "PDF" : "ONLINE_CLASS"
                    f("content_type", nextType)
                    setUploadedFileId("")
                  }}
                  className={`flex items-center justify-center gap-1.5 rounded-lg border-2 p-2 text-xs font-medium transition-colors ${
                    form.content_type === "ONLINE_CLASS"
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <Monitor className="h-4 w-4" />
                  Online Class {form.content_type === "ONLINE_CLASS" ? "(On)" : "(Off)"}
                </button>
              </div>
              {form.content_type === "PDF" ? <p className="text-xs text-emerald-600">PDF mode is active</p> : null}
            </div>

            {/* PDF Upload */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Upload PDF/File * <span className="text-xs text-muted-foreground">(PDF / Image, max 10MB)</span></label>
              <div className="flex items-center gap-2">
                <Input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                  disabled={uploading}
                  onChange={e => { const file = e.target.files?.[0]; if (file) uploadMut(file) }}
                  className="flex-1"
                />
                {uploading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
              </div>
              {uploadedFileId && (
                <p className="text-xs text-emerald-600 flex items-center gap-1">
                  Upload complete - file_id: <code className="font-mono">{uploadedFileId}</code>
                </p>
              )}
            </div>

            {/* Video URL */}
            {form.content_type === "VIDEO_LINK" && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Video URL *</label>
                <Input
                  placeholder="https://youtube.com/watch?v=..."
                  value={form.external_url}
                  onChange={e => f("external_url", e.target.value)}
                />
              </div>
            )}

            {/* Online Class fields */}
            {form.content_type === "ONLINE_CLASS" && (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Meet Link *</label>
                  <Input
                    placeholder="https://meet.google.com/..."
                    value={form.meet_link}
                    onChange={e => f("meet_link", e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium">Start Time *</label>
                    <Input type="datetime-local" value={form.start_at} onChange={e => f("start_at", e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium">End Time *</label>
                    <Input type="datetime-local" value={form.end_at} onChange={e => f("end_at", e.target.value)} />
                  </div>
                </div>
              </div>
            )}

            {/* Description */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Description</label>
              <Textarea
                placeholder="Brief description of this content..."
                value={form.description}
                onChange={e => f("description", e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button
              onClick={() => createMut.mutate()}
              disabled={!canCreate || createMut.isPending}
              className="gap-2"
            >
              {createMut.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── View Dialog ─── */}
      <Dialog open={Boolean(viewItem)} onOpenChange={open => { if (!open) setViewItem(null) }}>
        <DialogContent className="max-w-lg">
          {viewItem && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {contentTypeIcon(viewItem.content_type)}
                  {viewItem.title}
                </DialogTitle>
                <DialogDescription>{viewItem.description || "No description provided."}</DialogDescription>
              </DialogHeader>
              <div className="space-y-3 py-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Type</span>
                  <Badge variant="outline">{contentTypeLabel(viewItem.content_type)}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Class</span>
                  <span>{viewItem.class_name ?? viewItem.class_id}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Batch</span>
                  <span>{viewItem.batch_name ?? viewItem.batch_id}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Subject</span>
                  <span>{viewItem.subject_name ?? viewItem.subject_id}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Status</span>
                  {publishBadge(viewItem.publish_status)}
                </div>
                {viewItem.teacher && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Teacher</span>
                    <span>{viewItem.teacher.name}</span>
                  </div>
                )}
                {viewItem.start_at && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Schedule</span>
                    <span>{formatDate(viewItem.start_at)} – {formatDate(viewItem.end_at)}</span>
                  </div>
                )}
              </div>
              {resourceUrl(viewItem) && (
                <DialogFooter>
                  <a href={resourceUrl(viewItem)!} target="_blank" rel="noopener noreferrer">
                    <Button className="gap-2 w-full">
                      <Link2 className="h-4 w-4" />
                      {viewItem.content_type === "ONLINE_CLASS" ? "Join Class" : "Open Resource"}
                    </Button>
                  </a>
                </DialogFooter>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── Delete Confirm ─── */}
      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={open => { if (!open) setDeleteTarget(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Content?</AlertDialogTitle>
            <AlertDialogDescription>
              &quot;{deleteTarget?.title}&quot; will be permanently deleted. This cannot be undone.
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
