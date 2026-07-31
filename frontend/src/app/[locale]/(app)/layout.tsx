import { AuthGate } from "@/components/common/auth-gate";
import { MobileMenu } from "@/components/common/mobile-menu";
import { AppSidebar } from "@/components/common/sidebar";
import { SidebarProvider } from "@/components/common/sidebar-context";

/**
 * shell for all authenticated app pages (dashboard, monthly, credit cards) — sidebar +
 * mobile menu + main content slot
 *
 * `SidebarProvider` wraps everything so both `AppSidebar` (desktop) and `MobileMenu`
 * (mobile) can share the same collapsed/mobile-open state. not used by the `(auth)`
 * group, which has no sidebar
 *
 * `AuthGate` redirects to /signin if the silent refresh in `AuthProvider` comes
 * back unauthenticated
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGate mode="protected">
      <SidebarProvider>
        <AppSidebar />
        <MobileMenu />
        <main className="flex flex-col flex-1 overflow-hidden min-w-0">
          {children}
        </main>
      </SidebarProvider>
    </AuthGate>
  );
}
