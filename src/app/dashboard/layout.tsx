import { AuthGuard } from "@/components/auth/auth-guard";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { Navbar } from "@/components/layout/navbar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <div className="flex h-screen bg-gray-50 overflow-hidden">
        {/* Sidebar */}
        <Sidebar />

        {/* Main content area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />

          {/* Page content */}
          <main className="flex-1 overflow-x-hidden overflow-y-auto p-6">
            <div className="max-w-7xl mx-auto">{children}</div>
          </main>
        </div>
      </div>
    </AuthGuard>
  );
}