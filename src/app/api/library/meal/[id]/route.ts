import { NextResponse } from "next/server";
import { consumePublicReadRateLimit } from "@/features/security/auth-rate-limit";
import { rateLimitResponse } from "@/features/security/auth-user";
import { getRecipeBySlugFromSupabase } from "@/features/recipes/supabase-library";
import { sanitizePathParam, validationErrorResponse } from "@/lib/input-validation";
import { elapsedMs, logApiEvent } from "@/lib/observability";

const MEAL_CACHE_HEADERS = {
  "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
};

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const startedAt = Date.now();

  try {
    const params = await context.params;
    const mealId = sanitizePathParam(params.id, {
      fieldName: "ID da receita",
      maxLength: 160,
      pattern: /^[a-z0-9._-]+$/i,
    });
    const endpointRateLimit = await consumePublicReadRateLimit({
      route: "library-meal",
      request,
      identifier: mealId,
    });
    if (!endpointRateLimit.allowed) {
      logApiEvent({
        route: "library-meal",
        status: 429,
        durationMs: elapsedMs(startedAt),
        metadata: { mealId },
      });
      return rateLimitResponse(endpointRateLimit.retryAfterSeconds);
    }

    const recipeFromSupabase = await getRecipeBySlugFromSupabase(mealId);
    if (recipeFromSupabase) {
      logApiEvent({
        route: "library-meal",
        status: 200,
        durationMs: elapsedMs(startedAt),
        metadata: { mealId },
      });
      return NextResponse.json(
        { recipe: recipeFromSupabase, source: "supabase" },
        { headers: MEAL_CACHE_HEADERS },
      );
    }

    logApiEvent({
      route: "library-meal",
      status: 404,
      durationMs: elapsedMs(startedAt),
      metadata: { mealId },
    });
    return NextResponse.json({ message: "Receita nao encontrada no Supabase." }, { status: 404 });
  } catch (error) {
    const validationResponse = validationErrorResponse(error);
    if (validationResponse) {
      logApiEvent({
        route: "library-meal",
        status: validationResponse.status,
        durationMs: elapsedMs(startedAt),
        error,
      });
      return validationResponse;
    }

    logApiEvent({
      route: "library-meal",
      status: 500,
      durationMs: elapsedMs(startedAt),
      error,
    });
    return NextResponse.json({ message: "Falha ao carregar receita do Supabase." }, { status: 500 });
  }
}
