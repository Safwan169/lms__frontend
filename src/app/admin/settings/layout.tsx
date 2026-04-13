"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useMemo } from "react"
import {
  ArrowLeft,
  Bell,
  BookOpen,
  CalendarDays,
  ClipboardList,
  CreditCard,
  GraduationCap,
  School,
} from "lucide-react"

import { useAuth } from "@/context/AuthContext"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"

type SettingsNavItem = {
  title: string
  href: string
  icon: React.ComponentType<{ className?: string }>
}

const settingsNavItems: SettingsNavItem[] = [
  { title: "General", href: "/admin/settings/general", icon: School },
  { title: "Subjects", href: "/admin/settings/subjects", icon: BookOpen },
  { title: "Classes", href: "/admin/settings/classes", icon: GraduationCap },
  { title: "Batches", href: "/admin/settings/batches", icon: CalendarDays },
  { title: "Admission", href: "/admin/settings/admission", icon: ClipboardList },
  { title: "Payment Methods", href: "/admin/settings/payment-methods", icon: CreditCard },
  { title: "Notifications", href: "/admin/settings/notifications", icon: Bell },
]

function isRouteActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`)
}

function getPageName(pathname: string) {
  const matched = settingsNavItems.find((item) => isRouteActive(pathname, item.href))
  if (matched) return matched.title

  const parts = pathname.split("/").filter(Boolean)
  const lastPart = parts[parts.length - 1] ?? "settings"
  return lastPart
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

export default function AdminSettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user } = useAuth()
  const pathname = usePathname()
  const router = useRouter()
  const normalizedRole = useMemo(() => {
    return String(
      (user as any)?.role ??
      (Array.isArray((user as any)?.roles) ? (user as any)?.roles[0] : (user as any)?.roles) ??
      ""
    ).toLowerCase()
  }, [user])
  const canAccessPage = normalizedRole === "admin" || normalizedRole === "rektor" || normalizedRole === "superadmin"

  const tenantId = useMemo(() => {
    return (
      (user as any)?.tenant_id ??
      (user as any)?.tenantId ??
      (user as any)?.tenant?.id ??
      null
    )
  }, [user])

  useEffect(() => {
    if (!user) return
    if (!canAccessPage) {
      if (normalizedRole === "teacher") {
        router.replace("/dashboard/dashboard-empty")
        return
      }
      if (normalizedRole === "student") {
        router.replace("/dashboard")
        return
      }
      router.replace("/dashboard")
    }
  }, [user, canAccessPage, normalizedRole, router])

  if (!canAccessPage) return null

  const pageName = getPageName(pathname)

  return (
    <div className="min-h-screen w-full bg-[#f5f6fa] px-8 pt-6 pb-8 font-sans text-[#1a1d2e]">
      <div className="mx-auto w-full max-w-[1200px] px-4 md:px-8">
        <aside className="fixed top-2 hidden h-[calc(100vh-4rem)] w-56 overflow-y-auto rounded-lg border bg-card p-3 md:block">
          <h2 className="px-2 pb-3 text-lg font-semibold">Settings</h2>
          <nav className="space-y-1">
            {settingsNavItems.map((item) => {
              const Icon = item.icon
              const active = isRouteActive(pathname, item.href)

              return (
                <Button
                  key={item.href}
                  asChild
                  variant="ghost"
                  className={`w-full justify-start ${active ? "bg-muted font-medium" : ""}`}
                >
                  <Link href={item.href}>
                    <Icon className="mr-2 h-4 w-4" />
                    {item.title}
                  </Link>
                </Button>
              )
            })}
          </nav>
        </aside>

        <section className="space-y-4 md:ml-[15.5rem]">
          <Button asChild variant="ghost" className="w-fit">
            <Link href="/dashboard">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Link>
          </Button>

          <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
            <p>
              <span>Admin</span>
              <span className="mx-2">→</span>
              <span>Settings</span>
              <span className="mx-2">→</span>
              <span className="font-medium text-foreground">{pageName}</span>
            </p>
            <p className="text-xs">Tenant: {tenantId ? String(tenantId) : "Unknown"}</p>
          </div>
          <Separator />
          <div>{children}</div>
        </section>
      </div>
    </div>
  )
}
