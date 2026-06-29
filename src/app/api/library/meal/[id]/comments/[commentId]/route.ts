import { NextResponse } from "next/server";
import { moderateCommunityText } from "@/features/community/moderation";
import { deleteLibraryRecipeComment, updateLibraryRecipeComment } from "@/features/community/recipe-feedback";
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

async function readParams(context: { params: Promise<{ id: string; commentId: string }> }) {
  const params = await context.params;
  return {
    recipeSlug: sanitizePathParam(params.id, {
      fieldName: "ID da receita",
      maxLength: 160,
      pattern: /^[a-z0-9._-]+$/i,
    }),
    commentId: sanitizePathParam(params.commentId, {
      fieldName: "ID do comentário",
      maxLength: 80,
      pattern: /^[a-f0-9-]+$/i,
    }),
  };
}

export async function PUT(request: Request, context: { params: Promise<{ id: string; commentId: string }> }) {
  try {
    const userId = await requireAuthUserId(request);
    if (!userId) {
      return NextResponse.json({ message: "Sessão obrigatória para editar." }, { status: 401 });
    }

    const endpointRateLimit = await consumeAuthRateLimit({
      route: "library-comment-edit",
      request,
      identifier: userId,
    });
    if (!endpointRateLimit.allowed) {
      return rateLimitResponse(endpointRateLimit.retryAfterSeconds);
    }

    const { recipeSlug, commentId } = await readParams(context);
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

    const feedback = await updateLibraryRecipeComment({
      recipeSlug,
      commentId,
      userId,
      body,
      moderationResult: moderation.result,
    });
    if (!feedback) {
      throw new InputValidationError("Comentário não encontrado.", 404);
    }

    return NextResponse.json(feedback);
  } catch (error) {
    const validationResponse = validationErrorResponse(error);
    if (validationResponse) return validationResponse;
    const message = error instanceof Error ? error.message : "Falha ao editar comentário.";
    const status = message.includes("próprios comentários") ? 403 : 500;
    return NextResponse.json({ message }, { status });
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string; commentId: string }> },
) {
  try {
    const userId = await requireAuthUserId(request);
    if (!userId) {
      return NextResponse.json({ message: "Sessão obrigatória para excluir." }, { status: 401 });
    }

    const endpointRateLimit = await consumeAuthRateLimit({
      route: "library-comment-delete",
      request,
      identifier: userId,
    });
    if (!endpointRateLimit.allowed) {
      return rateLimitResponse(endpointRateLimit.retryAfterSeconds);
    }

    const { recipeSlug, commentId } = await readParams(context);
    const feedback = await deleteLibraryRecipeComment({ recipeSlug, commentId, userId });
    if (!feedback) {
      throw new InputValidationError("Comentário não encontrado.", 404);
    }

    return NextResponse.json(feedback);
  } catch (error) {
    const validationResponse = validationErrorResponse(error);
    if (validationResponse) return validationResponse;
    const message = error instanceof Error ? error.message : "Falha ao excluir comentário.";
    const status = message.includes("próprios comentários") ? 403 : 500;
    return NextResponse.json({ message }, { status });
  }
}
