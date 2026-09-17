'use client';

import { useCallback, useState } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/lib/firebase/auth-client';
import { FeatureAuthGate } from '@/components/auth/feature-auth-gate';

const MAX_OBJECTIVE_LENGTH = 20000;
const ALLOWED_PATHS = new Set(['orchestrator', 'memory', 'prediction']);
type AdvancedPath = 'orchestrator' | 'memory' | 'prediction';

export default function TeamAdvancedPage() {
  const { user, loading } = useAuth();
  const params = useParams<{ teamId: string }>();
  const teamId = typeof params?.teamId === 'string' ? params.teamId.trim() : '';
  const [objective, setObjective] = useState(''); const [result, setResult] = useState<unknown>(null); const [busy, setBusy] = useState(false); const [error, setError] = useState('');

  const call = useCallback(async (path: AdvancedPath, body: Record<string, unknown>) => {
    if (!user) { setError('Connexion requise'); return; }
    if (!teamId || teamId.length > 200 || /[/.#\[\]\\]/.test(teamId) || !ALLOWED_PATHS.has(path)) { setError('Contexte d’équipe invalide'); return; }
    setBusy(true); setError(''); setResult(null); const controller = new AbortController(); const timeout = window.setTimeout(() => controller.abort(), 60_000);
    try {
      const token = await user.getIdToken(); if (!token) throw new Error('Session d’authentification invalide');
      const response = await fetch(`/api/team/${encodeURIComponent(teamId)}/${path}`, { method:'POST', headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`}, body:JSON.stringify(body), signal:controller.signal, credentials:'same-origin' });
      const contentType=response.headers.get('content-type')??''; const data:unknown=contentType.includes('application/json')?await response.json():{error:await response.text()};
      if(!response.ok){const message=typeof data==='object'&&data!==null&&'error'in data&&typeof data.error==='string'?data.error:'Erreur serveur';throw new Error(message);} setResult(data);
    } catch(e){setError(e instanceof DOMException&&e.name==='AbortError'?'La requête a expiré. Réessayez.':e instanceof Error?e.message:'Erreur inconnue');} finally{window.clearTimeout(timeout);setBusy(false);}
  },[teamId,user]);

  if (loading || !user) return <FeatureAuthGate feature="Studio d’équipe Gen3ia" description="Connectez-vous pour accéder à la coordination multi-agent, à la mémoire d’équipe et à l’analyse préventive des risques."><span/></FeatureAuthGate>;
  const safeObjective=objective.trim().slice(0,MAX_OBJECTIVE_LENGTH);
  return <main className="mx-auto max-w-5xl space-y-8 p-8"><header><p className="text-sm font-medium text-indigo-500">Espace équipe</p><h1 className="text-3xl font-bold">Intelligence d’équipe avancée</h1><p className="mt-2 text-gray-500">Coordination multi-agent, mémoire de travail optimisée et anticipation des échecs. L’accès aux opérations est réservé aux membres authentifiés de cette équipe.</p></header>
    <section className="space-y-4 rounded-xl border p-6"><h2 className="text-xl font-semibold">Coordination automatique</h2><textarea value={objective} onChange={e=>setObjective(e.target.value.slice(0,MAX_OBJECTIVE_LENGTH))} placeholder="Objectif à exécuter par l’équipe d’agents…" className="min-h-32 w-full rounded-lg border p-3" maxLength={MAX_OBJECTIVE_LENGTH}/><button disabled={busy||!safeObjective} onClick={()=>void call('orchestrator',{objective:safeObjective})} className="rounded-lg bg-black px-4 py-2 text-white disabled:opacity-50">{busy?'Exécution…':'Lancer la coordination'}</button></section>
    <section className="space-y-4 rounded-xl border p-6"><h2 className="text-xl font-semibold">Réduction de la charge cognitive</h2><p className="text-sm text-gray-500">Déduplication, priorisation et compression du contexte avant transmission aux agents.</p><button disabled={busy} onClick={()=>void call('memory',{objective:safeObjective,memories:[],recentMessages:[],decisions:[],constraints:[]})} className="rounded-lg border px-4 py-2 disabled:opacity-50">Optimiser le contexte</button></section>
    <section className="space-y-4 rounded-xl border p-6"><h2 className="text-xl font-semibold">Anticipation des échecs</h2><p className="text-sm text-gray-500">Détection préventive des risques liés aux effets de bord, retries, délais, réseau, terminal et actions à fort impact.</p><button disabled={busy} onClick={()=>void call('prediction',{steps:[{id:'team-objective',type:'llm',timeoutMs:120000,maxRetries:2,sideEffect:false,requiresApproval:false}]})} className="rounded-lg border px-4 py-2 disabled:opacity-50">Analyser les risques</button></section>
    {error&&<div role="alert" className="rounded-lg border border-red-300 p-4 text-red-700">{error}</div>}{result!==null&&<pre className="max-h-[32rem] overflow-auto rounded-xl bg-gray-950 p-5 text-xs text-white">{JSON.stringify(result,null,2)}</pre>}
  </main>;
}
