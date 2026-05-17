"use client"

import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Inbox, Loader2, Megaphone, Pin, Search } from "lucide-react"
import Link from "next/link"

import { useAuth } from "@/context/AuthContext"
import noticesApi from "@/features/notices/api"
import {
  CATEGORIES,
  CATEGORY_STYLES,
  PRIORITY_STYLES,
  formatDateTime,
} from "@/features/notices/constants"
import type { FeedNotice, NoticeCategory } from "@/features/notices/types"

import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"

const PAGE_SIZE = 10

export default function UserNoticesView() {
  const { user } = useAuth()
  const tenantId = String((user as any)?.tenant_id ?? "")

  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [searchInput, setSearchInput] = useState("")
  const [category, setCategory] = useState<"" | NoticeCategory>("")
  const [unreadOnly, setUnreadOnly] = useState(false)

  const params = useMemo(
    () => ({
      page,
      limit: PAGE_SIZE,
      search: search || undefined,
      category: category || undefined,
      unread: unreadOnly ? true : undefined,
    }),
    [page, search, category, unreadOnly],
  )

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["notices", "feed", tenantId, params],
    queryFn: () => noticesApi.feed(tenantId, params),
    enabled: !!tenantId,
  })

  const items: FeedNotice[] = (data as any)?.data ?? []
  const total = (data as any)?.meta?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-200">
            <Megaphone className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Notice Board</h1>
            <p className="text-sm text-slate-500">Stay up-to-date with announcements from your school.</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              setSearch(searchInput.trim())
              setPage(1)
            }}
            className="relative md:col-span-2"
          >
            <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search notices…"
              className="pl-9"
            />
          </form>
          <select
            value={category}
            onChange={(e) => {
              setCategory(e.target.value as any)
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
        </div>
        <div className="flex items-center gap-3 mt-3">
          <label className="inline-flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
            <input
              type="checkbox"
              checked={unreadOnly}
              onChange={(e) => {
                setUnreadOnly(e.target.checked)
                setPage(1)
              }}
              className="rounded border-slate-300"
            />
            Unread only
          </label>
          {isFetching && !isLoading && (
            <span className="text-xs text-slate-400 inline-flex items-center gap-1 ml-auto">
              <Loader2 className="h-3 w-3 animate-spin" /> Refreshing
            </span>
          )}
        </div>
      </div>

      {/* Feed */}
      <div className="space-y-3">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))
        ) : items.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 py-16 flex flex-col items-center justify-center text-center">
            <Inbox className="h-10 w-10 text-slate-300 mb-2" />
            <div className="font-medium text-slate-700">No notices to show</div>
            <p className="text-sm text-slate-500">Check back later for new announcements.</p>
          </div>
        ) : (
          items.map((n) => <FeedCard key={n.id} n={n} />)
        )}
      </div>

      {totalPages > 1 && (
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
      )}
    </div>
  )
}

function FeedCard({ n }: { n: FeedNotice }) {
  const cat = CATEGORY_STYLES[n.category]
  const pri = PRIORITY_STYLES[n.priority]
  const accent = n.highlight_color ?? cat.text
  return (
    <Link
      href={`/dashboard/notices/${n.id}`}
      className="block bg-white rounded-xl border border-slate-200 hover:shadow-md hover:border-indigo-200 transition overflow-hidden"
    >
      <div className="flex">
        <div className="w-1.5 shrink-0" style={{ background: accent }} />
        <div className="flex-1 p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                {n.is_pinned && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                    <Pin className="h-3 w-3" /> Pinned
                  </span>
                )}
                <span
                  className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium"
                  style={{ background: cat.bg, color: cat.text }}
                >
                  {n.category}
                </span>
                <span
                  className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium"
                  style={{ background: pri.bg, color: pri.text }}
                >
                  {n.priority}
                </span>
                {!n.read_by_me && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full">
                    <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                    New
                  </span>
                )}
              </div>
              <h3 className="mt-2 font-semibold text-slate-900 line-clamp-1">{n.title}</h3>
              {n.preview && (
                <p className="text-sm text-slate-600 mt-1 line-clamp-2">{n.preview}</p>
              )}
            </div>
          </div>
          <div className="mt-3 flex items-center gap-3 text-xs text-slate-500">
            <span>By {n.author?.name ?? "—"}</span>
            <span>·</span>
            <span>{formatDateTime(n.published_at)}</span>
            {n.attachment_count ? (
              <>
                <span>·</span>
                <span>{n.attachment_count} attachment{n.attachment_count > 1 ? "s" : ""}</span>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </Link>
  )
}
