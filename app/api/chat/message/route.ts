import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/security/authenticated-request";
import { generate } from "@/lib/ai/router";
import { appendMessage, createConversation, getConversation, listMessages } from "@/lib/chat/repository";

const Body = z.object({
  conversationId: z.string().min(1).max(128).optional(),
  message: z.string().trim().min(1).max(20000),
  provider: z.enum(["groq","openrouter","anthropic","openai","glm","huggingface"]).optional(),
  model: z.string().trim().max(200).optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().int().positive().max(20000).optional(),
  preferFree: z.boolean().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const body = Body.parse(await request.json());
    let conversationId = body.conversationId;
    if (conversationId && !(await getConversation(user.uid, conversationId))) return NextResponse.json({ error: "Conversation introuvable." }, { status: 404 });
    if (!conversationId) conversationId = (await createConversation(user.uid, body.message.slice(0, 60))).id;

    const history = await listMessages(user.uid, conversationId, 100);
    await appendMessage({ conversationId, userId: user.uid, role: "user", content: body.message });

    const response = await generate({
      task: "chat",
      messages: [...history.map(m => ({ role: m.role, content: m.content })), { role: "user", content: body.message }],
      provider: body.provider, model: body.model, temperature: body.temperature, maxTokens: body.maxTokens, preferFree: body.preferFree ?? true,
      metadata: { userId: user.uid, conversationId },
    });

    const assistant = await appendMessage({
      conversationId, userId: user.uid, role: "assistant", content: response.text,
      provider: response.provider, model: response.model, usage: response.usage,
    });
    return NextResponse.json({ conversationId, message: assistant, response: { id: response.id, provider: response.provider, model: response.model, usage: response.usage, latencyMs: response.latencyMs, finishReason: response.finishReason } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "La génération IA a échoué." }, { status: 400 });
  }
}
