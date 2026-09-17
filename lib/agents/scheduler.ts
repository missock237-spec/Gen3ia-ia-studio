import { randomUUID } from "crypto";
import { FieldValue, Timestamp, type DocumentData } from "firebase-admin/firestore";
import { z } from "zod";

import { adminDb } from "@/lib/firebase/admin";
import { AgentRuntime, RuntimePlanSchema } from "@/lib/agents/runtime";

export const ScheduleSchema = z.object({
  agentId: z.string().trim().min(1).max(200),
  name: z.string().trim().min(1).max(200),
  objective: z.string().trim().min(3).max(50_000),
  plan: RuntimePlanSchema.omit({ executionId: true, objective: true }).optional(),
  timezone: z.string().trim().min(1).max(100),
  daysOfWeek: z.array(z.number().int().min(0).max(6)).min(1).max(7),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  intervalMinutes: z.number().int().min(0).max(1440).default(0),
  enabled: z.boolean().default(true),
});

export type AgentSchedule = z.infer<typeof ScheduleSchema> & {
  id: string;
  userId: string;
  lastTriggeredSlot?: string;
  createdAt?: string;
  updatedAt?: string;
};

const COLLECTION = "agentSchedules";

function assertTimezone(timezone: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format();
  } catch {
    throw new Error("Invalid IANA timezone");
  }
}

function minutes(value: string) {
  const [hours, mins] = value.split(":").map(Number);
  return hours * 60 + mins;
}

function localParts(now: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);

  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  const weekdayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
    hour: Number(get("hour")),
    minute: Number(get("minute")),
    weekday: weekdayMap[get("weekday")] ?? -1,
  };
}

function previousCalendarDate(year: number, month: number, day: number) {
  const date = new Date(Date.UTC(year, month - 1, day) - 86_400_000);
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate() };
}

function calendarDate(local: ReturnType<typeof localParts>) {
  return `${String(local.year).padStart(4, "0")}-${String(local.month).padStart(2, "0")}-${String(local.day).padStart(2, "0")}`;
}

export function isScheduleActive(schedule: AgentSchedule, now = new Date()) {
  if (!schedule.enabled) return false;
  const local = localParts(now, schedule.timezone);
  const current = local.hour * 60 + local.minute;
  const start = minutes(schedule.startTime);
  const end = minutes(schedule.endTime);

  if (start === end) return schedule.daysOfWeek.includes(local.weekday);

  if (start > end) {
    if (current < end) {
      const previousWeekday = (local.weekday + 6) % 7;
      return schedule.daysOfWeek.includes(previousWeekday);
    }
    return schedule.daysOfWeek.includes(local.weekday) && current >= start;
  }

  return schedule.daysOfWeek.includes(local.weekday) && current >= start && current < end;
}

function slotFor(schedule: AgentSchedule, now = new Date()) {
  const local = localParts(now, schedule.timezone);
  const current = local.hour * 60 + local.minute;
  const start = minutes(schedule.startTime);
  const end = minutes(schedule.endTime);

  if (!isScheduleActive(schedule, now)) return null;

  let date = calendarDate(local);
  let elapsed: number;
  if (start > end && current < end) {
    const previous = previousCalendarDate(local.year, local.month, local.day);
    date = `${String(previous.year).padStart(4, "0")}-${String(previous.month).padStart(2, "0")}-${String(previous.day).padStart(2, "0")}`;
    elapsed = current + 1440 - start;
  } else {
    elapsed = Math.max(0, current - start);
  }

  if (schedule.intervalMinutes <= 0) return `${date}:start`;
  return `${date}:${Math.floor(elapsed / schedule.intervalMinutes)}`;
}

export async function createSchedule(userId: string, input: unknown) {
  const parsed = ScheduleSchema.parse(input);
  assertTimezone(parsed.timezone);
  const id = randomUUID();
  const now = FieldValue.serverTimestamp();

  await adminDb.collection(COLLECTION).doc(id).set({
    ...parsed,
    userId,
    daysOfWeek: [...new Set(parsed.daysOfWeek)].sort((a, b) => a - b),
    createdAt: now,
    updatedAt: now,
  });

  return getSchedule(userId, id);
}

