// src/app/(dashboard)/layout.tsx
import { AppSidebar } from "@/components/app-sidebar"
import DahhboardTopbar from "@/components/dahsboard-topbar"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { TooltipProvider } from "@/components/ui/tooltip"
import Protected from "@/components/auth/Protected"

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <Protected>
      <TooltipProvider delayDuration={0}>
        <SidebarProvider>
          <AppSidebar userRole="rektor" />
          <SidebarInset>
            <DahhboardTopbar />
            <main className="flex flex-1 flex-col">
              {children}
            </main>
          </SidebarInset>
        </SidebarProvider>
      </TooltipProvider>
    </Protected>
  )
}