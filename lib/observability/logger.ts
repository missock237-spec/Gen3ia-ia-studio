import "server-only";

import pino, { type Logger } from "pino";

const REDACT_PATHS = [
  "req.headers.authorization",
  "req.headers.cookie",
  "headers.authorization",
  "headers.cookie",
  "authorization",
  "cookie",
  "password",
  "token",
  "accessToken",
  "refreshToken",
  "apiKey",
  "secret",
  "privateKey",
  "clientSecret",
  "arguments.password",
  "arguments.token",
  "arguments.apiKey",
  "arguments.secret",
];

export const logger: Logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  base: {
    service: "gen3ia-ai-studio",
    environment: process.env.NODE_ENV ?? "development",
  },
  redact: {
    paths: REDACT_PATHS,
    censor: "[REDACTED]",
  },
  serializers: {
    err: pino.stdSerializers.err,
  },
});

export function executionLogger(context: {
  requestId?: string;
  executionId?: string;
  userId?: string;
  agentId?: string;
  stepId?: string;
  toolName?: string;
}): Logger {
  return logger.child(context);
}

export function safeError(error: unknown): { name: string; message: string; stack?: string } {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      ...(process.env.NODE_ENV !== "production" && error.stack
        ? { stack: error.stack }
        : {}),
    };
  }

  return { name: "UnknownError", message: String(error) };
}
