import LoginForm from '@/components/auth/LoginForm';

export default function LoginPage() {
  return (
    <div className="flex h-screen items-center justify-center bg-discord-700">
      <div className="w-full max-w-md rounded-lg bg-discord-800 p-8 shadow-xl">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-white">Welcome back!</h1>
          <p className="mt-1 text-sm text-discord-text-muted">We're so excited to see you again!</p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
