"use client";

import Link from "next/link";
import { useAuth } from "@/lib/firebase/auth-client";
import { FeatureAuthGate, useServerSessionUser } from "@/components/auth/feature-auth-gate";
import { UniversalAgentChat } from "@/components/agent/universal-agent-chat";

interface HubFeature {
  href: string;
  eyebrow: string;
  title: string;
  description: string;
  cta: string;
  badge?: string;
  icon: React.ReactNode;
  iconBg: string;
  chip: string;
}

const FEATURES: HubFeature[] = [
  {
    href: "/studio",
    eyebrow: "GEN3IA STUDIO",
    title: "Studio d’agents IA",
    description:
      "Créez, équipez, testez et déployez des agents autonomes dans un environnement contrôlé.",
    cta: "Ouvrir le Studio",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 2 4 6v6c0 5 3.4 8.6 8 10 4.6-1.4 8-5 8-10V6l-8-4Z" />
        <path d="m9 12 2 2 4-4" />
      </svg>
    ),
    iconBg: "bg-violet-100 text-violet-600",
    chip: "border-[rgba(23,23,20,0.14)] bg-white text-neutral-800",
  },
  {
    href: "/live",
    eyebrow: "GEN3IA LIVE",
    title: "Agent Live",
    description:
      "Un agent qui observe votre écran et pilote clavier/souris sur votre ordinateur, avec permissions granulaires et validation humaine.",
    cta: "Lancer Agent Live",
    badge: "PC",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="2" y="4" width="20" height="13" rx="2" />
        <path d="M8 21h8M12 17v4" />
        <path d="m10 9-2 2 2 2M14 9l2 2-2 2" />
      </svg>
    ),
    iconBg: "bg-amber-100 text-amber-600",
    chip: "border-[rgba(23,23,20,0.14)] bg-white text-neutral-800",
  },
  {
    href: "/marketplace",
    eyebrow: "GEN3IA MARKETPLACE",
    title: "Marketplace",
    description:
      "Découvrez, installez et gérez des tools, skills et workflows créés par la communauté. Chaque extension est versionnée et sandboxée.",
    cta: "Parcourir la Marketplace",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4H6Z" />
        <path d="M3 6h18" />
        <path d="M16 10a4 4 0 0 1-8 0" />
      </svg>
    ),
    iconBg: "bg-emerald-100 text-emerald-600",
    chip: "border-[rgba(23,23,20,0.14)] bg-white text-neutral-800",
  },
];

const QUICK_LINKS = [
  {
    href: "/studio",
    label: "Mes agents",
    hint: "Créer et exécuter",
    icon: <path d="M12 2l2.4 7.2H22l-6 4.8 2.4 7.2L12 16.8 5.6 21.2 8 14 2 9.2h7.6Z" />,
  },
  {
    href: "/studio/interface-lab",
    label: "Atelier d'Interfaces",
    hint: "Agents de code · 21st.dev",
    icon: <path d="m8 6-6 6 6 6M16 6l6 6-6 6" />,
  },
  {
    href: "/billing",
    label: "Facturation",
    hint: "Solde et rechargement",
    icon: <path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />,
  },
  {
    href: "/storage",
    label: "Stockage permanent",
    hint: "Fichiers et caméra",
    icon: <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2Z" />,
  },
  {
    href: "/developer",
    label: "Espace développeur",
    hint: "Extensions et API",
    icon: <path d="m8 6-6 6 6 6M16 6l6 6-6 6" />,
  },
  {
    href: "/studio/schedules",
    label: "Planification",
    hint: "Fenêtres d’activation",
    icon: <path d="M12 8v4l3 3M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />,
  },
  {
    href: "/team",
    label: "Équipes",
    hint: "Créer et rejoindre",
    icon: <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />,
  },
];

/**
 * Page affichée juste après l’ouverture (connexion ou inscription) d’un
 * compte. Elle réunit l’agent universel (chat), les trois espaces produits
 * (Studio, Agent Live, Marketplace) et les accès rapides. Accessible
 * uniquement aux utilisateurs connectés.
 */
