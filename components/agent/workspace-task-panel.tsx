"use client";

import { useEffect, useState } from "react";
import { authFetch } from "@/lib/firebase/auth-client";

type WorkspaceTask = {
  id: string;
  objective: string;
  status: "draft" | "awaiting_approval" | "approved" | "running" | "completed" | "failed" | "cancelled";
  plan?: {
    objective: string;
    steps: Array<{ id: string; type: string; name?: string; description?: string; toolName?: string; requiresApproval?: boolean; sideEffect?: boolean; status?: string }>;
    maxIterations: number;
  };
  createdAt: number;
  updatedAt: number;
  approvedAt?: number;
};

const STATUS: Record<string,string> = {
  draft: "Brouillon",
  awaiting_approval: "Prêt pour validation",
  approved: "Approuvée",
  running: "En cours",
  completed: "Terminée",
  failed: "Échec",
  cancelled: "Annulée",
};

export function WorkspaceTaskPanel({ taskId }: { taskId: string }) {
  const [task, setTask] = useState<WorkspaceTask | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const response = await authFetch("/api/workspace/tasks/" + encodeURIComponent(taskId), { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Impossible de charger la tâche.");
      setTask(data.task);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Impossible de charger la tâche.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, [taskId]);

  async function approve() {
    if (!task || busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await authFetch("/api/workspace/tasks/" + encodeURIComponent(task.id) + "/approve", {
        method: "POST",
        headers: { "content-type": "application/json" },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Validation impossible.");
      setTask(data.task);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Validation impossible.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <section className="g3-workspace-task"><div className="g3-workspace-task-loading">Chargement du plan...</div></section>;
  if (error) return <section className="g3-workspace-task"><div className="g3-workspace-task-error">{error}<button type="button" onClick={() => void load()}>Réessayer</button></div></section>;
  if (!task) return null;

  return (
    <section className="g3-workspace-task" aria-label="Workspace task">
      <div className="g3-workspace-task-head">
        <div>
          <div className="g3-eyebrow">WORKSPACE TASK</div>
          <h2>{task.objective}</h2>
          <p>Plan préparé par Gen3ia · {STATUS[task.status] ?? task.status}</p>
        </div>
        <div className="g3-workspace-task-actions">
          <span className={"g3-workspace-task-status status-" + task.status}>{STATUS[task.status] ?? task.status}</span>
          {task.status === "awaiting_approval" && (
            <button type="button" disabled={busy} onClick={() => void approve()} className="g3-workspace-task-approve">
              {busy ? "Validation..." : "Approuver le plan"}
            </button>
          )}
        </div>
      </div>

      <div className="g3-workspace-task-flow">
        <span className="is-active">1. Plan</span><span>→</span><span className={task.status !== "awaiting_approval" && task.status !== "draft" ? "is-active" : ""}>2. Autorisation</span><span>→</span><span className={task.status === "running" || task.status === "completed" ? "is-active" : ""}>3. Exécution</span><span>→</span><span className={task.status === "completed" ? "is-active" : ""}>4. Vérification</span>
      </div>

      <div className="g3-workspace-task-plan">
        {(task.plan?.steps ?? []).map((step, index) => (
          <article key={step.id} className="g3-workspace-task-step">
            <span className="g3-workspace-task-index">{index + 1}</span>
            <div className="min-w-0 flex-1">
              <strong>{step.name || step.toolName || step.type}</strong>
              <p>{step.description || "Étape orchestrée par l’agent."}</p>
            </div>
            <span className="g3-workspace-task-step-meta">{step.requiresApproval ? "Autorisation" : step.sideEffect ? "Action externe" : "Agent"}</span>
          </article>
        ))}
      </div>

      {error && <div className="g3-workspace-task-inline-error">{error}</div>}
      {task.status === "awaiting_approval" && <p className="g3-workspace-task-note">Le plan est visible avant toute exécution. Les actions sensibles restent protégées par les politiques d’autorisation.</p>}
      {task.status === "approved" && <p className="g3-workspace-task-note">Plan approuvé. Le moteur d’exécution peut maintenant prendre le relais.</p>}
    </section>
  );
}
