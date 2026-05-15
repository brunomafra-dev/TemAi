import { NextResponse } from "next/server";
import { moderateCommunityText } from "@/features/community/moderation";
import { reportLibraryRecipe } from "@/features/community/recipe-feedback";
import { consumeAuthRateLimit } from "@/features/security/auth-rate-limit";
import { rateLimitResponse, requireAuthUserId } from "@/features/security/auth-user";
import {
  InputValidationError,
  parseJsonObjectBody,
  readOptionalEnum,
  readOptionalString,
  sanitizePathParam,
  validationErrorResponse,
} from "@/lib/input-validation";

const reportReasons = ["wrong_info", "wrong_image", "inappropriate", "dangerous", "other"] as const;

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await requireAuthUserId(request);
    if (!userId) {
      return NextResponse.json({ message: "Sessão obrigatória para denunciar." }, { status: 401 });
    }

    const endpointRateLimit = await consumeAuthRateLimit({
      route: "library-report",
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
      allowedKeys: ["reason", "detail"],
    });
    const reason = readOptionalEnum(payload, "reason", reportReasons, "other", "Motivo");
    const detail = readOptionalString(payload, "detail", {
      fieldName: "Detalhes",
      maxLength: 800,
    });

    let moderationResult: Record<string, unknown> = {};
    if (detail) {
      const moderation = await moderateCommunityText(detail);
      moderationResult = moderation.result;
      if (!moderation.allowed) {
        throw new InputValidationError("Detalhes da denúncia bloqueados pela moderação.", 422);
      }
    }

    const result = await reportLibraryRecipe({
      recipeSlug,
      userId,
      reason,
      detail,
      metadata: { detailModeration: moderationResult },
    });
    if (!result) {
      throw new InputValidationError("Receita não encontrada.", 404);
    }

    return NextResponse.json({
      ok: true,
      hiddenForReview: result.hiddenForReview,
      message: result.hiddenForReview
        ? "Denúncia recebida. A receita saiu temporariamente da Biblioteca para revisão."
        : "Denúncia recebida. Obrigado por ajudar a manter a comunidade segura.",
    });
  } catch (error) {
    const validationResponse = validationErrorResponse(error);
    if (validationResponse) return validationResponse;
    const message = error instanceof Error ? error.message : "";
    if (message.includes("já denunciou")) {
      return NextResponse.json({ message }, { status: 409 });
    }
    return NextResponse.json({ message: "Falha ao enviar denúncia." }, { status: 500 });
  }
}
