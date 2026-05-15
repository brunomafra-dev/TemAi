import { NextResponse } from "next/server";
import { getLibraryRecipeFeedback } from "@/features/community/recipe-feedback";
import { consumeAuthRateLimit } from "@/features/security/auth-rate-limit";
import { rateLimitResponse, readSafeBearerToken } from "@/features/security/auth-user";
import { getSupabaseServiceRoleClient } from "@/lib/supabase-admin";
import { sanitizePathParam, validationErrorResponse } from "@/lib/input-validation";

async function readOptionalUserId(request: Request): Promise<string | undefined> {
  const token = readSafeBearerToken(request);
  if (!token) return undefined;
  const supabase = getSupabaseServiceRoleClient();
  const userRes = await supabase.auth.getUser(token);
  return userRes.data.user?.id || undefined;
}

export async function GET(
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
      route: "library-feedback",
      request,
      identifier: recipeSlug,
    });
    if (!endpointRateLimit.allowed) {
      return rateLimitResponse(endpointRateLimit.retryAfterSeconds);
    }

    const userId = await readOptionalUserId(request);
    const feedback = await getLibraryRecipeFeedback({ recipeSlug, userId });
    if (!feedback) {
      return NextResponse.json({ message: "Receita não encontrada." }, { status: 404 });
    }

    return NextResponse.json(feedback);
  } catch (error) {
    const validationResponse = validationErrorResponse(error);
    if (validationResponse) return validationResponse;
    return NextResponse.json({ message: "Falha ao carregar feedback." }, { status: 500 });
  }
}
