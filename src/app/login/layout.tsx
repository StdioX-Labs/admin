import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In | SoldOutAfrica Admin",
  description: "Sign in to the SoldOutAfrica admin console",
};

/**
 * Sign-in canvas. Warm cream ground with slow-drifting terracotta and olive
 * washes, matching the Organic system's palette.
 */
export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 sm:p-8 overflow-hidden"
      style={{ background: "var(--color-bg)" }}
    >
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
        @media (prefers-reduced-motion: reduce) {
          .login-blob-1, .login-blob-2, .login-blob-3 { animation: none; }
        }
      `}</style>

      {/* Dot grid */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(color-mix(in srgb, #201e1d 10%, transparent) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />

      {/* Drifting colour washes */}
      <div
        className="login-blob-1 fixed pointer-events-none"
        style={{
          top: "8%",
          left: "12%",
          width: "46vw",
          height: "46vw",
          background:
            "radial-gradient(circle, color-mix(in srgb, var(--color-accent) 26%, transparent) 0%, transparent 70%)",
          filter: "blur(70px)",
        }}
      />
      <div
        className="login-blob-2 fixed pointer-events-none"
        style={{
          bottom: "8%",
          right: "8%",
          width: "50vw",
          height: "50vw",
          background:
            "radial-gradient(circle, color-mix(in srgb, var(--color-accent-2) 26%, transparent) 0%, transparent 70%)",
          filter: "blur(80px)",
        }}
      />
      <div
        className="login-blob-3 fixed pointer-events-none"
        style={{
          top: "38%",
          right: "24%",
          width: "30vw",
          height: "30vw",
          background:
            "radial-gradient(circle, color-mix(in srgb, var(--tint-amber-dot) 22%, transparent) 0%, transparent 70%)",
          filter: "blur(60px)",
        }}
      />

      <div className="relative w-full max-w-sm">{children}</div>
    </div>
  );
}
