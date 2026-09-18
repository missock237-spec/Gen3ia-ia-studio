"use client";

import Link from "next/link";
import { useAuth } from "@/lib/firebase/auth-client";
import { FeatureAuthGate, useServerSessionUser } from "@/components/auth/feature-auth-gate";
import { PlatformTabs } from "@/components/nav/platform-tabs";
import { UniversalAgentChat } from "@/components/agent/universal-agent-chat";

function DashboardContent() {
  const { user } = useAuth();
  const serverUser = useServerSessionUser();
  const displayName = user?.displayName?.trim() || serverUser?.name?.trim() || user?.email || serverUser?.email || "votre compte";

  return (
    <main className="min-h-screen bg-[#070a12] p-5 text-white md:p-8">
      <div className="mx-auto max-w-6xl">
        <PlatformTabs />
        <header className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-xs tracking-[.3em] text-violet-300">GEN3IA · AGENT WORKSPACE</div>
            <h1 className="mt-2 text-3xl font-bold">Bonjour, {displayName}</h1>
            <p className="mt-2 max-w-3xl text-white/60">Une seule interface pour piloter les capacités de Gen3ia. Décrivez votre objectif ; l’agent sélectionne les capacités disponibles, prépare les étapes et applique les contrôles de sécurité.</p>
          </div>
          <button type="button" onClick={async () => { const { logout } = await import("@/lib/firebase/auth-client"); await logout(); window.location.href = "/login"; }} className="rounded-full border border-white/10 bg-white/[.04] px-4 py-2 text-sm text-white/70 hover:bg-white/[.08] hover:text-white">Déconnexion</button>
        </header>

        <UniversalAgentChat />

        <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Studio", "/studio", "Créer et gérer des agents"],
            ["Live", "/live", "Piloter un ordinateur autorisé"],
            ["Marketplace", "/marketplace", "Ajouter des skills et outils"],
            ["Stockage", "/storage", "Gérer vos fichiers"],
            ["Développeur", "/developer", "API et extensions"],
            ["Équipe", "/team", "Travail collaboratif"],
            ["Facturation", "/billing", "Crédits et paiements"],
          ].map(([title, href, description]) => (
            <Link key={href} href={href} className="rounded-2xl border border-white/10 bg-[#0d1220] p-4 hover:border-violet-400/30 hover:bg-white/[.03]">
              <div className="font-semibold">{title}</div>
              <div className="mt-1 text-xs leading-5 text-white/45">{description}</div>
            </Link>
          ))}
        </section>

        <footer className="mt-6 rounded-2xl border border-amber-400/15 bg-amber-400/5 p-4 text-xs text-amber-100/70">
          Les opérations externes, financières, destructives, de publication, de sécurité ou nécessitant des secrets restent contrôlées par les permissions, les politiques d’exécution et la confirmation humaine.
        </footer>
      </div>
    </main>
  );
}

export default function DashboardPage() {
  return <FeatureAuthGate feature="Tableau de bord Gen3ia" description="Connectez-vous pour accéder à l’espace Agent Gen3ia."><DashboardContent /></FeatureAuthGate>;
}
