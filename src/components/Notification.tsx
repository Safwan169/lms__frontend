"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import NotificationsOutlinedIcon from "@mui/icons-material/NotificationsOutlined"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

type NotificationItem = {
  id: number | string
  title: string
  message: string
  time?: string
  href?: string
  unread: boolean
}

const DEFAULT_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 1,
    title: "Routine published for Science Morning A",
    message: "The published routine is now visible to teachers and students.",
    time: "2m ago",
    href: "/dashboard/my-class",
    unread: true,
  },
  {
    id: 2,
    title: "Class cancelled on 16 Apr for Physics",
    message: "A date-specific override marked the class as cancelled.",
    time: "1h ago",
    href: "/dashboard/my-class",
    unread: true,
  },
  {
    id: 3,
    title: "Teacher changed for Accounting on 18 Apr",
    message: "The override updated the assigned teacher for the session.",
    time: "Yesterday",
    href: "/dashboard/my-class",
    unread: false,
  },
]

export function Notification({ notifications }: { notifications?: NotificationItem[] }) {
  const pathname = usePathname()
  const rootRef = useRef<HTMLDivElement | null>(null)
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<NotificationItem[]>(notifications?.length ? notifications : DEFAULT_NOTIFICATIONS)

  useEffect(() => {
    if (notifications?.length) {
      setItems(notifications)
    }
  }, [notifications])

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (!rootRef.current) return
      if (!rootRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false)
      }
    }

    document.addEventListener("mousedown", handleOutsideClick)
    document.addEventListener("keydown", handleEscape)
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick)
      document.removeEventListener("keydown", handleEscape)
    }
  }, [])

  const unreadCount = useMemo(() => items.filter((item) => item.unread).length, [items])

  return (
    <div ref={rootRef} className="relative">
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Open notifications"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="relative"
      >
        <NotificationsOutlinedIcon fontSize="small" />
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 inline-flex min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
            {unreadCount}
          </span>
        ) : null}
      </Button>

      {open ? (
        <div className="absolute right-0 top-11 z-50 w-[min(360px,calc(100vw-24px))] rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
          <div className="flex items-center justify-between px-2 py-2">
            <div>
              <p className="text-sm font-semibold text-slate-900">Schedule Notifications</p>
              <p className="text-xs text-slate-500">Recent routine and override events</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setItems((current) => current.map((item) => ({ ...item, unread: false })))}>
              Mark all as read
            </Button>
          </div>

          <div className="max-h-96 space-y-1 overflow-y-auto px-1 pb-1">
            {items.map((item) => {
              const content = (
                <div className="flex gap-3 rounded-xl px-3 py-3 transition hover:bg-slate-50">
                  <div className={item.unread ? "mt-1.5 h-2.5 w-2.5 rounded-full bg-blue-500" : "mt-1.5 h-2.5 w-2.5 rounded-full bg-slate-200"} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium text-slate-900">{item.title}</p>
                      {item.unread ? <Badge className="bg-blue-100 text-blue-800">New</Badge> : null}
                    </div>
                    <p className="mt-1 text-xs text-slate-500">{item.message}</p>
                    {item.time ? <p className="mt-2 text-[11px] uppercase tracking-wide text-slate-400">{item.time}</p> : null}
                  </div>
                </div>
              )

              return item.href ? (
                <Link
                  key={item.id}
                  href={item.href}
                  onClick={() => {
                    setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, unread: false } : entry))
                    setOpen(false)
                  }}
                  className={pathname === item.href ? "block rounded-xl bg-slate-50" : "block rounded-xl"}
                >
                  {content}
                </Link>
              ) : (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, unread: false } : entry))}
                  className="block w-full rounded-xl text-left"
                >
                  {content}
                </button>
              )
            })}
          </div>
        </div>
      ) : null}
    </div>
  )
}
