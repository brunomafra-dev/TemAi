import { getSupabaseBrowserClient } from "@/lib/supabase-client";

export type SubscriptionPlan = "free" | "premium";
export type SubscriptionStatus = "active" | "canceled" | "past_due" | "expired";

export type SubscriptionState = {
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  billingCycle: "monthly" | "yearly";
  premiumUntil?: string;
  renewsAt?: string;
  usageCycleKey: string;
  aiGenerationsUsedThisMonth: number;
  aiGenerationsLimitThisMonth: number;
};

const STORAGE_KEY = "temai.subscription.v1";

const DEFAULT_SUBSCRIPTION: SubscriptionState = {
  plan: "free",
  status: "active",
  billingCycle: "monthly",
  usageCycleKey: "",
  aiGenerationsUsedThisMonth: 0,
  aiGenerationsLimitThisMonth: 3,
};

function currentUsageCycleKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value);
}

export function getSubscriptionState(): SubscriptionState {
  if (typeof window === "undefined") return DEFAULT_SUBSCRIPTION;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return { ...DEFAULT_SUBSCRIPTION, usageCycleKey: currentUsageCycleKey() };

  try {
    const parsed = JSON.parse(raw) as Partial<SubscriptionState>;
    const plan: SubscriptionPlan = parsed.plan === "premium" ? "premium" : "free";
    const status: SubscriptionStatus =
      parsed.status === "canceled" || parsed.status === "past_due" || parsed.status === "expired"
        ? parsed.status
        : "active";
    const usageCycleKey = currentUsageCycleKey();
    const parsedCycle = typeof parsed.usageCycleKey === "string" ? parsed.usageCycleKey : "";
    const shouldResetUsage = parsedCycle !== usageCycleKey;
    const usedThisMonth =
      typeof parsed.aiGenerationsUsedThisMonth === "number" && parsed.aiGenerationsUsedThisMonth >= 0
        ? parsed.aiGenerationsUsedThisMonth
        : 0;

    return {
      plan,
      status,
      billingCycle: parsed.billingCycle === "yearly" ? "yearly" : "monthly",
      premiumUntil: isIsoDate(parsed.premiumUntil) ? parsed.premiumUntil : undefined,
      renewsAt: isIsoDate(parsed.renewsAt) ? parsed.renewsAt : undefined,
      usageCycleKey,
      aiGenerationsUsedThisMonth: shouldResetUsage ? 0 : usedThisMonth,
      aiGenerationsLimitThisMonth: plan === "premium" ? 9999 : 3,
    };
  } catch {
    return { ...DEFAULT_SUBSCRIPTION, usageCycleKey: currentUsageCycleKey() };
  }
}

export function saveSubscriptionState(next: SubscriptionState): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

function toIsoDate(dateLike?: string | null): string | undefined {
  if (!dateLike) return undefined;
  const asDate = new Date(dateLike);
  if (Number.isNaN(asDate.getTime())) return undefined;
  return asDate.toISOString().slice(0, 10);
}

export async function syncSubscriptionFromCloud(): Promise<SubscriptionState | null> {
  const client = getSupabaseBrowserClient();
  if (!client) return null;

  const userRes = await client.auth.getUser();
  const userId = userRes.data.user?.id;
  if (!userId) return null;

  const { data, error } = await client
    .from("user_subscriptions")
    .select("plan,status,billing_cycle,current_period_end,next_renewal_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) return null;

  if (!data) {
    const fallback = { ...DEFAULT_SUBSCRIPTION, usageCycleKey: currentUsageCycleKey() };
    saveSubscriptionState(fallback);
    return fallback;
  }

  const next: SubscriptionState = {
    plan: data.plan === "premium" ? "premium" : "free",
    status:
      data.status === "canceled" || data.status === "past_due" || data.status === "expired"
        ? data.status
        : "active",
    billingCycle: data.billing_cycle === "yearly" ? "yearly" : "monthly",
    premiumUntil: toIsoDate(data.current_period_end),
    renewsAt: toIsoDate(data.next_renewal_at),
    usageCycleKey: currentUsageCycleKey(),
    aiGenerationsUsedThisMonth: 0,
    aiGenerationsLimitThisMonth: data.plan === "premium" ? 9999 : 3,
  };

  saveSubscriptionState(next);
  return next;
}

export function consumeAiGenerationAttempt(): SubscriptionState {
  const current = getSubscriptionState();
  if (current.plan === "premium" && current.status === "active") return current;

  const next = {
    ...current,
    aiGenerationsUsedThisMonth: Math.min(
      current.aiGenerationsLimitThisMonth,
      current.aiGenerationsUsedThisMonth + 1,
    ),
  };
  saveSubscriptionState(next);
  return next;
}
