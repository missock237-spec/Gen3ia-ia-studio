import { WebSocketServer, WebSocket } from "ws";
import { randomUUID } from "node:crypto";
import { getLiveSession, heartbeatLiveSession, recordLiveEvent, updateLiveSessionStatus } from "./repository";
import { constantTimeEqual, hashPairingToken, assertActionAllowed } from "./security";
import { decideLiveAction, actionRequiresConfirmation } from "./vision-decider";
import { LiveActionSchema, type LiveClientMessage, type LiveServerMessage } from "./types";

const MAX_FRAME_BYTES = 1_500_000;
const HEARTBEAT_MS = 15_000;
const FRAME_INTERVAL_MS = 900;
const clients = new Map<string, WebSocket>();
const lastDecisionAt = new Map<string, number>();

function send(socket: WebSocket, message: LiveServerMessage) {
  if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message));
}

function validateFrameBase64(value: string): Buffer {
  if (value.length > Math.ceil((MAX_FRAME_BYTES * 4) / 3) + 4) throw new Error("Live frame is too large");
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(value) || value.length % 4 === 1) throw new Error("Invalid frame encoding");
  const buffer = Buffer.from(value, "base64");
  if (buffer.length === 0 || buffer.length > MAX_FRAME_BYTES) throw new Error("Invalid live frame size");
  return buffer;
}

async function authenticateHello(message: Extract<LiveClientMessage, { type: "hello" }>) {
  const session = await getLiveSession(message.sessionId);
  if (!session) throw new Error("Live session not found");
  if (session.expiresAt && session.expiresAt <= Date.now()) throw new Error("Live session expired");
  if (!constantTimeEqual(session.pairingTokenHash, hashPairingToken(message.pairingToken))) throw new Error("Invalid pairing token");
  if (!session.permissions.includes("screen.read")) throw new Error("screen.read permission is required");
  return session;
}

export function startLiveGateway(port = Number(process.env.LIVE_GATEWAY_PORT || 8787)) {
  const server = new WebSocketServer({ port, maxPayload: 2_000_000, perMessageDeflate: false });

  server.on("connection", (socket) => {
    let sessionId: string | null = null;
    let deviceId: string | null = null;

    socket.on("message", async (raw) => {
      try {
        const message = JSON.parse(raw.toString()) as LiveClientMessage;

        if (message.type === "hello") {
          const session = await authenticateHello(message);
          sessionId = session.id;
          deviceId = message.deviceId;
          const existing = clients.get(session.id);
          if (existing && existing !== socket) existing.close(4009, "Replaced by a newer live connection");
          clients.set(session.id, socket);
          await updateLiveSessionStatus(session.id, "running", deviceId);
          await recordLiveEvent(session.id, { type: "connected", deviceId });
          send(socket, { type: "hello.ack", sessionId: session.id, heartbeatIntervalMs: HEARTBEAT_MS });
          return;
        }

        if (!sessionId || !deviceId || message.sessionId !== sessionId) throw new Error("Unauthenticated live connection");

        const session = await getLiveSession(sessionId);
        if (!session || session.deviceId !== deviceId) throw new Error("Live device is no longer authorized");
        if (session.expiresAt && session.expiresAt <= Date.now()) {
          send(socket, { type: "stop", reason: "Live session expired" });
          socket.close(4001, "Expired");
          return;
        }

        if (message.type === "heartbeat") {
          await heartbeatLiveSession(sessionId, deviceId);
          return;
        }

        if (message.type === "frame") {
          const now = Date.now();
          if (now - (lastDecisionAt.get(sessionId) || 0) < FRAME_INTERVAL_MS) return;
          const jpeg = validateFrameBase64(message.jpegBase64);
          lastDecisionAt.set(sessionId, now);
          const decision = await decideLiveAction(session, jpeg, message.width, message.height);
          await recordLiveEvent(sessionId, { type: "vision.decision", message: decision.message, done: decision.done });

          if (decision.done) {
            await updateLiveSessionStatus(sessionId, "connected", deviceId);
            return;
          }
          if (!decision.action) return;
          assertActionAllowed(decision.action, session.permissions);
          if (actionRequiresConfirmation(decision.action)) {
            await recordLiveEvent(sessionId, { type: "action.blocked", reason: "confirmation_required" });
            send(socket, { type: "pause", reason: "A sensitive action requires explicit confirmation" });
            await updateLiveSessionStatus(sessionId, "paused", deviceId);
            return;
          }

          const actionId = randomUUID();
          await recordLiveEvent(sessionId, { type: "action.requested", actionId, action: decision.action });
          send(socket, { type: "action", actionId, action: LiveActionSchema.parse(decision.action) });
          return;
        }

        if (message.type === "action.result") {
          await recordLiveEvent(sessionId, { type: "action.result", actionId: message.actionId, ok: message.ok, error: message.error });
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Live gateway error";
        send(socket, { type: "pause", reason: message });
        if (!sessionId) socket.close(4003, "Authentication failed");
      }
    });

    socket.on("close", async () => {
      if (!sessionId) return;
      if (clients.get(sessionId) === socket) {
        clients.delete(sessionId);
        lastDecisionAt.delete(sessionId);
        try {
          await updateLiveSessionStatus(sessionId, "disconnected", deviceId || undefined);
          await recordLiveEvent(sessionId, { type: "disconnected", deviceId });
        } catch { /* connection cleanup must not crash the gateway */ }
      }
    });
  });

  return server;
}
