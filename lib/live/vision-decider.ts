import OpenAI from "openai";
import { z } from "zod";
import { LiveActionSchema, type LiveAction, type LiveSession } from "./types";

const DecisionSchema = z.object({
  done: z.boolean(),
  message: z.string().max(2000).default(""),
  action: LiveActionSchema.nullable().default(null),
});

const MAX_FRAME_BYTES = 1_500_000;
const MAX_CONTEXT_ERROR = 2000;

function getClient() {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY is required for live vision");
  return new OpenAI({ apiKey: key });
}

export interface LiveActionFeedback {
  ok: boolean;
  error?: string;
  at: number;
}

export async function decideLiveAction(
  session: LiveSession,
  jpeg: Buffer,
  width: number,
  height: number,
  feedback?: LiveActionFeedback,
): Promise<z.infer<typeof DecisionSchema>> {
  if (!session.permissions.includes("screen.read")) {
    throw new Error("Live session has no screen.read permission");
  }
  if (jpeg.length === 0 || jpeg.length > MAX_FRAME_BYTES) {
    throw new Error("Live frame exceeds the allowed size");
  }

  const client = getClient();
  const model = process.env.LIVE_AGENT_VISION_MODEL || "gpt-4.1-mini";
  const response = await client.chat.completions.create({
    model,
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: [
          "You are the visual execution planner for a user-owned Gen3ia Live Agent.",
          "The user explicitly authorized this session. Inspect the current screen and advance the stated objective one safe step at a time.",
          "You receive the result of the previous action when available. Use it to determine whether the action succeeded and choose the next step.",
          "Never repeat a failed action without changing the approach or first verifying the current screen.",
          "Never invent UI state. If the objective is complete, set done=true.",
          "Prefer one minimal action per decision.",
          "Do not perform destructive, financial, account-security, credential, or irreversible actions autonomously.",
          "Do not ask for or expose passwords, API keys, recovery codes, cookies, tokens, or private secrets.",
          "If the screen is ambiguous or a human decision is required, return action=null and explain what is needed.",
          "Coordinates are pixels in the supplied frame.",
          "Return strict JSON: {done:boolean,message:string,action:null|{type,...}}.",
        ].join(" "),
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: JSON.stringify({
              objective: session.objective,
              viewport: { width, height },
              previousActionResult: feedback
                ? { ok: feedback.ok, error: feedback.error?.slice(0, MAX_CONTEXT_ERROR) }
                : null,
            }),
          },
          {
            type: "image_url",
            image_url: { url: `data:image/jpeg;base64,${jpeg.toString("base64")}` },
          },
        ],
      },
    ],
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("Live vision model returned no decision");
  const parsed = DecisionSchema.parse(JSON.parse(content));
  if (parsed.action) LiveActionSchema.parse(parsed.action);
  return parsed;
}

export function actionRequiresConfirmation(action: LiveAction): boolean {
  if (action.type === "keyboard.type") {
    return /password|secret|api[_ -]?key|token|recovery|private key/i.test(action.text);
  }
  return false;
}
