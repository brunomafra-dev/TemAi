import { NextResponse } from "next/server";
import { searchRecipesFromSupabase } from "@/features/recipes/supabase-library";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = url.searchParams.get("q")?.trim() || "";
  const category = url.searchParams.get("category")?.trim() || "";
  const seed = url.searchParams.get("seed")?.trim() || "";
  const page = Number(url.searchParams.get("page") || "1");
  const pageSize = Number(url.searchParams.get("pageSize") || "12");

  try {
    const result = await searchRecipesFromSupabase({ query, category, page, pageSize, seed });
    return NextResponse.json({
      recipes: result.recipes,
      source: "supabase",
      pagination: {
        total: result.total,
        page: result.page,
        pageSize: result.pageSize,
        totalPages: result.totalPages,
      },
    });
  } catch {
    return NextResponse.json(
      {
        recipes: [],
        source: "supabase",
        pagination: { total: 0, page: 1, pageSize: 12, totalPages: 1 },
        error: "Falha ao ler Supabase.",
      },
      { status: 500 },
    );
  }
}