function DashboardContent() {
  const { user } = useAuth();
  const serverUser = useServerSessionUser();
  const displayName = user?.displayName?.trim() || serverUser?.name?.trim() || user?.email || serverUser?.email || "votre compte";

  return (
    <main className="min-h-screen bg-[#f6f4ef] text-neutral-900">
      <div className="relative overflow-hidden">
        <div className="aurora" aria-hidden="true" />
        <div className="relative mx-auto max-w-6xl p-5 md:p-8">
          {/* En-tête */}
          <header className="anim-fade-up flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="g3-eyebrow">Gen3ia · Espace Agent</p>
              <h1 className="mt-2.5 font-serif text-4xl font-semibold tracking-tight">
                Bonjour, <span className="gradient-text">{displayName}</span>
              </h1>
              <p className="mt-2.5 max-w-2xl text-sm leading-7 text-neutral-500">
                Une seule interface pour piloter les capacités de Gen3ia.
                Décrivez votre objectif à l’agent : il sélectionne les
                capacités disponibles, prépare les étapes et applique les
                contrôles de sécurité.
              </p>
            </div>
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" aria-hidden="true" />
              Compte connecté
            </span>
          </header>

          {/* Agent universel — chat principal */}
          <section className="anim-fade-up anim-delay-1 mt-9" aria-label="Agent universel Gen3ia" style={{ animationDelay: "0.08s" }}>
            <UniversalAgentChat />
          </section>

          {/* Cartes des espaces */}
          <section className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-3" aria-label="Espaces de travail">
            {FEATURES.map((feature, index) => (
              <Link
                key={feature.href}
                href={feature.href}
                className="card-glow anim-fade-up group flex flex-col rounded-3xl border border-[rgba(23,23,20,0.09)] bg-white p-6 shadow-[0_2px_10px_rgba(15,23,42,0.05)]"
                style={{ animationDelay: `${0.16 + index * 0.09}s` }}
              >
                <div className="flex items-center justify-between">
                  <span className={`grid h-11 w-11 place-items-center rounded-2xl ${feature.iconBg}`}>
                    {feature.icon}
                  </span>
                  {feature.badge && (
                    <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-amber-700">
                      {feature.badge}
                    </span>
                  )}
                </div>
                <p className="mt-5 text-[11px] font-bold uppercase tracking-[.25em] text-neutral-400">
                  {feature.eyebrow}
                </p>
                <h2 className="mt-2 font-serif text-xl font-semibold transition-colors group-hover:text-sky-700">
                  {feature.title}
                </h2>
                <p className="mt-2.5 flex-1 text-sm leading-6 text-neutral-500">
                  {feature.description}
                </p>
                <span
                  className={`mt-6 inline-flex w-fit items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-semibold transition group-hover:gap-2.5 group-hover:bg-neutral-900 group-hover:text-white ${feature.chip}`}
                >
                  {feature.cta}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                </span>
              </Link>
            ))}
          </section>

          {/* Accès rapides */}
          <section className="anim-fade-up anim-delay-4 mt-9" aria-label="Accès rapides" style={{ animationDelay: "0.4s" }}>
            <p className="text-xs font-bold uppercase tracking-[.25em] text-neutral-400">Accès rapides</p>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {QUICK_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="card-glow group flex items-center gap-3.5 rounded-2xl border border-[rgba(23,23,20,0.09)] bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition hover:border-sky-200"
                >
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-sky-100 text-sky-700 transition group-hover:scale-105">
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      {link.icon}
                    </svg>
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-neutral-800">{link.label}</span>
                    <span className="mt-0.5 block truncate text-xs text-neutral-400">{link.hint}</span>
                  </span>
                </Link>
              ))}
            </div>
          </section>

          {/* Note de sécurité */}
          <footer className="anim-fade-up anim-delay-5 mt-8 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-800" style={{ animationDelay: "0.48s" }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="mt-0.5 shrink-0 text-amber-600">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
            </svg>
            <p>
              Les opérations externes, financières, destructives, de
              publication, de sécurité ou nécessitant des secrets restent
              contrôlées par les permissions, les politiques d’exécution et la
              confirmation humaine.
            </p>
          </footer>
        </div>
      </div>
    </main>
  );
}

export default function DashboardPage() {
  return (
    <FeatureAuthGate
      feature="Tableau de bord Gen3ia"
      description="Connectez-vous pour accéder à l’agent Gen3ia, au Studio, à l’agent Live et à la Marketplace depuis votre tableau de bord."
    >
      <DashboardContent />
    </FeatureAuthGate>
  );
}
