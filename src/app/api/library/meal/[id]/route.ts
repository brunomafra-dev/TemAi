import { NextResponse } from "next/server";
import { consumeAuthRateLimit } from "@/features/security/auth-rate-limit";
import { rateLimitResponse } from "@/features/security/auth-user";
import { getRecipeBySlugFromSupabase } from "@/features/recipes/supabase-library";
import {
  sanitizePathParam,
  validationErrorResponse,
} from "@/lib/input-validation";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const params = await context.params;
    const mealId = sanitizePathParam(params.id, {
      fieldName: "ID da receita",
      maxLength: 160,
      pattern: /^[a-z0-9._-]+$/i,
    });
    const endpointRateLimit = await consumeAuthRateLimit({
      route: "library-meal",
      request,
      identifier: mealId,
    });
    if (!endpointRateLimit.allowed) {
      return rateLimitResponse(endpointRateLimit.retryAfterSeconds);
    }

    const recipeFromSupabase = await getRecipeBySlugFromSupabase(mealId);
    if (recipeFromSupabase) {
      return NextResponse.json({ recipe: recipeFromSupabase, source: "supabase" });
    }
    return NextResponse.json({ message: "Receita não encontrada no Supabase." }, { status: 404 });
  } catch (error) {
    const validationResponse = validationErrorResponse(error);
    if (validationResponse) return validationResponse;
    return NextResponse.json({ message: "Falha ao carregar receita do Supabase." }, { status: 500 });
  }
}
