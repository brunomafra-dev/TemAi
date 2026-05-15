import { NextResponse } from "next/server";
import { consumeAuthRateLimit } from "@/features/security/auth-rate-limit";
import { rateLimitResponse, requireAuthUserId } from "@/features/security/auth-user";
import { getSupabaseServiceRoleClient } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const userId = await requireAuthUserId(request);
    if (!userId) {
      return NextResponse.json({ message: "Sessão obrigatória." }, { status: 401 });
    }

    const endpointRateLimit = await consumeAuthRateLimit({
      route: "profile-badges",
      request,
      identifier: userId,
    });
    if (!endpointRateLimit.allowed) {
      return rateLimitResponse(endpointRateLimit.retryAfterSeconds);
    }

    const supabase = getSupabaseServiceRoleClient();
    const { data, error } = await supabase.rpc("refresh_personal_badges", {
      p_user_id: userId,
    });
    if (error) throw error;

    return NextResponse.json({
      badges: Array.isArray(data) ? data.filter((item): item is string => typeof item === "string") : [],
    });
  } catch {
    return NextResponse.json({ message: "Falha ao carregar insígnias." }, { status: 500 });
  }
}
