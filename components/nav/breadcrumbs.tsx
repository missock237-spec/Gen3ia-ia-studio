"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Crumb = { label: string; href?: string };

/**
 * Fil d'Ariane global — orientation dans la hiérarchie de navigation.
 * Le dernier élément est la page courante (non cliquable, aria-current).
 */
function crumbsFor(pathname: string): Crumb[] {
  if (pathname.startsWith("/dashboard")) return [{ label: "Accueil", href: "/dashboard" }];
  if (pathname === "/studio/interface-lab")
    return [{ label: "Accueil", href: "/dashboard" }, { label: "Agent", href: "/studio" }, { label: "Atelier d'Interfaces" }];
  if (pathname === "/studio/schedules")
    return [{ label: "Accueil", href: "/dashboard" }, { label: "Agent", href: "/studio" }, { label: "Tâches planifiées" }];
  if (pathname.startsWith("/studio")) return [{ label: "Accueil", href: "/dashboard" }, { label: "Agent", href: "/studio" }];
  if (pathname === "/marketplace/purchases")
    return [{ label: "Accueil", href: "/dashboard" }, { label: "Marketplace", href: "/marketplace" }, { label: "Mes achats" }];
  if (pathname.startsWith("/marketplace/"))
    return [{ label: "Accueil", href: "/dashboard" }, { label: "Marketplace", href: "/marketplace" }, { label: "Fiche extension" }];
  if (pathname.startsWith("/marketplace")) return [{ label: "Accueil", href: "/dashboard" }, { label: "Marketplace", href: "/marketplace" }];
  if (pathname.startsWith("/live")) return [{ label: "Accueil", href: "/dashboard" }, { label: "Agent Live", href: "/live" }];
  if (pathname === "/team/join")
    return [{ label: "Accueil", href: "/dashboard" }, { label: "Équipe", href: "/team" }, { label: "Rejoindre une équipe" }];
  if (pathname.startsWith("/team/"))
    return [{ label: "Accueil", href: "/dashboard" }, { label: "Équipe", href: "/team" }, { label: "Espace d'équipe" }];
  if (pathname.startsWith("/team")) return [{ label: "Accueil", href: "/dashboard" }, { label: "Équipe", href: "/team" }];
  if (pathname.startsWith("/storage")) return [{ label: "Accueil", href: "/dashboard" }, { label: "Fichiers", href: "/storage" }];
  if (pathname.startsWith("/developer")) return [{ label: "Accueil", href: "/dashboard" }, { label: "Espace développeur", href: "/developer" }];
  if (pathname.startsWith("/billing")) return [{ label: "Accueil", href: "/dashboard" }, { label: "Facturation", href: "/billing" }];
  return [];
}

export function Breadcrumbs() {
  const pathname = usePathname();
  if (pathname === "/" || pathname === "/login" || pathname === "/signup") return null;
  const crumbs = crumbsFor(pathname);
  if (!crumbs.length) return null;

  return (
    <nav aria-label="Fil d'Ariane" className="g3-breadcrumb">
      {crumbs.map((crumb, index) => {
        const last = index === crumbs.length - 1;
        return (
          <span key={`${crumb.label}-${index}`} className="inline-flex items-center gap-[7px]">
            {index > 0 && <span className="g3-breadcrumb-sep" aria-hidden="true">›</span>}
            {last || !crumb.href ? (
              <span aria-current={last ? "page" : undefined}>{crumb.label}</span>
            ) : (
              <Link href={crumb.href}>{crumb.label}</Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
