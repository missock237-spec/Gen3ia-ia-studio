"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { onAuthStateChanged, type User } from "firebase/auth";

import { auth } from "@/lib/firebase/client";

interface DeveloperExtension {
  id: string;
  name: string;
  description: string;
  category: string;
  status: string;
  latestVersion: string | null;
  approvedVersion: string | null;
  permissions: string[];
  pricing: { model: string };
  stats: { installs: number; ratingCount: number; executions: number };
  rating: number | null;
}

interface RevenueSummary {
  totalGrossMinor: number;
  totalFeeMinor: number;
  totalNetMinor: number;
  currency: string;
  entries: number;
}

interface ApiKeyEntry {
  prefix: string;
  name: string;
  status: string;
  createdAt: number;
}

const MANIFEST_TEMPLATE = `{
  "id": "mon-extension",
  "name": "Mon Extension",
  "version": "1.0.0",
  "author": "rempli-automatiquement",
  "description": "Ce que fait mon extension pour les agents Gen3ia.",
  "category": "productivity",
  "tags": ["exemple"],
  "permissions": ["http.fetch:api.exemple.com"],
  "secrets": { "api_key": { "description": "Clé API du service externe" } },
  "tools": [
    {
      "id": "exemple-appel",
      "name": "Appel exemple",
      "description": "Interroge l'API externe.",
      "inputSchema": { "query": { "type": "string", "required": true, "maxLength": 200 } },
      "outputSchema": { "result": { "type": "string" } },
      "endpoint": {
        "method": "GET",
        "url": "https://api.exemple.com/v1/search?q={{input.query}}",
        "headers": [{ "name": "Authorization", "value": "Bearer {{secret.api_key}}" }],
        "timeoutMs": 8000
      }
    }
  ],
  "skills": [],
  "workflows": [],
  "settings": [],
  "pricing": { "model": "free", "maxExecutionsPerDay": 100 }
}`;

