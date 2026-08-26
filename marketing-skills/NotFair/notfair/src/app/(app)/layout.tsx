import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ClientMountGate } from "@/components/client-mount-gate";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClientMountGate
      fallback={
        <div className="min-h-screen bg-background" suppressHydrationWarning>
          {/* Empty shell during hydration — children mount client-side */}
        </div>
      }
    >
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <header className="sticky top-0 z-30 flex h-12 shrink-0 items-center bg-background/95 px-3 backdrop-blur md:hidden">
            <SidebarTrigger aria-label="Open navigation" />
          </header>
          <a href="#main-content" className="sr-only focus:not-sr-only">
            Skip to content
          </a>
          <main id="main-content" className="relative flex-1">
            {children}
          </main>
        </SidebarInset>
      </SidebarProvider>
    </ClientMountGate>
  );
}
