import AuthButtons from "@/components/auth/AuthButtons";
import EmailAuthForm from "@/components/auth/EmailAuthForm";

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <section className="w-full max-w-md">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold">
            Bienvenue sur Gen3ia
          </h1>

          <p className="mt-2 text-sm opacity-70">
            Creez des agents IA autonomes, des workflows et des applications.
          </p>
        </div>

        <div className="rounded-2xl border p-6 shadow-sm">
          <EmailAuthForm />

          <div className="my-6 flex items-center gap-3 text-xs opacity-50">
            <span className="h-px flex-1 bg-current" />
            ou continuer avec
            <span className="h-px flex-1 bg-current" />
          </div>

          <AuthButtons />
        </div>
      </section>
    </main>
  );
}
