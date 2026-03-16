import { AppSidebar } from "@/components/app-sidebar"
import DahhboardTopbar from "@/components/dahsboard-topbar"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { TooltipProvider } from "@/components/ui/tooltip"

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <TooltipProvider delayDuration={0}>
      <SidebarProvider>
        <AppSidebar userRole="rektor" />
        <SidebarInset>
        <DahhboardTopbar/>
          
          {/* MAIN CONTENT */}
          <main className="flex flex-1 flex-col ">
            {children}
          </main>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  )
}