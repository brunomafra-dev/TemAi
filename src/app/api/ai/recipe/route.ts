import { NextResponse } from "next/server";
import { generateFullRecipeWithOpenAi, isOpenAiGenerationError } from "@/features/recipes/openai-generator";
import type { Recipe } from "@/features/recipes/types";
import { aiUsageErrorResponse, consumeAiUsage } from "@/features/security/ai-usage";
import { consumeAuthRateLimit } from "@/features/security/auth-rate-limit";
import { rateLimitResponse, requireAuthUserId } from "@/features/security/auth-user";
import { getSupabaseServiceRoleClient } from "@/lib/supabase-admin";
import {
  parseJsonObjectBody,
  readOptionalBoolean,
  readOptionalString,
  readRequiredString,
  readStringArray,
  validationErrorResponse,
} from "@/lib/input-validation";

interface RecipePayload {
  suggestionId?: string;
  suggestionTitle?: string;
  ingredients?: string[];
  includeNutrition?: boolean;
  generationId?: string;
}

function isRecipe(value: unknown): value is Recipe {
  if (!value || typeof value !== "object") return false;
  const recipe = value as Partial<Recipe>;
  return (
    typeof recipe.id === "string" &&
    typeof recipe.title === "string" &&
    typeof recipe.description === "string" &&
    Array.isArray(recipe.ingredients) &&
    Array.isArray(recipe.steps) &&
    typeof recipe.prepMinutes === "number" &&
    typeof recipe.servings === "number" &&
    typeof recipe.sourceLabel === "string" &&
    recipe.origin === "ai"
  );
}

function generationHasSuggestion(suggestions: unknown, suggestionId: string): boolean {
  if (!Array.isArray(suggestions)) return false;
  return suggestions.some((item) => {
    if (!item || typeof item !== "object") return false;
    return (item as { id?: unknown }).id === suggestionId;
  });
}

async function verifyGeneratedSuggestion(params: {
  userId: string;
  generationId: string;
  suggestionId: string;
}): Promise<boolean> {
  const supabase = getSupabaseServiceRoleClient();
  const { data, error } = await supabase
    .from("ai_generation_logs")
    .select("id,suggestions")
    .eq("id", params.generationId)
    .eq("user_id", params.userId)
    .maybeSingle();

  if (error || !data) return false;
  return generationHasSuggestion((data as { suggestions?: unknown }).suggestions, params.suggestionId);
}

async function readGeneratedRecipeCache(params: {
  userId: string;
  generationId: string;
  suggestionId: string;
  includeNutrition: boolean;
}): Promise<Recipe | null> {
  const supabase = getSupabaseServiceRoleClient();
  const { data, error } = await supabase
    .from("ai_generated_recipes")
    .select("recipe")
    .eq("user_id", params.userId)
    .eq("generation_log_id", params.generationId)
    .eq("suggestion_id", params.suggestionId)
    .eq("include_nutrition", params.includeNutrition)
    .maybeSingle();

  if (error || !data) return null;
  const recipe = (data as { recipe?: unknown }).recipe;
  return isRecipe(recipe) ? recipe : null;
}

async function persistGeneratedRecipeCache(params: {
  userId: string;
  generationId: string;
  suggestionId: string;
  includeNutrition: boolean;
  recipe: Recipe;
}): Promise<void> {
  try {
    const supabase = getSupabaseServiceRoleClient();
    await supabase.from("ai_generated_recipes").upsert(
      {
        user_id: params.userId,
        generation_log_id: params.generationId,
        suggestion_id: params.suggestionId,
        include_nutrition: params.includeNutrition,
        recipe: params.recipe,
      },
      { onConflict: "user_id,generation_log_id,suggestion_id,include_nutrition" },
    );

    await supabase
      .from("ai_generation_logs")
      .update({
        selected_suggestion_id: params.suggestionId,
        generated_recipe: params.recipe,
      })
      .eq("id", params.generationId)
      .eq("user_id", params.userId);
  } catch {
    // Cache persistence cannot block the recipe response.
  }
}

export async function POST(request: Request) {
  try {
    const userId = await requireAuthUserId(request);
    if (!userId) {
      return NextResponse.json({ message: "Sessão obrigatória para usar IA." }, { status: 401 });
    }

    const endpointRateLimit = await consumeAuthRateLimit({
      route: "ai-recipe",
      request,
      identifier: userId,
    });
    if (!endpointRateLimit.allowed) {
      return rateLimitResponse(endpointRateLimit.retryAfterSeconds);
    }

    const payload = (await parseJsonObjectBody(request, {
      maxBytes: 12 * 1024,
      allowedKeys: ["suggestionId", "suggestionTitle", "ingredients", "includeNutrition", "generationId"],
    })) as RecipePayload &
      Record<string, unknown>;
    const suggestionId = readRequiredString(payload, "suggestionId", {
      fieldName: "ID de sugestão",
      minLength: 3,
      maxLength: 120,
      pattern: /^[a-z0-9._-]+$/i,
    });
    const suggestionTitle =
      typeof payload.suggestionTitle === "string" && payload.suggestionTitle.trim()
        ? payload.suggestionTitle.trim().slice(0, 120)
        : suggestionId.replace(/[-_]+/g, " ");
    const ingredients =
      payload.ingredients === undefined
        ? []
        : readStringArray(payload, "ingredients", {
            fieldName: "Ingredientes",
            maxItems: 100,
            itemMaxLength: 120,
            minItems: 0,
          });
    const includeNutrition = readOptionalBoolean(payload, "includeNutrition", false);
    const generationId = readOptionalString(payload, "generationId", {
      fieldName: "ID da geracao",
      minLength: 36,
      maxLength: 36,
      pattern: /^[0-9a-f-]{36}$/i,
    });

    if (generationId) {
      const isValidGeneratedSuggestion = await verifyGeneratedSuggestion({
        userId,
        generationId,
        suggestionId,
      });
      if (!isValidGeneratedSuggestion) {
        return NextResponse.json({ message: "Sugestao de IA invalida ou expirada." }, { status: 403 });
      }

      const cachedRecipe = await readGeneratedRecipeCache({
        userId,
        generationId,
        suggestionId,
        includeNutrition,
      });
      if (cachedRecipe) {
        return NextResponse.json(cachedRecipe);
      }

      const recipe = await generateFullRecipeWithOpenAi({
        suggestionTitle,
        ingredients,
        includeNutrition,
      });
      await persistGeneratedRecipeCache({
        userId,
        generationId,
        suggestionId,
        includeNutrition,
        recipe,
      });
      return NextResponse.json(recipe);
    }

    await consumeAiUsage({
      userId,
      bucket: "recipe_ai",
      feature: "recipe",
      inputMode: "text",
    });

    const recipe = await generateFullRecipeWithOpenAi({
      suggestionTitle,
      ingredients,
      includeNutrition,
    });
    return NextResponse.json(recipe);
  } catch (error) {
    const usageResponse = aiUsageErrorResponse(error);
    if (usageResponse) return usageResponse;
    const validationResponse = validationErrorResponse(error);
    if (validationResponse) return validationResponse;
    if (isOpenAiGenerationError(error)) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    return NextResponse.json({ message: "Erro ao gerar receita completa." }, { status: 500 });
  }
}
