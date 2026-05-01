import { NextResponse } from "next/server";
import { answerSupportWithOpenAi, isOpenAiGenerationError } from "@/features/recipes/openai-generator";
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
      return NextResponse.json({ message: "Sessão obrigatória para usar o suporte." }, { status: 401 });
    }

    const endpointRateLimit = await consumeAuthRateLimit({
      route: "support-agent",
      request,
      identifier: userId,
    });
    if (!endpointRateLimit.allowed) {
      return rateLimitResponse(endpointRateLimit.retryAfterSeconds);
    }

    const payload = await parseJsonObjectBody(request, {
      maxBytes: 8 * 1024,
      allowedKeys: ["message"],
    });
    const message = readRequiredString(payload, "message", {
      fieldName: "Mensagem",
      minLength: 1,
      maxLength: 2000,
    });

    const answer = await answerSupportWithOpenAi(message);
    return NextResponse.json({ message: answer });
  } catch (error) {
    const validationResponse = validationErrorResponse(error);
    if (validationResponse) return validationResponse;
    if (isOpenAiGenerationError(error)) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    return NextResponse.json({ message: "Falha ao acionar suporte IA." }, { status: 500 });
  }
}
