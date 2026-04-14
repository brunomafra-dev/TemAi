import { createHash } from "crypto";
import { getSupabaseServiceRoleClient } from "@/lib/supabase-admin";

export const AUTH_RATE_LIMIT_MAX_ATTEMPTS = 5;
export const AUTH_RATE_LIMIT_WINDOW_SECONDS = 15 * 60;

interface ConsumeRateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
  attempts: number;
  key: string;
}

function normalizeIdentifier(value?: string): string {
  return value?.trim().toLowerCase() || "-";
}

function readIpFromRequest(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const ip = forwardedFor.split(",")[0]?.trim();
    if (ip) return ip;
  }

  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;

  const cfIp = request.headers.get("cf-connecting-ip")?.trim();
  if (cfIp) return cfIp;

  return "unknown-ip";
}

function buildRateLimitKey(route: string, request: Request, identifier?: string): string {
  const rawKey = `${route}|${readIpFromRequest(request)}|${normalizeIdentifier(identifier)}`;
  const hash = createHash("sha256").update(rawKey).digest("hex");
  return `auth:${route}:${hash}`;
}

export async function consumeAuthRateLimit(params: {
  route: "login" | "register" | "forgot-password";
  request: Request;
  identifier?: string;
}): Promise<ConsumeRateLimitResult> {
  const key = buildRateLimitKey(params.route, params.request, params.identifier);
  const client = getSupabaseServiceRoleClient();
  const { data, error } = await client.rpc("consume_auth_rate_limit", {
    p_key: key,
    p_max_attempts: AUTH_RATE_LIMIT_MAX_ATTEMPTS,
    p_window_seconds: AUTH_RATE_LIMIT_WINDOW_SECONDS,
  });

  if (error || !Array.isArray(data) || data.length === 0) {
    throw new Error("Falha ao aplicar rate limit.");
  }

  const first = data[0] as {
    allowed: boolean;
    remaining: number;
    retry_after_seconds: number;
    attempts: number;
  };

  return {
    key,
    allowed: Boolean(first.allowed),
    remaining: Number(first.remaining) || 0,
    retryAfterSeconds: Number(first.retry_after_seconds) || 0,
    attempts: Number(first.attempts) || 0,
  };
}

export async function resetAuthRateLimit(key: string): Promise<void> {
  if (!key) return;
  const client = getSupabaseServiceRoleClient();
  await client.rpc("reset_auth_rate_limit", { p_key: key });
}
