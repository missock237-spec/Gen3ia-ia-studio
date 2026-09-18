"use client";

import { FormEvent, useMemo, useState } from "react";

type AgentStep = {
  id: string;
  type: string;
  name?: string;
  description?: string;
  toolName?: string;
  requiresApproval?: boolean;
  sideEffect?: boolean;
  status?: string;
};

type Approval = {
  id: string;
  toolSlug: string;
  reason: string;
  status: string;
  expiresAt: number;
  stepId?: string;
};

type AgentResult = {
  mode: "agent";
  status: string;
  executionId: string;
  objective: string;
  plan: { steps: AgentStep[]; maxIterations: number };
  observations?: Array<{ stepId: string; success: boolean; error?: string; latencyMs: number }>;
  outputs?: Record<string, unknown>;
  approvals?: Approval[];
  billing?: { totalChargeMinor: number; totalProviderCostEur: number };
  error?: string;
  finalText?: string;
};

type Message = {
  id: string;
  role: "user" | "agent";
  text: string;
  result?: AgentResult;
};

const CAPABILITIES = [
  ["web.search", "Recherche web"],
  ["web.open", "Pages web"],
  ["file.read", "Fichiers"],
  ["zip.analyze", "ZIP"],
  ["artifact.create", "Documents"],
  ["code.execute", "Code isolé"],
  ["memory.read", "Mémoire"],
  ["composio.execute", "Apps externes"],
  ["camera.capture", "Caméra"],
  ["file.create", "Création de fichiers"],
  ["voice.speak", "Voix IA"],
  ["github.create_repository", "GitHub"],
] as const;

function statusLabel(status?: string) {
  switch (status) {
    case "completed": return "Terminé";
    case "running": return "En cours";
    case "waiting_approval": return "Confirmation requise";
    case "failed": return "Échec";
    case "cancelled": return "Annulé";
    default: return status ?? "En attente";
  }
}

