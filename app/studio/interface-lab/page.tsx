"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { authFetch, useSessionAvailable } from "@/lib/firebase/auth-client";

/**
 * ATELIER D'INTERFACES — fonctionnalite EXCLUSIVE aux agents de code.
 * Recherche et recuperation de composants/themes/logos professionnels via
 * l'API 21st.dev (serveur MCP https://21st.dev/api/mcp, cle cote serveur).
 * L'adaptation au design system Gen3ia est realisee par les LLM Gen3ia.
 */

interface CatalogResult {
  kind: "component" | "theme" | "template" | "other";
  id: string;
  name: string;
  author: string;
  description: string;
  previewUrl: string | null;
  pageUrl: string | null;
  installCommand: string | null;
}

interface ComponentCode {
  id: string;
  name: string;
  installCommand: string | null;
  code: string | null;
  demo: string | null;
  dependencies: string[];
}

interface ThemeTokens {
  id: string;
  name: string;
  css: string | null;
  pageUrl: string | null;
}

interface LogoResult {
  title: string;
  svgUrl: string | null;
  category: string | null;
}

interface Usage {
  tier: string;
  aiGenerationEnabled: boolean;
  freeRetrievalsRemaining: number | null;
  freeRetrievalsPerDay: number | null;
}

type LabTab = "components" | "themes" | "logos";

const KIND_LABELS: Record<string, string> = { component: "Composant", theme: "Theme", template: "Template", other: "Autre" };

