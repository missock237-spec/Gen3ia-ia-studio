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

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/login"
            className="inline-flex rounded-xl px-6 py-3 border"
          >
            Start building
          </Link>
          <Link
            href="/studio"
            className="inline-flex rounded-xl px-6 py-3 border border-violet-400/40 bg-violet-500/10 text-violet-200"
          >
            Ouvrir le Studio
          </Link>
          <Link
            href="/live"
            className="inline-flex items-center gap-2 rounded-xl px-6 py-3 border"
          >
            Agent Live
            <span className="rounded-md border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-300">
              PC
            </span>
          </Link>
        </div>

        <p className="mt-6 text-sm opacity-50">
          Disponible sur le web (Android &amp; iOS — installable depuis le
          navigateur) et sur PC avec l'application Gen3ia Desktop (Windows,
          Linux).
        </p>
      </section>
    </main>
  );
}
