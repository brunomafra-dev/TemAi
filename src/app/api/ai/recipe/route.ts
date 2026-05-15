import { createHash } from "crypto";
import { NextResponse } from "next/server";
import {
  FULL_RECIPE_PROMPT_VERSION,
  generateFullRecipeWithOpenAi,
  isOpenAiGenerationError,
} from "@/features/recipes/openai-generator";
import type { CookingEquipment, Recipe } from "@/features/recipes/types";
import {
  COOKING_EQUIPMENT_VALUES,
  DEFAULT_COOKING_EQUIPMENT,
  normalizeCookingEquipment,
} from "@/features/recipes/cooking-equipment";
import { aiUsageErrorResponse, consumeAiUsage } from "@/features/security/ai-usage";
import { consumeAuthRateLimit } from "@/features/security/auth-rate-limit";
import { rateLimitResponse, requireAuthUserId } from "@/features/security/auth-user";
import { serverEnv } from "@/lib/env-server";
import { getSupabaseServiceRoleClient } from "@/lib/supabase-admin";
import {
  InputValidationError,
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
  cookingEquipment?: unknown;
  generationId?: string;
}

const inFlightRecipeRequests = new Map<string, Promise<Recipe>>();

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

function readCookingEquipment(payload: Record<string, unknown>): CookingEquipment[] {
  if (payload.cookingEquipment === undefined || payload.cookingEquipment === null) {
    return [...DEFAULT_COOKING_EQUIPMENT];
  }

  const values = readStringArray(payload, "cookingEquipment", {
    fieldName: "Equipamentos",
    maxItems: COOKING_EQUIPMENT_VALUES.length,
    itemMaxLength: 32,
    minItems: 0,
  });

  if (values.some((value) => !COOKING_EQUIPMENT_VALUES.includes(value as CookingEquipment))) {
    throw new InputValidationError("Equipamentos inválidos.");
  }

  return normalizeCookingEquipment(values);
}

function normalizeCacheText(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildRecipeCacheKey(params: {
  model: string;
  suggestionTitle: string;
  ingredients: string[];
  cookingEquipment: CookingEquipment[];
}): string {
  const payload = {
    promptVersion: FULL_RECIPE_PROMPT_VERSION,
    model: params.model,
    title: normalizeCacheText(params.suggestionTitle),
    ingredients: Array.from(new Set(params.ingredients.map(normalizeCacheText).filter(Boolean))).sort(),
    cookingEquipment: normalizeCookingEquipment(params.cookingEquipment).slice().sort(),
  };

  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
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
}): Promise<Recipe | null> {
  const supabase = getSupabaseServiceRoleClient();
  const { data, error } = await supabase
    .from("ai_generated_recipes")
    .select("recipe")
    .eq("user_id", params.userId)
    .eq("generation_log_id", params.generationId)
    .eq("suggestion_id", params.suggestionId)
    .order("created_at", { ascending: false })
    .limit(1);

  if (error || !Array.isArray(data) || data.length === 0) return null;
  const recipe = (data[0] as { recipe?: unknown }).recipe;
  return isRecipe(recipe) ? recipe : null;
}

async function readGeneratedRecipeCacheByKey(params: {
  userId: string;
  cacheKey: string;
}): Promise<Recipe | null> {
  const supabase = getSupabaseServiceRoleClient();
  const { data, error } = await supabase
    .from("ai_generated_recipes")
    .select("recipe")
    .eq("user_id", params.userId)
    .eq("cache_key", params.cacheKey)
    .order("created_at", { ascending: false })
    .limit(1);

  if (error || !Array.isArray(data) || data.length === 0) return null;
  const recipe = (data[0] as { recipe?: unknown }).recipe;
  return isRecipe(recipe) ? recipe : null;
}

