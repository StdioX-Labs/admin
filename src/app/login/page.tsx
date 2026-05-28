import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <div className="space-y-8">
      {/* Brand */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center mb-4">
          <img src="/bg-dark.svg" alt="SoldOutAfrica" className="h-16 w-16" />
        </div>
        <p className="text-sm text-muted-foreground">
          Sign in to the admin portal
        </p>
      </div>
      <LoginForm />
    </div>
  );
}
