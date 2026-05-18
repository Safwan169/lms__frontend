"use client"

import { useParams, useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { ArrowLeft, CalendarClock, Eye, Megaphone, Pin, Users } from "lucide-react"
import Link from "next/link"

import { useAuth } from "@/context/AuthContext"
import noticesApi from "@/features/notices/api"
import {
  CATEGORY_STYLES,
  PRIORITY_STYLES,
  STATE_STYLES,
  formatDateTime,
} from "@/features/notices/constants"
import type { NoticeDetail } from "@/features/notices/types"

import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"

export default function NoticeDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { user } = useAuth()
  const tenantId = String((user as any)?.tenant_id ?? "")

  const role = String(
    (user as any)?.role ??
      (Array.isArray((user as any)?.roles) ? (user as any)?.roles[0] : (user as any)?.roles) ??
      "",
  ).toLowerCase()
  const isAdmin = role === "admin" || role === "rektor" || role === "superadmin"

  const { data, isLoading, isError } = useQuery({
    queryKey: ["notices", "detail", tenantId, id],
    queryFn: () => noticesApi.getOne(tenantId, id!),
    enabled: !!tenantId && !!id,
  })

  const notice: NoticeDetail | null = (data as any)?.notice ?? null

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
      <button
        onClick={() => router.back()}
        className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-indigo-600 mb-4"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-72 w-full mt-4" />
        </div>
      ) : isError || !notice ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
          <Megaphone className="h-10 w-10 text-slate-300 mx-auto mb-2" />
          <div className="font-medium text-slate-700">Notice not available</div>
          <p className="text-sm text-slate-500 mt-1">
            It may have been removed or you might not have access to it.
          </p>
          <Link
            href="/dashboard/notices"
            className="inline-block mt-4 text-sm text-indigo-600 hover:underline"
          >
            Back to Notice Board
          </Link>
        </div>
      ) : (
        <NoticeView notice={notice} isAdmin={isAdmin} />
      )}
    </div>
  )
}

function NoticeView({ notice, isAdmin }: { notice: NoticeDetail; isAdmin: boolean }) {
  const cat = CATEGORY_STYLES[notice.category]
  const pri = PRIORITY_STYLES[notice.priority]
  const st = STATE_STYLES[notice.state]

  return (
    <article className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="h-1.5" style={{ background: cat.text }} />
      <header className="p-6 border-b border-slate-100">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          {notice.is_pinned && (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
              <Pin className="h-3 w-3" /> Pinned
            </span>
          )}
          <span
            className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium"
            style={{ background: cat.bg, color: cat.text }}
          >
            {notice.category}
          </span>
          <span
            className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium"
            style={{ background: pri.bg, color: pri.text }}
          >
            {notice.priority}
          </span>
          {isAdmin && (
            <span
              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium"
              style={{ background: st.bg, color: st.text }}
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: st.dot }} />
              {notice.state}
            </span>
          )}
        </div>
        <h1 className="text-2xl font-semibold text-slate-900 leading-tight">{notice.title}</h1>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
          <span>By {notice.author?.name ?? "—"}</span>
          <span className="inline-flex items-center gap-1">
            <CalendarClock className="h-3.5 w-3.5" />
            {formatDateTime(notice.published_at ?? notice.created_at)}
          </span>
          {notice.expires_at && <span>Expires {formatDateTime(notice.expires_at)}</span>}
          {isAdmin && (
            <>
              <span className="inline-flex items-center gap-1">
                <Eye className="h-3.5 w-3.5" />
                {notice.read_count ?? 0} reads
              </span>
              <span className="inline-flex items-center gap-1">
                <Users className="h-3.5 w-3.5" />
                {notice.recipient_count ?? 0} recipients
              </span>
            </>
          )}
        </div>
      </header>

      <div className="p-6">
        <div
          className="prose prose-slate max-w-none prose-headings:font-semibold prose-a:text-indigo-600"
          dangerouslySetInnerHTML={{ __html: notice.content }}
        />

        {Array.isArray(notice.attachments) && notice.attachments.length > 0 && (
          <div className="mt-6 border-t border-slate-100 pt-4">
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">
              Attachments
            </div>
            <ul className="space-y-1.5">
              {notice.attachments.map((a) => {
                const url = (a as any).media?.url ?? (a as any).url
                const name = (a as any).media?.name ?? (a as any).media?.original_name ?? a.media_id
                return (
                  <li key={a.id ?? a.media_id}>
                    {url ? (
                      <a
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm text-indigo-600 hover:underline"
                      >
                        {name}
                      </a>
                    ) : (
                      <span className="text-sm text-slate-600">{name}</span>
                    )}
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </div>
    </article>
  )
}