async function persistGeneratedRecipeCache(params: {
  userId: string;
  generationId: string;
  suggestionId: string;
  recipe: Recipe;
  cacheKey: string;
  model: string;
  cookingEquipment: CookingEquipment[];
}): Promise<void> {
  const supabase = getSupabaseServiceRoleClient();
  const insertPayload = {
    user_id: params.userId,
    generation_log_id: params.generationId,
    suggestion_id: params.suggestionId,
    include_nutrition: false,
    cooking_equipment: normalizeCookingEquipment(params.cookingEquipment),
    prompt_version: FULL_RECIPE_PROMPT_VERSION,
    model: params.model,
    cache_key: params.cacheKey,
    recipe: params.recipe,
  };

  const { error } = await supabase.from("ai_generated_recipes").upsert(
    insertPayload,
    { onConflict: "user_id,generation_log_id,suggestion_id,include_nutrition" },
  );

  if (error) {
    await supabase.from("ai_generated_recipes").upsert(
      {
        user_id: params.userId,
        generation_log_id: params.generationId,
        suggestion_id: params.suggestionId,
        include_nutrition: false,
        recipe: params.recipe,
      },
      { onConflict: "user_id,generation_log_id,suggestion_id,include_nutrition" },
    );
  }

  await supabase
    .from("ai_generation_logs")
    .update({
      selected_suggestion_id: params.suggestionId,
      generated_recipe: params.recipe,
    })
    .eq("id", params.generationId)
    .eq("user_id", params.userId);
}

async function generateWithInFlight(cacheKey: string, factory: () => Promise<Recipe>): Promise<Recipe> {
  const existing = inFlightRecipeRequests.get(cacheKey);
  if (existing) return existing;

  const next = factory().finally(() => {
    inFlightRecipeRequests.delete(cacheKey);
  });
  inFlightRecipeRequests.set(cacheKey, next);
  return next;
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
      allowedKeys: ["suggestionId", "suggestionTitle", "ingredients", "includeNutrition", "cookingEquipment", "generationId"],
    })) as RecipePayload &
      Record<string, unknown>;
    const suggestionId = readRequiredString(payload, "suggestionId", {
      fieldName: "ID de sugestao",
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
    const cookingEquipment = readCookingEquipment(payload);
    const generationId = readOptionalString(payload, "generationId", {
      fieldName: "ID da geracao",
      minLength: 36,
      maxLength: 36,
      pattern: /^[0-9a-f-]{36}$/i,
    });
    const recipeModel = serverEnv.openaiRecipeModel();
    const cacheKey = buildRecipeCacheKey({
      model: recipeModel,
      suggestionTitle,
      ingredients,
      cookingEquipment,
    });

    if (generationId) {
      const isValidGeneratedSuggestion = await verifyGeneratedSuggestion({
        userId,
        generationId,
        suggestionId,
      });
      if (!isValidGeneratedSuggestion) {
        return NextResponse.json({ message: "Sugestão de IA inválida ou expirada." }, { status: 403 });
      }

      const cachedRecipe = await readGeneratedRecipeCache({
        userId,
        generationId,
        suggestionId,
      });
      if (cachedRecipe) {
        return NextResponse.json(cachedRecipe);
      }

      const normalizedCachedRecipe = await readGeneratedRecipeCacheByKey({ userId, cacheKey });
      if (normalizedCachedRecipe) {
        await persistGeneratedRecipeCache({
          userId,
          generationId,
          suggestionId,
          recipe: normalizedCachedRecipe,
          cacheKey,
          model: recipeModel,
          cookingEquipment,
        }).catch(() => undefined);
        return NextResponse.json(normalizedCachedRecipe);
      }

      const recipe = await generateWithInFlight(`${userId}:${cacheKey}`, () =>
        generateFullRecipeWithOpenAi({
          suggestionTitle,
          ingredients,
          includeNutrition,
          cookingEquipment,
          userId,
        }),
      );
      await persistGeneratedRecipeCache({
        userId,
        generationId,
        suggestionId,
        recipe,
        cacheKey,
        model: recipeModel,
        cookingEquipment,
      }).catch(() => undefined);
      return NextResponse.json(recipe);
    }

    const normalizedCachedRecipe = await readGeneratedRecipeCacheByKey({ userId, cacheKey });
    if (normalizedCachedRecipe) {
      return NextResponse.json(normalizedCachedRecipe);
    }

    await consumeAiUsage({
      userId,
      bucket: "recipe_ai",
      feature: "recipe",
      inputMode: "text",
    });

    const recipe = await generateWithInFlight(`${userId}:${cacheKey}`, () =>
      generateFullRecipeWithOpenAi({
        suggestionTitle,
        ingredients,
        includeNutrition,
        cookingEquipment,
        userId,
      }),
    );
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
