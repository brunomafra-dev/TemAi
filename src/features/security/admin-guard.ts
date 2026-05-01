import "server-only";
import { NextResponse } from "next/server";
import { serverEnv } from "@/lib/env-server";
import { requireAuthUserId } from "@/features/security/auth-user";

export async function requireAdminUserId(request: Request): Promise<
  | { ok: true; userId: string }
  | { ok: false; response: NextResponse }
> {
  const userId = await requireAuthUserId(request);
  if (!userId) {
    return {
      ok: false,
      response: NextResponse.json({ message: "Sessão obrigatória." }, { status: 401 }),
    };
  }

  const admins = serverEnv.adminUserIds();
  if (!admins.includes(userId)) {
    return {
      ok: false,
      response: NextResponse.json({ message: "Acesso administrativo obrigatório." }, { status: 403 }),
    };
  }

  return { ok: true, userId };
}
