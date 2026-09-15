import type { AIRequest, AIResponse } from "@/lib/ai/models";
import { generate } from "@/lib/ai/router";
import { estimateExecutionCost, costFromAIResponse } from "./cost-engine";
import { getWallet, reserveFunds, settleReservation, releaseReservation } from "./wallet";

function approximateInputTokens(request: AIRequest): number {
  const text = request.messages.map((message) => message.content).join("\n");
  return Math.max(1, Math.ceil(text.length / 4));
}

export interface BilledAIResponse {
  response: AIResponse;
  chargeMinor: number;
  providerCostEur: number;
}

export async function generateForUser(params: {
  userId: string;
  executionId: string;
  request: AIRequest;
  complexity?: number;
}): Promise<BilledAIResponse> {
  const inputTokens = approximateInputTokens(params.request);
  const reserveEstimate = estimateExecutionCost({
    task: params.request.task,
    provider: params.request.provider,
    model: params.request.model,
    inputTokens,
    outputTokens: Math.max(1, params.request.maxTokens ?? 1024),
    complexity: params.complexity ?? (params.request.requiresTools ? 1.15 : 1),
    toolCalls: params.request.requiresTools ? 1 : 0,
  });

  const wallet = await getWallet(params.userId);
  if (wallet.availableMinor < reserveEstimate.reserveMinor) {
    throw new Error(`Insufficient balance. Required reserve: ${reserveEstimate.reserveMinor} ${wallet.currency} cents; available: ${wallet.availableMinor} ${wallet.currency} cents.`);
  }

  const reference = `ai_${params.executionId}_${crypto.randomUUID()}`;
  await reserveFunds({
    userId: params.userId,
    amountMinor: reserveEstimate.reserveMinor,
    reference,
    metadata: { task: params.request.task, provider: params.request.provider ?? "auto" },
  });

  try {
    const response = await generate(params.request);
    const actual = costFromAIResponse(params.request, response);
    await settleReservation({
      userId: params.userId,
      reference,
      reservedMinor: reserveEstimate.reserveMinor,
      actualChargeMinor: actual.chargeMinor,
      metadata: {
        task: params.request.task,
        provider: response.provider,
        model: response.model,
        inputTokens: String(response.usage.inputTokens),
        outputTokens: String(response.usage.outputTokens),
      },
    });

    return { response, chargeMinor: actual.chargeMinor, providerCostEur: actual.providerCostEur };
  } catch (error) {
    await releaseReservation({ userId: params.userId, reference, reservedMinor: reserveEstimate.reserveMinor }).catch(() => undefined);
    throw error;
  }
}
