"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/firebase/auth-client";
import { FeatureAuthGate } from "@/components/auth/feature-auth-gate";

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

type SortMode = "relevance" | "popular" | "rating" | "price-low" | "price-high";
type ViewMode = "grid" | "compact";

const CATEGORIES = [
  { id: "", label: "Toutes", icon: "✦" },
  { id: "ai", label: "IA & Agents", icon: "✧" },
  { id: "productivity", label: "Productivité", icon: "◫" },
  { id: "marketing", label: "Marketing", icon: "◎" },
  { id: "communication", label: "Communication", icon: "◌" },
  { id: "data", label: "Données", icon: "◇" },
  { id: "devtools", label: "Dev tools", icon: "⌘" },
  { id: "finance", label: "Finance", icon: "¤" },
  { id: "other", label: "Autres", icon: "•••" },
];

const TABS = [
  { id: "all", label: "Explorer" },
  { id: "popular", label: "Populaires" },
  { id: "rating", label: "Les mieux notées" },
  { id: "free", label: "Gratuites" },
  { id: "favorites", label: "Mes favoris" },
] as const;

type TabId = (typeof TABS)[number]["id"];

function formatPrice(pricing: MarketplaceExtension["pricing"]): string {
  if (pricing.model === "free") return "Gratuit";
  const amount = (pricing.amountMinor ?? 0) / 100;
  const currency = pricing.currency ?? "XAF";
  if (pricing.model === "usage") return `${amount.toLocaleString("fr-FR")} ${currency} · usage`;
  if (pricing.model === "subscription") return `${amount.toLocaleString("fr-FR")} ${currency} / mois`;
  return `${amount.toLocaleString("fr-FR")} ${currency}`;
}

function categoryLabel(id: string): string {
  return CATEGORIES.find((item) => item.id === id)?.label ?? id;
}

function priceValue(extension: MarketplaceExtension): number {
  return extension.pricing.model === "free" ? 0 : extension.pricing.amountMinor ?? 0;
}

function Icon({ name, size = 18 }: { name: "search" | "sliders" | "grid" | "list" | "heart" | "spark" | "arrow" | "shield" | "box" | "chevron" | "bolt"; size?: number }) {
  const common = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  if (name === "search") return <svg {...common}><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></svg>;
  if (name === "sliders") return <svg {...common}><path d="M4 6h16M4 12h16M4 18h16" /><circle cx="8" cy="6" r="2" /><circle cx="15" cy="12" r="2" /><circle cx="11" cy="18" r="2" /></svg>;
  if (name === "grid") return <svg {...common}><rect x="4" y="4" width="6" height="6" rx="1" /><rect x="14" y="4" width="6" height="6" rx="1" /><rect x="4" y="14" width="6" height="6" rx="1" /><rect x="14" y="14" width="6" height="6" rx="1" /></svg>;
  if (name === "list") return <svg {...common}><path d="M8 6h12M8 12h12M8 18h12" /><path d="M4 6h.01M4 12h.01M4 18h.01" /></svg>;
  if (name === "heart") return <svg {...common}><path d="M20.8 8.7c0 5.2-8.8 10.2-8.8 10.2S3.2 13.9 3.2 8.7A4.5 4.5 0 0 1 12 6.2a4.5 4.5 0 0 1 8.8 2.5Z" /></svg>;
  if (name === "spark") return <svg {...common}><path d="m12 3 1.6 5.4L19 10l-5.4 1.6L12 17l-1.6-5.4L5 10l5.4-1.6L12 3Z" /><path d="m19 16 .7 2.3L22 19l-2.3.7L19 22l-.7-2.3L16 19l2.3-.7L19 16Z" /></svg>;
  if (name === "arrow") return <svg {...common}><path d="M5 12h13" /><path d="m13 6 6 6-6 6" /></svg>;
  if (name === "shield") return <svg {...common}><path d="M12 3 20 6v5c0 5-3.3 8.7-8 10-4.7-1.3-8-5-8-10V6l8-3Z" /><path d="m9 12 2 2 4-4" /></svg>;
  if (name === "box") return <svg {...common}><path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" /><path d="M4 7.5 12 12l8-4.5M12 12v9" /></svg>;
  if (name === "chevron") return <svg {...common}><path d="m7 10 5 5 5-5" /></svg>;
  return <svg {...common}><path d="m13 2-8 12h6l-1 8 8-12h-6l1-8Z" /></svg>;
}

