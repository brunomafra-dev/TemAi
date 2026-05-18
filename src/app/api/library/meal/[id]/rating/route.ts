import { NextResponse } from "next/server";
import { deleteLibraryRecipeRating, saveLibraryRecipeRating } from "@/features/community/recipe-feedback";
import { consumeAuthRateLimit } from "@/features/security/auth-rate-limit";
import { rateLimitResponse, requireAuthUserId } from "@/features/security/auth-user";
import {
  InputValidationError,
  parseJsonObjectBody,
  readOptionalNumber,
  sanitizePathParam,
  validationErrorResponse,
} from "@/lib/input-validation";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await requireAuthUserId(request);
    if (!userId) {
      return NextResponse.json({ message: "Sessão obrigatória para avaliar." }, { status: 401 });
    }

    const endpointRateLimit = await consumeAuthRateLimit({
      route: "library-rating",
      request,
      identifier: userId,
    });
    if (!endpointRateLimit.allowed) {
      return rateLimitResponse(endpointRateLimit.retryAfterSeconds);
    }

    const params = await context.params;
    const recipeSlug = sanitizePathParam(params.id, {
      fieldName: "ID da receita",
      maxLength: 160,
      pattern: /^[a-z0-9._-]+$/i,
    });
    const payload = await parseJsonObjectBody(request, {
      maxBytes: 2 * 1024,
      allowedKeys: ["rating"],
    });
    const rating = readOptionalNumber(payload, "rating", {
      fieldName: "Avaliação",
      min: 1,
      max: 10,
      integer: true,
    });

    const feedback = await saveLibraryRecipeRating({ recipeSlug, userId, rating });
    if (!feedback) {
      throw new InputValidationError("Receita não encontrada.", 404);
    }

    return NextResponse.json(feedback, {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch (error) {
    const validationResponse = validationErrorResponse(error);
    if (validationResponse) return validationResponse;
    return NextResponse.json({ message: "Falha ao salvar avaliação." }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await requireAuthUserId(request);
    if (!userId) {
      return NextResponse.json({ message: "Sessão obrigatória para desfazer avaliação." }, { status: 401 });
    }

    const endpointRateLimit = await consumeAuthRateLimit({
      route: "library-rating",
      request,
      identifier: userId,
    });
    if (!endpointRateLimit.allowed) {
      return rateLimitResponse(endpointRateLimit.retryAfterSeconds);
    }

    const params = await context.params;
    const recipeSlug = sanitizePathParam(params.id, {
      fieldName: "ID da receita",
      maxLength: 160,
      pattern: /^[a-z0-9._-]+$/i,
    });

    const feedback = await deleteLibraryRecipeRating({ recipeSlug, userId });
    if (!feedback) {
      throw new InputValidationError("Receita não encontrada.", 404);
    }

    return NextResponse.json(feedback, {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch (error) {
    const validationResponse = validationErrorResponse(error);
    if (validationResponse) return validationResponse;
    return NextResponse.json({ message: "Falha ao desfazer avaliação." }, { status: 500 });
  }
}
