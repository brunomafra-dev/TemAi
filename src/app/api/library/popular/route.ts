import { NextResponse } from "next/server";
import { getPopularRecipesFromSupabase } from "@/features/recipes/supabase-library";
import {
  InputValidationError,
  validationErrorResponse,
} from "@/lib/input-validation";
import { consumePublicReadRateLimit } from "@/features/security/auth-rate-limit";
import { rateLimitResponse } from "@/features/security/auth-user";
import { elapsedMs, logApiEvent } from "@/lib/observability";

const POPULAR_CACHE_HEADERS = {
  "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
};

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
  const startedAt = Date.now();
  try {
    const endpointRateLimit = await consumePublicReadRateLimit({
      route: "library-popular",
      request,
    });
    if (!endpointRateLimit.allowed) {
      logApiEvent({ route: "library-popular", status: 429, durationMs: elapsedMs(startedAt) });
      return rateLimitResponse(endpointRateLimit.retryAfterSeconds);
    }

    const url = new URL(request.url);
    const limit = readLimit(url.searchParams.get("limit"));
    const fromSupabase = await getPopularRecipesFromSupabase(limit);
    logApiEvent({
      route: "library-popular",
      status: 200,
      durationMs: elapsedMs(startedAt),
      metadata: { limit, count: fromSupabase.length },
    });
    return NextResponse.json(
      { recipes: fromSupabase, source: "supabase" },
      { headers: POPULAR_CACHE_HEADERS },
    );
  } catch (error) {
    const validationResponse = validationErrorResponse(error);
    if (validationResponse) {
      logApiEvent({
        route: "library-popular",
        status: validationResponse.status,
        durationMs: elapsedMs(startedAt),
        error,
      });
      return validationResponse;
    }
    logApiEvent({
      route: "library-popular",
      status: 500,
      durationMs: elapsedMs(startedAt),
      error,
    });
    return NextResponse.json(
      { recipes: [], source: "supabase", error: "Falha ao ler Supabase." },
      { status: 500, headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  }
}
