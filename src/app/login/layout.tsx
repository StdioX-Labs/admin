import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In | Admin Dashboard",
  description: "Sign in to access your admin dashboard",
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-indigo-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-lg p-2">
          {children}
        </div>
      </div>
    </div>
  );
}