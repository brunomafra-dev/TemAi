import { NextResponse } from "next/server";
import { recordLibraryRecipeView } from "@/features/community/recipe-feedback";
import { consumeAuthRateLimit } from "@/features/security/auth-rate-limit";
import { rateLimitResponse, readSafeBearerToken } from "@/features/security/auth-user";
import { getSupabaseServiceRoleClient } from "@/lib/supabase-admin";
import {
  parseJsonObjectBody,
  readRequiredString,
  sanitizePathParam,
  validationErrorResponse,
} from "@/lib/input-validation";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function readOptionalUserId(request: Request): Promise<string | undefined> {
  const token = readSafeBearerToken(request);
  if (!token) return undefined;
  const supabase = getSupabaseServiceRoleClient();
  const userRes = await supabase.auth.getUser(token);
  return userRes.data.user?.id || undefined;
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const params = await context.params;
    const recipeSlug = sanitizePathParam(params.id, {
      fieldName: "ID da receita",
      maxLength: 160,
      pattern: /^[a-z0-9._-]+$/i,
    });

    const endpointRateLimit = await consumeAuthRateLimit({
      route: "library-view",
      request,
      identifier: recipeSlug,
    });
    if (!endpointRateLimit.allowed) {
      return rateLimitResponse(endpointRateLimit.retryAfterSeconds);
    }

    const payload = await parseJsonObjectBody(request, {
      maxBytes: 4 * 1024,
      allowedKeys: ["visitorKey"],
    });
    const visitorKey = readRequiredString(payload, "visitorKey", {
      fieldName: "Visitante",
      minLength: 12,
      maxLength: 120,
      pattern: /^[a-z0-9._:-]+$/i,
    });
    const userId = await readOptionalUserId(request);
    const ok = await recordLibraryRecipeView({ recipeSlug, userId, visitorKey });
    if (!ok) {
      return NextResponse.json({ message: "Receita não encontrada." }, { status: 404 });
    }

    return NextResponse.json({ ok: true }, {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch (error) {
    const validationResponse = validationErrorResponse(error);
    if (validationResponse) return validationResponse;
    return NextResponse.json({ message: "Falha ao registrar acesso." }, { status: 500 });
  }
}
