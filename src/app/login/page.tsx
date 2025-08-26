import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <div className=" bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
      <div className="w-full space-y-2">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
            SoldoutAfrica
          </h1>
          <p className="text-gray-600 mt-2">Sign in to your admin dashboard</p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}