import { WebSocketServer, WebSocket } from "ws";
import { randomUUID } from "node:crypto";
import {
  getLiveSession,
  heartbeatLiveSession,
  recordLiveEvent,
  updateLiveSessionStatus,
} from "./repository";
import {
  constantTimeEqual,
  hashPairingToken,
  assertActionAllowed,
} from "./security";
import { decideLiveAction, actionRequiresConfirmation } from "./vision-decider";
import {
  LiveActionSchema,
  LiveClientMessageSchema,
  type LiveClientMessage,
  type LiveServerMessage,
} from "./types";

const MAX_FRAME_BYTES = 1_500_000;
const MAX_FRAME_INTERVAL_MS = 900;
const HEARTBEAT_MS = 15_000;
const SESSION_POLL_MS = 2_000;
const ACTION_RESULT_MAX_AGE_MS = 5 * 60_000;

interface ConnectionState {
  sessionId: string;
  deviceId: string;
  socket: WebSocket;
  pausedByServer: boolean;
  lastFrameAt: number;
  lastActionId?: string;
  lastActionAt?: number;
  lastActionResult?: { ok: boolean; error?: string; at: number };
}

const clients = new Map<string, ConnectionState>();

function send(socket: WebSocket, message: LiveServerMessage) {
  if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message));
}

function validateFrameBase64(value: string): Buffer {
  if (value.length > Math.ceil((MAX_FRAME_BYTES * 4) / 3) + 4) {
    throw new Error("Live frame is too large");
  }
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(value) || value.length % 4 === 1) {
    throw new Error("Invalid frame encoding");
  }
  const buffer = Buffer.from(value, "base64");
  if (buffer.length === 0 || buffer.length > MAX_FRAME_BYTES) {
    throw new Error("Invalid live frame size");
  }
  return buffer;
}

async function authenticateHello(
  message: Extract<LiveClientMessage, { type: "hello" }>,
) {
  const session = await getLiveSession(message.sessionId);
  if (!session) throw new Error("Live session not found");
  if (session.expiresAt && session.expiresAt <= Date.now()) {
    throw new Error("Live session expired");
  }
  if (
    !constantTimeEqual(
      session.pairingTokenHash,
      hashPairingToken(message.pairingToken),
    )
  ) {
    throw new Error("Invalid pairing token");
  }
  if (!session.permissions.includes("screen.read")) {
    throw new Error("screen.read permission is required");
  }
  return session;
}

async function synchronizeConnection(state: ConnectionState): Promise<boolean> {
  const session = await getLiveSession(state.sessionId);
  if (!session || session.deviceId !== state.deviceId) {
    send(state.socket, { type: "stop", reason: "Live device is no longer authorized" });
    state.socket.close(4001, "Unauthorized");
    return false;
  }

  if (session.expiresAt && session.expiresAt <= Date.now()) {
    send(state.socket, { type: "stop", reason: "Live session expired" });
    state.socket.close(4001, "Expired");
    return false;
  }

  if (session.status === "stopped" || session.status === "failed") {
    send(state.socket, { type: "stop", reason: `Live session is ${session.status}` });
    state.socket.close(4000, session.status);
    return false;
  }

  if (session.status === "paused") {
    if (!state.pausedByServer) {
      state.pausedByServer = true;
      send(state.socket, { type: "pause", reason: "Live session paused by the user or policy" });
    }
    return true;
  }

  if (state.pausedByServer && session.status === "running") {
    state.pausedByServer = false;
    send(state.socket, { type: "resume", reason: "Live session resumed" });
  }

  return true;
}