function ExtensionMark({ extension, large = false }: { extension: MarketplaceExtension; large?: boolean }) {
  const initials = extension.name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
  return (
    <div className={`${large ? "h-14 w-14 rounded-2xl text-base" : "h-11 w-11 rounded-xl text-sm"} flex shrink-0 items-center justify-center border border-white/10 bg-gradient-to-br from-violet-500/20 via-indigo-500/10 to-cyan-400/10 font-bold text-violet-100 shadow-[0_0_30px_rgba(124,92,255,.12)]`}>
      {initials || "G"}
    </div>
  );
}

export default function MarketplacePage() {
  const { user, loading: authLoading } = useAuth();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [extensions, setExtensions] = useState<MarketplaceExtension[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<TabId>("all");
  const [sort, setSort] = useState<SortMode>("relevance");
  const [view, setView] = useState<ViewMode>("grid");
  const [showFilters, setShowFilters] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("gen3ia-marketplace-favorites");
      if (saved) setFavorites(JSON.parse(saved) as string[]);
    } catch {
      // Local preferences are optional and must never block the marketplace.
    }
  }, []);

  const toggleFavorite = (id: string) => {
    setFavorites((current) => {
      const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
      try { window.localStorage.setItem("gen3ia-marketplace-favorites", JSON.stringify(next)); } catch { /* ignore storage failures */ }
      return next;
    });
  };

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError("");
    try {
      const token = await user.getIdToken();
      const params = new URLSearchParams();
      if (query.trim()) params.set("q", query.trim());
      if (category) params.set("category", category);
      const response = await fetch(`/api/extensions?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (response.status === 401) throw new Error("Votre session a expiré. Reconnectez-vous pour continuer.");
      if (!response.ok) throw new Error("Impossible de charger le Marketplace.");
      setExtensions((await response.json()).extensions ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, [user, query, category]);

  useEffect(() => {
    if (!user) return;
    const timer = window.setTimeout(() => void load(), query ? 300 : 0);
    return () => window.clearTimeout(timer);
  }, [load, query, user]);

  const categoryCounts = useMemo(() => extensions.reduce<Record<string, number>>((acc, extension) => {
    acc[extension.category] = (acc[extension.category] ?? 0) + 1;
    return acc;
  }, {}), [extensions]);

  const visibleExtensions = useMemo(() => {
    let result = [...extensions];
    if (tab === "popular") result.sort((a, b) => b.stats.installs - a.stats.installs);
    if (tab === "rating") result = result.filter((item) => item.stats.rating !== null).sort((a, b) => (b.stats.rating ?? 0) - (a.stats.rating ?? 0));
    if (tab === "free") result = result.filter((item) => item.pricing.model === "free");
    if (tab === "favorites") result = result.filter((item) => favorites.includes(item.id));
    if (sort === "popular") result.sort((a, b) => b.stats.installs - a.stats.installs);
    if (sort === "rating") result.sort((a, b) => (b.stats.rating ?? -1) - (a.stats.rating ?? -1));
    if (sort === "price-low") result.sort((a, b) => priceValue(a) - priceValue(b));
    if (sort === "price-high") result.sort((a, b) => priceValue(b) - priceValue(a));
    return result;
  }, [extensions, favorites, sort, tab]);

  const featured = useMemo(() => [...extensions].sort((a, b) => b.stats.installs - a.stats.installs).slice(0, 3), [extensions]);

  if (authLoading || !user) {
    return <FeatureAuthGate feature="Marketplace Gen3ia" description="Connectez-vous pour découvrir, acheter, installer et gérer les extensions de vos agents."><span /></FeatureAuthGate>;
  }

  return (
    <main className="min-h-screen bg-[#05070d] text-white selection:bg-violet-500/30">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-[8%] top-[-10rem] h-[30rem] w-[30rem] rounded-full bg-violet-600/10 blur-[120px]" />
        <div className="absolute right-[-8rem] top-[20rem] h-[24rem] w-[24rem] rounded-full bg-cyan-500/[0.06] blur-[110px]" />
      </div>

      <div className="relative mx-auto max-w-[1480px] px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between border-b border-white/[0.07] pb-5">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 text-sm font-semibold tracking-tight">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-violet-400/20 bg-violet-500/10 text-violet-200"><Icon name="bolt" size={15} /></span>
              Gen3ia
            </Link>
            <span className="hidden text-white/20 sm:block">/</span>
            <span className="hidden text-sm text-white/50 sm:block">Marketplace</span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/developer" className="hidden rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-medium text-white/65 transition hover:border-white/20 hover:bg-white/[0.06] sm:block">Developer Studio</Link>
            <Link href="/studio" className="rounded-xl bg-white px-3 py-2 text-xs font-semibold text-black transition hover:bg-white/90">Ouvrir le Studio</Link>
          </div>
        </header>

        <section className="py-10 lg:py-14">
          <div className="max-w-4xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-violet-400/15 bg-violet-400/[0.07] px-3 py-1.5 text-[11px] font-medium text-violet-200">
              <Icon name="spark" size={13} /> Écosystème Gen3ia
            </div>
            <h1 className="text-4xl font-semibold tracking-[-0.04em] sm:text-5xl lg:text-6xl">Construisez plus.<br /><span className="bg-gradient-to-r from-white via-violet-200 to-cyan-200 bg-clip-text text-transparent">Ajoutez les bonnes capacités.</span></h1>
            <p className="mt-5 max-w-2xl text-sm leading-7 text-white/55 sm:text-base">Une marketplace conçue pour enrichir vos agents avec des tools, skills, workflows et intégrations vérifiés, versionnés et contrôlés par permissions.</p>
          </div>

          <div className="mt-8 max-w-3xl">
            <label className="group flex h-14 items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.045] px-4 shadow-2xl shadow-black/20 transition focus-within:border-violet-400/40 focus-within:bg-white/[0.06]">
              <span className="text-white/35"><Icon name="search" /></span>
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher une extension, une capacité ou une intégration…" className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/30" />
              <kbd className="hidden rounded-lg border border-white/10 bg-black/20 px-2 py-1 text-[10px] text-white/25 sm:block">⌘ K</kbd>
            </label>
          </div>
        </section>

        {featured.length > 0 && !query && !category && tab === "all" && (
          <section className="mb-10">
            <div className="mb-4 flex items-end justify-between">
              <div><p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-violet-300/70">Sélection</p><h2 className="mt-1 text-xl font-semibold">Capacités populaires</h2></div>
              <button onClick={() => setTab("popular")} className="hidden items-center gap-1 text-xs text-white/45 transition hover:text-white sm:flex">Tout voir <Icon name="arrow" size={14} /></button>
            </div>
            <div className="grid gap-3 lg:grid-cols-3">
              {featured.map((extension, index) => (
                <Link key={extension.id} href={`/marketplace/${extension.id}`} className="group relative overflow-hidden rounded-2xl border border-white/[0.09] bg-white/[0.035] p-4 transition duration-200 hover:-translate-y-0.5 hover:border-violet-400/30 hover:bg-white/[0.055]">
                  <div className="absolute right-0 top-0 h-24 w-24 rounded-full bg-violet-500/10 blur-3xl" />
                  <div className="relative flex items-start gap-3"><ExtensionMark extension={extension} /><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><span className="truncate text-sm font-semibold">{extension.name}</span><span className="text-[10px] text-white/25">0{index + 1}</span></div><p className="mt-1 line-clamp-2 text-xs leading-5 text-white/45">{extension.description}</p></div></div>
                  <div className="relative mt-4 flex items-center justify-between border-t border-white/[0.06] pt-3 text-[10px] text-white/35"><span>{categoryLabel(extension.category)}</span><span>{extension.stats.installs.toLocaleString("fr-FR")} installations · {extension.stats.rating !== null ? `${extension.stats.rating}/5` : "Nouveau"}</span></div>
                </Link>
              ))}
            </div>
          </section>
        )}

        <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
          <aside className={`${showFilters ? "block" : "hidden"} lg:block`}>
            <div className="sticky top-5 space-y-6">
              <div>
                <div className="mb-3 flex items-center justify-between"><h2 className="text-xs font-semibold text-white/75">Catégories</h2><span className="text-[10px] text-white/25">{extensions.length}</span></div>
                <div className="space-y-1">
                  {CATEGORIES.map((item) => (
                    <button key={item.id} onClick={() => { setCategory(item.id); setTab("all"); }} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs transition ${category === item.id ? "bg-violet-500/10 text-violet-200" : "text-white/45 hover:bg-white/[0.04] hover:text-white/75"}`}>
                      <span className="w-4 text-center text-white/30">{item.icon}</span><span className="flex-1">{item.label}</span><span className="text-[10px] text-white/20">{item.id ? categoryCounts[item.id] ?? 0 : extensions.length}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
                <div className="flex items-center gap-2 text-xs font-medium"><Icon name="shield" size={15} /> Environnement sécurisé</div>
                <p className="mt-2 text-[11px] leading-5 text-white/35">Les extensions sont versionnées et exécutées selon leurs permissions. Les paiements et droits d'utilisation sont vérifiés côté serveur.</p>
              </div>
              <Link href="/developer" className="flex items-center gap-2 text-xs text-violet-300/75 transition hover:text-violet-200"><Icon name="box" size={15} /> Publier une extension <Icon name="arrow" size={13} /></Link>
            </div>
          </aside>

          <section className="min-w-0">
            <div className="mb-4 flex flex-wrap items-center gap-2 border-b border-white/[0.07] pb-3">
              <div className="mr-auto flex max-w-full gap-1 overflow-x-auto pb-1 scrollbar-none">
                {TABS.map((item) => (
                  <button key={item.id} onClick={() => setTab(item.id)} className={`whitespace-nowrap rounded-lg px-3 py-2 text-xs font-medium transition ${tab === item.id ? "bg-white/[0.08] text-white" : "text-white/40 hover:bg-white/[0.04] hover:text-white/70"}`}>{item.label}{item.id === "favorites" && favorites.length > 0 ? ` · ${favorites.length}` : ""}</button>
                ))}
              </div>
              <button onClick={() => setShowFilters((current) => !current)} className="flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs text-white/55 transition hover:bg-white/[0.05] lg:hidden"><Icon name="sliders" size={14} /> Filtres</button>
              <div className="relative">
                <select value={sort} onChange={(event) => setSort(event.target.value as SortMode)} className="appearance-none rounded-lg border border-white/10 bg-[#0b0e16] py-2 pl-3 pr-8 text-xs text-white/55 outline-none hover:bg-white/[0.05]">
                  <option value="relevance">Pertinence</option><option value="popular">Popularité</option><option value="rating">Note</option><option value="price-low">Prix croissant</option><option value="price-high">Prix décroissant</option>
                </select><span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-white/25"><Icon name="chevron" size={13} /></span>
              </div>
              <div className="hidden rounded-lg border border-white/10 p-0.5 sm:flex"><button onClick={() => setView("grid")} aria-label="Vue grille" className={`rounded-md p-1.5 ${view === "grid" ? "bg-white/10 text-white" : "text-white/25"}`}><Icon name="grid" size={14} /></button><button onClick={() => setView("compact")} aria-label="Vue compacte" className={`rounded-md p-1.5 ${view === "compact" ? "bg-white/10 text-white" : "text-white/25"}`}><Icon name="list" size={14} /></button></div>
            </div>

            {error && <div role="alert" className="mb-5 flex items-center justify-between gap-4 rounded-xl border border-red-400/20 bg-red-400/[0.05] p-4 text-xs text-red-200"><span>{error}</span><button onClick={() => void load()} className="shrink-0 rounded-lg border border-red-300/20 px-3 py-1.5 text-[11px] hover:bg-red-300/10">Réessayer</button></div>}

            <div className="mb-5 flex items-center justify-between"><div><p className="text-xs text-white/35">{loading ? "Actualisation du catalogue…" : `${visibleExtensions.length} extension${visibleExtensions.length > 1 ? "s" : ""}`}{category ? ` · ${categoryLabel(category)}` : ""}</p></div><div className="hidden items-center gap-5 text-[10px] text-white/25 md:flex"><span>Permissions contrôlées</span><span>Versions vérifiées</span><span>Paiement sécurisé</span></div></div>

            {loading ? (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }).map((_, index) => <div key={index} className="h-56 animate-pulse rounded-2xl border border-white/[0.06] bg-white/[0.025]" />)}</div>
            ) : visibleExtensions.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-16 text-center"><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-white/30"><Icon name={tab === "favorites" ? "heart" : "search"} size={20} /></div><h2 className="mt-4 text-base font-semibold">{tab === "favorites" ? "Aucun favori" : "Aucune extension trouvée"}</h2><p className="mx-auto mt-2 max-w-md text-xs leading-5 text-white/35">{tab === "favorites" ? "Ajoutez des extensions à vos favoris pour les retrouver rapidement ici." : "Essayez un autre terme, une autre catégorie ou réinitialisez vos filtres."}</p>{(query || category || tab !== "all") && <button onClick={() => { setQuery(""); setCategory(""); setTab("all"); }} className="mt-5 rounded-xl bg-white px-4 py-2.5 text-xs font-semibold text-black">Réinitialiser</button>}</div>
            ) : view === "compact" ? (
              <div className="divide-y divide-white/[0.06] overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02]">{visibleExtensions.map((extension) => <Link key={extension.id} href={`/marketplace/${extension.id}`} className="group flex items-center gap-4 p-4 transition hover:bg-white/[0.04]"><ExtensionMark extension={extension} /><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><h3 className="truncate text-sm font-semibold">{extension.name}</h3>{extension.pricing.model === "free" && <span className="rounded-full bg-emerald-400/10 px-2 py-0.5 text-[9px] text-emerald-300">GRATUIT</span>}</div><p className="mt-1 truncate text-xs text-white/35">{extension.description}</p></div><div className="hidden text-right sm:block"><div className="text-xs text-white/55">{extension.stats.rating !== null ? `★ ${extension.stats.rating}/5` : "Nouveau"}</div><div className="mt-1 text-[10px] text-white/25">{extension.stats.installs.toLocaleString("fr-FR")} installations</div></div><span className="text-xs font-medium text-violet-300">{formatPrice(extension.pricing)}</span><Icon name="arrow" size={15} /></Link>)}</div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{visibleExtensions.map((extension) => {
                const favorite = favorites.includes(extension.id);
                return <article key={extension.id} className="group relative flex min-h-[245px] flex-col rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4 transition duration-200 hover:-translate-y-0.5 hover:border-violet-400/25 hover:bg-white/[0.04] hover:shadow-2xl hover:shadow-black/20">
                  <div className="flex items-start gap-3"><Link href={`/marketplace/${extension.id}`} className="flex min-w-0 flex-1 items-start gap-3"><ExtensionMark extension={extension} /><div className="min-w-0 pt-0.5"><div className="flex items-center gap-2"><h3 className="truncate text-sm font-semibold group-hover:text-violet-100">{extension.name}</h3></div><p className="mt-1 text-[10px] text-white/30">{categoryLabel(extension.category)} · v{extension.approvedVersion ?? extension.latestVersion ?? "—"}</p></div></Link><button onClick={() => toggleFavorite(extension.id)} aria-label={favorite ? "Retirer des favoris" : "Ajouter aux favoris"} className={`rounded-lg p-1.5 transition ${favorite ? "text-violet-300" : "text-white/20 hover:bg-white/5 hover:text-white/60"}`}><Icon name="heart" size={15} /></button></div>
                  <Link href={`/marketplace/${extension.id}`} className="mt-4 flex-1"><p className="line-clamp-3 text-xs leading-5 text-white/42">{extension.description}</p><div className="mt-4 flex flex-wrap gap-1.5">{extension.tags.slice(0, 3).map((tag) => <span key={tag} className="rounded-md border border-white/[0.06] bg-white/[0.025] px-2 py-1 text-[9px] text-white/30">{tag}</span>)}</div></Link>
                  <div className="mt-4 flex items-center justify-between border-t border-white/[0.06] pt-3"><div className="flex items-center gap-3 text-[10px] text-white/30"><span>{extension.stats.rating !== null ? <><span className="text-amber-300/80">★</span> {extension.stats.rating}</> : "Nouveau"}</span><span>{extension.stats.installs.toLocaleString("fr-FR")} installs</span></div><span className="text-[11px] font-semibold text-violet-200">{formatPrice(extension.pricing)}</span></div>
                  <div className="mt-2 flex items-center gap-1.5 text-[9px] text-emerald-300/55"><Icon name="shield" size={11} /> Permissions déclarées · exécution contrôlée</div>
                </article>;
              })}</div>
            )}
          </section>
        </div>

        <footer className="mt-16 border-t border-white/[0.07] py-8"><div className="flex flex-col gap-3 text-[10px] text-white/25 sm:flex-row sm:items-center sm:justify-between"><span>Gen3ia Marketplace · extensions, tools, skills & workflows</span><div className="flex gap-4"><Link href="/developer" className="hover:text-white/50">Devenir développeur</Link><Link href="/studio" className="hover:text-white/50">Studio</Link></div></div></footer>
      </div>
    </main>
  );
}