export default function InterfaceLabPage() {
  const sessionDisponible = useSessionAvailable();
  const [checking, setChecking] = useState(true);
  const [access, setAccess] = useState<boolean | null>(null);
  const [accessMessage, setAccessMessage] = useState("");

  const [tab, setTab] = useState<LabTab>("components");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<CatalogResult[]>([]);
  const [logos, setLogos] = useState<LogoResult[]>([]);
  const [themes, setThemes] = useState<CatalogResult[]>([]);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");

  const [detail, setDetail] = useState<{ kind: "component" | "theme"; id: string; name: string; description?: string; author?: string } | null>(null);
  const [quotaBlocked, setQuotaBlocked] = useState(false);
  const [component, setComponent] = useState<ComponentCode | null>(null);
  const [theme, setTheme] = useState<ThemeTokens | null>(null);
  const [cached, setCached] = useState(false);
  const [adapted, setAdapted] = useState<string>("");
  const [adapting, setAdapting] = useState(false);
  const [copied, setCopied] = useState<"code" | "adapted" | "css" | null>(null);

  const loadUsage = async () => {
    try {
      const response = await authFetch("/api/code-agents/21st/usage", { cache: "no-store" });
      if (response.ok) setUsage((await response.json()).usage);
    } catch {
      /* silencieux */
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await authFetch("/api/code-agents/access", { cache: "no-store" });
        if (cancelled) return;
        if (response.ok) {
          const data = await response.json();
          setAccess(Boolean(data.access));
          setAccessMessage(data.message ?? "");
          if (data.access) void loadUsage();
        } else {
          setAccess(false);
          setAccessMessage("Authentification requise.");
        }
      } catch {
        if (!cancelled) {
          setAccess(false);
          setAccessMessage("Verification d'acces impossible.");
        }
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const search = async () => {
    const trimmed = query.trim();
    if (trimmed.length < 2) return;
    setLoading(true);
    setError("");
    setNote("");
    try {
      if (tab === "logos") {
        const response = await authFetch("/api/code-agents/21st/logos", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ query: trimmed }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "Recherche impossible");
        setLogos(data.logos ?? []);
        setResults([]);
      } else {
        const response = await authFetch("/api/code-agents/21st/search", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ query: trimmed, limit: 10 }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "Recherche impossible");
        const all: CatalogResult[] = data.results ?? [];
        if (tab === "themes") {
          const onlyThemes = all.filter((r) => r.kind === "theme");
          setThemes(onlyThemes);
          setNote(onlyThemes.length === 0 ? "Aucun theme pour cette recherche — essayez l'onglet Composants." : "");
          setResults(onlyThemes.length > 0 ? onlyThemes : all);
        } else {
          setResults(all);
        }
        setLogos([]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Recherche impossible");
    } finally {
      setLoading(false);
    }
  };

  const openDetail = async (kind: "component" | "theme", id: string, name: string, description?: string, author?: string) => {
    setDetail({ kind, id, name, description, author });
    setComponent(null);
    setTheme(null);
    setAdapted("");
    setCached(false);
    setError("");
    setQuotaBlocked(false);
    try {
      const response = await authFetch(`/api/code-agents/21st/${kind}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await response.json();
      if (!response.ok) {
        const message = String(data.error ?? "Recuperation impossible");
        if (response.status === 429 || /quota/i.test(message)) {
          setQuotaBlocked(true);
          setError("Quota 21st.dev du jour epuise pour ce composant. Vous pouvez toujours generer une variante Gen3ia a partir de sa description (ci-dessous). Les composants deja recuperes restent en cache.");
          return;
        }
        throw new Error(message);
      }
      if (kind === "component") {
        setComponent(data.component);
        setCached(Boolean(data.cached));
      } else {
        setTheme(data.theme);
        setCached(Boolean(data.cached));
      }
      void loadUsage();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Recuperation impossible");
    }
  };

  const adaptForGen3ia = async () => {
    const source = component?.code ?? theme?.css;
    if (!detail || (!source && !quotaBlocked)) return;
    setAdapting(true);
    setAdapted("");
    setError("");
    try {
      const isTheme = detail.kind === "theme";
      const sourceBlock = source
        ? (isTheme
          ? `Adapte ces tokens CSS a la palette Gen3ia (fond #070a12, violet #8b5cf6, cyan #22d3ee) en gardant la structure :\n\n${source.slice(0, 14_000)}`
          : `Adapte ce composant au design system Gen3ia decrit ci-dessus. Supprime les imports externes non essentiels (lucide-react remplace par des SVG inline, shadcn/ui remplace par du Tailwind pur) :\n\n${source.slice(0, 14_000)}`)
        : `Le code source original n'est pas disponible (quota du catalogue). Cree une variante Gen3ia du composant « ${detail.name} »${detail.author ? ` (par ${detail.author})` : ""} a partir de cette description : ${detail.description ?? "aucune description"}. Respecte strictement le design system decrit ci-dessus.`;
      const response = await authFetch("/api/ai/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          task: "coding",
          messages: [
            {
              role: "system",
              content:
                "Tu es un ingenieur frontend senior de l'agence Gen3ia. Gen3ia est une plateforme SaaS dark-only : fond #070a12, panneaux #0d1220, bordures rgba(255,255,255,0.1), accents violet #8b5cf6, cyan #22d3ee, emerald #34d399, coins arrondis 16-20px, typographie systeme, animations douces (cubic-bezier(0.22,1,0.36,1)). Tu adaptes ou crees du code externe conforme a CE design system, sans dependances externes payantes, en React + Tailwind CSS v4 strictement compatibles Next.js App Router (composants client 'use client' si besoin). Reponds UNIQUEMENT avec le code final, sans explication.",
            },
            { role: "user", content: sourceBlock },
          ],
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Adaptation impossible");
      setAdapted(String(data.response?.text ?? "").replace(/^```(?:tsx?|css)?\n?/, "").replace(/\n?```$/, ""));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Adaptation impossible");
    } finally {
      setAdapting(false);
    }
  };

  const copy = async (text: string, which: "code" | "adapted" | "css") => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(which);
      window.setTimeout(() => setCopied(null), 1600);
    } catch {
      /* clipboard indisponible */
    }
  };

  // --------------------------------------------------------------------------
  // Rendu
  // --------------------------------------------------------------------------

  if (checking) {
    return (
      <main className="min-h-screen bg-[#070a12] p-4 text-white md:p-8">
        <div className="mx-auto max-w-6xl pt-20 text-center text-sm text-white/50">
          Verification de votre acces<span className="g3-dots"><span /><span /><span /></span>
        </div>
      </main>
    );
  }

  if (access !== true) {
    return (
      <main className="min-h-screen bg-[#070a12] p-4 text-white md:p-8">
        <div className="mx-auto max-w-2xl pt-16">
          <div className="g3-card anim-scale-in p-8 text-center md:p-12">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-cyan-400/30 bg-cyan-400/10 anim-float">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-cyan-300"><path d="M8 6l-5 6 5 6M16 6l5 6-5 6" /></svg>
            </div>
            <div className="g3-eyebrow mt-6">Acces exclusif</div>
            <h1 className="mt-2 text-2xl font-black md:text-3xl">Atelier reserve aux agents de code</h1>
            <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-white/55">
              {accessMessage || "L'Atelier d'Interfaces est une fonctionnalite premium reservee aux agents de type « code ». Creez un agent de code dans le Studio, activez-le, puis revenez : l'atelier se deverrouillera automatiquement."}
            </p>
            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              <Link href="/studio" className="g3-btn g3-btn-primary">Creer un agent de code</Link>
              {sessionDisponible === false && <Link href="/login" className="g3-btn g3-btn-ghost">Se connecter</Link>}
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#070a12] text-white p-4 md:p-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6">
          <div className="flex flex-wrap items-center gap-2">
            <div className="g3-eyebrow">EXCLUSIVITE AGENTS DE CODE</div>
            {usage && (
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-white/60">
                21st.dev · {usage.tier} · {usage.freeRetrievalsRemaining ?? "?"}/{usage.freeRetrievalsPerDay ?? "?"} recuperations aujourd&apos;hui
              </span>
            )}
          </div>
          <h1 className="mt-2 text-3xl font-black tracking-tight md:text-4xl">
            Atelier <span className="gradient-text">d&apos;Interfaces</span>
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-white/55 md:text-base">
            Recherchez des composants, themes et logos professionnels dans le catalogue 21st.dev, recuperez leur code source, puis faites-les adapter au design system Gen3ia par vos propres agents.
          </p>
        </header>

        {/* Onglets internes */}
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <div className="g3-tabs max-w-full overflow-x-auto">
            {([
              { key: "components", label: "Composants" },
              { key: "themes", label: "Themes" },
              { key: "logos", label: "Logos" },
            ] as Array<{ key: LabTab; label: string }>).map((item) => (
              <button key={item.key} type="button" className="g3-tab" data-active={tab === item.key} onClick={() => { setTab(item.key); setResults([]); setLogos([]); setNote(""); }}>
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Recherche */}
        <div className="g3-card p-4 md:p-5">
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              className="g3-input flex-1"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") void search(); }}
              placeholder={tab === "logos" ? "Ex. github, figma, nextjs…" : "Ex. hero section animee, bento grid, dashboard stats…"}
              maxLength={200}
            />
            <button type="button" className="g3-btn g3-btn-primary" disabled={loading || query.trim().length < 2} onClick={search}>
              {loading ? <>Recherche<span className="g3-dots"><span /><span /><span /></span></> : "Rechercher"}
            </button>
          </div>
          {tab === "logos" && <p className="mt-2 text-xs text-white/40">Recherche de logos SVG de marque (gratuite et illimitee via svgl.app).</p>}
          {tab !== "logos" && <p className="mt-2 text-xs text-white/40">Recherche illimitee. La recuperation du code complet est quantifiee (les resultats deja recuperees sont servis depuis le cache sans consommer de quota).</p>}
        </div>

        {note && <div className="anim-fade-in mt-4 rounded-2xl border border-white/10 bg-white/[.04] p-4 text-sm text-white/60">{note}</div>}
        {error && <div className="anim-fade-in mt-4 rounded-2xl border border-red-400/20 bg-red-400/5 p-4 text-sm text-red-100/90">{error}</div>}

        {/* Resultats */}
        {tab === "logos" && logos.length > 0 && (
          <div className="anim-fade-in mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {logos.map((logo) => (
              <div key={logo.title} className="g3-card card-glow flex flex-col items-center gap-2 p-4 text-center">
                {logo.svgUrl && <img src={logo.svgUrl} alt={logo.title} loading="lazy" className="h-10 w-10 object-contain" />}
                <span className="text-xs font-semibold">{logo.title}</span>
                {logo.svgUrl && (
                  <button type="button" className="g3-btn g3-btn-ghost !px-2 !py-1 text-[10px]" onClick={() => copy(logo.svgUrl ?? "", "code")}>
                    Copier l&apos;URL
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {tab === "logos" && !loading && logos.length === 0 && query.trim().length >= 2 && !error && (
          <div className="anim-fade-in mt-8 text-center text-sm text-white/40">Aucun logo trouve pour cette recherche — le service de logos (svgl.app) est peut-etre momentanement indisponible.</div>
        )}

        {tab !== "logos" && results.length > 0 && (
          <div className="anim-fade-up mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {results.map((item, index) => (
              <article key={`${item.kind}-${item.id}`} className="g3-card card-glow overflow-hidden" style={{ animationDelay: `${index * 0.05}s` }}>
                <div className="relative aspect-video bg-black/40">
                  {item.previewUrl ? (
                    <img src={item.previewUrl} alt={item.name} loading="lazy" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-white/30">Apercu indisponible</div>
                  )}
                  <span className="absolute left-2 top-2 rounded-full border border-white/15 bg-black/60 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white/80 backdrop-blur">
                    {KIND_LABELS[item.kind] ?? item.kind}
                  </span>
                </div>
                <div className="p-4">
                  <h3 className="truncate text-sm font-bold">{item.name}</h3>
                  <p className="text-xs text-violet-300/80">par {item.author}</p>
                  {item.description && <p className="mt-2 line-clamp-2 text-xs leading-5 text-white/50">{item.description}</p>}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(item.kind === "theme" ? ["theme", "component"] : ["component"]).includes(item.kind) || item.kind === "theme" ? (
                      <button type="button" className="g3-btn g3-btn-primary !px-3 !py-2 text-xs" onClick={() => openDetail(item.kind === "theme" ? "theme" : "component", item.id, item.name, item.description, item.author)}>
                        {item.kind === "theme" ? "Voir le theme" : "Voir le code"}
                      </button>
                    ) : (
                      <span className="rounded-lg border border-white/10 bg-white/[.04] px-3 py-2 text-xs text-white/40">Metadata uniquement</span>
                    )}
                    {item.pageUrl && (
                      <a href={item.pageUrl} target="_blank" rel="noopener noreferrer" className="g3-btn g3-btn-ghost !px-3 !py-2 text-xs">Page</a>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        {tab !== "logos" && !loading && results.length === 0 && query.trim().length >= 2 && !error && (
          <div className="mt-8 text-center text-sm text-white/40">Aucun resultat. Essayez d&apos;autres mots-cles.</div>
        )}
      </div>

      {/* Drawer de detail */}
      {detail && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={`Detail ${detail.name}`} onClick={() => setDetail(null)}>
          <div className="g3-drawer h-full w-full max-w-3xl overflow-y-auto border-l border-white/10 bg-[#0a0e18] p-5 md:p-7" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-black">{detail.name}</h2>
                <p className="mt-1 text-xs text-white/45">
                  {detail.kind === "theme" ? "Tokens CSS du theme" : "Code source du composant"}
                  {cached && " · servi depuis le cache (0 quota consomme)"}
                </p>
              </div>
              <button type="button" className="g3-btn g3-btn-ghost !px-3 !py-2" onClick={() => setDetail(null)} aria-label="Fermer">✕</button>
            </div>

            {detail.kind === "component" && (component || quotaBlocked) && (
              <div className="mt-5 space-y-5">
                {component && (
                  <div className="flex flex-wrap gap-2">
                    {component.code && <button type="button" className="g3-btn g3-btn-ghost text-xs" onClick={() => copy(component.code ?? "", "code")}>{copied === "code" ? "Copie ✓" : "Copier le code"}</button>}
                    {component.installCommand && <code className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-[11px] text-white/60">{component.installCommand}</code>}
                  </div>
                )}
                <button type="button" className="g3-btn g3-btn-primary" disabled={adapting || (!component?.code && !quotaBlocked)} onClick={adaptForGen3ia}>
                  {adapting ? <>IA Gen3ia en cours<span className="g3-dots"><span /><span /><span /></span></> : quotaBlocked && !component?.code ? "Generer une variante Gen3ia (IA)" : "Adapter au design system Gen3ia"}
                </button>
                {adapted && (
                  <div className="anim-slide-up">
                    <div className="mb-2 flex items-center justify-between">
                      <h3 className="text-sm font-bold text-emerald-300">Version Gen3ia</h3>
                      <button type="button" className="g3-btn g3-btn-cyan !px-3 !py-1.5 text-xs" onClick={() => copy(adapted, "adapted")}>{copied === "adapted" ? "Copie ✓" : "Copier"}</button>
                    </div>
                    <pre className="g3-code">{adapted}</pre>
                  </div>
                )}
                {component?.code && <pre className="g3-code">{component.code}</pre>}
                {component?.demo && (
                  <div>
                    <h3 className="mb-2 text-sm font-bold text-white/70">Exemple d&apos;utilisation</h3>
                    <pre className="g3-code">{component.demo}</pre>
                  </div>
                )}
              </div>
            )}

            {detail.kind === "theme" && theme && (
              <div className="mt-5 space-y-5">
                {theme.css && <button type="button" className="g3-btn g3-btn-ghost text-xs" onClick={() => copy(theme.css ?? "", "css")}>{copied === "css" ? "Copie ✓" : "Copier les tokens CSS"}</button>}
                <button type="button" className="g3-btn g3-btn-primary" disabled={adapting || !theme.css} onClick={adaptForGen3ia}>
                  {adapting ? <>Adaptation par l&apos;IA Gen3ia<span className="g3-dots"><span /><span /><span /></span></> : "Adapter a la palette Gen3ia"}
                </button>
                {adapted && (
                  <div className="anim-slide-up">
                    <div className="mb-2 flex items-center justify-between">
                      <h3 className="text-sm font-bold text-emerald-300">Palette Gen3ia</h3>
                      <button type="button" className="g3-btn g3-btn-cyan !px-3 !py-1.5 text-xs" onClick={() => copy(adapted, "adapted")}>{copied === "adapted" ? "Copie ✓" : "Copier"}</button>
                    </div>
                    <pre className="g3-code">{adapted}</pre>
                  </div>
                )}
                {theme.css && <pre className="g3-code">{theme.css}</pre>}
              </div>
            )}

            {!component && !theme && !quotaBlocked && (
              <div className="mt-10 text-center text-sm text-white/50">
                Recuperation du code via 21st.dev<span className="g3-dots"><span /><span /><span /></span>
                <div className="g3-progress mt-4" />
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
