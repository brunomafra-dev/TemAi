import { NextResponse } from "next/server";
import { searchRecipesFromSupabase } from "@/features/recipes/supabase-library";
import { InputValidationError, sanitizeQueryString, validationErrorResponse } from "@/lib/input-validation";
import { consumePublicReadRateLimit } from "@/features/security/auth-rate-limit";
import { rateLimitResponse } from "@/features/security/auth-user";
import { elapsedMs, logApiEvent } from "@/lib/observability";

const SEARCH_CACHE_HEADERS = {
  "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
};

function readIntParam(
  value: string | null,
  options: { fieldName: string; min: number; max: number; fallback: number },
): number {
  if (!value) return options.fallback;
  const normalized = value.trim();
  if (!/^\d+$/.test(normalized)) {
    throw new InputValidationError(`${options.fieldName} malformado.`);
  }
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed < options.min || parsed > options.max) {
    throw new InputValidationError(`${options.fieldName} fora do limite.`);
  }
  return parsed;
}

export async function GET(request: Request) {
  const startedAt = Date.now();
  try {
    const endpointRateLimit = await consumePublicReadRateLimit({
      route: "library-search",
      request,
    });
    if (!endpointRateLimit.allowed) {
      logApiEvent({ route: "library-search", status: 429, durationMs: elapsedMs(startedAt) });
      const response = rateLimitResponse(endpointRateLimit.retryAfterSeconds);
      return response;
    }

    const url = new URL(request.url);
    const query = sanitizeQueryString(url.searchParams.get("q"), {
      fieldName: "Busca",
      maxLength: 200,
      fallback: "",
    });
    const category = sanitizeQueryString(url.searchParams.get("category"), {
      fieldName: "Categoria",
      maxLength: 40,
      fallback: "",
      pattern: /^[a-z_-]*$/i,
      lowercase: true,
    });
    const seed = sanitizeQueryString(url.searchParams.get("seed"), {
      fieldName: "Seed",
      maxLength: 80,
      fallback: "",
      pattern: /^[a-z0-9_-]*$/i,
    });
    const page = readIntParam(url.searchParams.get("page"), {
      fieldName: "Página",
      min: 1,
      max: 5000,
      fallback: 1,
    });
    const pageSize = readIntParam(url.searchParams.get("pageSize"), {
      fieldName: "Tamanho de pagina",
      min: 1,
      max: 100,
      fallback: 12,
    });

    const result = await searchRecipesFromSupabase({ query, category, page, pageSize, seed });
    const response = NextResponse.json(
      {
        recipes: result.recipes,
        source: "supabase",
        pagination: {
          total: result.total,
          page: result.page,
          pageSize: result.pageSize,
          totalPages: result.totalPages,
        },
      },
      { headers: SEARCH_CACHE_HEADERS },
    );
    logApiEvent({
      route: "library-search",
      status: 200,
      durationMs: elapsedMs(startedAt),
      metadata: {
        hasQuery: Boolean(query),
        category: category || "todas",
        page: result.page,
        pageSize: result.pageSize,
        total: result.total,
      },
    });
    return response;
  } catch (error) {
    const validationResponse = validationErrorResponse(error);
    if (validationResponse) {
      logApiEvent({
        route: "library-search",
        status: validationResponse.status,
        durationMs: elapsedMs(startedAt),
        error,
      });
      return validationResponse;
    }
    logApiEvent({
      route: "library-search",
      status: 500,
      durationMs: elapsedMs(startedAt),
      error,
    });
    return NextResponse.json(
      {
        recipes: [],
        source: "supabase",
        pagination: { total: 0, page: 1, pageSize: 12, totalPages: 1 },
        error: "Falha ao ler Supabase.",
      },
      { status: 500, headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  }
}
