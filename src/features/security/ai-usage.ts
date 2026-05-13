import "server-only";
import type { InputMode } from "@/features/recipes/types";
import { getSupabaseServiceRoleClient } from "@/lib/supabase-admin";

export const FREE_RECIPE_AI_MONTHLY_LIMIT = 3;
export const FREE_SUPPORT_AI_MONTHLY_LIMIT = 10;
export const PREMIUM_SUPPORT_AI_MONTHLY_LIMIT = 100;

export type AiUsageFeature = "suggestions" | "recipe" | "author_recipe" | "support_agent";
export type AiUsageBucket = "recipe_ai" | "support_ai";
export type AiUsageInputMode = InputMode | "none";

export type AiEntitlement = {
  plan: "free" | "premium";
  status: "active" | "canceled" | "past_due" | "expired";
  isPremium: boolean;
};

export class AiUsageError extends Error {
  status: number;

  constructor(message: string, status = 403) {
    super(message);
    this.name = "AiUsageError";
    this.status = status;
  }
}

function startOfCurrentMonthIso(): string {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
  return start.toISOString();
}

export async function getAiEntitlement(userId: string): Promise<AiEntitlement> {
  const supabase = getSupabaseServiceRoleClient();
  const { data } = await supabase
    .from("user_subscriptions")
    .select("plan,status,current_period_end")
    .eq("user_id", userId)
    .maybeSingle();

  const plan = data?.plan === "premium" ? "premium" : "free";
  const status =
    data?.status === "canceled" || data?.status === "past_due" || data?.status === "expired"
      ? data.status
      : "active";
  const periodEnd = data?.current_period_end ? new Date(data.current_period_end) : null;
  const hasActivePeriod = !periodEnd || periodEnd.getTime() >= Date.now();
  const isPremium = plan === "premium" && status === "active" && hasActivePeriod;

  return { plan, status, isPremium };
}

function monthlyLimitFor(params: {
  bucket: AiUsageBucket;
  entitlement: AiEntitlement;
}): number {
  if (params.bucket === "recipe_ai") {
    return params.entitlement.isPremium ? -1 : FREE_RECIPE_AI_MONTHLY_LIMIT;
  }

  return params.entitlement.isPremium ? PREMIUM_SUPPORT_AI_MONTHLY_LIMIT : FREE_SUPPORT_AI_MONTHLY_LIMIT;
}

export async function consumeAiUsage(params: {
  userId: string;
  bucket: AiUsageBucket;
  feature: AiUsageFeature;
  inputMode?: AiUsageInputMode;
}): Promise<{
  entitlement: AiEntitlement;
  eventId: string;
  used: number;
  remaining: number;
  limit: number;
}> {
  const entitlement = await getAiEntitlement(params.userId);
  const limit = monthlyLimitFor({ bucket: params.bucket, entitlement });
  const supabase = getSupabaseServiceRoleClient();
  const { data, error } = await supabase.rpc("consume_ai_usage_event", {
    p_user_id: params.userId,
    p_bucket: params.bucket,
    p_feature: params.feature,
    p_input_mode: params.inputMode || "none",
    p_limit: limit,
    p_window_start: startOfCurrentMonthIso(),
  });

  if (error || !Array.isArray(data) || data.length === 0) {
    throw new AiUsageError("Não foi possível validar seu limite de IA agora.", 503);
  }

  const first = data[0] as {
    allowed: boolean;
    used: number;
    remaining: number;
    event_id: string | null;
  };

  if (!first.allowed || !first.event_id) {
    const message =
      params.bucket === "support_ai"
        ? "Limite mensal do suporte IA atingido."
        : "Plano free atingiu o limite de 3 gerações de IA neste mês.";
    throw new AiUsageError(message, 429);
  }

  return {
    entitlement,
    eventId: first.event_id,
    used: Number(first.used) || 0,
    remaining: Number(first.remaining) || 0,
    limit,
  };
}

export async function refundAiUsageEvent(userId: string, eventId?: string): Promise<void> {
  if (!eventId) return;
  const supabase = getSupabaseServiceRoleClient();
  await supabase.rpc("refund_ai_usage_event", {
    p_event_id: eventId,
    p_user_id: userId,
  });
}

export function aiUsageErrorResponse(error: unknown): Response | null {
  if (!(error instanceof AiUsageError)) return null;
  return Response.json({ message: error.message }, { status: error.status });
}
