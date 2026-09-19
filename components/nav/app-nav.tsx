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
  hint?: string;
};

const WORKSPACE: NavItem[] = [
  { href: "/dashboard", label: "Accueil", icon: "⌂", shortcut: "H" },
  { href: "/studio", label: "Agent", icon: "✦", shortcut: "A" },
  { href: "/live", label: "Live", icon: "◉" },
  { href: "/marketplace", label: "Marketplace", icon: "◇" },
];

const TOOLS: NavItem[] = [
  { href: "/studio/interface-lab", label: "Atelier d'Interfaces", icon: "⌘", hint: "Réservé aux agents de code" },
  { href: "/studio/schedules", label: "Tâches planifiées", icon: "◷" },
];

const LIBRARY: NavItem[] = [
  { href: "/storage", label: "Fichiers", icon: "□" },
  { href: "/marketplace/purchases", label: "Mes achats", icon: "◈" },
  { href: "/team", label: "Équipe", icon: "◎" },
];

const PLATFORM: NavItem[] = [
  { href: "/developer", label: "Développeur", icon: "⌥" },
  { href: "/billing", label: "Facturation", icon: "₣" },
];

const NAV_GROUPS: Array<{ title: string; items: NavItem[] }> = [
  { title: "Espace de travail", items: WORKSPACE },
  { title: "Outils", items: TOOLS },
  { title: "Bibliothèque", items: LIBRARY },
  { title: "Plateforme", items: PLATFORM },
];

const COMMAND_INDEX = NAV_GROUPS.flatMap((group) =>
  group.items.map((item) => ({ ...item, group: group.title }))
);

export function AppNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [compact, setCompact] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener("gen3ia:open-nav", handler);
    return () => window.removeEventListener("gen3ia:open-nav", handler);
  }, []);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen((value) => !value);
      }
      if (event.key === "Escape") {
        setCommandOpen(false);
        setAccountOpen(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  if (pathname === "/") return null;

  const name =
    user?.displayName?.trim() || user?.email?.split("@")[0] || "Compte";
  const initial = name.charAt(0).toUpperCase();
  const active = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  const commandItems = COMMAND_INDEX;
  const filteredCommands = commandItems.filter((item) =>
    item.label.toLowerCase().includes(query.trim().toLowerCase())
  );

  const openCommand = () => {
    setQuery("");
    setCursor(0);
    setCommandOpen(true);
  };

  const goTo = (href: string) => {
    setCommandOpen(false);
    setQuery("");
    setOpen(false);
    router.push(href);
  };

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
            {!compact && (
              <span className="min-w-0 flex-1">
                <span className="block truncate">{item.label}</span>
                {item.hint && <span className="g3-nav-hint">{item.hint}</span>}
              </span>
            )}
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
      {commandOpen && (
        <div className="g3-command-overlay" role="dialog" aria-modal="true" aria-label="Navigation Gen3ia">
          <button type="button" className="g3-command-backdrop" onClick={() => setCommandOpen(false)} aria-label="Fermer" />
          <div className="g3-command-panel">
            <div className="g3-command-search">
              <span aria-hidden="true">⌕</span>
              <input
                autoFocus
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setCursor(0);
                }}
                onKeyDown={(event) => {
                  if (event.key === "ArrowDown") {
                    event.preventDefault();
                    setCursor((value) => Math.min(value + 1, Math.max(filteredCommands.length - 1, 0)));
                  } else if (event.key === "ArrowUp") {
                    event.preventDefault();
                    setCursor((value) => Math.max(value - 1, 0));
                  } else if (event.key === "Enter") {
                    event.preventDefault();
                    const target = filteredCommands[cursor];
                    if (target) goTo(target.href);
                  }
                }}
                placeholder="Aller à…"
                aria-label="Rechercher une destination"
                role="combobox"
                aria-expanded="true"
                aria-controls="g3-command-listbox"
                aria-activedescendant={filteredCommands[cursor] ? `g3-command-opt-${cursor}` : undefined}
              />
              <kbd>ESC</kbd>
            </div>
            <div className="g3-command-list" id="g3-command-listbox" role="listbox">
              {filteredCommands.length ? filteredCommands.map((item, index) => (
                <button
                  key={item.href}
                  id={`g3-command-opt-${index}`}
                  type="button"
                  role="option"
                  aria-selected={index === cursor}
                  onMouseEnter={() => setCursor(index)}
                  onClick={() => goTo(item.href)}
                  className={`g3-command-item ${index === cursor ? "is-cursor" : ""}`}
                >
                  <span className="g3-side-icon">{item.icon}</span>
                  <span className="flex-1 text-left">{item.label}</span>
                  <span className="g3-command-group">{item.group}</span>
                  {active(item.href) && <span className="g3-command-current">Actuel</span>}
                </button>
              )) : (
                <div className="px-4 py-8 text-center text-xs text-neutral-400">Aucune destination trouvée.</div>
              )}
            </div>
            <div className="g3-command-footer">
              <span>Navigation rapide</span><span><kbd>↑ ↓</kbd> choisir</span><span><kbd>↵</kbd> ouvrir</span><span><kbd>Esc</kbd> fermer</span>
            </div>
          </div>
        </div>
      )}
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
            <button
              type="button"
              onClick={openCommand}
              className={`g3-nav-search ${compact ? "is-compact" : ""}`}
              aria-label="Rechercher une destination"
            >
              <span aria-hidden="true">⌕</span>
              {!compact && <><span className="min-w-0 flex-1 truncate text-left">Rechercher une destination…</span><kbd>⌘K</kbd></>}
            </button>
          </div>

          <nav className="g3-nav-scroll flex-1 space-y-5 px-2.5 py-4" aria-label="Navigation principale">
            {NAV_GROUPS.map((group) => (
              <NavGroup key={group.title} title={group.title} items={group.items} />
            ))}
          </nav>

          <div className="g3-nav-footer">
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
