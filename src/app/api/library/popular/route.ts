import { NextResponse } from "next/server";
import { getPopularRecipesFromSupabase } from "@/features/recipes/supabase-library";
import {
  InputValidationError,
  validationErrorResponse,
} from "@/lib/input-validation";

function readLimit(value: string | null): number {
  if (!value) return 8;
  const normalized = value.trim();
  if (!/^\d+$/.test(normalized)) {
    throw new InputValidationError("Limite malformado.");
  }
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed < 1 || parsed > 30) {
    throw new InputValidationError("Limite fora do limite.");
  }
  return parsed;
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const limit = readLimit(url.searchParams.get("limit"));
    const fromSupabase = await getPopularRecipesFromSupabase(limit);
    return NextResponse.json({ recipes: fromSupabase, source: "supabase" });
  } catch (error) {
    const validationResponse = validationErrorResponse(error);
    if (validationResponse) return validationResponse;
    return NextResponse.json({ recipes: [], source: "supabase", error: "Falha ao ler Supabase." }, { status: 500 });
  }
}
