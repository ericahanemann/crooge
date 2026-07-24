import { AppSidebar } from "@/components/common/sidebar";
import { MobileMenu } from "@/components/common/mobile-menu";
import { SidebarProvider } from "@/components/common/sidebar-context";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <MobileMenu />
      <main className="flex flex-col flex-1 overflow-hidden min-w-0">
        {children}
      </main>
    </SidebarProvider>
  );
}
