import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <section className="max-w-3xl text-center">
        <p className="text-sm uppercase tracking-widest opacity-60">
          Gen3ia AI Studio
        </p>

        <h1 className="mt-4 text-5xl font-bold tracking-tight">
          Create AI agents that actually work.
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-lg opacity-70">
          Autonomous agents, dynamic skills, real-time
          research, multimodal generation, code execution
          and deployment infrastructure.
        </p>

        <div className="mt-8">
          <Link
            href="/login"
            className="inline-flex rounded-xl px-6 py-3 border"
          >
            Start building
          </Link>
        </div>
      </section>
    </main>
  );
}
