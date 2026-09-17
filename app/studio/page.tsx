"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth } from "@/lib/firebase/client";

type Provider = "google_ads" | "meta_ads" | "tiktok_ads";
const labels: Record<Provider, string> = { google_ads: "Google Ads", meta_ads: "Meta Ads", tiktok_ads: "TikTok Ads" };

export default function StudioPage() {
  const [user, setUser] = useState<User | null>(null);
  const [connections, setConnections] = useState<Provider[]>([]);
  const [objective, setObjective] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [memoryCount, setMemoryCount] = useState(0);
  const [fileCount, setFileCount] = useState(0);

  useEffect(() => onAuthStateChanged(auth, async (current) => {
    setUser(current); if (!current) return;
    const token = await current.getIdToken(); const headers = { Authorization: `Bearer ${token}` };
    const [ads, memory, storage] = await Promise.all([fetch("/api/ads/connections", { headers, cache: "no-store" }), fetch("/api/memory", { headers, cache: "no-store" }), fetch("/api/storage/permanent", { headers, cache: "no-store" })]);
    if (ads.ok) setConnections(((await ads.json()).connections ?? []).map((x: { provider: Provider }) => x.provider));
    if (memory.ok) setMemoryCount(((await memory.json()).memories ?? []).length);
    if (storage.ok) setFileCount(((await storage.json()).files ?? []).length);
  }), []);

  const connectAds = async (provider: Provider) => {
    if (!user) return; setBusy(true); setMessage("");
    try { const token = await user.getIdToken(); const response = await fetch("/api/ads/connect", { method: "POST", headers: { Authorization: `Bearer ${token}`, "content-type": "application/json" }, body: JSON.stringify({ provider }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error); window.location.assign(data.authorizationUrl); }
    catch (e) { setMessage(e instanceof Error ? e.message : "Connexion impossible"); setBusy(false); }
  };

  const generateAd = async () => {
    if (!user || objective.trim().length < 10) return; setBusy(true); setMessage("");
    try { const provider = connections[0]; if (!provider) throw new Error("Connectez d'abord un compte Ads."); const token = await user.getIdToken(); const response = await fetch("/api/ads/generate", { method: "POST", headers: { Authorization: `Bearer ${token}`, "content-type": "application/json" }, body: JSON.stringify({ objective, provider, accountId: "connected", destinationUrl: "https://gen3ia.com" }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error); setMessage(`Publicité générée. Validation humaine requise avant publication. Approbation: ${data.approvalId}`); }
    catch (e) { setMessage(e instanceof Error ? e.message : "Génération impossible"); } finally { setBusy(false); }
  };

  return <main className="min-h-screen bg-[#070a12] text-white p-5 md:p-8"><div className="mx-auto max-w-7xl">
    <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between"><div><div className="text-xs tracking-[.3em] text-violet-300">GEN3IA AI STUDIO</div><h1 className="mt-2 text-3xl font-bold">Studio d’agents IA</h1><p className="mt-2 text-white/60">Créez, équipez, testez et déployez des agents autonomes dans un environnement contrôlé.</p></div><div className="flex items-center gap-3"><Link href="/marketplace" className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10">Marketplace</Link><Link href="/live" className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10">Agent Live<span className="rounded-md border border-amber-400/30 bg-amber-400/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-amber-300">PC</span></Link><div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm">{user ? "Compte connecté" : "Connexion requise"}</div></div></header>
    <section className="grid gap-4 md:grid-cols-4 mb-6"><Stat title="Agents" value="Studio" note="Création & orchestration"/><Stat title="Mémoire" value={String(memoryCount)} note="Souvenirs persistants"/><Stat title="Stockage" value={String(fileCount)} note="Fichiers permanents"/><Stat title="Terminal" value="Agent-only" note="Sandbox isolée"/></section>
    <section className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
      <div className="rounded-3xl border border-white/10 bg-[#0d1220] p-6"><div className="flex items-center justify-between"><h2 className="text-xl font-semibold">Créer un agent</h2><span className="rounded-full bg-emerald-400/10 px-3 py-1 text-xs text-emerald-300">Sécurité active</span></div><p className="mt-2 text-sm text-white/55">Décrivez le résultat attendu. L’orchestrateur sélectionne les compétences et outils nécessaires.</p><textarea value={objective} onChange={e => setObjective(e.target.value)} placeholder="Ex. Analyse mon marché, prépare une campagne et propose les créations publicitaires…" className="mt-5 min-h-40 w-full resize-y rounded-2xl border border-white/10 bg-black/20 p-4 outline-none focus:border-violet-400/60"/><button disabled={busy || objective.trim().length < 10} onClick={generateAd} className="mt-4 rounded-xl bg-violet-600 px-5 py-3 font-semibold disabled:opacity-40">Lancer l’agent Ads</button>{message && <div className="mt-4 rounded-xl border border-violet-400/20 bg-violet-400/5 p-4 text-sm text-white/80">{message}</div>}</div>
      <div className="rounded-3xl border border-white/10 bg-[#0d1220] p-6"><h2 className="text-xl font-semibold">Connexions Ads</h2><p className="mt-2 text-sm text-white/55">Les jetons sont stockés chiffrés côté serveur. Une publication externe exige une validation humaine.</p><div className="mt-5 space-y-3">{(Object.keys(labels) as Provider[]).map(provider => <button key={provider} disabled={busy} onClick={() => connectAds(provider)} className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/[.03] p-4 text-left hover:bg-white/[.06]"><span>{labels[provider]}</span><span className={connections.includes(provider) ? "text-emerald-300 text-sm" : "text-violet-300 text-sm"}>{connections.includes(provider) ? "Connecté" : "Connecter"}</span></button>)}</div></div>
    </section>
    <section className="mt-5 grid gap-5 md:grid-cols-3"><Feature title="Terminal IA" text="Un terminal sandboxé réservé aux agents. Aucun accès direct utilisateur au shell d’exécution."/><Feature title="Mémoire permanente" text="Les agents peuvent mémoriser des informations utiles, avec protection contre les secrets et contrôle propriétaire."/><Feature title="Caméra & fichiers" text="La caméra fonctionne uniquement après autorisation explicite. Les captures et fichiers peuvent être conservés dans le stockage permanent."/></section>
    <section className="mt-5 grid gap-5 md:grid-cols-2"><Feature title="Agent Live (PC uniquement)" text="Un agent qui observe votre écran et pilote clavier/souris sur votre ordinateur, avec permissions granulaires et validation humaine. Réservé aux ordinateurs Windows, Linux et macOS."/><Feature title="Mobile — Android & iOS" text="Le Studio s’adapte automatiquement aux écrans tactiles et s’installe comme application depuis le navigateur. L’agent Live y reste volontairement indisponible."/></section>
    <footer className="mt-8 rounded-2xl border border-amber-400/15 bg-amber-400/5 p-4 text-xs text-amber-100/70">Les actions externes, dépenses publicitaires et opérations sensibles restent soumises aux politiques de sécurité et à une confirmation humaine. Les agents ne peuvent pas contourner ces contrôles.</footer>
  </div></main>;
}
function Stat({ title, value, note }: { title: string; value: string; note: string }) { return <div className="rounded-2xl border border-white/10 bg-[#0d1220] p-5"><div className="text-xs text-white/45">{title}</div><div className="mt-2 text-xl font-bold">{value}</div><div className="mt-1 text-xs text-white/45">{note}</div></div>; }
function Feature({ title, text }: { title: string; text: string }) { return <div className="rounded-2xl border border-white/10 bg-[#0d1220] p-5"><h3 className="font-semibold">{title}</h3><p className="mt-2 text-sm leading-6 text-white/55">{text}</p></div>; }
