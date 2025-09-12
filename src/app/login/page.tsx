import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <div className=" flex items-center justify-center p-4">
      <div className="w-full space-y-2">
        <div className="text-center">
          <h1 className="text-3xl mb-3 font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
            SoldOutAfrica
          </h1>

        </div>
        <LoginForm />
      </div>
    </div>
  );
}