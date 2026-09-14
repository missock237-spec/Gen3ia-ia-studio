import { z } from "zod";

export const LivePermissionSchema = z.enum([
  "screen.read",
  "input.mouse",
  "input.keyboard",
  "files.read",
  "files.write",
  "browser.control",
]);
export type LivePermission = z.infer<typeof LivePermissionSchema>;

export const LiveSessionStatusSchema = z.enum([
  "pending",
  "connected",
  "running",
  "paused",
  "disconnected",
  "stopped",
  "failed",
]);
export type LiveSessionStatus = z.infer<typeof LiveSessionStatusSchema>;

export interface LiveSession {
  id: string;
  ownerId: string;
  name: string;
  objective: string;
  status: LiveSessionStatus;
  permissions: LivePermission[];
  deviceId?: string;
  createdAt: number;
  updatedAt: number;
  lastHeartbeatAt?: number;
  expiresAt?: number;
  version: number;
}

export type LiveClientMessage =
  | { type: "hello"; sessionId: string; deviceId: string; pairingToken: string }
  | { type: "heartbeat"; sessionId: string; deviceId: string; timestamp: number }
  | { type: "frame"; sessionId: string; deviceId: string; timestamp: number; width: number; height: number; jpegBase64: string }
  | { type: "action.result"; sessionId: string; actionId: string; ok: boolean; error?: string; result?: unknown };

export type LiveServerMessage =
  | { type: "hello.ack"; sessionId: string; heartbeatIntervalMs: number }
  | { type: "action"; actionId: string; action: LiveAction }
  | { type: "pause"; reason: string }
  | { type: "stop"; reason: string };

export const LiveActionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("mouse.move"), x: z.number().finite(), y: z.number().finite() }),
  z.object({ type: z.literal("mouse.click"), button: z.enum(["left", "middle", "right"]).default("left") }),
  z.object({ type: z.literal("keyboard.type"), text: z.string().max(10000) }),
  z.object({ type: z.literal("keyboard.key"), key: z.string().min(1).max(64) }),
  z.object({ type: z.literal("wait"), ms: z.number().int().min(50).max(30000) }),
]);
export type LiveAction = z.infer<typeof LiveActionSchema>;