export async function getSchedule(userId: string, id: string) {
  const snap = await adminDb.collection(COLLECTION).doc(id).get();
  if (!snap.exists || snap.data()?.userId !== userId) return null;
  return serializeSchedule(snap.id, snap.data()!);
}

export async function listSchedules(userId: string) {
  const snap = await adminDb.collection(COLLECTION).where("userId", "==", userId).limit(100).get();
  return snap.docs.map((doc) => serializeSchedule(doc.id, doc.data())).sort((a, b) => a.startTime.localeCompare(b.startTime));
}

export async function updateSchedule(userId: string, id: string, input: unknown) {
  const parsed = ScheduleSchema.partial().parse(input);
  if (parsed.timezone) assertTimezone(parsed.timezone);
  const ref = adminDb.collection(COLLECTION).doc(id);
  const current = await ref.get();
  if (!current.exists || current.data()?.userId !== userId) return null;

  await ref.update({
    ...parsed,
    ...(parsed.daysOfWeek ? { daysOfWeek: [...new Set(parsed.daysOfWeek)].sort((a, b) => a - b) } : {}),
    updatedAt: FieldValue.serverTimestamp(),
  });
  return getSchedule(userId, id);
}

export async function deleteSchedule(userId: string, id: string) {
  const ref = adminDb.collection(COLLECTION).doc(id);
  const current = await ref.get();
  if (!current.exists || current.data()?.userId !== userId) return false;
  await ref.delete();
  return true;
}

export async function claimDueSchedule(schedule: AgentSchedule, now = new Date()) {
  const slot = slotFor(schedule, now);
  if (!slot) return false;

  const ref = adminDb.collection(COLLECTION).doc(schedule.id);
  return adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) return false;
    const data = snap.data()!;
    if (data.userId !== schedule.userId || data.enabled !== true) return false;
    if (data.lastTriggeredSlot === slot) return false;

    tx.update(ref, {
      lastTriggeredSlot: slot,
      lastTriggeredAt: Timestamp.fromDate(now),
      updatedAt: FieldValue.serverTimestamp(),
    });
    return true;
  });
}

export async function runSchedule(schedule: AgentSchedule) {
  const executionId = randomUUID();
  const plan = schedule.plan ?? {
    steps: [{
      id: "scheduled_step",
      type: "llm" as const,
      name: "Scheduled agent execution",
      description: schedule.objective,
      dependencies: [],
      status: "pending" as const,
      input: {},
      skillIds: [],
      maxRetries: 2,
      timeoutMs: 120_000,
      sideEffect: false,
      requiresApproval: false,
    }],
    maxConcurrency: 4,
    maxIterations: 10,
  };

  const runtime = new AgentRuntime({
    userId: schedule.userId,
    objective: schedule.objective,
    plan: { ...plan, executionId, objective: schedule.objective },
  });

  const state = await runtime.run();
  await adminDb.collection(COLLECTION).doc(schedule.id).update({
    lastExecutionId: executionId,
    lastExecutionStatus: state.status,
    lastExecutionAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  return { executionId, status: state.status };
}

export function serializeSchedule(id: string, data: DocumentData): AgentSchedule {
  const toIso = (value: unknown) => value instanceof Timestamp ? value.toDate().toISOString() : undefined;
  return { ...(data as Omit<AgentSchedule, "id">), id, createdAt: toIso(data.createdAt), updatedAt: toIso(data.updatedAt) };
}

export async function dispatchSchedules(now = new Date()) {
  const snap = await adminDb.collection(COLLECTION).where("enabled", "==", true).limit(500).get();
  const due = snap.docs.map((doc) => serializeSchedule(doc.id, doc.data())).filter((schedule) => isScheduleActive(schedule, now));
  const results: Array<Record<string, unknown>> = [];

  for (const schedule of due) {
    const claimed = await claimDueSchedule(schedule, now);
    if (!claimed) continue;
    try {
      results.push({ scheduleId: schedule.id, ...(await runSchedule(schedule)) });
    } catch (error) {
      results.push({ scheduleId: schedule.id, status: "failed", error: error instanceof Error ? error.message : "Scheduled execution failed" });
    }
  }

  return { checked: snap.size, due: due.length, executed: results };
}
