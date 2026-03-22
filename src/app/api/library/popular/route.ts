import { NextResponse } from "next/server";
import { getPopularRecipesFromSupabase } from "@/features/recipes/supabase-library";

export async function GET() {
  try {
    const fromSupabase = await getPopularRecipesFromSupabase(8);
    return NextResponse.json({ recipes: fromSupabase, source: "supabase" });
  } catch {
    return NextResponse.json({ recipes: [], source: "supabase", error: "Falha ao ler Supabase." }, { status: 500 });
  }
}
