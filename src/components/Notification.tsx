"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import NotificationsOutlinedIcon from "@mui/icons-material/NotificationsOutlined"
import { Inbox, Loader2, Trash2 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/context/AuthContext"
import notificationsApi, { NotificationItem } from "@/features/notifications/api"

function relativeTime(value?: string | null) {
  if (!value) return ""
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ""
  const diff = (Date.now() - d.getTime()) / 1000
  if (diff < 60) return "Just now"
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short" }).format(d)
}

function resolveHref(n: NotificationItem): string | null {
  const module = n.source?.module?.toUpperCase()
  const entityId = n.source?.entity_id
  if (!entityId) return null
  switch (module) {
    case "NOTICE":
      return `/dashboard/notices/${entityId}`
    default:
      return null
  }
}

export function Notification(_props?: { notifications?: any[] }) {
  const { user } = useAuth()
  const tenantId = String((user as any)?.tenant_id ?? "")
  const router = useRouter()
  const qc = useQueryClient()

  const rootRef = useRef<HTMLDivElement | null>(null)
  const [open, setOpen] = useState(false)

  // Lightweight polling for badge — every 45s
  const { data: unread } = useQuery({
    queryKey: ["notifications", "unread", tenantId],
    queryFn: () => notificationsApi.unreadCount(tenantId),
    enabled: !!tenantId,
    refetchInterval: 45_000,
    refetchOnWindowFocus: true,
  })

  // Fetch list only when panel opens
  const { data: list, isFetching, isLoading } = useQuery({
    queryKey: ["notifications", "list", tenantId],
    queryFn: () => notificationsApi.list(tenantId, { page: 1, limit: 15 }),
    enabled: !!tenantId && open,
    staleTime: 15_000,
  })

  const items = list?.data ?? []
  const unreadCount = unread?.unread_count ?? list?.unread_count ?? 0

  const markAllMut = useMutation({
    mutationFn: () => notificationsApi.markRead(tenantId, { all: true }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] })
    },
  })

  const markOneMut = useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(tenantId, { notification_ids: [id] }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] })
    },
  })

  const removeMut = useMutation({
    mutationFn: (id: string) => notificationsApi.remove(tenantId, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] })
    },
  })

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (!rootRef.current) return
      if (!rootRef.current.contains(event.target as Node)) setOpen(false)
    }
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false)
    }
    document.addEventListener("mousedown", handleOutsideClick)
    document.addEventListener("keydown", handleEscape)
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick)
      document.removeEventListener("keydown", handleEscape)
    }
  }, [])

  const moduleSummary = useMemo(() => {
    const entries = Object.entries(unread?.by_module ?? {}).filter(([, v]) => v > 0)
    return entries.slice(0, 3)
  }, [unread])

  const handleItemClick = (n: NotificationItem) => {
    if (!n.is_read) markOneMut.mutate(n.id)
    const href = resolveHref(n)
    if (href) {
      router.push(href)
      setOpen(false)
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Open notifications"
        aria-expanded={open}
        onClick={() => setOpen((c) => !c)}
        className="relative"
      >
        <NotificationsOutlinedIcon fontSize="small" />
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 inline-flex min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </Button>

      {open ? (
        <div className="absolute right-0 top-11 z-50 w-[min(380px,calc(100vw-24px))] rounded-2xl border border-slate-200 bg-white shadow-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900">Notifications</p>
              <p className="text-[11px] text-slate-500">
                {unreadCount > 0
                  ? `${unreadCount} unread${moduleSummary.length ? ` · ${moduleSummary.map(([m, c]) => `${m.toLowerCase()} ${c}`).join(" · ")}` : ""}`
                  : "You're all caught up"}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => markAllMut.mutate()}
              disabled={unreadCount === 0 || markAllMut.isPending}
              className="text-xs"
            >
              {markAllMut.isPending ? "…" : "Mark all read"}
            </Button>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {!tenantId ? (
              <div className="px-4 py-10 text-center text-xs text-slate-400">
                Sign in to view notifications
              </div>
            ) : isLoading ? (
              <div className="flex items-center justify-center py-10 text-slate-400 text-xs">
                <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading…
              </div>
            ) : items.length === 0 ? (
              <div className="px-4 py-12 flex flex-col items-center justify-center text-center">
                <Inbox className="h-8 w-8 text-slate-300 mb-2" />
                <p className="text-sm font-medium text-slate-700">No notifications</p>
                <p className="text-[11px] text-slate-500">
                  You'll see updates here when something happens.
                </p>
              </div>
            ) : (
              items.map((n) => {
                const href = resolveHref(n)
                const Inner = (
                  <div className="flex gap-3 rounded-xl px-3 py-3 transition hover:bg-slate-50">
                    <div
                      className={`mt-1.5 h-2.5 w-2.5 rounded-full shrink-0 ${
                        !n.is_read ? "bg-blue-500" : "bg-slate-200"
                      }`}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-medium text-slate-900">
                          {n.subject || n.event_type.replace(/_/g, " ")}
                        </p>
                        {!n.is_read && (
                          <Badge className="bg-blue-100 text-blue-800 text-[10px] px-1.5 py-0">
                            New
                          </Badge>
                        )}
                        {n.priority === "URGENT" && (
                          <Badge className="bg-rose-100 text-rose-700 text-[10px] px-1.5 py-0">
                            Urgent
                          </Badge>
                        )}
                      </div>
                      {n.body && (
                        <p className="mt-1 text-xs text-slate-500 line-clamp-2">{n.body}</p>
                      )}
                      <div className="mt-1.5 flex items-center justify-between">
                        <p className="text-[11px] text-slate-400">
                          {relativeTime(n.created_at)}
                          {n.source?.module ? ` · ${n.source.module.toLowerCase()}` : ""}
                        </p>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            removeMut.mutate(n.id)
                          }}
                          className="text-slate-300 hover:text-rose-500 p-1 -mr-1"
                          aria-label="Delete notification"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                )

                return href ? (
                  <Link
                    key={n.id}
                    href={href}
                    onClick={() => handleItemClick(n)}
                    className="block px-1"
                  >
                    {Inner}
                  </Link>
                ) : (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => handleItemClick(n)}
                    className="block w-full text-left px-1"
                  >
                    {Inner}
                  </button>
                )
              })
            )}
          </div>

          {isFetching && !isLoading && (
            <div className="border-t border-slate-100 px-4 py-1.5 text-[11px] text-slate-400 inline-flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" /> Refreshing…
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}