export function UniversalAgentChat() {
  const [message, setMessage] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [active, setActive] = useState<AgentResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const progress = useMemo(() => {
    if (!active?.plan.steps.length) return 0;
    const done = active.plan.steps.filter((step) => step.status === "completed" || step.status === "skipped").length;
    return Math.round((done / active.plan.steps.length) * 100);
  }, [active]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const objective = message.trim();
    if (!objective || loading) return;

    setLoading(true);
    setError("");
    setMessages((items) => [...items, { id: crypto.randomUUID(), role: "user", text: objective }]);
    setMessage("");

    try {
      const response = await fetch("/api/agent/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: objective, ...(conversationId ? { conversationId } : {}) }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Impossible de lancer l'agent.");

      const result = data as AgentResult;
      if ((data as { conversationId?: string }).conversationId) setConversationId((data as { conversationId: string }).conversationId);
      setActive(result);
      setMessages((items) => [...items, {
        id: crypto.randomUUID(),
        role: "agent",
        text: result.status === "waiting_approval"
          ? "J’ai préparé le plan. Certaines actions nécessitent votre confirmation avant exécution."
          : result.status === "completed"
            ? "Exécution terminée. Je vous affiche les résultats et les étapes réellement exécutées."
            : "Plan préparé et exécution en cours.",
        result,
      }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur de l’agent.");
    } finally {
      setLoading(false);
    }
  }

  async function approve(approvalId: string) {
    if (loading) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/agent/chat/approve", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ approvalId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Approbation impossible.");
      const result = data as AgentResult;
      setActive(result);
      setMessages((items) => [...items, {
        id: crypto.randomUUID(),
        role: "agent",
        text: result.status === "waiting_approval"
          ? "Une autre confirmation est encore nécessaire."
          : result.status === "completed"
            ? "Toutes les actions autorisées ont été exécutées et vérifiées."
            : "L’exécution a été mise à jour.",
        result,
      }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur pendant l’approbation.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="overflow-hidden rounded-3xl border border-white/10 bg-[#0b0f1a] shadow-2xl">
      <div className="grid min-h-[720px] lg:grid-cols-[220px_minmax(0,1fr)_300px]">
        <aside className="hidden border-r border-white/10 bg-black/10 p-4 lg:block">
          <div className="text-[10px] font-bold tracking-[.28em] text-violet-300">AGENT CORE</div>
          <div className="mt-3 rounded-2xl border border-emerald-400/20 bg-emerald-400/5 p-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              Agent autonome
            </div>
            <p className="mt-2 text-[11px] leading-5 text-white/45">Planification, outils, sécurité, approbations et vérification.</p>
          </div>

          <div className="mt-5 text-[10px] font-semibold uppercase tracking-[.2em] text-white/35">Capacités</div>
          <div className="mt-2 space-y-1.5">
            {CAPABILITIES.map(([id, label]) => (
              <div key={id} className="rounded-lg px-2 py-1.5 text-xs text-white/60 hover:bg-white/[.04]">
                <span className="mr-2 text-violet-300">•</span>{label}
              </div>
            ))}
          </div>
        </aside>

        <div className="flex min-w-0 flex-col">
          <header className="flex items-center justify-between border-b border-white/10 px-4 py-3 md:px-5">
            <div>
              <div className="text-[10px] font-bold tracking-[.25em] text-violet-300">GEN3IA AGENT</div>
              <h2 className="mt-1 text-base font-semibold">Votre espace d’exécution</h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full border border-violet-400/20 bg-violet-400/10 px-2.5 py-1 text-[10px] text-violet-200">PLAN → ACT → VERIFY</span>
              <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-[10px] text-emerald-300">Sécurisé</span>
            </div>
          </header>

          <div className="flex-1 space-y-4 overflow-y-auto p-4 md:p-5">
            {messages.length === 0 && (
              <div className="flex min-h-[430px] items-center justify-center">
                <div className="max-w-xl text-center">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-violet-400/20 bg-violet-400/10 text-2xl">✦</div>
                  <h3 className="mt-5 text-2xl font-bold">Que voulez-vous que l’agent fasse ?</h3>
                  <p className="mt-3 text-sm leading-6 text-white/50">Décrivez un objectif en langage naturel. Gen3ia choisit les capacités disponibles, construit un plan, exécute les étapes autorisées et demande votre confirmation avant les actions sensibles.</p>
                  <div className="mt-5 flex flex-wrap justify-center gap-2">
                    {["Analyse mes fichiers", "Recherche sur le web", "Crée un rapport", "Analyse un ZIP"].map((item) => (
                      <button key={item} type="button" onClick={() => setMessage(item)} className="rounded-full border border-white/10 bg-white/[.03] px-3 py-2 text-xs text-white/60 hover:border-violet-400/30 hover:text-white">{item}</button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {messages.map((item) => (
              <div key={item.id} className={item.role === "user" ? "ml-auto max-w-[88%]" : "mr-auto max-w-[94%]"}>
                <div className={item.role === "user"
                  ? "rounded-2xl rounded-br-md bg-violet-600 px-4 py-3 text-sm text-white"
                  : "rounded-2xl rounded-bl-md border border-white/10 bg-white/[.03] px-4 py-3 text-sm text-white/80"}>
                  {item.text}
                </div>
              </div>
            ))}

            {active && (
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-[10px] uppercase tracking-[.2em] text-white/35">Exécution</div>
                    <div className="mt-1 font-mono text-xs text-white/60">{active.executionId}</div>
                  </div>
                  <span className="rounded-full border border-white/10 bg-white/[.04] px-3 py-1 text-xs text-white/70">{statusLabel(active.status)}</span>
                </div>

                <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-violet-500 transition-all" style={{ width: `${progress}%` }} />
                </div>

                <div className="mt-4 space-y-2">
                  {active.plan.steps.map((step, index) => (
                    <div key={step.id} className="rounded-xl border border-white/10 bg-white/[.02] p-3">
                      <div className="flex items-center gap-3">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/[.06] text-[10px] text-white/50">{index + 1}</span>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm text-white">{step.name || step.toolName || step.type}</div>
                          <div className="mt-0.5 text-[11px] text-white/35">{step.toolName || step.type}</div>
                        </div>
                        <span className={step.status === "completed" ? "text-xs text-emerald-300" : step.status === "failed" ? "text-xs text-red-300" : step.requiresApproval ? "text-xs text-amber-300" : "text-xs text-white/35"}>
                          {step.status === "completed" ? "✓" : step.status === "failed" ? "Échec" : step.requiresApproval ? "Confirmation" : statusLabel(step.status)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {active.approvals?.some((approval) => approval.status === "pending") && (
                  <div className="mt-4 rounded-xl border border-amber-400/20 bg-amber-400/5 p-4">
                    <div className="font-semibold text-amber-100">Actions en attente de confirmation</div>
                    <p className="mt-1 text-xs leading-5 text-amber-100/55">Gen3ia n’exécute pas une action externe ou sensible sans votre autorisation explicite.</p>
                    <div className="mt-3 space-y-2">
                      {active.approvals.filter((approval) => approval.status === "pending").map((approval) => (
                        <div key={approval.id} className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 p-3">
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-semibold text-white">{approval.toolSlug}</div>
                            <div className="mt-1 text-[11px] text-white/45">{approval.reason}</div>
                          </div>
                          <button type="button" disabled={loading} onClick={() => approve(approval.id)} className="rounded-lg bg-amber-400 px-3 py-2 text-xs font-bold text-black disabled:opacity-40">Autoriser</button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {active.outputs && Object.keys(active.outputs).length > 0 && (
                  <details className="mt-4 rounded-xl border border-white/10 bg-black/20 p-3">
                    <summary className="cursor-pointer text-xs font-semibold text-white/70">Résultats des étapes</summary>
                    <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap break-words text-[11px] text-white/50">{JSON.stringify(active.outputs, null, 2)}</pre>
                  </details>
                )}
              </div>
            )}
          </div>

          <form onSubmit={submit} className="border-t border-white/10 p-3 md:p-4">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-2 focus-within:border-violet-400/40">
              <textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                maxLength={20000}
                rows={3}
                placeholder="Décrivez l’objectif de l’agent…"
                className="w-full resize-none bg-transparent px-2 py-1 text-sm text-white outline-none placeholder:text-white/25"
              />
              <div className="flex items-center justify-between gap-2 px-2 pt-2">
                <div className="text-[10px] text-white/30">{message.length}/20 000 · Les secrets ne doivent jamais être saisis dans la demande.</div>
                <button disabled={loading || !message.trim()} className="rounded-xl bg-violet-500 px-5 py-2.5 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-40">
                  {loading ? "Agent en cours…" : "Lancer l’agent"}
                </button>
              </div>
            </div>
            {error && <p className="mt-2 text-xs text-red-300">{error}</p>}
          </form>
        </div>

        <aside className="hidden border-l border-white/10 bg-black/10 p-4 lg:block">
          <div className="text-[10px] font-bold tracking-[.25em] text-white/35">CONTRÔLE</div>
          <div className="mt-3 space-y-3">
            <Control title="Planification" text="DAG validé avant exécution." />
            <Control title="Permissions" text="Chaque outil passe par la politique de sécurité." />
            <Control title="Approbation" text="Actions sensibles bloquées jusqu’à confirmation." />
            <Control title="Audit" text="Les exécutions sont journalisées." />
            <Control title="Vérification" text="Une action n’est annoncée comme terminée qu’après succès." />
          </div>
          {active?.billing && (
            <div className="mt-5 rounded-xl border border-white/10 bg-white/[.02] p-3">
              <div className="text-[10px] uppercase tracking-[.18em] text-white/30">Consommation</div>
              <div className="mt-2 text-sm text-white/70">{active.billing.totalChargeMinor} unités mineures</div>
              <div className="mt-1 text-[11px] text-white/35">Coût fournisseur estimé : {active.billing.totalProviderCostEur.toFixed(4)} €</div>
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}

function Control({ title, text }: { title: string; text: string }) {
  return <div className="rounded-xl border border-white/10 bg-white/[.02] p-3"><div className="text-xs font-semibold text-white/75">{title}</div><div className="mt-1 text-[11px] leading-5 text-white/35">{text}</div></div>;
}
