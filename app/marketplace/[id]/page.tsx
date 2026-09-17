"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { onAuthStateChanged, type User } from "firebase/auth";

import { auth } from "@/lib/firebase/client";

interface Fiche {
  extension: {
    id: string;
    name: string;
    description: string;
    category: string;
    tags: string[];
    developerName: string;
    status: string;
    latestVersion: string | null;
    approvedVersion: string | null;
    pricing: { model: string; amountMinor?: number; unitAmountMinor?: number; currency?: string; interval?: string };
    permissions: string[];
    stats: { installs: number; ratingCount: number; rating: number | null };
  };
  version: {
    version: string;
    changelog: string;
    tools: Array<{ id: string; name: string; description: string }>;
    skills: Array<{ id: string; name: string; description: string }>;
    workflows: Array<{ id: string; name: string; description: string }>;
  } | null;
  reviews: Array<{ userId: string; rating: number; title: string | null; body: string; createdAt: number }>;
  userState: { installed: boolean; version?: string; status?: string; entitled: boolean } | null;
}

export default function ExtensionFichePage() {
  const [user, setUser] = useState<User | null>(null);
  const [fiche, setFiche] = useState<Fiche | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [rating, setRating] = useState(5);
  const [reviewBody, setReviewBody] = useState("");

  useEffect(() => onAuthStateChanged(auth, (current) => setUser(current)), []);

  const load = useCallback(async (currentUser: User | null) => {
    const headers: Record<string, string> = {};
    if (currentUser) headers.Authorization = `Bearer ${await currentUser.getIdToken()}`;
    const response = await fetch(`/api/extensions/${window.location.pathname.split("/").pop()}?reviews=1`, { headers, cache: "no-store" });
    if (response.ok) setFiche(await response.json());
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (current) => {
      setUser(current);
      void load(current);
    });
    return () => unsubscribe();
  }, [load]);

  if (!fiche) {
    return <main className="min-h-screen bg-[#070a12] p-10 text-center text-white/50">Chargement…</main>;
  }

  const { extension, version, reviews, userState } = fiche;
  const price =
    extension.pricing.model === "free"
      ? "Gratuit"
      : extension.pricing.model === "usage"
        ? `À l'usage`
        : extension.pricing.model === "subscription"
          ? `${((extension.pricing.amountMinor ?? 0) / 100).toLocaleString("fr-FR")} ${extension.pricing.currency ?? "XAF"} / ${extension.pricing.interval === "year" ? "an" : "mois"}`
          : `${((extension.pricing.amountMinor ?? 0) / 100).toLocaleString("fr-FR")} ${extension.pricing.currency ?? "XAF"}`;

  const action = async (path: string, init?: RequestInit) => {
    if (!user) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`/api/extensions/${extension.id}${path}`, {
        ...init,
        headers: { Authorization: `Bearer ${await user.getIdToken()}`, "content-type": "application/json", ...(init?.headers ?? {}) },
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? "Action impossible");
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
        return;
      }
      setMessage(
        data.status === "updated" ? "Extension mise à jour." :
        data.status === "uninstalled" ? "Extension désinstallée." :
        data.status === "up_to_date" ? "Extension déjà à jour." :
        data.status === "purchased" ? (data.message ?? "Achat effectué — installation en cours.") :
        data.status === "reported" ? "Signalement envoyé. Merci." :
        data.ok ? "Fait." : "Action effectuée.",
      );
      await load(user);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Action impossible");
    } finally {
      setBusy(false);
    }
  };

  const submitReview = async () => {
    if (!user || reviewBody.trim().length < 4) return;
    await action("/reviews", { method: "POST", body: JSON.stringify({ rating, body: reviewBody.trim() }) });
    setReviewBody("");
  };

  return (
    <main className="min-h-screen bg-[#070a12] p-5 text-white md:p-8">
      <div className="mx-auto max-w-5xl">
        <Link href="/marketplace" className="text-sm text-white/50 hover:text-white">← Marketplace</Link>
        <header className="mt-4 flex flex-col gap-4 rounded-3xl border border-white/10 bg-[#0d1220] p-6 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-white/50">{extension.category}</span>
              <span className="rounded-full bg-violet-400/10 px-3 py-1 text-xs text-violet-300">v{extension.approvedVersion ?? extension.latestVersion}</span>
            </div>
            <h1 className="mt-3 text-2xl font-bold">{extension.name}</h1>
            <p className="mt-1 text-sm text-white/45">par {extension.developerName} · {extension.stats.installs} installations · {extension.stats.rating !== null ? `${extension.stats.rating}/5 (${extension.stats.ratingCount} avis)` : "pas encore noté"}</p>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-white/70">{extension.description}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {(extension.tags ?? []).map((tag) => <span key={tag} className="rounded-md bg-white/5 px-2 py-0.5 text-[11px] text-white/45">#{tag}</span>)}
            </div>
          </div>
          <div className="flex w-full flex-col gap-3 md:w-64">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-center">
              <div className="text-lg font-bold text-violet-300">{price}</div>
              {extension.pricing.model === "usage" && extension.pricing.unitAmountMinor && (
                <div className="mt-1 text-xs text-white/45">{(extension.pricing.unitAmountMinor / 100).toFixed(0)} {extension.pricing.currency ?? "XAF"} par exécution</div>
              )}
            </div>
            {userState?.installed ? (
              <div className="flex flex-col gap-2">
                <div className="rounded-xl border border-emerald-400/25 bg-emerald-400/10 px-4 py-2 text-center text-sm text-emerald-300">
                  Installée (v{userState.version})
                </div>
                <button disabled={busy} onClick={() => action("/update", { method: "POST" })} className="rounded-xl border border-white/15 bg-white/[.04] px-4 py-2.5 text-sm font-semibold hover:bg-white/[.08] disabled:opacity-40">Mettre à jour</button>
                <button disabled={busy} onClick={() => action("/install", { method: "DELETE" })} className="rounded-xl border border-red-400/25 bg-red-400/10 px-4 py-2.5 text-sm font-semibold text-red-200 hover:bg-red-400/20 disabled:opacity-40">Désinstaller</button>
              </div>
            ) : (
              <button
                disabled={busy || !user || extension.status !== "approved"}
                onClick={() => action("/install", { method: "POST", body: JSON.stringify({}) })}
                className="rounded-xl bg-violet-600 px-4 py-3 text-sm font-semibold hover:bg-violet-500 disabled:opacity-40"
              >
                {extension.pricing.model === "free" ? "Installer" : "Acheter & installer"}
              </button>
            )}
            <button
              disabled={!user}
              onClick={() => action("/reports", { method: "POST", body: JSON.stringify({ reason: "other", details: "Signalement depuis la fiche." }) })}
              className="text-xs text-white/35 hover:text-white/60 disabled:opacity-30"
            >
              Signaler cette extension
            </button>
            {!user && <p className="text-center text-xs text-white/40"><Link href="/login" className="underline">Connectez-vous</Link> pour installer.</p>}
          </div>
        </header>

        {message && <div className="mt-4 rounded-xl border border-violet-400/20 bg-violet-400/5 p-4 text-sm text-white/80">{message}</div>}

        <section className="mt-6 grid gap-5 lg:grid-cols-2">
          <div className="rounded-3xl border border-white/10 bg-[#0d1220] p-6">
            <h2 className="text-lg font-semibold">Fonctionnalités</h2>
            {(version?.tools ?? []).length === 0 && (version?.skills ?? []).length === 0 && (version?.workflows ?? []).length === 0 && (
              <p className="mt-2 text-sm text-white/45">Aucune capacité déclarée.</p>
            )}
            {(version?.tools ?? []).map((tool) => (
              <div key={tool.id} className="mt-3 rounded-xl border border-white/10 bg-white/[.03] p-4">
                <div className="text-sm font-semibold">{tool.name} <span className="ml-1 font-mono text-[11px] text-white/35">ext.{extension.id}.{tool.id}</span></div>
                <p className="mt-1 text-sm text-white/55">{tool.description}</p>
              </div>
            ))}
            {(version?.skills ?? []).map((skill) => (
              <div key={skill.id} className="mt-3 rounded-xl border border-white/10 bg-white/[.03] p-4">
                <div className="text-sm font-semibold">Skill — {skill.name}</div>
                <p className="mt-1 text-sm text-white/55">{skill.description}</p>
              </div>
            ))}
            {(version?.workflows ?? []).map((workflow) => (
              <div key={workflow.id} className="mt-3 rounded-xl border border-white/10 bg-white/[.03] p-4">
                <div className="text-sm font-semibold">Workflow — {workflow.name}</div>
                <p className="mt-1 text-sm text-white/55">{workflow.description}</p>
              </div>
            ))}
          </div>

          <div className="space-y-5">
            <div className="rounded-3xl border border-amber-400/20 bg-amber-400/5 p-6">
              <h2 className="text-lg font-semibold">Permissions demandées</h2>
              <p className="mt-1 text-xs text-white/45">Validées à l'installation et vérifiées à chaque exécution par le moteur de permissions.</p>
              <ul className="mt-3 space-y-1.5">
                {extension.permissions.map((permission) => (
                  <li key={permission} className="rounded-lg bg-black/25 px-3 py-1.5 font-mono text-xs text-amber-100/85">{permission}</li>
                ))}
              </ul>
            </div>

            <div className="rounded-3xl border border-white/10 bg-[#0d1220] p-6">
              <h2 className="text-lg font-semibold">Avis ({reviews.length})</h2>
              {userState?.installed && (
                <div className="mt-3 rounded-xl border border-white/10 bg-white/[.03] p-4">
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button key={star} onClick={() => setRating(star)} className={star <= rating ? "text-amber-300" : "text-white/20"}>★</button>
                    ))}
                  </div>
                  <textarea value={reviewBody} onChange={(event) => setReviewBody(event.target.value)} placeholder="Votre retour d'utilisation…" className="mt-2 min-h-20 w-full rounded-lg border border-white/10 bg-black/20 p-3 text-sm outline-none focus:border-violet-400/60" />
                  <button disabled={busy || reviewBody.trim().length < 4} onClick={submitReview} className="mt-2 rounded-lg bg-violet-600 px-4 py-2 text-xs font-semibold disabled:opacity-40">Publier mon avis</button>
                </div>
              )}
              <ul className="mt-4 space-y-3">
                {reviews.map((review, index) => (
                  <li key={index} className="rounded-xl border border-white/10 bg-white/[.03] p-4">
                    <div className="flex items-center justify-between text-xs text-white/40">
                      <span>{review.userId}</span>
                      <span className="text-amber-300">{"★".repeat(review.rating)}</span>
                    </div>
                    {review.title && <div className="mt-1 text-sm font-semibold">{review.title}</div>}
                    <p className="mt-1 text-sm text-white/60">{review.body}</p>
                  </li>
                ))}
                {reviews.length === 0 && <li className="text-sm text-white/40">Aucun avis pour le moment.</li>}
              </ul>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
