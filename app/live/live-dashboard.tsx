"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { onAuthStateChanged, type User } from "firebase/auth";

import { auth } from "@/lib/firebase/client";
import { authFetch, useSessionAvailable } from "@/lib/firebase/auth-client";

type Permission =
  | "screen.read"
  | "input.mouse"
  | "input.keyboard"
  | "files.read"
  | "files.write"
  | "browser.control";

const PERMISSION_LABELS: Record<Permission, string> = {
  "screen.read": "Observer l'écran",
  "input.mouse": "Contrôler la souris",
  "input.keyboard": "Contrôler le clavier",
  "files.read": "Lire les fichiers",
  "files.write": "Écrire des fichiers",
  "browser.control": "Contrôler le navigateur",
};

interface LiveSessionPublic {
  id: string;
  name: string;
  objective: string;
  status: string;
  permissions: Permission[];
  createdAt: number;
  expiresAt?: number;
  deviceId?: string;
}

interface CreatedSession {
  session: LiveSessionPublic;
  pairingToken: string;
  viewerToken: string;
}

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-400/10 text-amber-300 border-amber-400/25",
  connected: "bg-sky-400/10 text-sky-300 border-sky-400/25",
  running: "bg-emerald-400/10 text-emerald-300 border-emerald-400/25",
  paused: "bg-white/5 text-white/60 border-white/15",
  disconnected: "bg-white/5 text-white/60 border-white/15",
  stopped: "bg-white/5 text-white/60 border-white/15",
  failed: "bg-red-400/10 text-red-300 border-red-400/25",
};

function formatDate(ts: number) {
  return new Date(ts).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" });
}

