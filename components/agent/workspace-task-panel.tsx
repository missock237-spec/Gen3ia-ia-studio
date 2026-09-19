"use client";

import { useEffect, useMemo, useState } from "react";
import { authFetch } from "@/lib/firebase/auth-client";
import { RuntimePlanSchema, validateDAG, type RuntimePlan, type RuntimeStep } from "@/lib/agents/runtime";

type WorkspaceTask = {
  id: string;
  objective: string;
  status: "draft" | "awaiting_approval" | "approved" | "running" | "completed" | "failed" | "cancelled";
  plan?: RuntimePlan;
  createdAt: number;
  updatedAt: number;
  approvedAt?: number;
};

const STATUS: Record<string, string> = {
  draft: "Brouillon",
  awaiting_approval: "Prêt pour validation",
  approved: "Approuvé",
  running: "En cours",
  completed: "Terminée",
  failed: "Échec",
  cancelled: "Annulée",
};

const STEP_TYPES = ["llm", "tool", "research", "document", "media", "code", "condition"] as const;

function clonePlan(plan: RuntimePlan): RuntimePlan {
  return JSON.parse(JSON.stringify(plan)) as RuntimePlan;
}

function newStep(index: number): RuntimeStep {
  return {
    id: `step-${Date.now()}-${index}`,
    type: "llm",
    name: `Nouvelle étape ${index + 1}`,
    description: "Décris précisément ce que cette étape doit accomplir.",
    dependencies: index > 0 ? [] : [],
    status: "pending",
    input: {},
    skillIds: [],
    maxRetries: 2,
    timeoutMs: 120000,
    sideEffect: false,
    requiresApproval: false,
  };
}

function validatePlan(plan: RuntimePlan): string[] {
  const parsed = RuntimePlanSchema.safeParse(plan);
  if (!parsed.success) return parsed.error.issues.map((issue) => issue.message);
  const dag = validateDAG(parsed.data);
  return dag.valid ? [] : dag.errors;
}

