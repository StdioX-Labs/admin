import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <div className="space-y-7">
      {/* Brand */}
      <div className="text-center space-y-3">
        <div className="flex items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo-tile.svg"
            alt="SoldOutAfrica"
            className="h-14 w-14"
            style={{ borderRadius: 14, boxShadow: "var(--shadow-md)" }}
          />
        </div>
        <div>
          <div className="soa-brand" style={{ fontSize: 22, letterSpacing: "-.01em" }}>
            SoldOutAfrica
          </div>
          <p
            className="m-0"
            style={{
              fontSize: 12,
              letterSpacing: ".14em",
              textTransform: "uppercase",
              fontWeight: 600,
              color: "var(--color-accent-700)",
            }}
          >
            Admin console
          </p>
        </div>
      </div>
      <LoginForm />
    </div>
  );
}
