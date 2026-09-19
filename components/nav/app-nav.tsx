"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { logout, useAuth } from "@/lib/firebase/auth-client";

type NavItem = {
  href: string;
  label: string;
  icon: string;
  shortcut?: string;
};

const NAV: NavItem[] = [
  { href: "/dashboard", label: "Accueil", icon: "⌂", shortcut: "H" },
  { href: "/studio", label: "Agent", icon: "✦", shortcut: "A" },
  { href: "/live", label: "Live", icon: "◉" },
  { href: "/marketplace", label: "Marketplace", icon: "◇" },
];

const LIBRARY: NavItem[] = [
  { href: "/storage", label: "Fichiers", icon: "□" },
  { href: "/studio/schedules", label: "Tâches planifiées", icon: "◷" },
  { href: "/team", label: "Équipe", icon: "◎" },
];

const PLATFORM: NavItem[] = [
  { href: "/developer", label: "Développeur", icon: "⌘" },
  { href: "/billing", label: "Facturation", icon: "₣" },
];

export function AppNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [compact, setCompact] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener("gen3ia:open-nav", handler);
    return () => window.removeEventListener("gen3ia:open-nav", handler);
  }, []);

  if (pathname === "/") return null;

  const name =
    user?.displayName?.trim() || user?.email?.split("@")[0] || "Compte";
  const initial = name.charAt(0).toUpperCase();
  const active = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  const NavGroup = ({
    title,
    items,
  }: {
    title: string;
    items: NavItem[];
  }) => (
    <div className="g3-nav-group">
      {!compact && <p className="g3-nav-group-title">{title}</p>}
      <div className="space-y-1">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            title={compact ? item.label : undefined}
            aria-current={active(item.href) ? "page" : undefined}
            onClick={() => setOpen(false)}
            className={`g3-side-link ${active(item.href) ? "is-active" : ""}`}
          >
            <span className="g3-side-icon" aria-hidden="true">{item.icon}</span>
            {!compact && <span className="min-w-0 flex-1 truncate">{item.label}</span>}
            {!compact && item.shortcut && (
              <kbd className="g3-nav-shortcut">{item.shortcut}</kbd>
            )}
          </Link>
        ))}
      </div>
    </div>
  );

  return (
    <>
      <div
        className={`g3-sidebar-backdrop ${open ? "is-open" : ""}`}
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />
      <aside className={`g3-sidebar ${open ? "is-open" : ""} ${compact ? "is-compact" : ""}`}>
        <div className="flex h-full flex-col">
          <div className="g3-nav-header">
            <Link href="/dashboard" className="g3-brand" onClick={() => setOpen(false)}>
              <span className="g3-brand-mark">G3</span>
              {!compact && (
                <span className="g3-brand-name">Gen3ia</span>
              )}
            </Link>
            <button
              type="button"
              className="g3-nav-toggle"
              onClick={() => setCompact((value) => !value)}
              aria-label={compact ? "Développer la navigation" : "Réduire la navigation"}
              title={compact ? "Développer" : "Réduire"}
            >
              {compact ? "›" : "‹"}
            </button>
          </div>

          <div className="px-2.5 pt-3">
            <Link
              href="/studio"
              onClick={() => setOpen(false)}
              className={`g3-new-task ${compact ? "is-compact" : ""}`}
              title={compact ? "Nouvelle tâche" : undefined}
            >
              <span>+</span>
              {!compact && <><strong>Nouvelle tâche</strong><kbd>⌘ K</kbd></>}
            </Link>
          </div>

          <nav className="g3-nav-scroll flex-1 space-y-5 px-2.5 py-4" aria-label="Navigation principale">
            <NavGroup title="Espace de travail" items={NAV} />
            <NavGroup title="Bibliothèque" items={LIBRARY} />
            <NavGroup title="Plateforme" items={PLATFORM} />
          </nav>

          <div className="g3-nav-footer">
            {!compact && (
              <Link href="/studio" className="g3-help-row" onClick={() => setOpen(false)}>
                <span>?</span>
                <span>Centre de commandes</span>
              </Link>
            )}

            <div className="relative">
              {accountOpen && (
                <div className={`g3-account-menu ${compact ? "is-compact" : ""}`}>
                  <Link href="/team" onClick={() => setAccountOpen(false)} className="g3-account-item">
                    Paramètres & équipe
                  </Link>
                  <button
                    type="button"
                    className="g3-account-item danger"
                    onClick={async () => {
                      setAccountOpen(false);
                      await logout();
                      router.push("/login");
                    }}
                  >
                    Se déconnecter
                  </button>
                </div>
              )}
              <button
                type="button"
                onClick={() => setAccountOpen((value) => !value)}
                className={`g3-account-button ${compact ? "is-compact" : ""}`}
                aria-expanded={accountOpen}
              >
                <span className="g3-account-avatar">{initial}</span>
                {!compact && (
                  <span className="min-w-0 flex-1 text-left">
                    <span className="block truncate text-xs font-semibold">{name}</span>
                    <span className="block truncate text-[10px] text-neutral-400">
                      {user?.email || "Session Gen3ia"}
                    </span>
                  </span>
                )}
                <span className="text-neutral-400">•••</span>
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
