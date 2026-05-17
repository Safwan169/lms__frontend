"use client"

import { useAuth } from "@/context/AuthContext"
import AdminNoticesView from "./_components/AdminNoticesView"
import UserNoticesView from "./_components/UserNoticesView"
import { Skeleton } from "@/components/ui/skeleton"

export default function NoticesPage() {
  const { user, isAuthReady } = useAuth()

  if (!isAuthReady) {
    return (
      <div className="p-6 space-y-3">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    )
  }

  const role = String(
    (user as any)?.role ??
      (Array.isArray((user as any)?.roles) ? (user as any)?.roles[0] : (user as any)?.roles) ??
      "",
  ).toLowerCase()

  const isAdmin = role === "admin" || role === "rektor" || role === "superadmin"

  return isAdmin ? <AdminNoticesView /> : <UserNoticesView />
}