export function LiveDashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [sessions, setSessions] = useState<LiveSessionPublic[]>([]);
  const [created, setCreated] = useState<CreatedSession | null>(null);
  const [name, setName] = useState("");
  const [objective, setObjective] = useState("");
  const [permissions, setPermissions] = useState<Permission[]>([
    "screen.read",
    "input.mouse",
    "input.keyboard",
  ]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [liveFrame, setLiveFrame] = useState<string | null>(null);
  const [viewerStatus, setViewerStatus] = useState<"offline" | "connecting" | "live">("offline");
  const sessionDisponible = useSessionAvailable();

  const loadSessions = useCallback(async () => {
    // authFetch : ID token Firebase si disponible, sinon cookie de session.
    const response = await authFetch("/api/live/sessions", { cache: "no-store" });
    if (response.ok) setSessions((await response.json()).sessions ?? []);
  }, []);

  useEffect(
    () =>
      onAuthStateChanged(auth, async (current) => {
        setUser(current);
        setAuthReady(true);
        await loadSessions();
      }),
    [loadSessions],
  );

  const togglePermission = (permission: Permission) => {
    setPermissions((current) =>
      current.includes(permission)
        ? current.filter((item) => item !== permission)
        : [...current, permission],
    );
  };

  const createSession = async () => {
    if (sessionDisponible === false) { setError("Session expirée. Reconnectez-vous."); return; }
    if (name.trim().length === 0 || objective.trim().length < 10 || permissions.length === 0) return;
    setBusy(true);
    setError("");
    setCreated(null);
    try {
      const response = await authFetch("/api/live/sessions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: name.trim(), objective: objective.trim(), permissions }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Création impossible");
      setCreated(data);
      await loadSessions();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Création impossible");
    } finally {
      setBusy(false);
    }
  };

  const stopSession = async (id: string) => {
    if (sessionDisponible === false) return;
    await authFetch(`/api/live/sessions/${id}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "stop" }),
    });
    await loadSessions();
  };

  useEffect(() => {
    if (!created?.viewerToken) return;
    const gateway = process.env.NEXT_PUBLIC_LIVE_GATEWAY_URL;
    if (!gateway) return;
    setViewerStatus("connecting");
    const socket = new WebSocket(gateway);
    socket.onopen = () => socket.send(JSON.stringify({ type: "viewer.hello", sessionId: created.session.id, viewerToken: created.viewerToken }));
    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as { type?: string; jpegBase64?: string };
        if (message.type === "viewer.ack") setViewerStatus("live");
        if (message.type === "frame" && message.jpegBase64) setLiveFrame("data:image/jpeg;base64," + message.jpegBase64);
      } catch {}
    };
    socket.onerror = () => setViewerStatus("offline");
    socket.onclose = () => setViewerStatus("offline");
    return () => socket.close();
  }, [created]);

  const copyPairing = async () => {
    if (!created) return;
    await navigator.clipboard.writeText(created.pairingToken);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!authReady || sessionDisponible === null) {
    return <div className="p-10 text-center text-white/50">Chargement…</div>;
  }

  if (sessionDisponible === false) {
    return (
      <div className="mx-auto max-w-md rounded-3xl border border-white/10 bg-[#0d1220] p-8 text-center">
        <h2 className="text-xl font-semibold">Connexion requise</h2>
        <p className="mt-2 text-sm text-white/60">
          Connectez-vous pour créer et piloter des sessions d’agent Live.
        </p>
        <Link href="/login" className="mt-6 inline-flex rounded-xl bg-violet-600 px-6 py-3 text-sm font-semibold hover:bg-violet-500">
          Se connecter
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
      <section className="rounded-3xl border border-white/10 bg-[#0d1220] p-6">
        <h2 className="text-xl font-semibold">Créer une session d’agent Live</h2>
        <p className="mt-2 text-sm text-white/55">
          Décrivez la mission. Le client PC se connectera à cette session avec
          le jeton d’appairage, partagera l’écran et exécutera les actions
          approuvées.
        </p>
        <label className="mt-5 block text-xs uppercase tracking-widest text-white/45">Nom de la session</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex. Préparer la présentation client"
          maxLength={120}
          className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm outline-none focus:border-violet-400/60"
        />
        <label className="mt-4 block text-xs uppercase tracking-widest text-white/45">Objectif</label>
        <textarea
          value={objective}
          onChange={(e) => setObjective(e.target.value)}
          placeholder="Ex. Ouvre le dossier du projet, vérifie les derniers chiffres et prépare le résumé dans le tableur…"
          className="mt-2 min-h-32 w-full resize-y rounded-xl border border-white/10 bg-black/20 p-4 text-sm outline-none focus:border-violet-400/60"
        />
        <div className="mt-4">
          <div className="text-xs uppercase tracking-widest text-white/45">Permissions accordées</div>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {(Object.keys(PERMISSION_LABELS) as Permission[]).map((permission) => (
              <button
                key={permission}
                onClick={() => togglePermission(permission)}
                className={`rounded-xl border px-4 py-2.5 text-left text-sm transition ${
                  permissions.includes(permission)
                    ? "border-violet-400/50 bg-violet-400/10 text-violet-200"
                    : "border-white/10 bg-white/[.03] text-white/55 hover:bg-white/[.06]"
                }`}
              >
                {PERMISSION_LABELS[permission]}
              </button>
            ))}
          </div>
        </div>
        <button
          disabled={busy || name.trim().length === 0 || objective.trim().length < 10 || permissions.length === 0}
          onClick={createSession}
          className="mt-5 rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold disabled:opacity-40"
        >
          {busy ? "Création…" : "Créer la session Live"}
        </button>
        {error && (
          <div className="mt-4 rounded-xl border border-red-400/25 bg-red-400/5 p-4 text-sm text-red-200">{error}</div>
        )}

        {created && (
          <div className="mt-5 rounded-2xl border border-emerald-400/25 bg-emerald-400/5 p-5">
            <div className="text-sm font-semibold text-emerald-300">Session créée — {created.session.name}</div>
            <div className="mt-1 text-xs text-white/50">ID : {created.session.id}</div>
            <div className="mt-4 text-xs uppercase tracking-widest text-white/45">Jeton d’appairage (affiché une seule fois)</div>
            <div className="mt-2 flex items-center gap-2">
              <code className="flex-1 overflow-x-auto rounded-xl border border-white/10 bg-black/40 px-4 py-3 font-mono text-sm text-emerald-200">
                {created.pairingToken}
              </code>
              <button onClick={copyPairing} className="rounded-xl border border-white/15 bg-white/[.04] px-4 py-3 text-xs font-semibold hover:bg-white/[.08]">
                {copied ? "Copié" : "Copier"}
              </button>
            </div>
            <p className="mt-3 text-xs leading-5 text-white/55">
              Configurez le client PC puis lancez-le sur l’ordinateur à piloter
              (voir les instructions à droite). La session expire au bout de 24 h
              si elle reste inactive.
            </p>
          </div>
        )}
      </section>

      <div className="space-y-5">        {created && (
          <section className="rounded-3xl border border-white/10 bg-[#0d1220] p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Écran en temps réel</h2>
                <p className="mt-1 text-xs text-white/45">Flux privé de la session active.</p>
              </div>
              <span className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] text-white/60">{viewerStatus === "live" ? "LIVE" : viewerStatus}</span>
            </div>
            <div className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-black aspect-video flex items-center justify-center">
              {liveFrame ? <img src={liveFrame} alt="Écran du PC contrôlé par Gen3ia Live" className="h-full w-full object-contain" /> : <span className="text-sm text-white/35">En attente du flux écran…</span>}
            </div>
            <p className="mt-3 text-xs leading-5 text-white/45">Le flux est accessible uniquement avec le jeton de visualisation de cette session. Il ne permet pas de prendre le contrôle du PC.</p>
          </section>
        )}

        <section className="rounded-3xl border border-white/10 bg-[#0d1220] p-6">
          <h2 className="text-lg font-semibold">Connecter un PC (client Live)</h2>
          <ol className="mt-4 space-y-3 text-sm leading-6 text-white/60">
            <li className="rounded-xl border border-white/10 bg-white/[.03] px-4 py-3">
              1. Téléchargez l’app Gen3ia Desktop (Windows / Linux) ou
              installez le client : <code className="font-mono text-xs text-violet-300">live-agent/</code>
            </li>
            <li className="rounded-xl border border-white/10 bg-white/[.03] px-4 py-3">
              2. Définissez les variables :
              <code className="mt-1 block overflow-x-auto whitespace-pre rounded-lg bg-black/40 p-2 font-mono text-[11px] text-emerald-200">
{`GEN3IA_LIVE_GATEWAY_URL=wss://votre-gateway
GEN3IA_LIVE_SESSION_ID=<id session>
GEN3IA_LIVE_PAIRING_TOKEN=<jeton>
GEN3IA_LIVE_DEVICE_ID=<nom du PC>`}
              </code>
            </li>
            <li className="rounded-xl border border-white/10 bg-white/[.03] px-4 py-3">
              3. Lancez le client : il partage l’écran et attend les actions
              approuvées.
            </li>
          </ol>
          <p className="mt-4 rounded-xl border border-amber-400/20 bg-amber-400/5 p-3 text-xs leading-5 text-amber-100/80">
            Chaque action sensible exige une validation humaine depuis cette
            page. Revoquez la session à tout moment avec « Stop ».
          </p>
        </section>

        <section className="rounded-3xl border border-white/10 bg-[#0d1220] p-6">
          <h2 className="text-lg font-semibold">Sessions récentes</h2>
          {sessions.length === 0 ? (
            <p className="mt-3 text-sm text-white/45">Aucune session pour le moment.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {sessions.map((session) => (
                <li key={session.id} className="rounded-xl border border-white/10 bg-white/[.03] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="truncate text-sm font-semibold">{session.name}</div>
                    <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] ${STATUS_STYLES[session.status] ?? STATUS_STYLES.paused}`}>
                      {session.status}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-white/40">{formatDate(session.createdAt)}</div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {session.permissions.map((permission) => (
                      <span key={permission} className="rounded-md bg-white/5 px-2 py-0.5 text-[10px] text-white/50">
                        {permission}
                      </span>
                    ))}
                  </div>
                  {["pending", "connected", "running", "paused"].includes(session.status) && (
                    <button
                      onClick={() => stopSession(session.id)}
                      className="mt-3 rounded-lg border border-red-400/25 bg-red-400/10 px-3 py-1.5 text-xs font-semibold text-red-200 hover:bg-red-400/20"
                    >
                      Stop
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
