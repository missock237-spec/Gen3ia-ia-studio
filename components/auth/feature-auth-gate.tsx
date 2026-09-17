"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useAuth } from "@/lib/firebase/auth-client";

interface FeatureAuthGateProps {
  children: ReactNode;
  feature: string;
  description: string;
}

export function FeatureAuthGate({ children, feature, description }: FeatureAuthGateProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <main className="min-h-screen bg-[#070a12] p-8 text-white">
        <div className="mx-auto flex min-h-[60vh] max-w-md items-center justify-center">
          <div className="w-full rounded-3xl border border-white/10 bg-[#0d1220] p-8 text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-white/15 border-t-violet-400" />
            <p className="mt-4 text-sm text-white/50">Vérification de votre session…</p>
          </div>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-[#070a12] p-5 text-white md:p-8">
        <div className="mx-auto flex min-h-[70vh] max-w-lg items-center justify-center">
          <section className="w-full rounded-3xl border border-violet-400/20 bg-[#0d1220] p-8 text-center shadow-2xl">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-violet-400/25 bg-violet-400/10 text-2xl">🔐</div>
            <p className="mt-5 text-xs font-semibold uppercase tracking-[.25em] text-violet-300">Gen3ia · accès protégé</p>
            <h1 className="mt-3 text-2xl font-bold">{feature}</h1>
            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-white/55">{description}</p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Link href="/login" className="rounded-xl bg-violet-600 px-6 py-3 text-sm font-semibold hover:bg-violet-500">Se connecter</Link>
              <Link href="/signup" className="rounded-xl border border-white/10 bg-white/[.04] px-6 py-3 text-sm font-semibold hover:bg-white/[.08]">Créer un compte</Link>
            </div>
            <p className="mt-5 text-xs text-white/35">Vos agents, extensions, sessions Live et données d’équipe restent associés à votre compte.</p>
          </section>
        </div>
      </main>
    );
  }

  return <>{children}</>;
}
