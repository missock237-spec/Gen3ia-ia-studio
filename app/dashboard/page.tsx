"use client";

import Link from "next/link";
import { useAuth } from "@/lib/firebase/auth-client";
import { FeatureAuthGate } from "@/components/auth/feature-auth-gate";

interface HubFeature {
  href: string;
  eyebrow: string;
  title: string;
  description: string;
  cta: string;
  badge?: string;
  accent: string;
}

const FEATURES: HubFeature[] = [
  {
    href: "/studio",
    eyebrow: "GEN3IA STUDIO",
    title: "Studio d’agents IA",
    description:
      "Créez, équipez, testez et déployez des agents autonomes dans un environnement contrôlé.",
    cta: "Ouvrir le Studio",
    accent: "violet",
  },
  {
    href: "/live",
    eyebrow: "GEN3IA LIVE",
    title: "Agent Live",
    description:
      "Un agent qui observe votre écran et pilote clavier/souris sur votre ordinateur, avec permissions granulaires et validation humaine.",
    cta: "Lancer Agent Live",
    badge: "PC",
    accent: "amber",
  },
  {
    href: "/marketplace",
    eyebrow: "GEN3IA MARKETPLACE",
    title: "Marketplace",
    description:
      "Découvrez, installez et gérez des tools, skills et workflows créés par la communauté. Chaque extension est versionnée et sandboxée.",
    cta: "Parcourir la Marketplace",
    accent: "emerald",
  },
];

const ACCENTS: Record<HubFeature["accent"], { border: string; text: string; chip: string }> = {
  violet: {
    border: "hover:border-violet-400/40",
    text: "text-violet-300",
    chip: "border-violet-400/25 bg-violet-400/10 text-violet-200",
  },
  amber: {
    border: "hover:border-amber-400/40",
    text: "text-amber-300",
    chip: "border-amber-400/25 bg-amber-400/10 text-amber-200",
  },
  emerald: {
    border: "hover:border-emerald-400/40",
    text: "text-emerald-300",
    chip: "border-emerald-400/25 bg-emerald-400/10 text-emerald-200",
  },
};

/**
 * Page affichée juste après l’ouverture (connexion ou inscription) d’un
 * compte. Elle regroupe les points d’entrée principaux : Studio, Agent Live
 * et Marketplace. Accessible uniquement aux utilisateurs connectés.
 */
function DashboardContent() {
  const { user } = useAuth();
  const displayName = user?.displayName?.trim() || user?.email || "votre compte";

  return (
    <main className="min-h-screen bg-[#070a12] p-5 text-white md:p-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-xs tracking-[.3em] text-violet-300">GEN3IA · TABLEAU DE BORD</div>
            <h1 className="mt-2 text-3xl font-bold">Bienvenue, {displayName}</h1>
            <p className="mt-2 max-w-2xl text-white/60">
              Votre compte est actif. Choisissez un espace de travail pour
              démarrer : créer des agents, piloter l’agent Live ou étendre vos
              agents avec la Marketplace.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-4 py-2 text-sm text-emerald-300">
              Compte connecté
            </span>
          </div>
        </header>

        <section className="grid gap-5 md:grid-cols-3">
          {FEATURES.map((feature) => {
            const accent = ACCENTS[feature.accent];
            return (
              <Link
                key={feature.href}
                href={feature.href}
                className={`group flex flex-col rounded-3xl border border-white/10 bg-[#0d1220] p-6 transition ${accent.border}`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold tracking-[.25em] text-white/40">
                    {feature.eyebrow}
                  </span>
                  {feature.badge && (
                    <span className="rounded-md border border-amber-400/30 bg-amber-400/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-amber-300">
                      {feature.badge}
                    </span>
                  )}
                </div>
                <h2 className="mt-4 text-xl font-semibold group-hover:text-violet-200">
                  {feature.title}
                </h2>
                <p className="mt-2 flex-1 text-sm leading-6 text-white/55">
                  {feature.description}
                </p>
                <span
                  className={`mt-5 inline-flex w-fit items-center rounded-xl border px-4 py-2 text-sm font-semibold transition group-hover:bg-white/10 ${accent.chip}`}
                >
                  {feature.cta}
                </span>
              </Link>
            );
          })}
        </section>

        <section className="mt-6 flex flex-wrap items-center gap-3">
          <span className="text-xs text-white/40">Accès rapides :</span>
          <Link href="/storage" className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs hover:bg-white/10">
            Stockage permanent
          </Link>
          <Link href="/developer" className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs hover:bg-white/10">
            Espace développeur
          </Link>
          <Link href="/billing" className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs hover:bg-white/10">
            Facturation
          </Link>
        </section>

        <footer className="mt-8 rounded-2xl border border-amber-400/15 bg-amber-400/5 p-4 text-xs text-amber-100/70">
          Les actions externes, dépenses publicitaires et opérations sensibles
          restent soumises aux politiques de sécurité et à une confirmation
          humaine.
        </footer>
      </div>
    </main>
  );
}

export default function DashboardPage() {
  return (
    <FeatureAuthGate
      feature="Tableau de bord Gen3ia"
      description="Connectez-vous pour accéder au Studio, à l’agent Live et à la Marketplace depuis votre tableau de bord."
    >
      <DashboardContent />
    </FeatureAuthGate>
  );
}
