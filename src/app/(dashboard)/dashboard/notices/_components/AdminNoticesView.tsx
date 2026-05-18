"use client"

import { useMemo, useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  Megaphone,
  Plus,
  Search,
  Pin,
  PinOff,
  Send,
  Archive,
  Trash2,
  Eye,
  Pencil,
  Inbox,
  Loader2,
} from "lucide-react"
import Link from "next/link"
import toast from "react-hot-toast"

import { useAuth } from "@/context/AuthContext"
import noticesApi from "@/features/notices/api"
import {
  CATEGORIES,
  CATEGORY_STYLES,
  PRIORITIES,
  PRIORITY_STYLES,
  STATES,
  STATE_STYLES,
  formatDateTime,
} from "@/features/notices/constants"
import type { NoticeCategory, NoticePriority, NoticeState, NoticeSummary } from "@/features/notices/types"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table-primitive"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
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
import NoticeFormDialog from "./NoticeFormDialog"

const PAGE_SIZE = 10

export default function AdminNoticesView() {
  const { user } = useAuth()
  const tenantId = String((user as any)?.tenant_id ?? "")
  const qc = useQueryClient()

  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [searchInput, setSearchInput] = useState("")
  const [stateFilter, setStateFilter] = useState<"" | NoticeState>("")
  const [categoryFilter, setCategoryFilter] = useState<"" | NoticeCategory>("")
  const [priorityFilter, setPriorityFilter] = useState<"" | NoticePriority>("")
  const [pinnedOnly, setPinnedOnly] = useState(false)

  const [createOpen, setCreateOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [publishId, setPublishId] = useState<string | null>(null)
  const [archiveId, setArchiveId] = useState<string | null>(null)

  const params = useMemo(
    () => ({
      page,
      limit: PAGE_SIZE,
      search: search || undefined,
      state: stateFilter || undefined,
      category: categoryFilter || undefined,
      priority: priorityFilter || undefined,
      is_pinned: pinnedOnly ? true : undefined,
    }),
    [page, search, stateFilter, categoryFilter, priorityFilter, pinnedOnly],
  )

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["notices", "admin-list", tenantId, params],
    queryFn: () => noticesApi.adminList(tenantId, params),
    enabled: !!tenantId,
  })

  const items: NoticeSummary[] = (data as any)?.data ?? []
  const total = (data as any)?.meta?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["notices"] })
  }

  const publishMut = useMutation({
    mutationFn: (id: string) => noticesApi.publish(tenantId, id),
    onSuccess: () => {
      toast.success("Notice published")
      setPublishId(null)
      invalidate()
    },
    onError: () => toast.error("Failed to publish"),
  })

  const archiveMut = useMutation({
    mutationFn: (id: string) => noticesApi.archive(tenantId, id),
    onSuccess: () => {
      toast.success("Notice archived")
      setArchiveId(null)
      invalidate()
    },
    onError: () => toast.error("Failed to archive"),
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => noticesApi.remove(tenantId, id),
    onSuccess: () => {
      toast.success("Draft deleted")
      setDeleteId(null)
      invalidate()
    },
    onError: () => toast.error("Failed to delete"),
  })

  const pinMut = useMutation({
    mutationFn: ({ id, is_pinned }: { id: string; is_pinned: boolean }) =>
      noticesApi.pin(tenantId, id, is_pinned),
    onSuccess: (_r, vars) => {
      toast.success(vars.is_pinned ? "Pinned" : "Unpinned")
      invalidate()
    },
    onError: () => toast.error("Failed to update pin"),
  })

  const resetFilters = () => {
    setSearch("")
    setSearchInput("")
    setStateFilter("")
    setCategoryFilter("")
    setPriorityFilter("")
    setPinnedOnly(false)
    setPage(1)
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-[#171717] flex items-center justify-center text-white shadow-md shadow-indigo-200">
            <Megaphone className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Notice Board</h1>
            <p className="text-sm text-slate-500">Create, schedule and publish notices for your community.</p>
          </div>
        </div>
        <Button
          onClick={() => setCreateOpen(true)}
          className="bg-[#171717]  text-white shadow-sm"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Notice
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              setSearch(searchInput.trim())
              setPage(1)
            }}
            className="relative lg:col-span-2"
          >
            <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search title or content…"
              className="pl-9"
            />
          </form>

          <select
            value={stateFilter}
            onChange={(e) => {
              setStateFilter(e.target.value as any)
              setPage(1)
            }}
            className="h-9 rounded-md border border-slate-200 px-3 text-sm bg-white"
          >
            <option value="">All states</option>
            {STATES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value as any)
              setPage(1)
            }}
            className="h-9 rounded-md border border-slate-200 px-3 text-sm bg-white"
          >
            <option value="">All categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => {
              setPriorityFilter(e.target.value as any)
              setPage(1)
            }}
            className="h-9 rounded-md border border-slate-200 px-3 text-sm bg-white"
          >
            <option value="">All priorities</option>
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-3 mt-3">
          <label className="inline-flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
            <input
              type="checkbox"
              checked={pinnedOnly}
              onChange={(e) => {
                setPinnedOnly(e.target.checked)
                setPage(1)
              }}
              className="rounded border-slate-300"
            />
            Pinned only
          </label>
          <button
            type="button"
            onClick={resetFilters}
            className="text-xs text-slate-500 hover:text-slate-800 underline-offset-2 hover:underline"
          >
            Reset filters
          </button>
          {isFetching && !isLoading && (
            <span className="text-xs text-slate-400 inline-flex items-center gap-1 ml-auto">
              <Loader2 className="h-3 w-3 animate-spin" /> Refreshing
            </span>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/70">
                <TableHead className="w-[42%]">Title</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>State</TableHead>
                <TableHead>Published</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={6}>
                      <Skeleton className="h-8 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6}>
                    <div className="py-14 flex flex-col items-center justify-center text-center text-slate-500">
                      <Inbox className="h-10 w-10 text-slate-300 mb-2" />
                      <div className="font-medium text-slate-700">No notices yet</div>
                      <p className="text-sm">Create your first notice to broadcast to your audience.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                items.map((n) => {
                  const cat = CATEGORY_STYLES[n.category]
                  const pri = PRIORITY_STYLES[n.priority]
                  const st = STATE_STYLES[n.state]
                  return (
                    <TableRow key={n.id} className="hover:bg-slate-50/60">
                      <TableCell>
                        <div className="flex items-start gap-2">
                          {n.is_pinned && (
                            <Pin className="h-3.5 w-3.5 text-amber-500 mt-1 shrink-0" />
                          )}
                          <div className="min-w-0">
                            <Link
                              href={`/dashboard/notices/${n.id}`}
                              className="font-medium text-slate-900 hover:text-indigo-600 line-clamp-1"
                            >
                              {n.title}
                            </Link>
                            <div className="text-xs text-slate-400 mt-0.5">
                              by {n.author?.name ?? "—"}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span
                          className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium"
                          style={{ background: cat.bg, color: cat.text }}
                        >
                          {n.category}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span
                          className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium"
                          style={{ background: pri.bg, color: pri.text }}
                        >
                          {n.priority}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span
                          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium"
                          style={{ background: st.bg, color: st.text }}
                        >
                          <span
                            className="h-1.5 w-1.5 rounded-full"
                            style={{ background: st.dot }}
                          />
                          {n.state}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-slate-600">
                        {formatDateTime(n.published_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex items-center gap-1">
                          <ActionIcon
                            tooltip="View"
                            href={`/dashboard/notices/${n.id}`}
                            icon={<Eye className="h-4 w-4" />}
                          />
                          {n.state === "DRAFT" && (
                            <>
                              <ActionIcon
                                tooltip="Edit"
                                onClick={() => setEditId(n.id)}
                                icon={<Pencil className="h-4 w-4" />}
                              />
                              <ActionIcon
                                tooltip="Publish"
                                onClick={() => setPublishId(n.id)}
                                className="text-indigo-600 hover:bg-indigo-50"
                                icon={<Send className="h-4 w-4" />}
                              />
                              <ActionIcon
                                tooltip="Delete"
                                onClick={() => setDeleteId(n.id)}
                                className="text-rose-600 hover:bg-rose-50"
                                icon={<Trash2 className="h-4 w-4" />}
                              />
                            </>
                          )}
                          {n.state === "PUBLISHED" && (
                            <>
                              <ActionIcon
                                tooltip={n.is_pinned ? "Unpin" : "Pin"}
                                onClick={() =>
                                  pinMut.mutate({ id: n.id, is_pinned: !n.is_pinned })
                                }
                                icon={
                                  n.is_pinned ? (
                                    <PinOff className="h-4 w-4" />
                                  ) : (
                                    <Pin className="h-4 w-4" />
                                  )
                                }
                              />
                              <ActionIcon
                                tooltip="Archive"
                                onClick={() => setArchiveId(n.id)}
                                icon={<Archive className="h-4 w-4" />}
                              />
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>

        {totalPages > 1 && (
          <div className="border-t border-slate-100 px-4 py-3 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              Showing {items.length} of {total}
            </span>
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href="#"
                    onClick={(e) => {
                      e.preventDefault()
                      setPage((p) => Math.max(1, p - 1))
                    }}
                  />
                </PaginationItem>
                <PaginationItem>
                  <PaginationLink href="#" isActive>
                    {page}
                  </PaginationLink>
                </PaginationItem>
                <PaginationItem>
                  <PaginationNext
                    href="#"
                    onClick={(e) => {
                      e.preventDefault()
                      setPage((p) => Math.min(totalPages, p + 1))
                    }}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </div>

      {/* Create dialog */}
      {createOpen && (
        <NoticeFormDialog
          mode="create"
          tenantId={tenantId}
          onClose={() => setCreateOpen(false)}
          onSaved={() => {
            setCreateOpen(false)
            invalidate()
          }}
        />
      )}

      {/* Edit dialog */}
      {editId && (
        <NoticeFormDialog
          mode="edit"
          tenantId={tenantId}
          noticeId={editId}
          onClose={() => setEditId(null)}
          onSaved={() => {
            setEditId(null)
            invalidate()
          }}
        />
      )}

      <AlertDialog open={!!publishId} onOpenChange={(o) => !o && setPublishId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Publish notice?</AlertDialogTitle>
            <AlertDialogDescription>
              This will deliver the notice to all matching recipients and send notifications.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => publishId && publishMut.mutate(publishId)}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              Publish
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!archiveId} onOpenChange={(o) => !o && setArchiveId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive notice?</AlertDialogTitle>
            <AlertDialogDescription>
              The notice will be removed from all user feeds.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => archiveId && archiveMut.mutate(archiveId)}>
              Archive
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete draft?</AlertDialogTitle>
            <AlertDialogDescription>
              This cannot be undone. Only drafts can be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMut.mutate(deleteId)}
              className="bg-rose-600 hover:bg-rose-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function ActionIcon({
  icon,
  onClick,
  href,
  tooltip,
  className = "",
}: {
  icon: React.ReactNode
  onClick?: () => void
  href?: string
  tooltip?: string
  className?: string
}) {
  const base =
    "inline-flex items-center justify-center h-8 w-8 rounded-md text-slate-600 hover:bg-slate-100 transition"
  if (href) {
    return (
      <Link href={href} title={tooltip} className={`${base} ${className}`}>
        {icon}
      </Link>
    )
  }
  return (
    <button type="button" onClick={onClick} title={tooltip} className={`${base} ${className}`}>
      {icon}
    </button>
  )
}
