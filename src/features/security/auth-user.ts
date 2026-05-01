import { getSupabaseServiceRoleClient } from "@/lib/supabase-admin";

export async function requireAuthUserId(request: Request): Promise<string | null> {
  const authorization = request.headers.get("authorization") || "";
  if (!authorization.startsWith("Bearer ")) return null;

  const token = authorization.slice(7).trim();
  if (!token) return null;

  const supabase = getSupabaseServiceRoleClient();
  const userRes = await supabase.auth.getUser(token);
  return userRes.data.user?.id || null;
}

export function rateLimitResponse(retryAfterSeconds: number): Response {
  return Response.json(
    {
      message: "Muitas solicitacoes. Tente novamente em alguns minutos.",
      retryAfterSeconds,
    },
    {
      status: 429,
      headers: { "Retry-After": String(retryAfterSeconds) },
    },
  );
}
