"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useMemo } from "react"
import {
  ArrowLeft,
  Bell,
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
  
  // Guard implementation intentionally commented for frontend-only flow.
  // const router = useRouter()
  // const isAdmin = useMemo(() => {
  //   if (!user) return false
  //   const role = String((user as any)?.role ?? "").toLowerCase()
  //   return role === "admin" || role === "rektor"
  // }, [user])

  const tenantId = useMemo(() => {
    return (
      (user as any)?.tenant_id ??
      (user as any)?.tenantId ??
      (user as any)?.tenant?.id ??
      null
    )
  }, [user])

  // useEffect(() => {
  //   if (!user) {
  //     router.push("/login")
  //     return
  //   }
  //
  //   if (!isAdmin) {
  //     router.push("/dashboard")
  //   }
  // }, [user, isAdmin, router])

  const canAccessPage = true
  if (!canAccessPage) return null

  const pageName = getPageName(pathname)

  return (
    <div className="adm-root">
      <div className="mx-auto flex w-full max-w-[1200px] gap-6 px-4 py-6 md:px-8">
        <aside className="sticky top-6 h-[calc(100vh-3rem)] w-56 shrink-0 rounded-lg border bg-card p-3">
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

        <section className="flex-1 space-y-4">
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
