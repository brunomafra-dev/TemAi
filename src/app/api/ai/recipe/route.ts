import { NextResponse } from "next/server";
import { generateFullRecipe } from "@/features/recipes/ai-generator";
import {
  parseJsonObjectBody,
  readRequiredString,
  readStringArray,
  validationErrorResponse,
} from "@/lib/input-validation";

interface RecipePayload {
  suggestionId?: string;
  ingredients?: string[];
}

export async function POST(request: Request) {
  try {
    const payload = (await parseJsonObjectBody(request, { maxBytes: 12 * 1024 })) as RecipePayload &
      Record<string, unknown>;
    const suggestionId = readRequiredString(payload, "suggestionId", {
      fieldName: "ID de sugestao",
      minLength: 3,
      maxLength: 120,
      pattern: /^[a-z0-9._-]+$/i,
    });
    const ingredients =
      payload.ingredients === undefined
        ? []
        : readStringArray(payload, "ingredients", {
            fieldName: "Ingredientes",
            maxItems: 100,
            itemMaxLength: 120,
            minItems: 0,
          });

    const recipe = generateFullRecipe(suggestionId, ingredients);
    return NextResponse.json(recipe);
  } catch (error) {
    const validationResponse = validationErrorResponse(error);
    if (validationResponse) return validationResponse;
    return NextResponse.json({ message: "Erro ao gerar receita completa." }, { status: 500 });
  }
}
