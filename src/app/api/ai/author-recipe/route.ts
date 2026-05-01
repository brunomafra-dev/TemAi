import { NextResponse } from "next/server";
import { isOpenAiGenerationError, polishAuthorRecipeWithOpenAi } from "@/features/recipes/openai-generator";
import { consumeAuthRateLimit } from "@/features/security/auth-rate-limit";
import { rateLimitResponse, requireAuthUserId } from "@/features/security/auth-user";
import {
  parseJsonObjectBody,
  readRequiredString,
  validationErrorResponse,
} from "@/lib/input-validation";

export async function POST(request: Request) {
  try {
    const userId = await requireAuthUserId(request);
    if (!userId) {
      return NextResponse.json({ message: "Sessão obrigatória para usar IA." }, { status: 401 });
    }

    const endpointRateLimit = await consumeAuthRateLimit({
      route: "ai-author-recipe",
      request,
      identifier: userId,
    });
    if (!endpointRateLimit.allowed) {
      return rateLimitResponse(endpointRateLimit.retryAfterSeconds);
    }

    const payload = await parseJsonObjectBody(request, {
      maxBytes: 16 * 1024,
      allowedKeys: ["title", "description", "ingredientsText", "stepsText"],
    });
    const title = readRequiredString(payload, "title", {
      fieldName: "Título",
      minLength: 3,
      maxLength: 120,
    });
    const ingredientsText = readRequiredString(payload, "ingredientsText", {
      fieldName: "Ingredientes",
      minLength: 3,
      maxLength: 5000,
    });
    const stepsText = readRequiredString(payload, "stepsText", {
      fieldName: "Preparo",
      minLength: 3,
      maxLength: 8000,
    });
    const description =
      typeof payload.description === "string"
        ? payload.description.trim().slice(0, 500)
        : "";

    const polished = await polishAuthorRecipeWithOpenAi({
      title,
      description,
      ingredientsText,
      stepsText,
    });

    return NextResponse.json(polished);
  } catch (error) {
    const validationResponse = validationErrorResponse(error);
    if (validationResponse) return validationResponse;
    if (isOpenAiGenerationError(error)) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    return NextResponse.json({ message: "Falha ao organizar receita autoral." }, { status: 500 });
  }
}
