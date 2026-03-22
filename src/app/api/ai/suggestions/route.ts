import { NextResponse } from "next/server";
import { generateRecipeSuggestions } from "@/features/recipes/ai-generator";
import { parseIngredientsText } from "@/features/recipes/helpers";
import type { InputMode } from "@/features/recipes/types";

interface SuggestionsPayload {
  ingredientsText?: string;
  inputMode?: InputMode;
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as SuggestionsPayload;
    const ingredientsText = payload.ingredientsText?.trim();

    if (!ingredientsText) {
      return NextResponse.json({ message: "Informe ao menos um ingrediente." }, { status: 400 });
    }

    const ingredients = parseIngredientsText(ingredientsText);
    if (!ingredients.length) {
      return NextResponse.json({ message: "Nao foi possivel identificar ingredientes validos." }, { status: 400 });
    }

    const response = generateRecipeSuggestions(ingredients);
    return NextResponse.json(response);
  } catch {
    return NextResponse.json({ message: "Erro ao gerar sugestoes." }, { status: 500 });
  }
}
