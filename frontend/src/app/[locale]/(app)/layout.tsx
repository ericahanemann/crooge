import { AppSidebar } from "@/components/common/sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AppSidebar />
      <main className="flex flex-col flex-1 overflow-hidden min-w-0">
        {children}
      </main>
    </>
  );
}
