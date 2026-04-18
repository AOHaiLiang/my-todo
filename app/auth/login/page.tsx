import { LoginForm } from "@/components/login-form";

export default function Page() {
  return (
    <div className="relative flex min-h-[calc(100svh-3.5rem)] w-full items-center justify-center overflow-hidden bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 p-6 md:p-10">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-40 top-20 h-[500px] w-[500px] rounded-full bg-purple-600/20 blur-[120px] animate-pulse" />
        <div className="absolute -right-40 bottom-20 h-[400px] w-[400px] rounded-full bg-blue-600/20 blur-[120px] animate-pulse [animation-delay:2s]" />
      </div>
      <div className="relative z-10 w-full max-w-sm">
        <LoginForm />
      </div>
    </div>
  );
}
