import { NextResponse } from "next/server";
import type { LibraryCategory } from "@/features/recipes/types";
import { updateRecipeCategoryInSupabase } from "@/features/recipes/supabase-library";

interface UpdateCategoryPayload {
  recipeId?: string;
  category?: LibraryCategory;
}

const allowedCategories = new Set<LibraryCategory>([
  "principais",
  "veggie",
  "massas",
  "kids",
  "sobremesas",
  "bebidas",
  "lanches",
]);

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as UpdateCategoryPayload;
    const recipeId = payload.recipeId?.trim();
    const category = payload.category;

    if (!recipeId) {
      return NextResponse.json({ message: "ID da receita obrigatorio." }, { status: 400 });
    }

    if (!category || !allowedCategories.has(category)) {
      return NextResponse.json({ message: "Categoria invalida." }, { status: 400 });
    }

    const recipe = await updateRecipeCategoryInSupabase(recipeId, category);
    return NextResponse.json({ recipe, source: "supabase" });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Falha ao atualizar categoria da receita.",
      },
      { status: 500 },
    );
  }
}