export default function DeveloperPage() {
  const [user, setUser] = useState<User | null>(null);
  const [extensions, setExtensions] = useState<DeveloperExtension[]>([]);
  const [revenue, setRevenue] = useState<RevenueSummary | null>(null);
  const [apiKeys, setApiKeys] = useState<ApiKeyEntry[]>([]);
  const [manifest, setManifest] = useState(MANIFEST_TEMPLATE);
  const [newKey, setNewKey] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [logs, setLogs] = useState<Array<Record<string, unknown>>>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const authedFetch = useCallback(async (path: string, init?: RequestInit) => {
    const token = await (user as User).getIdToken();
    return fetch(path, {
      ...init,
      headers: { Authorization: `Bearer ${token}`, "content-type": "application/json", ...(init?.headers ?? {}) },
    });
  }, [user]);

  const loadAll = useCallback(async () => {
    if (!user) return;
    const [extensionsRes, revenueRes, keysRes] = await Promise.all([
      authedFetch("/api/developer/extensions"),
      authedFetch("/api/developer/revenue"),
      authedFetch("/api/developer/api-keys"),
    ]);
    if (extensionsRes.ok) setExtensions((await extensionsRes.json()).extensions ?? []);
    if (revenueRes.ok) setRevenue((await revenueRes.json()).revenue ?? null);
    if (keysRes.ok) setApiKeys((await keysRes.json()).keys ?? []);
  }, [authedFetch, user]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (current) => {
      setUser(current);
      if (current) void loadAll();
    });
    return () => unsubscribe();
  }, [loadAll]);

  const createExtension = async () => {
    setBusy(true);
    setMessage("");
    try {
      const parsed = JSON.parse(manifest);
      const response = await authedFetch("/api/extensions", { method: "POST", body: JSON.stringify({ manifest: parsed }) });
      const data = await response.json();
      if (!response.ok) throw new Error([data.error, ...(data.details ?? [])].filter(Boolean).join(" — "));
      setMessage(`Extension « ${data.extension.id} » créée (v${data.extension.latestVersion}). Soumettez-la après tests.`);
      await loadAll();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Création impossible");
    } finally {
      setBusy(false);
    }
  };

  const submit = async (extensionId: string, version: string | null) => {
    if (!version) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await authedFetch(`/api/extensions/${extensionId}/submit`, { method: "POST", body: JSON.stringify({ version }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setMessage(`Version ${version} soumise à la modération.`);
      await loadAll();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Soumission impossible");
    } finally {
      setBusy(false);
    }
  };

  const createApiKey = async () => {
    setBusy(true);
    try {
      const response = await authedFetch("/api/developer/api-keys", { method: "POST", body: JSON.stringify({ name: "SDK" }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setNewKey(data.key);
      await loadAll();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Création de clé impossible");
    } finally {
      setBusy(false);
    }
  };

  const loadLogs = async (extensionId: string) => {
    setSelected(extensionId);
    const response = await authedFetch(`/api/extensions/${extensionId}/executions?limit=30`);
    if (response.ok) setLogs((await response.json()).executions ?? []);
  };

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#070a12] p-6 text-white">
        <div className="max-w-md rounded-3xl border border-white/10 bg-[#0d1220] p-8 text-center">
          <h1 className="text-xl font-bold">Espace développeur</h1>
          <p className="mt-2 text-sm text-white/60">Connectez-vous pour créer et publier des extensions Gen3ia.</p>
          <Link href="/login" className="mt-6 inline-flex rounded-xl bg-violet-600 px-6 py-3 text-sm font-semibold">Se connecter</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#070a12] text-white p-5 md:p-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-xs tracking-[.3em] text-violet-300">GEN3IA DEVELOPER STUDIO</div>
            <h1 className="mt-2 text-3xl font-bold">Mes extensions</h1>
            <p className="mt-2 text-white/60">Créez, testez, soumettez et monétisez vos extensions.</p>
          </div>
          <div className="flex gap-3">
            <Link href="/marketplace" className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10">Marketplace</Link>
            <Link href="/studio" className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10">Studio</Link>
          </div>
        </header>

        {message && <div className="mb-5 rounded-xl border border-violet-400/20 bg-violet-400/5 p-4 text-sm text-white/80">{message}</div>}

        <section className="mb-8 grid gap-4 md:grid-cols-4">
          <Stat title="Extensions" value={String(extensions.length)} />
          <Stat title="Installations" value={String(extensions.reduce((total, extension) => total + extension.stats.installs, 0))} />
          <Stat title="Exécutions" value={String(extensions.reduce((total, extension) => total + extension.stats.executions, 0))} />
          <Stat title="Revenus nets" value={revenue ? `${(revenue.totalNetMinor / 100).toLocaleString("fr-FR")} ${revenue.currency}` : "—"} />
        </section>

        <section className="mb-8 grid gap-5 lg:grid-cols-[1.3fr_1fr]">
          <div className="rounded-3xl border border-white/10 bg-[#0d1220] p-6">
            <h2 className="text-xl font-semibold">Créer une extension (manifest)</h2>
            <p className="mt-2 text-sm text-white/55">
              Le manifest déclare tools, skills, workflows, permissions, secrets et prix.
              Il est validé côté serveur à chaque étape. Aucun code tiers n’est exécuté :
              les tools sont des connecteurs HTTPS déclaratifs.
            </p>
            <textarea
              value={manifest}
              onChange={(event) => setManifest(event.target.value)}
              className="mt-4 min-h-80 w-full resize-y rounded-2xl border border-white/10 bg-black/30 p-4 font-mono text-xs leading-5 outline-none focus:border-violet-400/60"
              spellCheck={false}
            />
            <button disabled={busy} onClick={createExtension} className="mt-4 rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold disabled:opacity-40">
              Créer l’extension
            </button>
          </div>

          <div className="space-y-5">
            <div className="rounded-3xl border border-white/10 bg-[#0d1220] p-6">
              <h2 className="text-lg font-semibold">Clés SDK / API</h2>
              <p className="mt-1 text-xs text-white/45">Authentifie l’API développeur depuis vos outils CI (`Authorization: Bearer g3x_…`).</p>
              {newKey && (
                <div className="mt-3 rounded-xl border border-emerald-400/25 bg-emerald-400/5 p-3">
                  <div className="text-xs text-emerald-300">Nouvelle clé (affichée une seule fois) :</div>
                  <code className="mt-1 block overflow-x-auto font-mono text-xs text-emerald-200">{newKey}</code>
                </div>
              )}
              <button disabled={busy} onClick={createApiKey} className="mt-3 rounded-xl border border-white/15 bg-white/[.04] px-4 py-2.5 text-sm font-semibold hover:bg-white/[.08]">Générer une clé</button>
              <ul className="mt-4 space-y-2 text-xs text-white/50">
                {apiKeys.map((key, index) => (
                  <li key={index} className="flex items-center justify-between rounded-lg bg-white/[.03] px-3 py-2">
                    <span className="font-mono">{key.prefix}…</span>
                    <span>{key.status}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-3xl border border-white/10 bg-[#0d1220] p-6">
              <h2 className="text-lg font-semibold">Revenus</h2>
              {revenue ? (
                <div className="mt-3 space-y-1 text-sm text-white/65">
                  <div>Brut : {(revenue.totalGrossMinor / 100).toLocaleString("fr-FR")} {revenue.currency}</div>
                  <div>Commission plateforme : {(revenue.totalFeeMinor / 100).toLocaleString("fr-FR")} {revenue.currency}</div>
                  <div className="font-semibold text-emerald-300">Net : {(revenue.totalNetMinor / 100).toLocaleString("fr-FR")} {revenue.currency}</div>
                  <p className="mt-2 text-xs text-white/40">{revenue.entries} transactions vérifiées (wallet/Chariow).</p>
                </div>
              ) : (
                <p className="mt-2 text-sm text-white/40">Aucun revenu pour le moment.</p>
              )}
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Mes extensions publiées</h2>
          {extensions.length === 0 && <p className="text-sm text-white/40">Aucune extension — créez la première ci-dessus.</p>}
          {extensions.map((extension) => (
            <div key={extension.id} className="rounded-3xl border border-white/10 bg-[#0d1220] p-5">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{extension.name}</h3>
                    <span className={`rounded-full px-2.5 py-0.5 text-[11px] ${
                      extension.status === "approved" ? "bg-emerald-400/10 text-emerald-300" :
                      extension.status === "pending" ? "bg-amber-400/10 text-amber-300" :
                      extension.status === "rejected" || extension.status === "suspended" ? "bg-red-400/10 text-red-300" :
                      "bg-white/5 text-white/50"
                    }`}>{extension.status}</span>
                  </div>
                  <p className="mt-1 text-xs text-white/45">
                    {extension.id} · v{extension.latestVersion} · {extension.stats.installs} install. · {extension.stats.executions} exéc.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => void loadLogs(extension.id)} className="rounded-lg border border-white/15 bg-white/[.04] px-3 py-2 text-xs font-semibold hover:bg-white/[.08]">Logs</button>
                  <button disabled={busy || extension.status === "approved"} onClick={() => submit(extension.id, extension.latestVersion)} className="rounded-lg bg-violet-600 px-3 py-2 text-xs font-semibold disabled:opacity-40">Soumettre v{extension.latestVersion}</button>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {extension.permissions.map((permission) => (
                  <span key={permission} className="rounded-md bg-white/5 px-2 py-0.5 font-mono text-[10px] text-white/45">{permission}</span>
                ))}
              </div>
              {selected === extension.id && (
                <div className="mt-4 rounded-xl border border-white/10 bg-black/25 p-4">
                  <div className="text-xs uppercase tracking-widest text-white/40">Dernières exécutions</div>
                  <ul className="mt-2 space-y-1 font-mono text-[11px] text-white/55">
                    {logs.map((log, index) => (
                      <li key={index}>
                        {String(log.createdAt ? new Date(Number(log.createdAt)).toLocaleString("fr-FR") : "")} · {String(log.toolId)} · {String(log.status)} · {String(log.durationMs)}ms{log.error ? ` · ${String(log.error).slice(0, 120)}` : ""}
                      </li>
                    ))}
                    {logs.length === 0 && <li>Aucune exécution enregistrée.</li>}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}

function Stat({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0d1220] p-5">
      <div className="text-xs text-white/45">{title}</div>
      <div className="mt-2 text-xl font-bold">{value}</div>
    </div>
  );
}
