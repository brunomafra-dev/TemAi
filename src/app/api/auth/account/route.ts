import { NextResponse } from "next/server";
import { getSupabaseServiceRoleClient } from "@/lib/supabase-admin";

function readBearerToken(request: Request): string {
  const authorization = request.headers.get("authorization") || "";
  if (!authorization.startsWith("Bearer ")) return "";
  return authorization.slice(7).trim();
}

export async function DELETE(request: Request) {
  try {
    const token = readBearerToken(request);
    if (!token) {
      return NextResponse.json({ message: "Sessao obrigatoria." }, { status: 401 });
    }

    const supabase = getSupabaseServiceRoleClient();
    const userRes = await supabase.auth.getUser(token);
    const userId = userRes.data.user?.id || "";

    if (userRes.error || !userId) {
      return NextResponse.json({ message: "Sessao invalida ou expirada." }, { status: 401 });
    }

    const deleteRes = await supabase.auth.admin.deleteUser(userId);
    if (deleteRes.error) {
      return NextResponse.json(
        { message: deleteRes.error.message || "Nao foi possivel excluir a conta." },
        { status: 500 },
      );
    }

    return NextResponse.json({ message: "Conta excluida com sucesso." });
  } catch (error) {
    console.error("[auth/account] Falha ao excluir conta", error);
    return NextResponse.json({ message: "Falha ao excluir conta." }, { status: 500 });
  }
}
