import { NextResponse } from "next/server";
import { BASIC_BRAZILIAN_RECIPE_SLUGS } from "@/features/recipes/basic-brazilian-recipes";
import { getRecipesBySlugsFromSupabase } from "@/features/recipes/supabase-library";
import { consumeAuthRateLimit } from "@/features/security/auth-rate-limit";
import { rateLimitResponse } from "@/features/security/auth-user";
import {
  sanitizeQueryString,
  validationErrorResponse,
} from "@/lib/input-validation";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const endpointRateLimit = await consumeAuthRateLimit({
      route: "library-category-review",
      request,
    });
    if (!endpointRateLimit.allowed) {
      return rateLimitResponse(endpointRateLimit.retryAfterSeconds);
    }

    const url = new URL(request.url);
    const batch = sanitizeQueryString(url.searchParams.get("batch"), {
      fieldName: "Lote",
      maxLength: 60,
      fallback: "basic-brazilian",
      pattern: /^[a-z0-9_-]+$/i,
      lowercase: true,
    });

    if (batch !== "basic-brazilian") {
      return NextResponse.json({ message: "Lote não encontrado." }, { status: 404 });
    }

    const recipes = await getRecipesBySlugsFromSupabase(BASIC_BRAZILIAN_RECIPE_SLUGS);
    return NextResponse.json(
      {
        batch,
        total: BASIC_BRAZILIAN_RECIPE_SLUGS.length,
        recipes,
      },
      { headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  } catch (error) {
    const validationResponse = validationErrorResponse(error);
    if (validationResponse) return validationResponse;
    return NextResponse.json({ message: "Falha ao carregar lote de categorização." }, { status: 500 });
  }
}