export function startLiveGateway(
  port = Number(process.env.LIVE_GATEWAY_PORT || 8787),
) {
  const server = new WebSocketServer({
    port,
    maxPayload: 2_000_000,
    perMessageDeflate: false,
  });

  server.on("connection", (socket) => {
    let state: ConnectionState | null = null;

    socket.on("message", async (raw) => {
      try {
        const message = LiveClientMessageSchema.parse(JSON.parse(raw.toString()));

        if (message.type === "hello") {
          const session = await authenticateHello(message);
          const existing = clients.get(session.id);
          if (existing && existing.socket !== socket) {
            send(existing.socket, { type: "stop", reason: "Replaced by a newer live connection" });
            existing.socket.close(4009, "Replaced");
          }

          state = {
            sessionId: session.id,
            deviceId: message.deviceId,
            socket,
            pausedByServer: session.status === "paused",
            lastFrameAt: 0,
          };
          clients.set(session.id, state);
          await updateLiveSessionStatus(session.id, "running", message.deviceId);
          await recordLiveEvent(session.id, {
            type: "connected",
            deviceId: message.deviceId,
          });

          send(socket, {
            type: "hello.ack",
            sessionId: session.id,
            heartbeatIntervalMs: HEARTBEAT_MS,
            frameIntervalMs: MAX_FRAME_INTERVAL_MS,
          });
          if (state.pausedByServer) {
            send(socket, { type: "pause", reason: "Live session is paused" });
          }
          return;
        }

        if (!state || message.sessionId !== state.sessionId || message.deviceId !== state.deviceId) {
          throw new Error("Unauthenticated live connection");
        }

        if (!(await synchronizeConnection(state))) return;
        if (state.pausedByServer && message.type === "frame") return;

        if (message.type === "heartbeat") {
          await heartbeatLiveSession(state.sessionId, state.deviceId);
          return;
        }

        if (message.type === "frame") {
          const now = Date.now();
          if (now - state.lastFrameAt < MAX_FRAME_INTERVAL_MS) return;
          const jpeg = validateFrameBase64(message.jpegBase64);
          state.lastFrameAt = now;

          const decision = await decideLiveAction(
            await getLiveSession(state.sessionId) as NonNullable<Awaited<ReturnType<typeof getLiveSession>>>,
            jpeg,
            message.width,
            message.height,
            state.lastActionResult && Date.now() - state.lastActionResult.at <= ACTION_RESULT_MAX_AGE_MS
              ? state.lastActionResult
              : undefined,
          );

          await recordLiveEvent(state.sessionId, {
            type: "vision.decision",
            message: decision.message,
            done: decision.done,
            action: decision.action,
          });

          if (decision.done) {
            await updateLiveSessionStatus(state.sessionId, "connected", state.deviceId);
            return;
          }
          if (!decision.action) return;

          const action = LiveActionSchema.parse(decision.action);
          assertActionAllowed(action, (await getLiveSession(state.sessionId))!.permissions);
          if (actionRequiresConfirmation(action)) {
            await recordLiveEvent(state.sessionId, {
              type: "action.blocked",
              reason: "confirmation_required",
              action,
            });
            state.pausedByServer = true;
            send(socket, {
              type: "pause",
              reason: "A sensitive action requires explicit confirmation",
            });
            await updateLiveSessionStatus(state.sessionId, "paused", state.deviceId);
            return;
          }

          const actionId = randomUUID();
          state.lastActionId = actionId;
          state.lastActionAt = Date.now();
          state.lastActionResult = undefined;
          await recordLiveEvent(state.sessionId, {
            type: "action.requested",
            actionId,
            action,
          });
          send(socket, { type: "action", actionId, action });
          return;
        }

        if (message.type === "action.result") {
          if (state.lastActionId !== message.actionId) {
            throw new Error("Unknown or expired live action");
          }
          state.lastActionResult = {
            ok: message.ok,
            error: message.error,
            at: Date.now(),
          };
          await recordLiveEvent(state.sessionId, {
            type: "action.result",
            actionId: message.actionId,
            ok: message.ok,
            error: message.error,
          });
        }
      } catch (error) {
        const reason = error instanceof Error ? error.message : "Live gateway error";
        if (state) {
          await recordLiveEvent(state.sessionId, { type: "protocol.error", reason }).catch(() => undefined);
          send(socket, { type: "pause", reason });
        } else {
          socket.close(4003, "Authentication failed");
        }
      }
    });

    socket.on("close", async () => {
      if (!state) return;
      if (clients.get(state.sessionId)?.socket === socket) {
        clients.delete(state.sessionId);
        try {
          await updateLiveSessionStatus(state.sessionId, "disconnected", state.deviceId);
          await recordLiveEvent(state.sessionId, {
            type: "disconnected",
            deviceId: state.deviceId,
          });
        } catch {
          // Cleanup must never crash the gateway.
        }
      }
    });
  });

  const poller = setInterval(() => {
    for (const state of clients.values()) {
      void synchronizeConnection(state).catch((error) => {
        send(state.socket, {
          type: "pause",
          reason: error instanceof Error ? error.message : "Session synchronization failed",
        });
      });
    }
  }, SESSION_POLL_MS);

  server.on("close", () => clearInterval(poller));
  return server;
}
