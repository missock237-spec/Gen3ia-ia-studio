"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAuth, authFetch } from "@/lib/firebase/auth-client";

type Extension = {
  id: string;
  name: string;
  description: string;
  category: string;
  tags?: string[];
  developerName?: string;
  latestVersion?: string | null;
  pricing?: { model?: string; amountMinor?: number; currency?: string };
  stats?: { installs?: number; ratingCount?: number; rating?: number | null };
};

type Installation = { extensionId: string; extension?: Extension | null; status?: string; version?: string };
type HubTab = "discover" | "installed" | "favorites" | "purchases";

const categories = [
  ["all", "Tout", "✦"], ["ai", "IA & Agents", "✦"], ["productivity", "Productivité", "◈"],
  ["marketing", "Marketing", "◇"], ["communication", "Communication", "⌁"], ["data", "Données", "◌"],
  ["devtools", "Dev tools", "⌘"], ["finance", "Finance", "◉"],
];

function price(value?: Extension["pricing"]) {
  if (!value || value.model === "free") return "Gratuit";
  const amount = (value.amountMinor ?? 0) / 100;
  return `${amount.toLocaleString("fr-FR")} ${value.currency ?? "XAF"}${value.model === "subscription" ? "/mois" : ""}`;
}

function initials(name: string) { return name.trim().slice(0, 2).toUpperCase() || "G3"; }

