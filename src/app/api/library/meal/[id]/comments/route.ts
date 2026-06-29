import { NextResponse } from "next/server";
import { moderateCommunityText } from "@/features/community/moderation";
import { insertLibraryRecipeComment } from "@/features/community/recipe-feedback";
import { consumeAuthRateLimit } from "@/features/security/auth-rate-limit";
import { rateLimitResponse, requireAuthUserId } from "@/features/security/auth-user";
import {
  InputValidationError,
  parseJsonObjectBody,
  readRequiredString,
  sanitizePathParam,
  validationErrorResponse,
} from "@/lib/input-validation";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireAuthUserId(request);
    if (!userId) {
      return NextResponse.json({ message: "Sessão obrigatória para comentar." }, { status: 401 });
    }

    const endpointRateLimit = await consumeAuthRateLimit({
      route: "library-comment",
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
      maxBytes: 6 * 1024,
      allowedKeys: ["body"],
    });
    const body = readRequiredString(payload, "body", {
      fieldName: "Comentário",
      minLength: 3,
      maxLength: 800,
    });

    const moderation = await moderateCommunityText(body);
    if (!moderation.allowed) {
      return NextResponse.json(
        { message: "Comentário bloqueado pela moderação.", reason: moderation.reason },
        { status: 422 },
      );
    }

    const feedback = await insertLibraryRecipeComment({
      recipeSlug,
      userId,
      body,
      moderationResult: moderation.result,
    });
    if (!feedback) {
      throw new InputValidationError("Receita não encontrada.", 404);
    }

    return NextResponse.json(feedback);
  } catch (error) {
    const validationResponse = validationErrorResponse(error);
    if (validationResponse) return validationResponse;
    return NextResponse.json({ message: "Falha ao publicar comentário." }, { status: 500 });
  }
}
