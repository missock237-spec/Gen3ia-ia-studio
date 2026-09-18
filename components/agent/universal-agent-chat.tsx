"use client";

import { FormEvent, useState } from "react";

type Plan = {
  executionId: string;
  objective: string;
  steps: Array<{ id: string; type: string; toolName?: string; requiresApproval?: boolean; sideEffect?: boolean }>;
  maxIterations: number;
};

export function UniversalAgentChat() {
  const [message, setMessage] = useState("");
  const [plan, setPlan] = useState<Plan | null>(null);
  const [reply, setReply] = useState("Décrivez simplement ce que vous voulez faire.");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!message.trim() || loading) return;
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/agent/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Impossible de lancer l'agent.");
      setPlan(data.plan);
      setReply("Plan créé. Les étapes sensibles restent soumises aux permissions et confirmations prévues par Gen3ia.");
      setMessage("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur de l'agent.");
    } finally { setLoading(false); }
  }

  return (
    <section className="rounded-3xl border border-white/10 bg-[#0d1220] p-4 shadow-2xl">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="text-[11px] font-semibold tracking-[.25em] text-violet-300">GEN3IA AGENT</div>
          <h2 className="mt-1 text-xl font-semibold text-white">Que voulez-vous que votre agent fasse ?</h2>
        </div>
        <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs text-emerald-300">Agent actif</span>
      </div>

      <div className="min-h-20 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/70">{reply}</div>

      {plan && (
        <div className="mt-4 rounded-2xl border border-violet-400/20 bg-violet-400/5 p-4">
          <div className="flex items-center justify-between text-xs text-white/50">
            <span>Exécution {plan.executionId}</span><span>{plan.steps.length} étape(s)</span>
          </div>
          <div className="mt-3 space-y-2">
            {plan.steps.map((step, index) => (
              <div key={step.id} className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 p-3 text-sm">
                <span className="text-white/40">{index + 1}</span>
                <span className="text-white">{step.toolName || step.type}</span>
                {step.requiresApproval && <span className="ml-auto text-xs text-amber-300">Confirmation</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={submit} className="mt-4 flex gap-2">
        <input
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          maxLength={20000}
          placeholder="Ex. : analyse mes fichiers, crée un rapport et prépare un ZIP"
          className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-violet-400/50"
        />
        <button disabled={loading || !message.trim()} className="rounded-2xl bg-violet-500 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">
          {loading ? "Analyse…" : "Exécuter"}
        </button>
      </form>
      {error && <p className="mt-3 text-sm text-red-300">{error}</p>}
    </section>
  );
}
