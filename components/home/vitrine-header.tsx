"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

/**
 * En-tête de la vitrine — comportement de défilement identique à runable.com :
 * - transparent en haut de page (le dégradé ciel du héros passe derrière) ;
 * - dès que le conteneur interne (#g3-scroll) défile, fond crème translucide,
 *   flou d'arrière-plan et ombre douce, avec une transition de 300 ms.
 * L'en-tête est sticky dans le conteneur de défilement : le contenu glisse
 * dessous, exactement comme la navigation fixe de Runable.
 */
export function VitrineHeader() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const el = document.getElementById("g3-scroll");
    if (!el) return;
    const onScroll = () => setScrolled(el.scrollTop > 12);
    el.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 border-b transition-all duration-300 ease-out ${
        scrolled
          ? "border-[rgba(23,23,20,0.07)] bg-[#f6f4ef]/90 shadow-[0_10px_30px_-20px_rgba(28,27,24,0.35)] backdrop-blur-md"
          : "border-transparent bg-transparent"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5" aria-label="Gen3ia — accueil">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-neutral-900 text-sm font-black text-white">
            G3
          </span>
          <span className="text-sm font-bold tracking-tight">Gen3ia</span>
        </Link>
        <nav aria-label="Navigation vitrine" className="hidden items-center gap-1.5 md:flex">
          <a href="#produits" className="rounded-full bg-white px-4 py-2 text-sm font-medium text-neutral-800 shadow-[0_1px_2px_rgba(28,27,24,0.08)] transition hover:shadow-[0_4px_14px_-6px_rgba(28,27,24,0.3)]">Produits</a>
          <a href="#fonctionnement" className="rounded-full bg-white px-4 py-2 text-sm font-medium text-neutral-800 shadow-[0_1px_2px_rgba(28,27,24,0.08)] transition hover:shadow-[0_4px_14px_-6px_rgba(28,27,24,0.3)]">Fonctionnement</a>
          <a href="#securite" className="rounded-full bg-white px-4 py-2 text-sm font-medium text-neutral-800 shadow-[0_1px_2px_rgba(28,27,24,0.08)] transition hover:shadow-[0_4px_14px_-6px_rgba(28,27,24,0.3)]">Sécurité</a>
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/login" className="rounded-full border border-[rgba(23,23,20,0.12)] bg-white px-4 py-2 text-sm font-medium text-neutral-700 transition hover:border-[rgba(23,23,20,0.22)]">
            Se connecter
          </Link>
          <Link
            href="/signup"
            className="rounded-full bg-neutral-900 px-4 py-2 text-sm font-semibold text-white shadow-[0_8px_20px_-10px_rgba(28,27,24,0.6)] transition hover:-translate-y-0.5 hover:bg-neutral-800"
          >
            Commencer
          </Link>
        </div>
      </div>
    </header>
  );
}
