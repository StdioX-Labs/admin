import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <div className="space-y-8">
      {/* Brand */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center h-12 w-12 rounded-2xl bg-foreground mb-4">
          <span className="text-background text-lg font-bold tracking-tighter">S</span>
        </div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          SoldOutAfrica
        </h1>
        <p className="text-sm text-muted-foreground">
          Sign in to the admin portal
        </p>
      </div>
      <LoginForm />
    </div>
  );
}
