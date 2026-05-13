import "server-only";
import { getSupabaseServiceRoleClient } from "@/lib/supabase-admin";

type OpenAiUsage = {
  input_tokens?: number;
  output_tokens?: number;
  total_tokens?: number;
};

export type AiTelemetryContext = {
  userId?: string;
  route: string;
  operation: string;
  feature: string;
  inputMode?: string;
  metadata?: Record<string, unknown>;
};

const MODEL_PRICES_USD_PER_MILLION: Record<string, { input: number; output: number }> = {
  "gpt-5.4-mini": { input: 0.75, output: 4.5 },
  "gpt-4.1-mini": { input: 0.4, output: 1.6 },
};

function readNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function extractOpenAiUsage(payload: unknown): OpenAiUsage | null {
  if (!payload || typeof payload !== "object") return null;
  const usage = (payload as { usage?: unknown }).usage;
  if (!usage || typeof usage !== "object") return null;

  const inputTokens = readNumber((usage as { input_tokens?: unknown }).input_tokens);
  const outputTokens = readNumber((usage as { output_tokens?: unknown }).output_tokens);
  const totalTokens = readNumber((usage as { total_tokens?: unknown }).total_tokens);

  if (inputTokens === null && outputTokens === null && totalTokens === null) return null;
  return {
    input_tokens: inputTokens ?? undefined,
    output_tokens: outputTokens ?? undefined,
    total_tokens: totalTokens ?? undefined,
  };
}

function estimateCostUsd(model: string, usage: OpenAiUsage | null): number | null {
  if (!usage) return null;
  const price = MODEL_PRICES_USD_PER_MILLION[model];
  if (!price) return null;

  const inputCost = ((usage.input_tokens || 0) / 1_000_000) * price.input;
  const outputCost = ((usage.output_tokens || 0) / 1_000_000) * price.output;
  return Number((inputCost + outputCost).toFixed(8));
}

export async function logOpenAiTelemetry(params: {
  model: string;
  usage: OpenAiUsage | null;
  context?: AiTelemetryContext;
}): Promise<void> {
  if (!params.context) return;

  try {
    const supabase = getSupabaseServiceRoleClient();
    await supabase.from("ai_call_usage").insert({
      user_id: params.context.userId || null,
      route: params.context.route,
      operation: params.context.operation,
      feature: params.context.feature,
      input_mode: params.context.inputMode || "none",
      model: params.model,
      input_tokens: params.usage?.input_tokens ?? null,
      output_tokens: params.usage?.output_tokens ?? null,
      total_tokens: params.usage?.total_tokens ?? null,
      cost_usd: estimateCostUsd(params.model, params.usage),
      metadata: params.context.metadata || {},
    });
  } catch {
    // Telemetry cannot block the user flow.
  }
}
