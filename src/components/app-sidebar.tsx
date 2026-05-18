"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Calculator,
  Wallet,
  BarChart2,
  ChevronDown,
  Cpu,
  Monitor,
  BookOpen,
  BookCheck,
  CalendarDays,
  ClipboardCheck,
  ClipboardList,
  Megaphone,
  School,
  GraduationCap,
  Users,
  UserCheck,
  UserRound,
  Settings,
} from "lucide-react"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar"
import Link from "next/link"
import { useAuth } from "@/context/AuthContext"

type NavSubItem = {
  title: string
  url: string
}

type NavItem = {
  title: string
  url: string
  icon: React.ComponentType<any>
  roles: string[]
  items?: NavSubItem[]
}

type ConfigItem = {
  title: string
  url: string
  icon: React.ComponentType<any>
  roles: string[]
}

const navData: NavItem[] = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: LayoutDashboard,
    roles: ["admin", "user", "rektor", "student", "teacher", "accountant"],
  },
  // {
  //   title: "Data Master",
  //   url: "#",
  //   icon: Database,
  //   roles: ["admin", "rektor"],
  //   items: [
  //     { title: "Profil PT", url: "/profil" },
  //     { title: "Mata Kuliah", url: "/mata-kuliah" },
  //     { title: "Pengguna", url: "/pengguna" },
  //   ],
  // },
  {
    title: "Admissions",
    url: "/dashboard/admissions",
    icon: GraduationCap,
    roles: ["admin", "rektor"],
  },
  {
    title: "Student List",
    url: "/dashboard/students",
    icon: BookOpen,
    roles: ["admin", "rektor"],
  },
  {
    title: "Teacher List",
    url: "/dashboard/teachers",
    icon: GraduationCap,
    roles: ["admin", "rektor"],
  },
  {
    title: "Assign Teacher",
    url: "/dashboard/admin/batch-teacher-assignment",
    icon: UserCheck,
    roles: ["admin", "rektor"],
  },
  {
    title: "Admin List",
    url: "/dashboard/admins",
    icon: Monitor,
    roles: ["admin", "rektor", "superadmin"],
  },
  {
    title: "Accountants",
    url: "/dashboard/accountants",
    icon: Calculator,
    roles: ["admin", "rektor"],
  },
  {
    title: "Payments",
    url: "/dashboard/payments",
    icon: Wallet,
    roles: ["admin", "rektor", "accountant"],
  },
  {
    title: "Payroll",
    url: "/dashboard/payroll",
    icon: Calculator,
    roles: ["admin", "rektor", "accountant"],
  },
  {
    title: "Accounting",
    url: "/dashboard/accountant",
    icon: BarChart2,
    roles: ["admin", "rektor", "accountant", "superadmin"],
  },
  {
    title: "Class Rooms",
    url: "/dashboard/classrooms",
    icon: School,
    roles: [],
  },
  {
    title: "Class Access",
    url: "/dashboard/class-access",
    icon: BookOpen,
    roles: ["student"],
  },
  {
    title: "My Class",
    url: "/dashboard/my-class",
    icon: CalendarDays,
    roles: ["teacher", "student"],
  },
  {
    title: "Timetable",
    url: "/dashboard/timetable",
    icon: CalendarDays,
    roles: ["admin", "rektor", "superadmin"],
  },
  {
    title: "Attendance",
    url: "/dashboard/attendance",
    icon: ClipboardCheck,
    roles: ["admin", "rektor", "teacher"],
  },
  // {
  //   title: "Teacher Attendance",
  //   url: "/dashboard/teacher-attendance",
  //   icon: UserCheck,
  //   roles: ["admin", "rektor", "superadmin"],
  // },
  // {
  //   title: "Machine Import",
  //   url: "/dashboard/machine-import",
  //   icon: Cpu,
  //   roles: ["admin", "rektor", "superadmin"],
  // },
  // {
  //   title: "Attendance Stats",
  //   url: "/dashboard/attendance-stats",
  //   icon: BarChart2,
  //   roles: ["admin", "rektor", "superadmin"],
  // },
  {
    title: "My Attendance",
    url: "/dashboard/self-attendance",
    icon: ClipboardCheck,
    roles: ["student"],
  },
  {
    title: "My Payroll",
    url: "/dashboard/my-payroll",
    icon: Calculator,
    roles: ["teacher"],
  },
  {
    title: "My Payments",
    url: "/dashboard/my-payments",
    icon: Wallet,
    roles: ["student"],
  },
  {
    title: "Content",
    url: "/dashboard/content",
    icon: BookOpen,
    roles: ["admin", "rektor", "superadmin", "teacher"],
  },
  {
    title: "Assessments",
    url: "/dashboard/assessments",
    icon: ClipboardList,
    roles: ["admin", "rektor", "superadmin", "teacher", "student"],
  },
  {
    title: "My Profile",
    url: "/dashboard/profile",
    icon: UserRound,
    roles: ["teacher", "student"],
  },
  {
    title: "Notice Board",
    url: "/dashboard/notices",
    icon: Megaphone,
    roles: ["admin", "rektor", "superadmin", "teacher", "student", "accountant", "employee"],
  },
  
  // {
  //   title: "Settings",
  //   url: "/admin/settings/general",
  //   icon: Settings,
  //   roles: ["admin", "rektor"],
  // },
  // {
  //   title: "Bank Soal",
  //   url: "/bank-soal",
  //   icon: BookOpen,
  //   roles: ["admin", "rektor"],
  // },
  // {
  //   title: "Data Sistem",
  //   url: "/sistem",
  //   icon: HardDrive,
  //   roles: ["admin", "rektor"],
  // },
]

