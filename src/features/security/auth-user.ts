import { getSupabaseServiceRoleClient } from "@/lib/supabase-admin";

const JWT_PATTERN = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;

export function readSafeBearerToken(request: Request): string {
  const authorization = request.headers.get("authorization") || "";
  if (!authorization.startsWith("Bearer ")) return "";

  const token = authorization.slice(7).trim();
  if (!token || token.length > 4096 || !JWT_PATTERN.test(token)) return "";
  return token;
}

export async function requireAuthUserId(request: Request): Promise<string | null> {
  const token = readSafeBearerToken(request);
  if (!token) return null;

  const supabase = getSupabaseServiceRoleClient();
  const userRes = await supabase.auth.getUser(token);
  return userRes.data.user?.id || null;
}

export function rateLimitResponse(retryAfterSeconds: number): Response {
  return Response.json(
    {
      message: "Muitas solicitações. Tente novamente em alguns minutos.",
      retryAfterSeconds,
    },
    {
      status: 429,
      headers: { "Retry-After": String(retryAfterSeconds) },
    },
  );
}
