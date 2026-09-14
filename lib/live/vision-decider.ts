import OpenAI from "openai";
import { z } from "zod";
import { LiveActionSchema, type LiveAction, type LiveSession } from "./types";

const DecisionSchema = z.object({
  done: z.boolean(),
  message: z.string().max(2000).default(""),
  action: LiveActionSchema.nullable().default(null),
});

const MAX_FRAME_BYTES = 1_500_000;

function getClient() {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY is required for live vision");
  return new OpenAI({ apiKey: key });
}

export async function decideLiveAction(session: LiveSession, jpeg: Buffer, width: number, height: number): Promise<z.infer<typeof DecisionSchema>> {
  if (!session.permissions.includes("screen.read")) throw new Error("Live session has no screen.read permission");
  if (jpeg.length === 0 || jpeg.length > MAX_FRAME_BYTES) throw new Error("Live frame exceeds the allowed size");

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
          "Never invent UI state. If the objective is complete, set done=true.",
          "Prefer one minimal action per decision. Do not perform destructive, financial, account-security, or credential actions unless the objective explicitly requires them and the screen clearly shows the user authorized that exact task.",
          "Do not ask for or expose passwords, API keys, recovery codes, cookies, tokens, or private secrets.",
          "If the screen is ambiguous, return action=null and explain what is needed.",
          "Coordinates are pixels in the supplied frame. Return strict JSON: {done:boolean,message:string,action:null|{type,...}}.",
        ].join(" "),
      },
      {
        role: "user",
        content: [
          { type: "text", text: JSON.stringify({ objective: session.objective, viewport: { width, height } }) },
          { type: "image_url", image_url: { url: `data:image/jpeg;base64,${jpeg.toString("base64")}` } },
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
  return action.type === "keyboard.type" && /password|secret|api[_ -]?key|token|recovery|private key/i.test(action.text);
}
