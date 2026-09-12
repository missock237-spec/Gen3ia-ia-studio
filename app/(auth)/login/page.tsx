import AuthButtons from "@/components/auth/AuthButtons";

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <section className="w-full max-w-md">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold">
            Welcome to Gen3ia
          </h1>

          <p className="mt-2 text-sm opacity-70">
            Build autonomous AI agents,
            workflows and applications.
          </p>
        </div>

        <AuthButtons />
      </section>
    </main>
  );
}
