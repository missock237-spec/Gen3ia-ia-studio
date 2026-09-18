"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { logout, useAuth } from "@/lib/firebase/auth-client";

/**
 * Navigation globale de l'application Gen3ia.
 *
 * - Barre sticky en verre dépoli, presente sur toutes les pages sauf la
 *   vitrine "/" (qui possede sa propre navigation).
 * - Acces structure : liens principaux au centre, menu utilisateur a droite
 *   (Facturation, Stockage, Developpeur, Deconnexion).
 * - L'identite affichee combine l'etat Firebase client et, a defaut, la
 *   session serveur (cookie signe) pour rester fiable sur mobile/webviews.
 * - Menu mobile anime pour les petits ecrans.
 */

interface SessionIdentity {
  name: string;
  email: string;
  initial: string;
}

const MAIN_LINKS = [
  { href: "/dashboard", label: "Tableau de bord" },
  { href: "/studio", label: "Studio" },
  { href: "/live", label: "Agent Live", badge: "PC" },
  { href: "/marketplace", label: "Marketplace" },
];

const SECONDARY_LINKS = [
  { href: "/billing", label: "Facturation", hint: "Solde et rechargement" },
  { href: "/storage", label: "Stockage permanent", hint: "Fichiers et camera" },
  { href: "/developer", label: "Espace developpeur", hint: "Extensions et API" },
];

function useIdentity(): SessionIdentity | null {
  const { user, loading } = useAuth();
  const [serverIdentity, setServerIdentity] = useState<SessionIdentity | null>(null);

  useEffect(() => {
    if (user || loading) return;
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch("/api/auth/session", { cache: "no-store" });
        if (!response.ok) return;
        const body = (await response.json()) as {
          authenticated?: boolean;
          user?: { name?: string | null; email?: string | null };
        };
        if (cancelled || !body?.authenticated || !body.user) return;
        const name = body.user.name?.trim() || body.user.email?.trim() || "Compte";
        setServerIdentity({
          name,
          email: body.user.email?.trim() || "",
          initial: name.charAt(0).toUpperCase(),
        });
      } catch {
        /* pas de session serveur */
      }
    })();
    return () => { cancelled = true; };
  }, [user, loading]);

  if (user) {
    const name = user.displayName?.trim() || user.email?.split("@")[0] || "Compte";
    return {
      name,
      email: user.email ?? "",
      initial: name.charAt(0).toUpperCase(),
    };
  }
  if (loading) return null;
  return serverIdentity;
}

function isActivePathname(pathname: string, href: string): boolean {
  if (pathname === href) return true;
  return href !== "/" && pathname.startsWith(`${href}/`);
}