export function MarketplaceHub() {
  const { user } = useAuth();
  const [tab, setTab] = useState<HubTab>("discover");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [sort, setSort] = useState("popular");
  const [extensions, setExtensions] = useState<Extension[]>([]);
  const [installed, setInstalled] = useState<Installation[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [installedLoading, setInstalledLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      try {
        // authFetch : ID token Firebase si disponible, sinon cookie de session.
        const response = await authFetch("/api/extensions?limit=100", { cache: "no-store" });
        if (!response.ok) throw new Error("Impossible de charger le catalogue.");
        const data = await response.json();
        if (active) setExtensions(Array.isArray(data.extensions) ? data.extensions : []);
      } catch (e) { if (active) setError(e instanceof Error ? e.message : "Erreur de chargement"); }
      finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      setInstalledLoading(true);
      try {
        const response = await authFetch("/api/extensions/installed", { cache: "no-store" });
        if (!response.ok) throw new Error("Impossible de charger vos installations.");
        const data = await response.json();
        if (active) setInstalled(Array.isArray(data.installations) ? data.installations : []);
      } catch (e) { if (active) setError(e instanceof Error ? e.message : "Erreur de chargement des installations"); }
      finally { if (active) setInstalledLoading(false); }
    })();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!user) return;
    try { setFavorites(JSON.parse(localStorage.getItem("gen3ia:marketplace:favorites") ?? "[]")); } catch { setFavorites([]); }
  }, [user]);

  const toggleFavorite = (id: string) => {
    setFavorites((current) => {
      const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
      localStorage.setItem("gen3ia:marketplace:favorites", JSON.stringify(next));
      return next;
    });
  };

  const visible = useMemo(() => {
    let list = [...extensions];
    if (tab === "favorites") list = list.filter((item) => favorites.includes(item.id));
    if (tab === "installed") list = installed.map((entry) => entry.extension).filter((item): item is Extension => Boolean(item));
    if (category !== "all") list = list.filter((item) => item.category?.toLowerCase() === category);
    const q = query.trim().toLowerCase();
    if (q) list = list.filter((item) => `${item.name} ${item.description} ${item.category} ${(item.tags ?? []).join(" ")}`.toLowerCase().includes(q));
    list.sort((a, b) => {
      if (sort === "rating") return (b.stats?.rating ?? 0) - (a.stats?.rating ?? 0);
      if (sort === "newest") return (b.latestVersion ?? "").localeCompare(a.latestVersion ?? "", undefined, { numeric: true });
      if (sort === "price") return (a.pricing?.amountMinor ?? 0) - (b.pricing?.amountMinor ?? 0);
      return (b.stats?.installs ?? 0) - (a.stats?.installs ?? 0);
    });
    return list;
  }, [extensions, favorites, installed, tab, category, query, sort]);

  const tabs: [HubTab, string, string][] = [["discover", "Explorer", "Découvrir les capacités"], ["installed", "Installées", "Extensions actives"], ["favorites", "Favoris", "Votre sélection"], ["purchases", "Achats", "Licences et accès"]];

  return (
    <div className="min-h-screen bg-[#060812] text-white">
      <div className="mx-auto flex max-w-[1480px] gap-0 px-3 py-3 sm:px-5 lg:px-7">
        <aside className="sticky top-3 hidden h-[calc(100vh-24px)] w-[248px] shrink-0 flex-col rounded-[28px] border border-white/10 bg-white/[.035] p-4 lg:flex">
          <Link href="/marketplace" className="mb-7 flex items-center gap-3 px-2 py-2"><span className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-400 text-sm font-black">G3</span><span><b className="block text-sm">Gen3ia</b><small className="text-white/40">Marketplace</small></span></Link>
          <p className="px-2 text-[10px] font-semibold uppercase tracking-[.22em] text-white/35">Espace marketplace</p>
          <nav className="mt-3 space-y-1">{tabs.map(([id, label, desc]) => <button key={id} onClick={() => setTab(id)} className={`w-full rounded-2xl px-3 py-3 text-left transition ${tab === id ? "bg-violet-500/15 text-white" : "text-white/55 hover:bg-white/5 hover:text-white"}`}><span className="text-sm font-medium">{label}</span><span className="mt-0.5 block text-[11px] text-white/30">{desc}</span></button>)}</nav>
          <div className="my-5 h-px bg-white/10" />
          <p className="px-2 text-[10px] font-semibold uppercase tracking-[.22em] text-white/35">Catégories</p>
          <nav className="mt-2 space-y-1">{categories.map(([id, label, icon]) => <button key={id} onClick={() => { setCategory(id); setTab("discover"); }} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm ${category === id ? "bg-white/7 text-white" : "text-white/50 hover:bg-white/5 hover:text-white"}`}><span className="w-5 text-center text-violet-300">{icon}</span>{label}</button>)}</nav>
          <div className="mt-auto rounded-2xl border border-cyan-400/10 bg-cyan-400/[.04] p-3"><p className="text-xs font-medium">Vous développez une extension ?</p><p className="mt-1 text-[11px] leading-5 text-white/40">Publiez vos tools, skills et workflows.</p><Link href="/developer" className="mt-3 inline-flex text-xs font-semibold text-cyan-300">Ouvrir Developer Studio →</Link></div>
        </aside>

        <main className="min-w-0 flex-1 px-2 sm:px-5 lg:px-7">
          <header className="rounded-[30px] border border-white/10 bg-gradient-to-br from-violet-500/[.12] via-white/[.025] to-cyan-400/[.06] p-6 sm:p-8">
            <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between"><div><div className="text-[10px] font-bold tracking-[.28em] text-violet-300">GEN3IA / MARKETPLACE</div><h1 className="mt-3 max-w-3xl text-3xl font-bold tracking-tight sm:text-4xl">Construisez votre environnement IA.</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-white/55">Des extensions professionnelles pour enrichir vos agents avec des tools, skills, workflows et intégrations prêtes à l’emploi.</p></div><div className="grid grid-cols-3 gap-2"><div className="rounded-2xl border border-white/10 bg-black/15 px-4 py-3"><b className="text-lg">{extensions.length}</b><small className="mt-1 block text-[10px] text-white/35">Extensions</small></div><div className="rounded-2xl border border-white/10 bg-black/15 px-4 py-3"><b className="text-lg">{installed.length}</b><small className="mt-1 block text-[10px] text-white/35">Installées</small></div><div className="rounded-2xl border border-white/10 bg-black/15 px-4 py-3"><b className="text-lg">{favorites.length}</b><small className="mt-1 block text-[10px] text-white/35">Favoris</small></div></div></div>
            <div className="mt-7 flex flex-col gap-3 md:flex-row"><label className="relative flex-1"><span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/35">⌕</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher une extension, une capacité, un outil…" className="w-full rounded-2xl border border-white/10 bg-black/25 py-3.5 pl-11 pr-4 text-sm outline-none placeholder:text-white/25 focus:border-violet-400/50" /></label><select value={sort} onChange={(e) => setSort(e.target.value)} className="rounded-2xl border border-white/10 bg-[#0d1220] px-4 py-3 text-sm text-white/70 outline-none"><option value="popular">Plus populaires</option><option value="rating">Mieux notées</option><option value="newest">Plus récentes</option><option value="price">Prix croissant</option></select></div>
          </header>

          <div className="mt-5 flex gap-2 overflow-x-auto pb-1 lg:hidden">{tabs.map(([id, label]) => <button key={id} onClick={() => setTab(id)} className={`whitespace-nowrap rounded-xl border px-3 py-2 text-xs ${tab === id ? "border-violet-400/30 bg-violet-400/10" : "border-white/10 bg-white/[.03] text-white/50"}`}>{label}</button>)}</div>
          <div className="mt-6 flex gap-2 overflow-x-auto pb-1">{categories.map(([id, label]) => <button key={id} onClick={() => setCategory(id)} className={`whitespace-nowrap rounded-full border px-3.5 py-2 text-xs ${category === id ? "border-violet-400/30 bg-violet-400/10 text-violet-100" : "border-white/10 bg-white/[.025] text-white/45 hover:text-white"}`}>{label}</button>)}</div>

          <section className="mt-7">
            <div className="mb-4 flex items-center justify-between"><div><h2 className="text-lg font-semibold">{tab === "discover" ? "Explorer" : tabs.find((x) => x[0] === tab)?.[1]}</h2><p className="mt-1 text-xs text-white/35">{tab === "installed" && installedLoading ? "Synchronisation…" : `${visible.length} résultat${visible.length > 1 ? "s" : ""}`}</p></div><Link href="/developer" className="text-xs font-semibold text-violet-300 hover:text-violet-200">Publier une extension →</Link></div>
            {error ? <div className="rounded-2xl border border-red-400/20 bg-red-400/5 p-5 text-sm text-red-200">{error}</div> : loading || (tab === "installed" && installedLoading) ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-60 animate-pulse rounded-3xl border border-white/10 bg-white/[.03]" />)}</div> : visible.length === 0 ? <div className="rounded-3xl border border-dashed border-white/10 bg-white/[.02] p-12 text-center"><div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-white/5 text-xl">⌕</div><h3 className="mt-4 font-semibold">{tab === "installed" ? "Aucune extension installée" : tab === "favorites" ? "Aucun favori" : tab === "purchases" ? "Aucun achat affiché" : "Aucun résultat"}</h3><p className="mt-2 text-sm text-white/40">{tab === "installed" ? "Installez une extension depuis sa fiche pour la retrouver ici." : tab === "favorites" ? "Ajoutez des extensions à vos favoris pour les retrouver rapidement." : tab === "purchases" ? "La gestion détaillée des licences sera ajoutée dans l’espace achats." : "Modifiez votre recherche, catégorie ou sélection."}</p>{tab === "installed" && <button onClick={() => setTab("discover")} className="mt-5 rounded-xl bg-violet-600 px-4 py-2 text-xs font-semibold hover:bg-violet-500">Explorer le catalogue</button>}</div> : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{visible.map((extension) => <article key={extension.id} className="group relative overflow-hidden rounded-3xl border border-white/10 bg-[#0c111e] p-5 transition duration-200 hover:-translate-y-0.5 hover:border-violet-400/25"><button aria-label={favorites.includes(extension.id) ? "Retirer des favoris" : "Ajouter aux favoris"} onClick={() => toggleFavorite(extension.id)} className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-black/20 text-sm text-white/50 hover:text-white">{favorites.includes(extension.id) ? "★" : "☆"}</button><Link href={`/marketplace/${extension.id}`} className="block"><div className="flex items-start gap-3"><div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-violet-500/20 to-cyan-400/10 text-xs font-bold text-violet-200">{initials(extension.name)}</div><div className="min-w-0 pr-10"><h3 className="truncate font-semibold">{extension.name}</h3><p className="mt-1 text-[11px] text-white/35">{extension.developerName ?? "Développeur Gen3ia"} · v{extension.latestVersion ?? "—"}</p></div></div><p className="mt-4 line-clamp-3 min-h-[60px] text-sm leading-5 text-white/50">{extension.description}</p><div className="mt-4 flex flex-wrap gap-1.5">{(extension.tags ?? []).slice(0, 3).map((tag) => <span key={tag} className="rounded-full bg-white/5 px-2 py-1 text-[10px] text-white/40">{tag}</span>)}</div><div className="mt-5 flex items-center justify-between border-t border-white/7 pt-4"><span className="text-xs text-white/35">{extension.stats?.installs ?? 0} installations · {extension.stats?.rating ? `${extension.stats.rating}/5` : "Nouveau"}</span><b className="text-sm text-violet-200">{price(extension.pricing)}</b></div></Link></article>)}</div>}
          </section>
        </main>
      </div>
    </div>
  );
}