const configData: ConfigItem[] = [
  // { title: "Bantuan", url: "/bantuan", icon: LifeBuoy, roles: ["admin", "user", "rektor"] },
  // { title: "Konfigurasi", url: "/config", icon: Settings, roles: ["admin", "rektor"] },
]

export function AppSidebar({ userRole = "rektor" }) {
  const { user } = useAuth()
  const pathname = usePathname()
  const normalizedUserRole = String(
    (user as any)?.role ??
    (Array.isArray((user as any)?.roles) ? (user as any)?.roles[0] : (user as any)?.roles) ??
    userRole
  ).toLowerCase()
  const tenantDisplayName = String(
    (user as any)?.tenant?.school_name ??
    (user as any)?.tenant?.schoolName ??
    (user as any)?.tenant?.name ??
    (user as any)?.school_name ??
    (user as any)?.schoolName ??
    (user as any)?.tenant_name ??
    "Tenant"
  ).trim()
  const userDisplayName = String(
    (user as any)?.name ??
    (user as any)?.full_name ??
    (user as any)?.fullName ??
    (user as any)?.username ??
    "User"
  ).trim()
  const userDisplayRole = String(
    (user as any)?.designation ??
    (user as any)?.role ??
    (Array.isArray((user as any)?.roles) ? (user as any)?.roles[0] : (user as any)?.roles) ??
    userRole
  ).trim()
  const userInitials = userDisplayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "US"
  const userAvatarUrl = String(
    (user as any)?.avatar_url ??
    (user as any)?.avatarUrl ??
    (user as any)?.profile?.avatar_url ??
    ""
  ).trim()

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600&display=swap');

        [data-sidebar="sidebar"] {
          font-family: 'Sora', sans-serif !important;
          background: #ffffff !important;
          border-right: 1px solid #f0f1f5 !important;
          width: 256px !important;
        }

        /* ── Header ── */
        .sb-header {
          padding: 1.5rem 1.25rem 1rem;
          border-bottom: 1px solid #f0f1f5;
        }

        .sb-logo-row {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 1.25rem;
        }

        .sb-logo-icon {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          flex-shrink: 0;
          box-shadow: 0 4px 12px rgba(99,102,241,0.3);
        }

        .sb-logo-name {
          font-size: 0.95rem;
          font-weight: 600;
          color: #1a1d2e;
          letter-spacing: -0.01em;
          line-height: 1.2;
        }

        .sb-logo-tagline {
          font-size: 0.68rem;
          color: #9095a8;
          font-weight: 400;
        }

        /* ── User card ── */
        .sb-user-card {
          display: flex;
          align-items: center;
          gap: 10px;
          background: #f5f6fa;
          border-radius: 10px;
          padding: 0.65rem 0.85rem;
        }

        .sb-user-av {
          width: 34px;
          height: 34px;
          border-radius: 8px;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 0.72rem;
          font-weight: 600;
          flex-shrink: 0;
        }

        .sb-user-av img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: 8px;
          display: block;
        }

        .sb-user-name {
          font-size: 0.82rem;
          font-weight: 600;
          color: #1a1d2e;
          line-height: 1.2;
        }

        .sb-user-role {
          font-size: 0.68rem;
          color: #9095a8;
          text-transform: capitalize;
        }

        .sb-user-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #10b981;
          margin-left: auto;
          flex-shrink: 0;
        }

        /* ── Group label ── */
        [data-sidebar="group-label"] {
          font-size: 0.62rem !important;
          font-weight: 700 !important;
          letter-spacing: 0.1em !important;
          color: #c0c3d0 !important;
          padding: 0 1rem !important;
          margin-bottom: 0.25rem !important;
          font-family: 'Sora', sans-serif !important;
        }

        /* ── Menu item base ── */
        [data-sidebar="menu-button"] {
          font-family: 'Sora', sans-serif !important;
          font-size: 0.82rem !important;
          font-weight: 500 !important;
          color: #6b7280 !important;
          border-radius: 9px !important;
          padding: 0.55rem 0.85rem !important;
          margin: 1px 0.75rem !important;
          transition: background 0.15s, color 0.15s !important;
          display: flex !important;
          align-items: center !important;
          gap: 10px !important;
        }

        [data-sidebar="menu-button"]:hover {
          background: #f5f6fa !important;
          color: #1a1d2e !important;
        }

        [data-sidebar="menu-button"]:hover svg {
          color: #6366f1 !important;
        }

        /* ── Active state ── */
        [data-sidebar="menu-button"][data-active="true"] {
          background: #eef2ff !important;
          color: #6366f1 !important;
          font-weight: 600 !important;
        }

        [data-sidebar="menu-button"][data-active="true"] svg {
          color: #6366f1 !important;
        }

        /* ── Icons ── */
        [data-sidebar="menu-button"] svg {
          width: 16px !important;
          height: 16px !important;
          color: #c0c3d0 !important;
          flex-shrink: 0 !important;
          transition: color 0.15s !important;
        }

        /* ── Sub menu ── */
        [data-sidebar="menu-sub"] {
          border-left: 2px solid #f0f1f5 !important;
          margin-left: 1.85rem !important;
          padding-left: 0.75rem !important;
          margin-right: 0.75rem !important;
        }

        [data-sidebar="menu-sub-button"] {
          font-family: 'Sora', sans-serif !important;
          font-size: 0.78rem !important;
          font-weight: 400 !important;
          color: #9095a8 !important;
          border-radius: 7px !important;
          padding: 0.4rem 0.65rem !important;
          transition: background 0.15s, color 0.15s !important;
        }

        [data-sidebar="menu-sub-button"]:hover {
          background: #f5f6fa !important;
          color: #1a1d2e !important;
        }

        [data-sidebar="menu-sub-button"][data-active="true"] {
          background: #eef2ff !important;
          color: #6366f1 !important;
          font-weight: 500 !important;
        }

        /* ── Chevron ── */
        .sb-chevron {
          width: 14px !important;
          height: 14px !important;
          margin-left: auto !important;
          color: #c0c3d0 !important;
          transition: transform 0.2s ease, color 0.15s !important;
          flex-shrink: 0 !important;
        }

        .group-data-[state=open]\\/collapsible\\:rotate-180.sb-chevron {
          transform: rotate(180deg) !important;
        }

        /* ── Divider ── */
        .sb-divider {
          height: 1px;
          background: #f0f1f5;
          margin: 0.5rem 1rem;
        }

        /* ── Footer ── */
        .sb-footer {
          padding: 1rem 1.25rem;
          border-top: 1px solid #f0f1f5;
        }

        .sb-footer-version {
          font-size: 0.65rem;
          color: #d1d5db;
          text-align: center;
          font-family: 'Sora', sans-serif;
        }
      `}</style>

      <Sidebar>
        {/* ── Header ── */}
        <SidebarHeader className="sb-header p-0">
          <div className="sb-logo-row">
            <div className="sb-logo-icon">
              <GraduationCap size={18} />
            </div>
            <div>
              <div className="sb-logo-name">{tenantDisplayName}</div>
              <div className="sb-logo-tagline">Learning Management</div>
            </div>
          </div>

          {/* User card */}
          <div className="sb-user-card">
            <div className="sb-user-av">
              {userAvatarUrl ? (
                <img src={userAvatarUrl} alt={userDisplayName} />
              ) : (
                userInitials
              )}
            </div>
            <div>
              <div className="sb-user-name">{userDisplayName}</div>
              <div className="sb-user-role">{userDisplayRole}</div>
            </div>
            <div className="sb-user-dot" />
          </div>
        </SidebarHeader>

        <SidebarContent>
          {/* ── Menu Utama ── */}
          <SidebarGroup>
            <SidebarGroupLabel>MENU </SidebarGroupLabel>
            <SidebarMenu>
              {navData
                .filter((item) => item.roles.includes(normalizedUserRole))
                .map((item) => (
                  <SidebarMenuItem key={item.title}>
                    {item?.items ? (
                      <Collapsible asChild className="group/collapsible">
                        <div>
                          <CollapsibleTrigger asChild>
                            <SidebarMenuButton
                              isActive={item?.items.some((sub) => pathname === sub.url)}
                              tooltip={item.title}
                            >
                              <item.icon />
                              <span>{item.title}</span>
                              <ChevronDown className="sb-chevron group-data-[state=open]/collapsible:rotate-180" />
                            </SidebarMenuButton>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <SidebarMenuSub>
                              {item?.items.map((subItem) => (
                                <SidebarMenuSubItem key={subItem.title}>
                                  <SidebarMenuSubButton
                                    asChild
                                    isActive={pathname === subItem.url}
                                  >
                                    <Link href={subItem.url}>
                                      <span>{subItem.title}</span>
                                    </Link>
                                  </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                              ))}
                            </SidebarMenuSub>
                          </CollapsibleContent>
                        </div>
                      </Collapsible>
                    ) : (
                      <SidebarMenuButton
                        asChild
                        isActive={pathname === item.url}
                        tooltip={item.title}
                      >
                        <Link href={item.url}>
                          <item.icon />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    )}
                  </SidebarMenuItem>
                ))}
            </SidebarMenu>
          </SidebarGroup>

          <div className="sb-divider" />

          {/* ── Konfigurasi ── */}
          <SidebarGroup>
            {/* <SidebarGroupLabel>KONFIGURASI</SidebarGroupLabel> */}
            <SidebarMenu>
              {configData
                .filter((item) => item.roles.includes(normalizedUserRole))
                .map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname === item.url}
                      tooltip={item.title}
                    >
                      <a href={item.url}>
                        <item.icon />
                        <span>{item.title}</span>
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>

        {/* ── Footer ── */}
        <SidebarFooter>
          <div className="sb-footer">
            <div className="sb-footer-version">Sans LMS · v2.4.1</div>
          </div>
        </SidebarFooter>
      </Sidebar>
    </>
  )
}
