"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Les 3 onglets principaux du tableau de bord : ils servent d'acces aux
 * autres interfaces de fonctionnalites de la plateforme (Studio d'agents,
 * Agent Live et Marketplace).
 *
 * Affiches en haut du dashboard, ils sont egalement presents sur chaque
 * interface afin de pouvoir passer de l'une a l'autre sans repasser par
 * le tableau de bord.
 */
const TABS: { href: string; label: string; badge?: string }[] = [
  { href: "/studio", label: "Studio" },
  { href: "/live", label: "Agent Live", badge: "PC" },
  { href: "/marketplace", label: "Marketplace" },
];

export function PlatformTabs() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Accès aux interfaces Gen3ia"
      className="mb-8 flex flex-wrap items-center gap-2 rounded-2xl border border-white/10 bg-[#0d1220] p-2"
    >
      <Link
        href="/dashboard"
        aria-current={pathname === "/dashboard" ? "page" : undefined}
        className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
          pathname === "/dashboard"
            ? "bg-violet-600 text-white shadow-lg shadow-violet-600/25"
            : "text-white/50 hover:bg-white/[.06] hover:text-white"
        }`}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M3 10.5 12 3l9 7.5" />
          <path d="M5 9.5V21h14V9.5" />
        </svg>
        <span className="hidden sm:inline">Tableau de bord</span>
      </Link>

      <span className="mx-1 hidden h-6 w-px bg-white/10 sm:block" aria-hidden="true" />

      {TABS.map((tab) => {
        const active = pathname === tab.href || (tab.href !== "/dashboard" && pathname.startsWith(`${tab.href}/`));
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition ${
              active
                ? "bg-violet-600 text-white shadow-lg shadow-violet-600/25"
                : "text-white/60 hover:bg-white/[.06] hover:text-white"
            }`}
          >
            {tab.label}
            {tab.badge && (
              <span className="rounded-md border border-amber-400/30 bg-amber-400/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-amber-300">
                {tab.badge}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
