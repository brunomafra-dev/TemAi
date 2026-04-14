import { NextResponse } from "next/server";
import { generateRecipeSuggestions } from "@/features/recipes/ai-generator";
import { parseIngredientsText } from "@/features/recipes/helpers";
import type { InputMode } from "@/features/recipes/types";
import {
  parseJsonObjectBody,
  readRequiredString,
  validationErrorResponse,
} from "@/lib/input-validation";

interface SuggestionsPayload {
  ingredientsText?: string;
  inputMode?: InputMode;
}

export async function POST(request: Request) {
  try {
    const payload = (await parseJsonObjectBody(request, { maxBytes: 12 * 1024 })) as SuggestionsPayload &
      Record<string, unknown>;
    const ingredientsText = readRequiredString(payload, "ingredientsText", {
      fieldName: "Ingredientes",
      minLength: 1,
      maxLength: 4000,
    });

    const ingredients = parseIngredientsText(ingredientsText);
    if (!ingredients.length) {
      return NextResponse.json({ message: "Nao foi possivel identificar ingredientes validos." }, { status: 400 });
    }

    const response = generateRecipeSuggestions(ingredients);
    return NextResponse.json(response);
  } catch (error) {
    const validationResponse = validationErrorResponse(error);
    if (validationResponse) return validationResponse;
    return NextResponse.json({ message: "Erro ao gerar sugestoes." }, { status: 500 });
  }
}
