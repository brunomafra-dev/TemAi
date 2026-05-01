import { NextResponse } from "next/server";
import { consumeAuthRateLimit } from "@/features/security/auth-rate-limit";
import { rateLimitResponse, readSafeBearerToken } from "@/features/security/auth-user";
import { getSupabaseServiceRoleClient } from "@/lib/supabase-admin";

export async function DELETE(request: Request) {
  try {
    const token = readSafeBearerToken(request);
    const rateLimit = await consumeAuthRateLimit({
      route: "delete-account",
      request,
      identifier: token || "anonymous",
    });
    if (!rateLimit.allowed) {
      return rateLimitResponse(rateLimit.retryAfterSeconds);
    }

    if (!token) {
      return NextResponse.json({ message: "Sessão obrigatória." }, { status: 401 });
    }

    const supabase = getSupabaseServiceRoleClient();
    const userRes = await supabase.auth.getUser(token);
    const userId = userRes.data.user?.id || "";

    if (userRes.error || !userId) {
      return NextResponse.json({ message: "Sessão inválida ou expirada." }, { status: 401 });
    }

    const deleteRes = await supabase.auth.admin.deleteUser(userId);
    if (deleteRes.error) {
      return NextResponse.json(
        { message: deleteRes.error.message || "Não foi possível excluir a conta." },
        { status: 500 },
      );
    }

    return NextResponse.json({ message: "Conta excluída com sucesso." });
  } catch (error) {
    console.error("[auth/account] Falha ao excluir conta", error);
    return NextResponse.json({ message: "Falha ao excluir conta." }, { status: 500 });
  }
}
