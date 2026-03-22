import { NextResponse } from "next/server";
import { generateFullRecipe } from "@/features/recipes/ai-generator";

interface RecipePayload {
  suggestionId?: string;
  ingredients?: string[];
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as RecipePayload;
    const suggestionId = payload.suggestionId?.trim();
    const ingredients = Array.isArray(payload.ingredients) ? payload.ingredients : [];

    if (!suggestionId) {
      return NextResponse.json(
        { message: "ID de sugestao obrigatorio para gerar receita completa." },
        { status: 400 },
      );
    }

    const recipe = generateFullRecipe(suggestionId, ingredients);
    return NextResponse.json(recipe);
  } catch {
    return NextResponse.json({ message: "Erro ao gerar receita completa." }, { status: 500 });
  }
}
