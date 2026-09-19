import type { AIRequest, AIResponse } from "@/lib/ai/models";
import { generate, selectProvider } from "@/lib/ai/router";
import { estimateExecutionCost, costFromAIResponse } from "./cost-engine";
import { getWallet, reserveFunds, settleReservation, releaseReservation } from "./wallet";

function conservativeInputTokens(request: AIRequest): number {
  const text = [request.system ?? "", ...request.messages.map((message) => message.content)].join("\n");
  // Character/token ratios vary by language and provider. Reserve conservatively;
  // settlement always uses the provider-reported usage when available.
  return Math.max(1, Math.ceil(text.length / 3));
}

export interface BilledAIResponse {
  response: AIResponse;
  chargeMinor: number;
  providerCostEur: number;
}

function worstCaseReserve(request: AIRequest, complexity: number): number {
  const inputTokens = conservativeInputTokens(request);
  const outputTokens = Math.max(1, request.maxTokens ?? 1024);
  const candidates = selectProvider(request);

  if (candidates.length === 0) {
    throw new Error(`No configured provider can execute task "${request.task}".`);
  }

  const worst = Math.max(
    ...candidates.map((candidate) =>
      estimateExecutionCost({
        task: request.task,
        provider: candidate.provider,
        model: candidate.model,
        inputTokens,
        outputTokens,
        complexity,
        toolCalls: request.requiresTools ? 1 : 0,
      }).reserveMinor,
    ),
  );

  // Garde-fou facturation : Math.max(...[NaN]) === NaN serait rejeté plus bas
  // par la validation du portefeuille. Fallback : 100 minor (1 EUR).
  return Number.isSafeInteger(worst) && worst >= 1 ? worst : 100;
}

export async function generateForUser(params: {
  userId: string;
  executionId: string;
  request: AIRequest;
  complexity?: number;
}): Promise<BilledAIResponse> {
  const complexity = params.complexity ?? (params.request.requiresTools ? 1.15 : 1);
  const reserveMinor = worstCaseReserve(params.request, complexity);
  const wallet = await getWallet(params.userId);

  if (wallet.availableMinor < reserveMinor) {
    throw new Error(
      `Insufficient balance. Required reserve: ${reserveMinor} ${wallet.currency} cents; available: ${wallet.availableMinor} ${wallet.currency} cents.`,
    );
  }

  const reference = `ai_${params.executionId}_${crypto.randomUUID()}`;
  await reserveFunds({
    userId: params.userId,
    amountMinor: reserveMinor,
    reference,
    metadata: {
      task: params.request.task,
      provider: params.request.provider ?? "auto",
      model: params.request.model ?? "auto",
      reservePolicy: "worst-case-configured-provider",
    },
  });

  try {
    const response = await generate(params.request);
    const actual = costFromAIResponse(params.request, response);

    await settleReservation({
      userId: params.userId,
      reference,
      reservedMinor: reserveMinor,
      actualChargeMinor: actual.chargeMinor,
      metadata: {
        task: params.request.task,
        provider: response.provider,
        model: response.model,
        inputTokens: String(response.usage.inputTokens),
        outputTokens: String(response.usage.outputTokens),
      },
    });

    return {
      response,
      chargeMinor: actual.chargeMinor,
      providerCostEur: actual.providerCostEur,
    };
  } catch (error) {
    await releaseReservation({
      userId: params.userId,
      reference,
      reservedMinor: reserveMinor,
    }).catch(() => undefined);
    throw error;
  }
}
