import { NextResponse } from "next/server";
import { generateFullRecipeWithOpenAi, isOpenAiGenerationError } from "@/features/recipes/openai-generator";
import { consumeAuthRateLimit } from "@/features/security/auth-rate-limit";
import { rateLimitResponse, requireAuthUserId } from "@/features/security/auth-user";
import {
  parseJsonObjectBody,
  readOptionalBoolean,
  readRequiredString,
  readStringArray,
  validationErrorResponse,
} from "@/lib/input-validation";

interface RecipePayload {
  suggestionId?: string;
  suggestionTitle?: string;
  ingredients?: string[];
  includeNutrition?: boolean;
}

export async function POST(request: Request) {
  try {
    const userId = await requireAuthUserId(request);
    if (!userId) {
      return NextResponse.json({ message: "Sessao obrigatoria para usar IA." }, { status: 401 });
    }

    const endpointRateLimit = await consumeAuthRateLimit({
      route: "ai-recipe",
      request,
      identifier: userId,
    });
    if (!endpointRateLimit.allowed) {
      return rateLimitResponse(endpointRateLimit.retryAfterSeconds);
    }

    const payload = (await parseJsonObjectBody(request, { maxBytes: 12 * 1024 })) as RecipePayload &
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

    const recipe = await generateFullRecipeWithOpenAi({
      suggestionTitle,
      ingredients,
      includeNutrition,
    });
    return NextResponse.json(recipe);
  } catch (error) {
    const validationResponse = validationErrorResponse(error);
    if (validationResponse) return validationResponse;
    if (isOpenAiGenerationError(error)) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    return NextResponse.json({ message: "Erro ao gerar receita completa." }, { status: 500 });
  }
}
