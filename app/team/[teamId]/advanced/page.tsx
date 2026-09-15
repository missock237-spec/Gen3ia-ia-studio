'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/lib/firebase/auth-client';

export default function TeamAdvancedPage() {
  const { user } = useAuth(); const { teamId } = useParams() as { teamId: string };
  const [objective, setObjective] = useState(''); const [result, setResult] = useState<unknown>(null); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  async function call(path: string, body: unknown) {
    if (!user) { setError('Connexion requise'); return; }
    setBusy(true); setError(''); setResult(null);
    try { const token = await user.getIdToken(); const response = await fetch(`/api/team/${encodeURIComponent(teamId)}/${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(body) }); const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Erreur serveur'); setResult(data); }
    catch (e) { setError(e instanceof Error ? e.message : 'Erreur inconnue'); } finally { setBusy(false); }
  }
  return <main className="mx-auto max-w-5xl space-y-8 p-8">
    <header><p className="text-sm font-medium text-indigo-500">Espace équipe</p><h1 className="text-3xl font-bold">Intelligence d’équipe avancée</h1><p className="mt-2 text-gray-500">Coordination multi-agent, mémoire de travail optimisée et anticipation des échecs. Accès réservé aux membres de cette équipe.</p></header>
    <section className="space-y-4 rounded-xl border p-6"><h2 className="text-xl font-semibold">Coordination automatique</h2><textarea value={objective} onChange={(e) => setObjective(e.target.value)} placeholder="Objectif à exécuter par l’équipe d’agents…" className="min-h-32 w-full rounded-lg border p-3" maxLength={20000}/><button disabled={busy || !objective.trim()} onClick={() => call('orchestrator', { objective })} className="rounded-lg bg-black px-4 py-2 text-white disabled:opacity-50">Lancer la coordination</button></section>
    <section className="space-y-4 rounded-xl border p-6"><h2 className="text-xl font-semibold">Réduction de la charge cognitive</h2><p className="text-sm text-gray-500">Déduplication, priorisation et compression du contexte avant transmission aux agents.</p><button disabled={busy} onClick={() => call('memory', { objective, memories: [], recentMessages: [], decisions: [], constraints: [] })} className="rounded-lg border px-4 py-2 disabled:opacity-50">Optimiser le contexte</button></section>
    <section className="space-y-4 rounded-xl border p-6"><h2 className="text-xl font-semibold">Anticipation des échecs</h2><p className="text-sm text-gray-500">Détection préventive des risques liés aux effets de bord, retries, délais, réseau, terminal et actions à fort impact.</p><button disabled={busy} onClick={() => call('prediction', { steps: [{ id: 'team-objective', type: 'llm', timeoutMs: 120000, maxRetries: 2, sideEffect: false, requiresApproval: false }] })} className="rounded-lg border px-4 py-2 disabled:opacity-50">Analyser les risques</button></section>
    {error && <div className="rounded-lg border border-red-300 p-4 text-red-700">{error}</div>}{result && <pre className="max-h-[32rem] overflow-auto rounded-xl bg-gray-950 p-5 text-xs text-white">{JSON.stringify(result, null, 2)}</pre>}
  </main>;
}