export function AppNav() {
  const pathname = usePathname();
  const identity = useIdentity();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const closeMenus = useCallback(() => {
    setMenuOpen(false);
    setMobileOpen(false);
  }, []);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setMenuOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setMenuOpen(false); setMobileOpen(false); }
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  // La vitrine possede sa propre navigation dediee.
  // (place apres tous les hooks pour respecter l'ordre d'appel)
  if (pathname === "/") return null;

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#070a12]/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6">
        {/* Logo */}
        <Link href="/dashboard" className="group flex shrink-0 items-center gap-2.5" aria-label="Gen3ia — tableau de bord">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-cyan-400 text-sm font-black text-white shadow-lg shadow-violet-600/30 transition-transform duration-300 group-hover:scale-105">
            G3
          </span>
          <span className="hidden text-sm font-bold tracking-tight text-white sm:block">
            Gen3ia <span className="font-medium text-white/40">AI Studio</span>
          </span>
        </Link>

        {/* Liens principaux — desktop */}
        <nav aria-label="Navigation principale" className="ml-4 hidden flex-1 items-center gap-1 lg:flex">
          {MAIN_LINKS.map((link) => {
            const active = isActivePathname(pathname, link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                onClick={closeMenus}
                className={`relative rounded-xl px-3.5 py-2 text-sm font-medium transition-colors duration-200 ${
                  active ? "text-white" : "text-white/55 hover:text-white"
                }`}
              >
                {link.label}
                {link.badge && (
                  <span className="ml-1.5 rounded-md border border-amber-400/30 bg-amber-400/10 px-1.5 py-0.5 align-middle text-[9px] font-bold uppercase tracking-wide text-amber-300">
                    {link.badge}
                  </span>
                )}
                <span
                  aria-hidden="true"
                  className={`absolute inset-x-3 -bottom-[13px] h-0.5 rounded-full bg-gradient-to-r from-violet-400 to-cyan-400 transition-all duration-300 ${
                    active ? "opacity-100 scale-x-100" : "opacity-0 scale-x-0"
                  }`}
                />
              </Link>
            );
          })}
        </nav>

        <div className="flex-1 lg:hidden" />

        {/* Zone droite : connexion ou menu utilisateur */}
        <div className="flex shrink-0 items-center gap-2">
          {identity ? (
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((open) => !open)}
                aria-expanded={menuOpen}
                aria-haspopup="menu"
                className="flex items-center gap-2.5 rounded-full border border-white/10 bg-white/[.04] py-1.5 pl-1.5 pr-3 transition hover:border-white/20 hover:bg-white/[.08]"
              >
                <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-violet-500 to-cyan-400 text-sm font-bold text-white">
                  {identity.initial}
                </span>
                <span className="hidden max-w-[140px] truncate text-sm font-medium text-white/80 sm:block">
                  {identity.name}
                </span>
                <svg
                  width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
                  className={`text-white/50 transition-transform duration-300 ${menuOpen ? "rotate-180" : ""}`}
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>

              {/* Menu utilisateur */}
              <div
                role="menu"
                aria-label="Menu utilisateur"
                className={`absolute right-0 top-[calc(100%+10px)] w-72 origin-top-right overflow-hidden rounded-2xl border border-white/10 bg-[#0d1220] shadow-2xl shadow-black/50 transition-all duration-200 ${
                  menuOpen ? "anim-scale-in opacity-100" : "pointer-events-none scale-95 opacity-0"
                }`}
              >
                <div className="border-b border-white/10 px-4 py-3.5">
                  <p className="truncate text-sm font-semibold text-white">{identity.name}</p>
                  {identity.email && <p className="mt-0.5 truncate text-xs text-white/45">{identity.email}</p>}
                </div>
                <div className="p-1.5">
                  {SECONDARY_LINKS.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      role="menuitem"
                      className="block rounded-xl px-3 py-2.5 transition hover:bg-white/[.06]"
                    >
                      <span className="block text-sm font-medium text-white/85">{link.label}</span>
                      <span className="mt-0.5 block text-xs text-white/40">{link.hint}</span>
                    </Link>
                  ))}
                </div>
                <div className="border-t border-white/10 p-1.5">
                  <button
                    type="button"
                    role="menuitem"
                    onClick={async () => { closeMenus(); await logout(); window.location.href = "/login"; }}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-red-300/90 transition hover:bg-red-400/10 hover:text-red-200"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                      <path d="m16 17 5-5-5-5" />
                      <path d="M21 12H9" />
                    </svg>
                    Se deconnecter
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="rounded-xl px-4 py-2 text-sm font-medium text-white/70 transition hover:bg-white/[.06] hover:text-white"
              >
                Se connecter
              </Link>
              <Link
                href="/signup"
                className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-violet-600/25 transition hover:bg-violet-500"
              >
                Creer un compte
              </Link>
            </div>
          )}

          {/* Bouton menu mobile */}
          <button
            type="button"
            onClick={() => setMobileOpen((open) => !open)}
            aria-expanded={mobileOpen}
            aria-label={mobileOpen ? "Fermer le menu" : "Ouvrir le menu"}
            className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/[.04] text-white/70 transition hover:bg-white/[.08] lg:hidden"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
              {mobileOpen ? <path d="M18 6 6 18M6 6l12 12" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
        </div>
      </div>

      {/* Panneau mobile */}
      <div
        className={`overflow-hidden border-t border-white/10 bg-[#070a12]/95 backdrop-blur-xl transition-all duration-300 lg:hidden ${
          mobileOpen ? "max-h-[420px] opacity-100" : "max-h-0 border-t-0 opacity-0"
        }`}
      >
        <nav aria-label="Navigation mobile" className="space-y-1 px-4 py-4">
          {MAIN_LINKS.map((link) => {
            const active = isActivePathname(pathname, link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                onClick={closeMenus}
                className={`flex items-center justify-between rounded-xl px-4 py-3 text-sm font-medium transition ${
                  active ? "bg-violet-600/15 text-white" : "text-white/60 hover:bg-white/[.05] hover:text-white"
                }`}
              >
                {link.label}
                {link.badge && (
                  <span className="rounded-md border border-amber-400/30 bg-amber-400/10 px-1.5 py-0.5 text-[9px] font-bold uppercase text-amber-300">
                    {link.badge}
                  </span>
                )}
              </Link>
            );
          })}
          <div className="my-2 h-px bg-white/10" />
          {SECONDARY_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={closeMenus}
              className="block rounded-xl px-4 py-3 text-sm text-white/60 transition hover:bg-white/[.05] hover:text-white"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
