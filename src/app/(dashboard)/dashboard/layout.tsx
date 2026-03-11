import { AppSidebar } from "@/components/app-sidebar"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { TooltipProvider } from "@/components/ui/tooltip"

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <TooltipProvider delayDuration={0}>
      <SidebarProvider>
        <AppSidebar userRole="rektor" />
        <SidebarInset>
          {/* HEADER: Added sticky, top-0, z-index, and background color */}
          <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-2 border-b bg-background px-4">
            <SidebarTrigger className="-ml-1" />
            <div className="h-4 w-[1px] bg-border mx-2" />
            <h1 className="text-sm font-medium">Dashboard</h1>
          </header>
          
          {/* MAIN CONTENT */}
          <main className="flex flex-1 flex-col p-4">
            {children}
          </main>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  )
}