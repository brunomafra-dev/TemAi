import { NextResponse } from "next/server";
import { reportLibraryRecipeComment } from "@/features/community/recipe-feedback";
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

const commentReportReasons = ["inappropriate", "harassment", "spam", "dangerous", "other"] as const;

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string; commentId: string }> },
) {
  try {
    const userId = await requireAuthUserId(request);
    if (!userId) {
      return NextResponse.json({ message: "Sessão obrigatória para denunciar." }, { status: 401 });
    }

    const endpointRateLimit = await consumeAuthRateLimit({
      route: "library-comment-report",
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
    const commentId = sanitizePathParam(params.commentId, {
      fieldName: "ID do comentário",
      maxLength: 80,
      pattern: /^[a-f0-9-]+$/i,
    });
    const payload = await parseJsonObjectBody(request, {
      maxBytes: 6 * 1024,
      allowedKeys: ["reason", "detail"],
    });
    const reason = readOptionalEnum(payload, "reason", commentReportReasons, "inappropriate", "Motivo");
    const detail = readOptionalString(payload, "detail", {
      fieldName: "Detalhe",
      maxLength: 600,
    });

    const result = await reportLibraryRecipeComment({
      recipeSlug,
      commentId,
      userId,
      reason,
      detail,
    });
    if (!result) {
      throw new InputValidationError("Comentário não encontrado.", 404);
    }

    return NextResponse.json({
      ok: true,
      hiddenForReview: result.hiddenForReview,
      message: result.hiddenForReview
        ? "Denúncia recebida. O comentário saiu temporariamente da receita para revisão."
        : "Denúncia recebida. Obrigado por ajudar a manter a comunidade segura.",
    });
  } catch (error) {
    const validationResponse = validationErrorResponse(error);
    if (validationResponse) return validationResponse;
    const message = error instanceof Error ? error.message : "";
    if (message.includes("já denunciou") || message.includes("próprio comentário")) {
      return NextResponse.json({ message }, { status: 409 });
    }
    return NextResponse.json({ message: "Falha ao denunciar comentário." }, { status: 500 });
  }
}
