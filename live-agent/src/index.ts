import screenshot from "screenshot-desktop";
import { imageSize } from "image-size";
import { Button, Key, Point, keyboard, mouse } from "@nut-tree/nut-js";
import WebSocket from "ws";

const gatewayUrl = process.env.GEN3IA_LIVE_GATEWAY_URL;
const sessionId = process.env.GEN3IA_LIVE_SESSION_ID;
const pairingToken = process.env.GEN3IA_LIVE_PAIRING_TOKEN;
const deviceId = process.env.GEN3IA_LIVE_DEVICE_ID;

if (!gatewayUrl || !sessionId || !pairingToken || !deviceId) {
  throw new Error("GEN3IA_LIVE_GATEWAY_URL, GEN3IA_LIVE_SESSION_ID, GEN3IA_LIVE_PAIRING_TOKEN and GEN3IA_LIVE_DEVICE_ID are required");
}

const MAX_FRAME_BYTES = 1_500_000;
const FRAME_INTERVAL_MS = 350;
let socket: WebSocket | null = null;
let heartbeatTimer: NodeJS.Timeout | undefined;
let captureTimer: NodeJS.Timeout | undefined;
let reconnectTimer: NodeJS.Timeout | undefined;
let reconnectDelay = 1000;
let stopped = false;

function send(message: unknown) {
  if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message));
}

async function captureAndSend() {
  if (stopped || socket?.readyState !== WebSocket.OPEN) return;
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

async function executeAction(action: any) {
  switch (action.type) {
    case "mouse.move":
      await mouse.setPosition(new Point(action.x, action.y));
      return;
    case "mouse.click":
      await mouse.click(action.button === "right" ? Button.RIGHT : action.button === "middle" ? Button.MIDDLE : Button.LEFT);
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
    default:
      throw new Error("Unsupported live action");
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
      const message = JSON.parse(raw.toString());
      if (message.type === "hello.ack") {
        if (heartbeatTimer) clearInterval(heartbeatTimer);
        heartbeatTimer = setInterval(() => {
          send({ type: "heartbeat", sessionId, deviceId, timestamp: Date.now() });
        }, message.heartbeatIntervalMs);
        if (captureTimer) clearInterval(captureTimer);
        captureTimer = setInterval(() => void captureAndSend(), FRAME_INTERVAL_MS);
        await captureAndSend();
        return;
      }
      if (message.type === "action") {
        try {
          await executeAction(message.action);
          send({ type: "action.result", sessionId, actionId: message.actionId, ok: true });
        } catch (error) {
          send({ type: "action.result", sessionId, actionId: message.actionId, ok: false, error: error instanceof Error ? error.message : String(error) });
        }
        return;
      }
      if (message.type === "pause" || message.type === "stop") {
        if (captureTimer) clearInterval(captureTimer);
        if (message.type === "stop") stopped = true;
        console.warn(`Gen3ia Live Agent ${message.type}: ${message.reason}`);
      }
    } catch (error) {
      console.error("invalid gateway message", error);
    }
  });

  socket.on("close", () => {
    if (heartbeatTimer) clearInterval(heartbeatTimer);
    if (captureTimer) clearInterval(captureTimer);
    heartbeatTimer = undefined;
    captureTimer = undefined;
    scheduleReconnect();
  });

  socket.on("error", (error) => console.error("live gateway error", error.message));
}

process.on("SIGINT", () => { stopped = true; socket?.close(); });
process.on("SIGTERM", () => { stopped = true; socket?.close(); });

connect();