export function WorkspaceTaskPanel({ taskId }: { taskId: string }) {
  const [task, setTask] = useState<WorkspaceTask | null>(null);
  const [draftPlan, setDraftPlan] = useState<RuntimePlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saveMessage, setSaveMessage] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    setSaveMessage("");
    try {
      const response = await authFetch("/api/workspace/tasks/" + encodeURIComponent(taskId), { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Impossible de charger la tâche.");
      setTask(data.task);
      setDraftPlan(data.task.plan ? clonePlan(data.task.plan) : null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Impossible de charger la tâche.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, [taskId]);

  const isEditable = task?.status === "draft" || task?.status === "awaiting_approval";
  const hasChanges = useMemo(
    () => JSON.stringify(task?.plan ?? null) !== JSON.stringify(draftPlan),
    [task?.plan, draftPlan],
  );
  const validationErrors = useMemo(
    () => (draftPlan ? validatePlan(draftPlan) : []),
    [draftPlan],
  );

  function updateStep(stepId: string, patch: Partial<RuntimeStep>) {
    setDraftPlan((current) => {
      if (!current) return current;
      return {
        ...current,
        steps: current.steps.map((step) => step.id === stepId ? { ...step, ...patch } : step),
      };
    });
    setSaveMessage("");
  }

  function moveStep(index: number, direction: -1 | 1) {
    setDraftPlan((current) => {
      if (!current) return current;
      const target = index + direction;
      if (target < 0 || target >= current.steps.length) return current;
      const steps = [...current.steps];
      [steps[index], steps[target]] = [steps[target], steps[index]];
      return { ...current, steps };
    });
    setSaveMessage("");
  }

  function removeStep(stepId: string) {
    setDraftPlan((current) => {
      if (!current) return current;
      const steps = current.steps
        .filter((step) => step.id !== stepId)
        .map((step) => ({
          ...step,
          dependencies: step.dependencies.filter((dependency) => dependency !== stepId),
        }));
      return { ...current, steps };
    });
    setSaveMessage("");
  }

  function addStep() {
    setDraftPlan((current) => current ? { ...current, steps: [...current.steps, newStep(current.steps.length)] } : current);
    setSaveMessage("");
  }

  async function savePlan() {
    if (!task || !draftPlan || busy || !isEditable) return;
    setError("");
    setSaveMessage("");
    if (validationErrors.length > 0) {
      setError("Le plan contient des erreurs : " + validationErrors.join(" "));
      return;
    }
    setBusy(true);
    try {
      const response = await authFetch("/api/workspace/tasks/" + encodeURIComponent(task.id) + "/plan", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ plan: draftPlan }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Impossible d'enregistrer le plan.");
      setTask(data.task);
      setDraftPlan(data.task.plan ? clonePlan(data.task.plan) : null);
      setSaveMessage("Plan enregistré.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Impossible d'enregistrer le plan.");
    } finally {
      setBusy(false);
    }
  }

  async function approve() {
    if (!task || busy) return;
    if (hasChanges) {
      setError("Enregistre d'abord les modifications du plan avant de l'approuver.");
      return;
    }
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
      setDraftPlan(data.task.plan ? clonePlan(data.task.plan) : null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Validation impossible.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <section className="g3-workspace-task"><div className="g3-workspace-task-loading">Chargement du plan...</div></section>;
  if (error && !task) return <section className="g3-workspace-task"><div className="g3-workspace-task-error">{error}<button type="button" onClick={() => void load()}>Réessayer</button></div></section>;
  if (!task) return null;

  const plan = draftPlan ?? task.plan;
  const steps = plan?.steps ?? [];

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
          {isEditable && hasChanges && (
            <button type="button" disabled={busy || validationErrors.length > 0} onClick={() => void savePlan()} className="g3-workspace-task-save">
              {busy ? "Enregistrement..." : "Enregistrer"}
            </button>
          )}
          {task.status === "awaiting_approval" && (
            <button type="button" disabled={busy || hasChanges} onClick={() => void approve()} className="g3-workspace-task-approve">
              {busy ? "Validation..." : "Approuver le plan"}
            </button>
          )}
        </div>
      </div>

      <div className="g3-workspace-task-flow">
        <span className="is-active">1. Plan</span><span>→</span>
        <span className={task.status !== "awaiting_approval" && task.status !== "draft" ? "is-active" : ""}>2. Autorisation</span><span>→</span>
        <span className={task.status === "running" || task.status === "completed" ? "is-active" : ""}>3. Exécution</span><span>→</span>
        <span className={task.status === "completed" ? "is-active" : ""}>4. Vérification</span>
      </div>

      <div className="g3-workspace-task-toolbar">
        <div>
          <strong>Plan d'exécution</strong>
          <span>{steps.length} étape{steps.length > 1 ? "s" : ""} · {plan?.maxConcurrency ?? 0} concurrentes max</span>
        </div>
        {isEditable && (
          <button type="button" onClick={addStep} className="g3-workspace-task-add" disabled={busy}>+ Ajouter une étape</button>
        )}
      </div>

      <div className="g3-workspace-task-plan">
        {steps.map((step, index) => (
          <article key={step.id} className="g3-workspace-task-step g3-workspace-task-step-editor">
            <div className="g3-workspace-task-step-top">
              <span className="g3-workspace-task-index">{index + 1}</span>
              <div className="g3-workspace-task-step-order">
                <button type="button" aria-label="Monter l'étape" disabled={!isEditable || index === 0} onClick={() => moveStep(index, -1)}>↑</button>
                <button type="button" aria-label="Descendre l'étape" disabled={!isEditable || index === steps.length - 1} onClick={() => moveStep(index, 1)}>↓</button>
              </div>
              <span className="g3-workspace-task-step-id">{step.id}</span>
              {isEditable && steps.length > 1 && (
                <button type="button" className="g3-workspace-task-remove" onClick={() => removeStep(step.id)}>Supprimer</button>
              )}
            </div>

            <div className="g3-workspace-task-fields">
              <label>
                Nom
                <input value={step.name} disabled={!isEditable} onChange={(e) => updateStep(step.id, { name: e.target.value })} />
              </label>
              <label>
                Type
                <select value={step.type} disabled={!isEditable} onChange={(e) => updateStep(step.id, { type: e.target.value as RuntimeStep["type"] })}>
                  {STEP_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
                </select>
              </label>
              <label className="g3-workspace-task-field-wide">
                Description
                <textarea value={step.description} disabled={!isEditable} rows={2} onChange={(e) => updateStep(step.id, { description: e.target.value })} />
              </label>
              <label>
                Outil
                <input value={step.toolName ?? ""} disabled={!isEditable} placeholder="Aucun outil" onChange={(e) => updateStep(step.id, { toolName: e.target.value || undefined })} />
              </label>
              <label className="g3-workspace-task-field-wide">
                Dépendances (IDs séparés par des virgules)
                <input
                  value={step.dependencies.join(", ")}
                  disabled={!isEditable}
                  onChange={(e) => updateStep(step.id, { dependencies: e.target.value.split(",").map((v) => v.trim()).filter(Boolean) })}
                />
              </label>
              <label className="g3-workspace-task-check"><input type="checkbox" checked={step.requiresApproval} disabled={!isEditable} onChange={(e) => updateStep(step.id, { requiresApproval: e.target.checked })} /> Autorisation humaine</label>
              <label className="g3-workspace-task-check"><input type="checkbox" checked={step.sideEffect} disabled={!isEditable} onChange={(e) => updateStep(step.id, { sideEffect: e.target.checked })} /> Effet externe</label>
            </div>
          </article>
        ))}
      </div>

      {validationErrors.length > 0 && (
        <div className="g3-workspace-task-validation" role="alert">
          <strong>Plan invalide</strong>
          <ul>{validationErrors.map((item, index) => <li key={index}>{item}</li>)}</ul>
        </div>
      )}
      {error && <div className="g3-workspace-task-inline-error" role="alert">{error}</div>}
      {saveMessage && <div className="g3-workspace-task-save-message" role="status">{saveMessage}</div>}

      {task.status === "awaiting_approval" && <p className="g3-workspace-task-note">Le plan est visible avant toute exécution. Les actions sensibles restent protégées par les politiques d'autorisation.</p>}
      {task.status === "approved" && <p className="g3-workspace-task-note">Plan approuvé. Le moteur d'exécution peut maintenant prendre le relais.</p>}
    </section>
  );
}
