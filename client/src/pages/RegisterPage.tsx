import RegisterForm from '@/components/auth/RegisterForm';

export default function RegisterPage() {
  return (
    <div className="flex h-screen items-center justify-center bg-discord-700">
      <div className="w-full max-w-md rounded-lg bg-discord-800 p-8 shadow-xl">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-white">Create an account</h1>
          <p className="mt-1 text-sm text-discord-text-muted">Join the conversation today.</p>
        </div>
        <RegisterForm />
      </div>
    </div>
  );
}
