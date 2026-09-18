"use client";

import Link from "next/link";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useAuth } from "@/lib/firebase/auth-client";

interface FeatureAuthGateProps {
  children: ReactNode;
  feature: string;
  description: string;
}

interface ServerSessionUser {
  uid: string;
  email: string | null;
  name: string | null;
  picture: string | null;
}

const ServerSessionUserContext = createContext<ServerSessionUser | null>(null);

/**
 * Utilisateur issu du cookie de session serveur : disponible meme lorsque
 * l'etat Firebase client n'a pas pu etre restaure (webviews mobiles,
 * stockage bloque). Rendu null si aucune session serveur n'existe.
 */
export function useServerSessionUser(): ServerSessionUser | null {
  return useContext(ServerSessionUserContext);
}

/**
 * Verifie la session serveur via le cookie signe (GET /api/auth/session).
 * Retourne null tant que la reponse n'est pas connue.
 */
function useServerSession(enabled: boolean): { user: ServerSessionUser | null; checking: boolean } {
  const [state, setState] = useState<{ user: ServerSessionUser | null; checking: boolean }>({
    user: null,
    checking: enabled,
  });

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    (async () => {
      try {
        const response = await fetch("/api/auth/session", { cache: "no-store" });
        if (!response.ok) throw new Error("Pas de session serveur.");
        const body = (await response.json()) as { authenticated: boolean; user?: ServerSessionUser };
        if (!cancelled && body?.authenticated && body.user) {
          setState({ user: body.user, checking: false });
        }
      } catch {
        /* pas de session serveur : la page protegee affichera le portail */
      } finally {
        if (!cancelled) setState((previous) => ({ ...previous, checking: false }));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return state;
}

export function FeatureAuthGate({ children, feature, description }: FeatureAuthGateProps) {
  const { user, loading } = useAuth();
  const { user: serverUser, checking } = useServerSession(!loading && !user);

  if (loading || checking) {
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

  if (!user && !serverUser) {
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
            <p className="mt-5 text-xs text-white/35">Vos agents, extensions, sessions Live et données d’équipe restent associées à votre compte.</p>
          </section>
        </div>
      </main>
    );
  }

  return (
    <ServerSessionUserContext.Provider value={user ? null : serverUser}>
      {children}
    </ServerSessionUserContext.Provider>
  );
}
