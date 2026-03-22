import { NextResponse } from "next/server";
import { getRecipeBySlugFromSupabase } from "@/features/recipes/supabase-library";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const params = await context.params;
  const mealId = params.id;

  try {
    const recipeFromSupabase = await getRecipeBySlugFromSupabase(mealId);
    if (recipeFromSupabase) {
      return NextResponse.json({ recipe: recipeFromSupabase, source: "supabase" });
    }
    return NextResponse.json({ message: "Receita nao encontrada no Supabase." }, { status: 404 });
  } catch {
    return NextResponse.json({ message: "Falha ao carregar receita do Supabase." }, { status: 500 });
  }
}
