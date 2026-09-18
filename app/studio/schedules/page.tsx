"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import { authFetch, useSessionAvailable } from "@/lib/firebase/auth-client";
import { PlatformTabs } from "@/components/nav/platform-tabs";

type Schedule = {
  id: string;
  agentId: string;
  name: string;
  objective: string;
  timezone: string;
  daysOfWeek: number[];
  startTime: string;
  endTime: string;
  intervalMinutes: number;
  enabled: boolean;
  lastExecutionStatus?: string;
};

const days = [
  [1, "Lun"], [2, "Mar"], [3, "Mer"], [4, "Jeu"], [5, "Ven"], [6, "Sam"], [0, "Dim"],
] as const;

function browserTimezone() {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"; }
  catch { return "UTC"; }
}

export default function AgentSchedulesPage() {
  const [user, setUser] = useState<User | null>(null);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [name, setName] = useState("");
  const [agentId, setAgentId] = useState("");
  const [objective, setObjective] = useState("");
  const [timezone, setTimezone] = useState("UTC");
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("18:00");
  const [intervalMinutes, setIntervalMinutes] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const sessionDisponible = useSessionAvailable();

  const load = async () => {
    // authFetch : ID token Firebase si disponible, sinon cookie de session.
    const response = await authFetch("/api/agents/schedules", { cache: "no-store" });
    if (!response.ok) throw new Error((await response.json()).error ?? "Chargement impossible");
    setSchedules((await response.json()).schedules ?? []);
  };

  useEffect(() => {
    // Differe d'un tick pour eviter un rendu en cascade synchrone (set-state-in-effect).
    const timer = setTimeout(() => setTimezone(browserTimezone()), 0);
    const unsubscribe = onAuthStateChanged(auth, async (current) => {
      setUser(current);
      try { await load(); } catch (error) { setMessage(error instanceof Error ? error.message : "Chargement impossible"); }
    });
    return () => { clearTimeout(timer); unsubscribe(); };
  }, []);

  const summary = useMemo(() => {
    const selected = days.filter(([value]) => selectedDays.includes(value)).map(([, label]) => label);
    return `${selected.join(", ")} · ${startTime} → ${endTime}`;
  }, [selectedDays, startTime, endTime]);

  const toggleDay = (day: number) => {
    setSelectedDays((current) => current.includes(day) ? current.filter((value) => value !== day) : [...current, day].sort());
  };

  const create = async () => {
    if (sessionDisponible === false) { setMessage("Session expirée. Reconnectez-vous."); return; }
    if (!name.trim() || !agentId.trim() || objective.trim().length < 3 || selectedDays.length === 0) return;
    setBusy(true); setMessage("");
    try {
      const response = await authFetch("/api/agents/schedules", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name, agentId, objective, timezone, daysOfWeek: selectedDays,
          startTime, endTime, intervalMinutes, enabled: true,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Création impossible");
      setSchedules((current) => [data.schedule, ...current]);
      setName(""); setAgentId(""); setObjective(""); setMessage("Planification enregistrée.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Création impossible"); }
    finally { setBusy(false); }
  };

  const toggle = async (schedule: Schedule) => {
    if (sessionDisponible === false) return;
    setBusy(true); setMessage("");
    try {
      const response = await authFetch(`/api/agents/schedules/${encodeURIComponent(schedule.id)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ enabled: !schedule.enabled }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Modification impossible");
      setSchedules((current) => current.map((item) => item.id === schedule.id ? data.schedule : item));
    } catch (error) { setMessage(error instanceof Error ? error.message : "Modification impossible"); }
    finally { setBusy(false); }
  };

  const remove = async (schedule: Schedule) => {
    if (sessionDisponible === false || !window.confirm(`Supprimer « ${schedule.name} » ?`)) return;
    setBusy(true); setMessage("");
    try {
      const response = await authFetch(`/api/agents/schedules/${encodeURIComponent(schedule.id)}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error((await response.json()).error ?? "Suppression impossible");
      setSchedules((current) => current.filter((item) => item.id !== schedule.id));
    } catch (error) { setMessage(error instanceof Error ? error.message : "Suppression impossible"); }
    finally { setBusy(false); }
  };

  return (
    <main className="min-h-screen bg-[#070a12] p-5 text-white md:p-8">
      <div className="mx-auto max-w-6xl">
        <PlatformTabs />
        <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="text-xs tracking-[.3em] text-violet-300">GEN3IA · AUTOMATION</div>
            <h1 className="mt-2 text-3xl font-bold">Planification des agents</h1>
            <p className="mt-2 max-w-2xl text-white/55">Définissez les jours et la fenêtre horaire pendant lesquels un agent peut être activé automatiquement. Le serveur applique la fenêtre et le fuseau horaire, même si l’utilisateur ferme l’application.</p>
          </div>
          <Link href="/studio" className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10">← Retour au Studio</Link>
        </header>

        <section className="grid gap-5 lg:grid-cols-[1.15fr_.85fr]">
          <div className="rounded-3xl border border-white/10 bg-[#0d1220] p-6">
            <div className="flex items-center justify-between"><h2 className="text-xl font-semibold">Nouvelle planification</h2><span className="rounded-full bg-emerald-400/10 px-3 py-1 text-xs text-emerald-300">Fuseau serveur contrôlé</span></div>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <label className="text-sm text-white/65">Nom<input value={name} onChange={(e) => setName(e.target.value)} placeholder="Agent du matin" className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 p-3 text-white outline-none focus:border-violet-400/60" /></label>
              <label className="text-sm text-white/65">ID de l’agent<input value={agentId} onChange={(e) => setAgentId(e.target.value)} placeholder="agent_..." className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 p-3 text-white outline-none focus:border-violet-400/60" /></label>
            </div>
            <label className="mt-4 block text-sm text-white/65">Objectif<textarea value={objective} onChange={(e) => setObjective(e.target.value)} placeholder="Ex. Surveille les nouveautés de mon secteur et prépare un rapport." className="mt-2 min-h-28 w-full resize-y rounded-xl border border-white/10 bg-black/20 p-3 text-white outline-none focus:border-violet-400/60" /></label>
            <div className="mt-5"><div className="text-sm text-white/65">Jours actifs</div><div className="mt-2 flex flex-wrap gap-2">{days.map(([value, label]) => <button type="button" key={value} onClick={() => toggleDay(value)} className={`rounded-xl border px-3 py-2 text-sm ${selectedDays.includes(value) ? "border-violet-400/50 bg-violet-500/20 text-violet-100" : "border-white/10 bg-white/[.03] text-white/50"}`}>{label}</button>)}</div></div>
            <div className="mt-5 grid gap-4 md:grid-cols-3">
              <label className="text-sm text-white/65">Activation<input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 p-3 text-white" /></label>
              <label className="text-sm text-white/65">Arrêt<input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 p-3 text-white" /></label>
              <label className="text-sm text-white/65">Répétition<input type="number" min={0} max={1440} value={intervalMinutes} onChange={(e) => setIntervalMinutes(Math.max(0, Math.min(1440, Number(e.target.value) || 0)))} className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 p-3 text-white" /><span className="mt-1 block text-xs text-white/35">0 = une activation au début de la fenêtre</span></label>
            </div>
            <label className="mt-4 block text-sm text-white/65">Fuseau horaire<input value={timezone} onChange={(e) => setTimezone(e.target.value)} placeholder="Africa/Douala" className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 p-3 text-white" /></label>
            <div className="mt-4 rounded-xl border border-white/10 bg-white/[.03] p-3 text-sm text-white/60">{summary} · {timezone}</div>
            <button disabled={busy || !user || !name.trim() || !agentId.trim() || objective.trim().length < 3 || selectedDays.length === 0} onClick={create} className="mt-4 w-full rounded-xl bg-violet-600 px-5 py-3 font-semibold disabled:opacity-40">Enregistrer la planification</button>
            {message && <div className="mt-4 rounded-xl border border-violet-400/20 bg-violet-400/5 p-3 text-sm text-white/75">{message}</div>}
          </div>

          <div className="rounded-3xl border border-white/10 bg-[#0d1220] p-6">
            <h2 className="text-xl font-semibold">Vos planifications</h2>
            <p className="mt-2 text-sm text-white/45">La planification est stockée dans Firestore et traitée côté serveur.</p>
            <div className="mt-5 space-y-3">
              {schedules.length === 0 ? <div className="rounded-2xl border border-dashed border-white/10 p-6 text-center text-sm text-white/40">Aucune planification.</div> : schedules.map((schedule) => <article key={schedule.id} className="rounded-2xl border border-white/10 bg-white/[.025] p-4"><div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold">{schedule.name}</h3><p className="mt-1 text-xs text-white/40">{schedule.agentId}</p></div><span className={`rounded-full px-2 py-1 text-[10px] uppercase ${schedule.enabled ? "bg-emerald-400/10 text-emerald-300" : "bg-white/10 text-white/40"}`}>{schedule.enabled ? "active" : "pause"}</span></div><p className="mt-3 line-clamp-2 text-sm text-white/55">{schedule.objective}</p><div className="mt-3 text-xs text-white/45">{days.filter(([value]) => schedule.daysOfWeek.includes(value)).map(([, label]) => label).join(" · ")} · {schedule.startTime} → {schedule.endTime}</div><div className="mt-1 text-xs text-white/35">{schedule.timezone}{schedule.intervalMinutes ? ` · toutes les ${schedule.intervalMinutes} min` : " · au début de la fenêtre"}</div><div className="mt-4 flex gap-2"><button disabled={busy} onClick={() => toggle(schedule)} className="rounded-lg border border-white/10 px-3 py-2 text-xs hover:bg-white/10">{schedule.enabled ? "Mettre en pause" : "Activer"}</button><button disabled={busy} onClick={() => remove(schedule)} className="rounded-lg border border-red-400/20 px-3 py-2 text-xs text-red-300 hover:bg-red-400/10">Supprimer</button></div></article>)}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
