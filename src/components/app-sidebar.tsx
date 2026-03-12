"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import {
  Database,
  LayoutDashboard,
  ChevronDown,
  Monitor,
  BookOpen,
  HardDrive,
  FileText,
  LifeBuoy,
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
} from "@/components/ui/sidebar"
import Link from "next/link"

// 1. DYNAMIC NAVIGATION DATA
const navData = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: LayoutDashboard,
    roles: ["admin", "user", "rektor"],
  },
  {
    title: "Data Master",
    url: "#",
    icon: Database,
    roles: ["admin", "rektor"],
    items: [
      { title: "Profil PT", url: "/profil" },
      { title: "Mata Kuliah", url: "/mata-kuliah" },
      { title: "Pengguna", url: "/pengguna" },
    ],
  },
  {
    title: "User List",
    url: "/dashboard/users",
    icon: Monitor,
    roles: ["admin", "rektor"],
  },
  {
    title: "Bank Soal",
    url: "/bank-soal",
    icon: BookOpen,
    roles: ["admin", "rektor"],
  },
  {
    title: "Data Sistem",
    url: "/sistem",
    icon: HardDrive,
    roles: ["admin", "rektor"],
  },
];

const configData = [
  { title: "Bantuan", url: "/bantuan", icon: LifeBuoy, roles: ["admin", "user", "rektor"] },
  { title: "Konfigurasi", url: "/config", icon: Settings, roles: ["admin", "rektor"] },
];

export function AppSidebar({ userRole = "rektor" }) {
  const pathname = usePathname();

  return (
    <Sidebar>
      {/* LOGO SECTION */}
      <SidebarHeader className="flex flex-col items-center pt-6 pb-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-black text-white font-bold text-2xl">
          S
        </div>
        <h2 className="mt-4 font-bold text-lg">Sans University</h2>
      </SidebarHeader>

      <SidebarContent>
        {/* USER PROFILE CARD */}
        <div className="mx-4 mb-6 flex items-center gap-3 rounded-lg border p-2">
          <div className="h-10 w-10 overflow-hidden rounded-full bg-emerald-100">
            {/* <img src="/avatar.png" alt="User" /> */}
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold">Nirmala Azalea</span>
            <span className="text-xs text-muted-foreground capitalize">{userRole}</span>
          </div>
        </div>

        {/* MENU UTAMA GROUP */}
        <SidebarGroup>
          <SidebarGroupLabel className="px-4">MENU UTAMA</SidebarGroupLabel>
          <SidebarMenu>
            {navData
              .filter((item) => item.roles.includes(userRole))
              .map((item) => (
                <SidebarMenuItem key={item.title}>
                  {item.items ? (
                    <Collapsible asChild className="group/collapsible">
                      <div>
                        <CollapsibleTrigger asChild>
                          <SidebarMenuButton 
                            isActive={item.items.some(sub => pathname === sub.url)}
                            tooltip={item.title}
                          >
                            <item.icon />
                            <span>{item.title}</span>
                            <ChevronDown className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-180" />
                          </SidebarMenuButton>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <SidebarMenuSub>
                            {item.items.map((subItem) => (
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

        {/* KONFIGURASI GROUP */}
        <SidebarGroup>
          <SidebarGroupLabel className="px-4">KONFIGURASI</SidebarGroupLabel>
          <SidebarMenu>
            {configData
              .filter((item) => item.roles.includes(userRole))
              .map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={pathname === item.url}>
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
    </Sidebar>
  )
}