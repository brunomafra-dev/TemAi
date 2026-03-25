import { NextResponse } from "next/server";
import { getPopularRecipesFromSupabase } from "@/features/recipes/supabase-library";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const limit = Number(url.searchParams.get("limit") || "8");
  try {
    const fromSupabase = await getPopularRecipesFromSupabase(limit);
    return NextResponse.json({ recipes: fromSupabase, source: "supabase" });
  } catch {
    return NextResponse.json({ recipes: [], source: "supabase", error: "Falha ao ler Supabase." }, { status: 500 });
  }
}
