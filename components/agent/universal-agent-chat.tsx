"use client";

import * as React from "react";
import { PromptBox, AGENT_TOOLS } from "@/components/ui/chatgpt-prompt-input";

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
  conversationId?: string;
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

const QUICK_ACTIONS = [
  "Analyse mes fichiers et résume les informations importantes.",
  "Fais une recherche web et prépare un rapport structuré.",
  "Analyse mon fichier ZIP et explique son contenu.",
  "Crée un document professionnel à partir de mon objectif.",
];

const capabilityLabels: Record<string, string> = Object.fromEntries(
  AGENT_TOOLS.map((tool) => [tool.id, tool.name]),
);

function statusLabel(status?: string) {
  switch (status) {
    case "completed": return "Terminé";
    case "running": return "En cours";
    case "waiting_approval": return "Confirmation requise";
    case "failed": return "Échec";
    case "cancelled": return "Annulé";
    case "blocked": return "Bloqué";
    default: return status ?? "En attente";
  }
}

function statusClass(status?: string) {
  if (status === "completed") return "text-emerald-300";
  if (status === "failed" || status === "blocked") return "text-red-300";
  if (status === "running") return "text-cyan-300";
  if (status === "waiting_approval") return "text-amber-300";
  return "text-white/40";
}

function Icon({ name, className = "h-4 w-4" }: { name: "spark" | "shield" | "activity" | "clock" | "file" | "search" | "code" | "globe" | "check" | "arrow" | "plus" | "stop"; className?: string }) {
  const common = { className, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  if (name === "spark") return <svg {...common}><path d="m12 2 1.7 6.3L20 10l-6.3 1.7L12 18l-1.7-6.3L4 10l6.3-1.7L12 2Z"/><path d="m19 16 .7 2.3L22 19l-2.3.7L19 22l-.7-2.3L16 19l2.3-.7L19 16Z"/></svg>;
  if (name === "shield") return <svg {...common}><path d="M12 3 20 6v5c0 5.2-3.3 8.7-8 10-4.7-1.3-8-4.8-8-10V6l8-3Z"/><path d="m9 12 2 2 4-4"/></svg>;
  if (name === "activity") return <svg {...common}><path d="M3 12h4l2-6 4 12 2-6h6"/></svg>;
  if (name === "clock") return <svg {...common}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>;
  if (name === "file") return <svg {...common}><path d="M6 3h8l4 4v14H6z"/><path d="M14 3v5h5M9 13h6M9 17h6"/></svg>;
  if (name === "search" || name === "globe") return <svg {...common}><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>{name === "globe" && <><path d="M4 11h14"/><path d="M11 4a11 11 0 0 1 0 14"/></>}</svg>;
  if (name === "code") return <svg {...common}><path d="m9 18-6-6 6-6M15 6l6 6-6 6"/></svg>;
  if (name === "check") return <svg {...common}><path d="m5 12 4 4L19 6"/></svg>;
  if (name === "arrow") return <svg {...common}><path d="M5 12h14M13 6l6 6-6 6"/></svg>;
  if (name === "plus") return <svg {...common}><path d="M12 5v14M5 12h14"/></svg>;
  return <svg {...common}><rect x="7" y="7" width="10" height="10" rx="2"/></svg>;
}

export function UniversalAgentChat() {
  const [message, setMessage] = React.useState("");
  const [conversationId, setConversationId] = React.useState<string | null>(null);
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [active, setActive] = React.useState<AgentResult | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [selectedTool, setSelectedTool] = React.useState<string | null>(null);
  const [attachment, setAttachment] = React.useState<File | null>(null);
  const [isListening, setIsListening] = React.useState(false);
  const [showTrace, setShowTrace] = React.useState(true);

  const progress = React.useMemo(() => {
    if (!active?.plan.steps.length) return 0;
    const done = active.plan.steps.filter((step) => step.status === "completed" || step.status === "skipped").length;
    return Math.round((done / active.plan.steps.length) * 100);
  }, [active]);

  const activeToolName = selectedTool ? capabilityLabels[selectedTool] : "Auto";
  const statusText = loading ? "Agent en cours" : active ? statusLabel(active.status) : "Prêt";

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const objective = message.trim();
    if (!objective || loading) return;

    setLoading(true);
    setError("");
    setMessages((items) => [...items, { id: crypto.randomUUID(), role: "user", text: objective }]);
    setMessage("");

    try {
      const enrichedObjective = selectedTool
        ? `[Capacité prioritaire: ${selectedTool}] ${objective}`
        : objective;

      const response = await fetch("/api/agent/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          message: enrichedObjective,
          ...(conversationId ? { conversationId } : {}),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Impossible de lancer l'agent.");

      const result = data as AgentResult;
      if (result.conversationId) setConversationId(result.conversationId);
      setActive(result);
      setMessages((items) => [
        ...items,
        {
          id: crypto.randomUUID(),
          role: "agent",
          text: result.finalText
            || (result.status === "waiting_approval"
              ? "Le plan est actif. J’ai exécuté les étapes autorisées et mis les actions sensibles en attente de votre confirmation."
              : result.status === "completed"
                ? "Mission terminée. Les résultats affichés correspondent aux étapes réellement exécutées."
                : "Mission préparée. L’agent analyse, exécute et vérifie les étapes autorisées."),
          result,
        },
      ]);
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
      if (result.conversationId) setConversationId(result.conversationId);
      setActive(result);
      setMessages((items) => [...items, {
        id: crypto.randomUUID(),
        role: "agent",
        text: result.finalText
          || (result.status === "waiting_approval"
            ? "Une autre autorisation est nécessaire avant de continuer."
            : "Autorisation appliquée. L’agent reprend l’exécution et vérifie le résultat."),
        result,
      }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur pendant l’approbation.");
    } finally {
      setLoading(false);
    }
  }

  function startVoice() {
    type Recognition = {
      lang: string;
      continuous: boolean;
      interimResults: boolean;
      start: () => void;
      stop: () => void;
      onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
      onend: (() => void) | null;
      onerror: (() => void) | null;
    };
    type RecognitionConstructor = new () => Recognition;
    const speechWindow = window as unknown as {
      SpeechRecognition?: RecognitionConstructor;
      webkitSpeechRecognition?: RecognitionConstructor;
    };
    const SpeechRecognition = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError("La saisie vocale n’est pas disponible dans ce navigateur.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "fr-FR";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results).map((result) => result[0]?.transcript ?? "").join(" ");
      setMessage((current) => current ? current + " " + transcript : transcript);
    };
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => {
      setIsListening(false);
      setError("La saisie vocale a rencontré un problème.");
    };
    setIsListening(true);
    recognition.start();
  }

  function resetConversation() {
    if (loading) return;
    setConversationId(null);
    setMessages([]);
    setActive(null);
    setError("");
    setAttachment(null);
    setSelectedTool(null);
    setMessage("");
  }

  return (
    <section className="relative overflow-hidden rounded-[30px] border border-white/10 bg-[#090e18] shadow-2xl shadow-black/40">
      <div className="pointer-events-none absolute -left-32 -top-32 h-72 w-72 rounded-full bg-violet-500/15 blur-3xl animate-pulse" />
      <div className="pointer-events-none absolute -bottom-40 -right-20 h-80 w-80 rounded-full bg-cyan-500/10 blur-3xl" />

      <div className="relative grid min-h-[760px] lg:grid-cols-[230px_minmax(0,1fr)_290px]">
        <aside className="hidden border-r border-white/10 bg-black/10 p-4 lg:block">
          <div className="flex items-center gap-2 text-[10px] font-black tracking-[.28em] text-violet-300">
            <Icon name="spark" className="h-3.5 w-3.5" /> GEN3IA AGENT
          </div>

          <div className="mt-4 rounded-2xl border border-emerald-400/20 bg-emerald-400/[.05] p-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-white">
              <span className="relative flex h-2 w-2"><span className="absolute h-full w-full animate-ping rounded-full bg-emerald-400/70"/><span className="relative h-2 w-2 rounded-full bg-emerald-400"/></span>
              Agent opérationnel
            </div>
            <p className="mt-2 text-[11px] leading-5 text-white/40">Un seul chat pour planifier, utiliser les outils, créer, rechercher, coder et agir.</p>
          </div>

          <div className="mt-6 text-[10px] font-bold uppercase tracking-[.2em] text-white/30">Capacités</div>
          <div className="mt-2 space-y-1">
            {AGENT_TOOLS.map((tool) => (
              <button
                key={tool.id}
                type="button"
                onClick={() => setSelectedTool((current) => current === tool.id ? null : tool.id)}
                className={`flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-[11px] transition ${selectedTool === tool.id ? "bg-violet-500/15 text-violet-200" : "text-white/50 hover:bg-white/[.04] hover:text-white"}`}
              >
                <span className="grid h-6 w-6 place-items-center rounded-lg bg-white/[.04] text-violet-300"><Icon name={tool.id === "web.search" ? "globe" : tool.id === "code.execute" ? "code" : tool.id.includes("file") || tool.id.includes("zip") ? "file" : "spark"} className="h-3.5 w-3.5"/></span>
                <span className="truncate">{tool.name}</span>
              </button>
            ))}
          </div>

          <button type="button" onClick={resetConversation} disabled={loading} className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[.03] px-3 py-2.5 text-xs text-white/55 transition hover:bg-white/[.06] hover:text-white disabled:opacity-30">
            <Icon name="plus" className="h-3.5 w-3.5"/> Nouvelle mission
          </button>
        </aside>

        <div className="flex min-w-0 flex-col">
          <header className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3.5 md:px-5">
            <div className="flex min-w-0 items-center gap-3">
              <div className="relative grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-violet-400/20 bg-violet-400/10 text-violet-200">
                <Icon name="spark" className="h-5 w-5"/>
                <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#090e18] bg-emerald-400"/>
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="truncate text-sm font-bold text-white">Agent universel</h2>
                  <span className="hidden rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-cyan-200 sm:inline">Autonome</span>
                </div>
                <p className="mt-0.5 truncate text-[11px] text-white/35">{statusText} · {activeToolName}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className={`hidden items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] sm:inline-flex ${loading ? "border-cyan-400/20 bg-cyan-400/10 text-cyan-200" : "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${loading ? "animate-pulse bg-cyan-300" : "bg-emerald-400"}`}/>
                {loading ? "Exécution" : "Sécurisé"}
              </span>
              <button type="button" onClick={resetConversation} disabled={loading} className="rounded-xl border border-white/10 px-3 py-2 text-[11px] text-white/50 hover:bg-white/[.05] hover:text-white disabled:opacity-30">Nouveau</button>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto p-4 md:p-5">
            {messages.length === 0 && (
              <div className="flex min-h-[470px] items-center justify-center">
                <div className="w-full max-w-2xl text-center">
                  <div className="mx-auto relative grid h-20 w-20 place-items-center rounded-[24px] border border-violet-400/20 bg-gradient-to-br from-violet-500/15 to-cyan-400/10 text-violet-200 shadow-xl shadow-violet-500/10">
                    <Icon name="spark" className="h-9 w-9"/>
                    <span className="absolute inset-0 rounded-[24px] border border-violet-400/10 animate-ping"/>
                  </div>
                  <h3 className="mt-6 text-2xl font-black tracking-tight text-white md:text-3xl">Que voulez-vous que je fasse ?</h3>
                  <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-white/45">Parlez à Gen3ia comme à un assistant, mais donnez-lui aussi un objectif à exécuter. Il choisit les capacités, orchestre les étapes, vérifie les résultats et demande votre autorisation lorsque nécessaire.</p>

                  <div className="mt-7 grid gap-2 sm:grid-cols-2">
                    {QUICK_ACTIONS.map((action, index) => (
                      <button key={action} type="button" onClick={() => setMessage(action)} className="group flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[.025] p-3 text-left transition duration-300 hover:-translate-y-0.5 hover:border-violet-400/25 hover:bg-violet-400/[.05]">
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-white/[.04] text-violet-300 transition group-hover:scale-110"><Icon name={index === 1 ? "search" : index === 2 ? "file" : index === 3 ? "spark" : "activity"} className="h-4 w-4"/></span>
                        <span className="text-xs leading-5 text-white/55 group-hover:text-white/80">{action}</span>
                        <Icon name="arrow" className="ml-auto h-3.5 w-3.5 shrink-0 text-white/20 transition group-hover:translate-x-1 group-hover:text-violet-300"/>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="mx-auto max-w-3xl space-y-5">
              {messages.map((item) => (
                <div key={item.id} className={item.role === "user" ? "ml-auto max-w-[88%] md:max-w-[78%]" : "mr-auto max-w-[96%]"}>
                  <div className="mb-1.5 text-[9px] font-bold uppercase tracking-[.2em] text-white/25">{item.role === "user" ? "Vous" : "Gen3ia Agent"}</div>
                  <div className={item.role === "user"
                    ? "rounded-2xl rounded-br-md bg-gradient-to-br from-violet-600 to-violet-500 px-4 py-3.5 text-sm leading-6 text-white shadow-lg shadow-violet-500/10"
                    : "rounded-2xl rounded-bl-md border border-white/10 bg-white/[.035] px-4 py-3.5 text-sm leading-6 text-white/75"}>{item.text}</div>
                </div>
              ))}

              {loading && (
                <div className="mr-auto flex items-center gap-3 rounded-2xl border border-cyan-400/10 bg-cyan-400/[.025] px-4 py-3 text-xs text-white/45">
                  <span className="flex gap-1"><span className="h-1.5 w-1.5 animate-bounce rounded-full bg-violet-300"/><span className="h-1.5 w-1.5 animate-bounce rounded-full bg-cyan-300 [animation-delay:120ms]"/><span className="h-1.5 w-1.5 animate-bounce rounded-full bg-violet-300 [animation-delay:240ms]"/></span>
                  L’agent analyse votre objectif…
                </div>
              )}

              {active && (
                <div className="overflow-hidden rounded-3xl border border-white/10 bg-black/20 shadow-xl anim-fade-up">
                  <div className="border-b border-white/10 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="grid h-9 w-9 place-items-center rounded-xl bg-violet-400/10 text-violet-300"><Icon name="activity" className="h-4 w-4"/></div>
                        <div>
                          <div className="text-[10px] font-bold uppercase tracking-[.2em] text-white/30">Mission</div>
                          <div className="mt-1 font-mono text-[10px] text-white/45">{active.executionId}</div>
                        </div>
                      </div>
                      <span className={`rounded-full border border-white/10 bg-white/[.04] px-2.5 py-1 text-[10px] font-semibold ${statusClass(active.status)}`}>{statusLabel(active.status)}</span>
                    </div>

                    <div className="mt-4 flex items-center justify-between text-[10px] text-white/30"><span>Progression</span><span>{progress}%</span></div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10">
                      <div className="relative h-full rounded-full bg-gradient-to-r from-violet-500 via-fuchsia-400 to-cyan-400 transition-all duration-700" style={{ width: `${Math.max(progress, active.status === "waiting_approval" ? 12 : 0)}%` }}>
                        <span className="absolute right-0 top-0 h-full w-12 animate-pulse bg-white/30 blur-sm"/>
                      </div>
                    </div>
                  </div>

                  <div className="p-4">
                    <div className="space-y-2">
                      {active.plan.steps.map((step, index) => (
                        <div key={step.id} className="group flex items-center gap-3 rounded-2xl border border-white/[.07] bg-white/[.018] p-3 transition hover:bg-white/[.035]">
                          <div className={`grid h-7 w-7 shrink-0 place-items-center rounded-xl border ${step.status === "completed" ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-300" : step.status === "running" ? "border-cyan-400/25 bg-cyan-400/10 text-cyan-300" : step.requiresApproval ? "border-amber-400/25 bg-amber-400/10 text-amber-300" : "border-white/10 bg-white/[.03] text-white/35"}`}>
                            {step.status === "completed" ? <Icon name="check" className="h-3.5 w-3.5"/> : step.status === "running" ? <span className="h-2 w-2 animate-pulse rounded-full bg-cyan-300"/> : index + 1}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-xs font-semibold text-white/80">{step.name || capabilityLabels[step.toolName || ""] || step.toolName || step.type}</div>
                            <div className="mt-0.5 truncate text-[10px] text-white/30">{step.toolName || step.type}{step.sideEffect ? " · action externe" : ""}</div>
                          </div>
                          <span className={`shrink-0 text-[10px] font-semibold ${statusClass(step.status)}`}>{step.requiresApproval ? "Autorisation" : statusLabel(step.status)}</span>
                        </div>
                      ))}
                    </div>

                    {active.approvals?.some((approval) => approval.status === "pending") && (
                      <div className="mt-4 rounded-2xl border border-amber-400/20 bg-amber-400/[.055] p-4">
                        <div className="flex items-start gap-3">
                          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-amber-400/10 text-amber-300"><Icon name="shield" className="h-4 w-4"/></div>
                          <div>
                            <div className="text-xs font-bold text-amber-100">Votre confirmation est requise</div>
                            <p className="mt-1 text-[11px] leading-5 text-amber-100/50">Les actions sensibles, externes, destructives ou irréversibles ne sont jamais exécutées silencieusement.</p>
                          </div>
                        </div>
                        <div className="mt-3 space-y-2">
                          {active.approvals.filter((approval) => approval.status === "pending").map((approval) => (
                            <div key={approval.id} className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 p-3">
                              <div className="min-w-0 flex-1">
                                <div className="truncate text-xs font-semibold text-white">{approval.toolSlug}</div>
                                <div className="mt-1 text-[10px] leading-4 text-white/40">{approval.reason}</div>
                              </div>
                              <button type="button" disabled={loading} onClick={() => approve(approval.id)} className="shrink-0 rounded-xl bg-amber-400 px-3 py-2 text-[10px] font-black text-black transition hover:bg-amber-300 disabled:opacity-40">Autoriser</button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {active.finalText && active.status === "completed" && (
                      <div className="mt-4 rounded-2xl border border-emerald-400/15 bg-emerald-400/[.04] p-4">
                        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.2em] text-emerald-300"><Icon name="check" className="h-3.5 w-3.5"/> Résultat final</div>
                        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-white/70">{active.finalText}</p>
                      </div>
                    )}

                    {showTrace && (
                      <details className="mt-4 rounded-2xl border border-white/[.07] bg-black/20 p-3">
                        <summary className="cursor-pointer text-[10px] font-bold uppercase tracking-[.18em] text-white/35">Trace d’exécution</summary>
                        <div className="mt-3 space-y-1.5">
                          {active.observations?.map((observation) => (
                            <div key={`${observation.stepId}-${observation.latencyMs}`} className="flex items-center gap-2 rounded-lg bg-white/[.02] px-2.5 py-2 text-[10px]">
                              <span className={observation.success ? "text-emerald-300" : "text-red-300"}>{observation.success ? "✓" : "!"}</span>
                              <span className="min-w-0 flex-1 truncate text-white/40">{observation.stepId}</span>
                              <span className="text-white/25">{observation.latencyMs} ms</span>
                            </div>
                          ))}
                        </div>
                      </details>
                    )}

                    {active.outputs && Object.keys(active.outputs).length > 0 && (
                      <details className="mt-2 rounded-2xl border border-white/[.07] bg-black/20 p-3">
                        <summary className="cursor-pointer text-[10px] font-bold uppercase tracking-[.18em] text-white/35">Données produites</summary>
                        <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap break-words text-[10px] leading-5 text-white/45">{JSON.stringify(active.outputs, null, 2)}</pre>
                      </details>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-white/10 bg-black/10 p-3 md:p-4">
            {attachment && (
              <div className="mx-auto mb-2 flex max-w-3xl items-center gap-2 rounded-xl border border-violet-400/15 bg-violet-400/[.05] px-3 py-2 text-[10px] text-violet-200">
                <Icon name="file" className="h-3.5 w-3.5"/>
                <span className="min-w-0 flex-1 truncate">{attachment.name}</span>
                <span className="text-white/30">{Math.ceil(attachment.size / 1024)} Ko</span>
                <button type="button" onClick={() => setAttachment(null)} className="text-white/35 hover:text-white" aria-label="Retirer le fichier">×</button>
              </div>
            )}

            <div className="mx-auto max-w-3xl">
              <PromptBox
                value={message}
                onValueChange={setMessage}
                onSubmit={submit}
                disabled={loading}
                selectedTool={selectedTool}
                onToolChange={setSelectedTool}
                onFile={setAttachment}
                onVoice={startVoice}
                placeholder="Parlez à l’Agent Gen3ia… demandez-lui de réfléchir, rechercher, créer ou agir."
              />
              <div className="mt-2 flex items-center justify-between gap-3 px-1 text-[9px] text-white/25">
                <span>{isListening ? "Écoute vocale active…" : "Entrée pour envoyer · Maj+Entrée pour une nouvelle ligne"}</span>
                <button type="button" onClick={() => setShowTrace((value) => !value)} className="hover:text-white/50">{showTrace ? "Masquer la trace" : "Afficher la trace"}</button>
              </div>
            </div>
          </div>
        </div>

        <aside className="hidden border-l border-white/10 bg-black/10 p-4 lg:block">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.2em] text-white/30"><Icon name="shield" className="h-3.5 w-3.5"/> Contrôle Agent</div>
          <div className="mt-4 space-y-2">
            {[
              ["Planification", "DAG validé avant exécution.", "activity"],
              ["Permissions", "Chaque outil est autorisé par politique.", "shield"],
              ["Exécution", "Les capacités sont appelées via le runtime sécurisé.", "spark"],
              ["Vérification", "Un succès n’est annoncé qu’après retour réel.", "check"],
              ["Approbation", "Les effets sensibles restent bloqués.", "clock"],
            ].map(([title, text, icon]) => (
              <div key={title} className="rounded-2xl border border-white/[.07] bg-white/[.02] p-3 transition hover:bg-white/[.04]">
                <div className="flex items-center gap-2 text-xs font-semibold text-white/70"><span className="text-violet-300"><Icon name={icon as "activity" | "shield" | "spark" | "check" | "clock"} className="h-3.5 w-3.5"/></span>{title}</div>
                <div className="mt-1.5 text-[10px] leading-4 text-white/30">{text}</div>
              </div>
            ))}
          </div>

          {active?.billing && (
            <div className="mt-4 rounded-2xl border border-cyan-400/10 bg-cyan-400/[.03] p-3">
              <div className="text-[9px] font-bold uppercase tracking-[.18em] text-white/25">Consommation</div>
              <div className="mt-2 text-sm font-semibold text-white/70">{active.billing.totalChargeMinor} unités mineures</div>
              <div className="mt-1 text-[10px] text-white/30">Fournisseur estimé : {active.billing.totalProviderCostEur.toFixed(4)} €</div>
            </div>
          )}

          <div className="mt-4 rounded-2xl border border-violet-400/10 bg-violet-400/[.035] p-3">
            <div className="text-[9px] font-bold uppercase tracking-[.18em] text-violet-300/60">Mode</div>
            <div className="mt-2 text-xs font-semibold text-white/70">Agent universel</div>
            <p className="mt-1 text-[10px] leading-4 text-white/30">Le chat et l’agent partagent maintenant la même interface d’exécution.</p>
          </div>
        </aside>
      </div>
    </section>
  );
}
