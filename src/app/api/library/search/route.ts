import { NextResponse } from "next/server";
import { searchRecipesFromSupabase } from "@/features/recipes/supabase-library";
import {
  InputValidationError,
  sanitizeQueryString,
  validationErrorResponse,
} from "@/lib/input-validation";
import { consumeAuthRateLimit } from "@/features/security/auth-rate-limit";
import { rateLimitResponse } from "@/features/security/auth-user";

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
  try {
    const endpointRateLimit = await consumeAuthRateLimit({
      route: "library-search",
      request,
    });
    if (!endpointRateLimit.allowed) {
      return rateLimitResponse(endpointRateLimit.retryAfterSeconds);
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
      fieldName: "Pagina",
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
  } catch (error) {
    const validationResponse = validationErrorResponse(error);
    if (validationResponse) return validationResponse;
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
