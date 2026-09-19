"use client";

import { usePathname } from "next/navigation";

import { AppNav } from "@/components/nav/app-nav";
import { ScrollTop } from "@/components/nav/scroll-top";

/**
 * Coquille applicative Gen3ia — mode de défilement « Runable ».
 *
 * Reproduit exactement l'architecture de défilement mesurée sur runable.com :
 * - la page est verrouillée à la hauteur du viewport (h-dvh + overflow-hidden) :
 *   le document ne défile JAMAIS, ce qui supprime les micro-rebonds et la
 *   barre de défilement globale du navigateur ;
 * - un unique conteneur de défilement interne (`<main id="g3-scroll">`,
 *   flex-1 min-h-0 overflow-auto) porte tout le contenu, pied de page inclus ;
 * - la navigation (AppNav) reste immobile au-dessus du conteneur : le contenu
 *   glisse sous elle au défilement (fond translucide + flou) ;
 * - sur la vitrine ("/"), la navigation AppNav est absente : la page possède
 *   son propre en-tête sticky et aucun espaceur n'est appliqué ;
 * - un bouton flottant « Haut » apparaît après défilement, comme sur Runable.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isVitrine = pathname === "/";

  return (
    <div className="g3-shell flex flex-col overflow-hidden">
      <AppNav />
      <main
        id="g3-scroll"
        className={`g3-scroll relative min-h-0 flex-1 overflow-x-hidden overflow-y-auto ${
          isVitrine ? "" : "pt-16"
        }`}
      >
        {children}
      </main>
      <ScrollTop />
    </div>
  );
}
