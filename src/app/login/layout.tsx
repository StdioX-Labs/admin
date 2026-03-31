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
    <div className="min-h-screen bg-background flex items-center justify-center p-4 sm:p-8 overflow-hidden">
      <style>{`
        @keyframes blob-drift-1 {
          0%, 100% { transform: translate(0%, 0%) scale(1); }
          33% { transform: translate(8%, -12%) scale(1.08); }
          66% { transform: translate(-6%, 8%) scale(0.95); }
        }
        @keyframes blob-drift-2 {
          0%, 100% { transform: translate(0%, 0%) scale(1); }
          33% { transform: translate(-10%, 6%) scale(1.05); }
          66% { transform: translate(7%, -10%) scale(0.97); }
        }
        @keyframes blob-drift-3 {
          0%, 100% { transform: translate(0%, 0%) scale(1); }
          50% { transform: translate(5%, 8%) scale(1.06); }
        }
        .login-blob-1 { animation: blob-drift-1 18s ease-in-out infinite; }
        .login-blob-2 { animation: blob-drift-2 22s ease-in-out infinite; }
        .login-blob-3 { animation: blob-drift-3 26s ease-in-out infinite; }
      `}</style>

      {/* Dot-grid */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(oklch(0.26 0.006 285.8) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />

      {/* Animated gradient blobs */}
      <div className="login-blob-1 fixed pointer-events-none" style={{
        top: '10%', left: '15%', width: '45vw', height: '45vw',
        background: 'radial-gradient(circle, oklch(0.22 0.012 285.8 / 0.55) 0%, transparent 70%)',
        filter: 'blur(60px)',
      }} />
      <div className="login-blob-2 fixed pointer-events-none" style={{
        bottom: '10%', right: '10%', width: '50vw', height: '50vw',
        background: 'radial-gradient(circle, oklch(0.2 0.01 285.8 / 0.45) 0%, transparent 70%)',
        filter: 'blur(70px)',
      }} />
      <div className="login-blob-3 fixed pointer-events-none" style={{
        top: '40%', right: '25%', width: '30vw', height: '30vw',
        background: 'radial-gradient(circle, oklch(0.25 0.008 285.8 / 0.3) 0%, transparent 70%)',
        filter: 'blur(50px)',
      }} />

      <div className="relative w-full max-w-sm">
        {children}
      </div>
    </div>
  );
}
