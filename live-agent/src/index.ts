import screenshot from "screenshot-desktop";
import { imageSize } from "image-size";
import { Button, Key, Point, keyboard, mouse } from "@nut-tree/nut-js";
import WebSocket from "ws";
import { z } from "zod";

const gatewayUrl = process.env.GEN3IA_LIVE_GATEWAY_URL;
const sessionId = process.env.GEN3IA_LIVE_SESSION_ID;
const pairingToken = process.env.GEN3IA_LIVE_PAIRING_TOKEN;
const deviceId = process.env.GEN3IA_LIVE_DEVICE_ID;

if (!gatewayUrl || !sessionId || !pairingToken || !deviceId) {
  throw new Error(
    "GEN3IA_LIVE_GATEWAY_URL, GEN3IA_LIVE_SESSION_ID, GEN3IA_LIVE_PAIRING_TOKEN and GEN3IA_LIVE_DEVICE_ID are required",
  );
}

const MAX_FRAME_BYTES = 1_500_000;
const DEFAULT_FRAME_INTERVAL_MS = 900;
const ActionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("mouse.move"), x: z.number().finite().min(0), y: z.number().finite().min(0) }),
  z.object({ type: z.literal("mouse.click"), button: z.enum(["left", "middle", "right"]) }),
  z.object({ type: z.literal("keyboard.type"), text: z.string().max(10000) }),
  z.object({ type: z.literal("keyboard.key"), key: z.string().min(1).max(64) }),
  z.object({ type: z.literal("wait"), ms: z.number().int().min(50).max(30000) }),
]);

let socket: WebSocket | null = null;
let heartbeatTimer: NodeJS.Timeout | undefined;
let captureTimer: NodeJS.Timeout | undefined;
let reconnectTimer: NodeJS.Timeout | undefined;
let reconnectDelay = 1000;
let stopped = false;
let paused = false;
let frameIntervalMs = DEFAULT_FRAME_INTERVAL_MS;

function send(message: unknown) {
  if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message));
}

function startCapture() {
  if (stopped || paused || captureTimer) return;
  captureTimer = setInterval(() => void captureAndSend(), frameIntervalMs);
  void captureAndSend();
}

function stopCapture() {
  if (captureTimer) clearInterval(captureTimer);
  captureTimer = undefined;
}

async function captureAndSend() {
  if (stopped || paused || socket?.readyState !== WebSocket.OPEN) return;
  try {
    const jpeg = await screenshot({ format: "jpg" });
    if (jpeg.length > MAX_FRAME_BYTES) return;
    const dimensions = imageSize(jpeg);
    if (!dimensions.width || !dimensions.height) return;
    send({
      type: "frame",
      sessionId,
      deviceId,
      timestamp: Date.now(),
      width: dimensions.width,
      height: dimensions.height,
      jpegBase64: jpeg.toString("base64"),
    });
  } catch (error) {
    console.error("screen capture failed", error);
  }
}

function keyFromString(value: string): Key | null {
  const keys: Record<string, Key> = {
    Enter: Key.Enter, Escape: Key.Escape, Tab: Key.Tab, Backspace: Key.Backspace,
    Delete: Key.Delete, ArrowUp: Key.Up, ArrowDown: Key.Down, ArrowLeft: Key.Left,
    ArrowRight: Key.Right, Home: Key.Home, End: Key.End, PageUp: Key.PageUp,
    PageDown: Key.PageDown, Space: Key.Space, Control: Key.LeftControl,
    Shift: Key.LeftShift, Alt: Key.LeftAlt,
  };
  return keys[value] ?? null;
}

async function executeAction(rawAction: unknown) {
  const action = ActionSchema.parse(rawAction);
  switch (action.type) {
    case "mouse.move":
      await mouse.setPosition(new Point(action.x, action.y));
      return;
    case "mouse.click":
      await mouse.click(
        action.button === "right"
          ? Button.RIGHT
          : action.button === "middle"
            ? Button.MIDDLE
            : Button.LEFT,
      );
      return;
    case "keyboard.type":
      await keyboard.type(action.text);
      return;
    case "keyboard.key": {
      const key = keyFromString(action.key);
      if (!key) throw new Error(`Unsupported keyboard key: ${action.key}`);
      await keyboard.pressKey(key);
      return;
    }
    case "wait":
      await new Promise((resolve) => setTimeout(resolve, action.ms));
      return;
  }
}

function scheduleReconnect() {
  if (stopped || reconnectTimer) return;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = undefined;
    connect();
  }, reconnectDelay);
  reconnectDelay = Math.min(reconnectDelay * 2, 30_000);
}

function connect() {
  if (stopped) return;
  socket = new WebSocket(gatewayUrl!, { maxPayload: 2_000_000 });

  socket.on("open", () => {
    reconnectDelay = 1000;
    send({ type: "hello", sessionId, deviceId, pairingToken });
  });

  socket.on("message", async (raw) => {
    try {
      const message = JSON.parse(raw.toString()) as Record<string, unknown>;

      if (message.type === "hello.ack") {
        const heartbeatInterval = Number(message.heartbeatIntervalMs);
        frameIntervalMs = Math.max(
          DEFAULT_FRAME_INTERVAL_MS,
          Number(message.frameIntervalMs) || DEFAULT_FRAME_INTERVAL_MS,
        );
        if (heartbeatTimer) clearInterval(heartbeatTimer);
        heartbeatTimer = setInterval(() => {
          send({ type: "heartbeat", sessionId, deviceId, timestamp: Date.now() });
        }, Number.isFinite(heartbeatInterval) && heartbeatInterval >= 5000 ? heartbeatInterval : 15000);
        paused = false;
        startCapture();
        return;
      }

      if (message.type === "action") {
        const actionId = typeof message.actionId === "string" ? message.actionId : "";
        try {
          await executeAction(message.action);
          send({ type: "action.result", sessionId, actionId, ok: true });
        } catch (error) {
          send({
            type: "action.result",
            sessionId,
            actionId,
            ok: false,
            error: error instanceof Error ? error.message : String(error),
          });
        }
        return;
      }

      if (message.type === "pause") {
        paused = true;
        stopCapture();
        console.warn(`Gen3ia Live Agent paused: ${String(message.reason || "No reason provided")}`);
        return;
      }

      if (message.type === "resume") {
        paused = false;
        startCapture();
        return;
      }

      if (message.type === "stop") {
        paused = true;
        stopped = true;
        stopCapture();
        if (heartbeatTimer) clearInterval(heartbeatTimer);
        heartbeatTimer = undefined;
        console.warn(`Gen3ia Live Agent stopped: ${String(message.reason || "No reason provided")}`);
      }
    } catch (error) {
      console.error("invalid gateway message", error);
    }
  });

  socket.on("close", () => {
    if (heartbeatTimer) clearInterval(heartbeatTimer);
    stopCapture();
    heartbeatTimer = undefined;
    scheduleReconnect();
  });

  socket.on("error", (error) => console.error("live gateway error", error.message));
}

process.on("SIGINT", () => {
  stopped = true;
  stopCapture();
  socket?.close();
});
process.on("SIGTERM", () => {
  stopped = true;
  stopCapture();
  socket?.close();
});

connect();
