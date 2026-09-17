"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { onAuthStateChanged } from "firebase/auth";

import { auth } from "@/lib/firebase/client";

interface MarketplaceExtension {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  developerName: string;
  latestVersion: string | null;
  approvedVersion: string | null;
  pricing: { model: string; amountMinor?: number; currency?: string };
  stats: { installs: number; ratingCount: number; rating: number | null };
}

const CATEGORIES = [
  { id: "", label: "Toutes" },
  { id: "productivity", label: "Productivité" },
  { id: "marketing", label: "Marketing" },
  { id: "data", label: "Données" },
  { id: "ai", label: "IA" },
  { id: "devtools", label: "Dev tools" },
  { id: "finance", label: "Finance" },
  { id: "communication", label: "Communication" },
  { id: "other", label: "Autres" },
];

function formatPrice(pricing: MarketplaceExtension["pricing"]): string {
  if (pricing.model === "free") return "Gratuit";
  if (pricing.model === "usage") {
    return `À l'usage (${((pricing.amountMinor ?? 0) / 100).toFixed(0)} ${pricing.currency ?? "XAF"})`;
  }
  if (pricing.model === "subscription") {
    return `Abonnement ${((pricing.amountMinor ?? 0) / 100).toLocaleString("fr-FR")} ${pricing.currency ?? "XAF"}/mois`;
  }
  return `${((pricing.amountMinor ?? 0) / 100).toLocaleString("fr-FR")} ${pricing.currency ?? "XAF"}`;
}

export default function MarketplacePage() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [extensions, setExtensions] = useState<MarketplaceExtension[]>([]);
  const [loading, setLoading] = useState(true);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => onAuthStateChanged(auth, (user) => setSignedIn(Boolean(user))), []);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (category) params.set("category", category);
    const response = await fetch(`/api/extensions?${params.toString()}`, { cache: "no-store" });
    if (response.ok) setExtensions((await response.json()).extensions ?? []);
    setLoading(false);
  }, [query, category]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), query ? 350 : 0);
    return () => clearTimeout(timer);
  }, [load, query]);

  return (
    <main className="min-h-screen bg-[#070a12] text-white p-5 md:p-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-xs tracking-[.3em] text-violet-300">GEN3IA MARKETPLACE</div>
            <h1 className="mt-2 text-3xl font-bold">Extensions pour vos agents</h1>
            <p className="mt-2 max-w-2xl text-white/60">
              Découvrez, installez et gérez des tools, skills et workflows créés par la
              communauté. Chaque extension est versionnée, permissionnée et sandboxée.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/developer" className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10">
              Espace développeur
            </Link>
            <Link href="/studio" className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10">
              Studio
            </Link>
          </div>
        </header>

        <section className="mb-6 flex flex-col gap-4 md:flex-row md:items-center">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Rechercher une extension, un tool, une intégration…"
            className="flex-1 rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm outline-none focus:border-violet-400/60"
          />
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((item) => (
              <button
                key={item.id}
                onClick={() => setCategory(item.id)}
                className={`rounded-full border px-3 py-1.5 text-xs transition ${
                  category === item.id
                    ? "border-violet-400/50 bg-violet-400/10 text-violet-200"
                    : "border-white/10 bg-white/[.03] text-white/55 hover:bg-white/[.06]"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </section>

        {loading ? (
          <div className="py-20 text-center text-white/40">Chargement du catalogue…</div>
        ) : extensions.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-[#0d1220] p-10 text-center">
            <h2 className="text-lg font-semibold">Aucune extension pour l'instant</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-white/55">
              Le catalogue s'étoffe dès les premières publications. Vous êtes développeur ?
              Créez votre extension depuis l'espace développeur avec le SDK Gen3ia.
            </p>
            <Link href="/developer" className="mt-6 inline-flex rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold hover:bg-violet-500">
              Créer une extension
            </Link>
          </div>
        ) : (
          <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {extensions.map((extension) => (
              <Link
                key={extension.id}
                href={`/marketplace/${extension.id}`}
                className="group rounded-3xl border border-white/10 bg-[#0d1220] p-5 transition hover:border-violet-400/40"
              >
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-white/5 px-2.5 py-1 text-[11px] text-white/50">{extension.category}</span>
                  <span className="text-sm font-semibold text-violet-300">{formatPrice(extension.pricing)}</span>
                </div>
                <h2 className="mt-3 text-lg font-semibold group-hover:text-violet-200">{extension.name}</h2>
                <p className="mt-1 line-clamp-3 text-sm text-white/55">{extension.description}</p>
                <div className="mt-4 flex items-center justify-between text-xs text-white/40">
                  <span>par {extension.developerName}</span>
                  <span>
                    {extension.stats.installs} install. ·{" "}
                    {extension.stats.rating !== null ? `${extension.stats.rating}/5` : "nouveau"}
                  </span>
                </div>
              </Link>
            ))}
          </section>
        )}

        {!signedIn && (
          <footer className="mt-10 rounded-2xl border border-violet-400/20 bg-violet-400/5 p-4 text-center text-xs text-violet-100/80">
            Connectez-vous pour installer des extensions et les rendre disponibles à vos
            agents. <Link href="/login" className="underline">Se connecter</Link>
          </footer>
        )}
      </div>
    </main>
  );
}
