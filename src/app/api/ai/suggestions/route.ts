import { NextResponse } from "next/server";
import { parseIngredientsText, uniqueIngredients } from "@/features/recipes/helpers";
import {
  generateRecipeSuggestionsWithOpenAi,
  identifyIngredientsFromPhotoWithOpenAi,
  isOpenAiGenerationError,
  transcribeAudioWithOpenAi,
} from "@/features/recipes/openai-generator";
import type { InputMode } from "@/features/recipes/types";
import {
  aiUsageErrorResponse,
  consumeAiUsage,
  getAiEntitlement,
  refundAiUsageEvent,
} from "@/features/security/ai-usage";
import { consumeAuthRateLimit } from "@/features/security/auth-rate-limit";
import { rateLimitResponse, requireAuthUserId } from "@/features/security/auth-user";
import { getSupabaseServiceRoleClient } from "@/lib/supabase-admin";
import {
  assertRequestContentLength,
  InputValidationError,
  parseJsonObjectBody,
  readRequiredString,
  validationErrorResponse,
} from "@/lib/input-validation";

interface SuggestionsPayload {
  ingredientsText?: string;
  inputMode?: InputMode;
}

const MAX_PHOTO_BYTES = 8 * 1024 * 1024;
const MAX_AUDIO_BYTES = 15 * 1024 * 1024;
const MAX_MULTIPART_BYTES = 16 * 1024 * 1024;

async function readSuggestionsInput(request: Request): Promise<SuggestionsPayload & { file?: File }> {
  const contentType = request.headers.get("content-type")?.toLowerCase() || "";
  if (!contentType.includes("multipart/form-data")) {
    return (await parseJsonObjectBody(request, {
      maxBytes: 12 * 1024,
      allowedKeys: ["ingredientsText", "inputMode"],
    })) as SuggestionsPayload;
  }

  assertRequestContentLength(request, MAX_MULTIPART_BYTES);
  const form = await request.formData();
  for (const key of form.keys()) {
    if (!["ingredientsText", "inputMode", "file"].includes(key)) {
      throw new InputValidationError(`Campo inesperado: ${key}.`);
    }
  }

  const file = form.get("file");
  const rawIngredientsText = String(form.get("ingredientsText") || "").trim();
  const rawInputMode = String(form.get("inputMode") || "").trim();
  if (rawIngredientsText.length > 4000) {
    throw new InputValidationError("Ingredientes muito grande.", 413);
  }
  if (!/^(text|audio|photo)$/i.test(rawInputMode)) {
    throw new InputValidationError("Modo de entrada malformado.");
  }

  return {
    ingredientsText: rawIngredientsText,
    inputMode: rawInputMode as InputMode,
    file: file instanceof File ? file : undefined,
  };
}

function validateUpload(file: File, inputMode: InputMode): NextResponse | null {
  if (inputMode === "photo") {
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ message: "Envie um arquivo de imagem válido." }, { status: 415 });
    }
    if (file.size > MAX_PHOTO_BYTES) {
      return NextResponse.json({ message: "Foto muito grande. Envie uma imagem de até 8 MB." }, { status: 413 });
    }
  }

  if (inputMode === "audio") {
    if (!file.type.startsWith("audio/")) {
      return NextResponse.json({ message: "Envie um arquivo de áudio válido." }, { status: 415 });
    }
    if (file.size > MAX_AUDIO_BYTES) {
      return NextResponse.json({ message: "Áudio muito grande. Envie um arquivo de até 15 MB." }, { status: 413 });
    }
  }

  return null;
}

async function persistSuggestionLog(params: {
  userId: string;
  inputMode: InputMode;
  ingredientsText: string;
  normalizedIngredients: string[];
  suggestions: unknown[];
}): Promise<string | undefined> {
  try {
    const supabase = getSupabaseServiceRoleClient();
    const { data } = await supabase
      .from("ai_generation_logs")
      .insert({
        user_id: params.userId,
        input_mode: params.inputMode,
        ingredients_text: params.ingredientsText,
        normalized_ingredients: params.normalizedIngredients,
        suggestions: params.suggestions,
      })
      .select("id")
      .single();

    return typeof data?.id === "string" ? data.id : undefined;
  } catch {
    // non-blocking log persistence
    return undefined;
  }
}

export async function POST(request: Request) {
  let userIdForRefund: string | undefined;
  let usageEventId: string | undefined;

  try {
    const payload = await readSuggestionsInput(request);
    const inputModeRaw = readRequiredString(payload as Record<string, unknown>, "inputMode", {
      fieldName: "Modo de entrada",
      minLength: 4,
      maxLength: 10,
      pattern: /^(text|audio|photo)$/i,
    }).toLowerCase();
    const inputMode = inputModeRaw as InputMode;

    const userId = await requireAuthUserId(request);
    if (!userId) {
      return NextResponse.json({ message: "Sessão obrigatória para usar IA." }, { status: 401 });
    }

    userIdForRefund = userId;

    const endpointRateLimit = await consumeAuthRateLimit({
      route: "ai-suggestions",
      request,
      identifier: userId,
    });
    if (!endpointRateLimit.allowed) {
      return rateLimitResponse(endpointRateLimit.retryAfterSeconds);
    }

    const entitlement = await getAiEntitlement(userId);
    if (!entitlement.isPremium && inputMode !== "text") {
      return NextResponse.json(
        { message: "Plano free permite IA apenas por texto." },
        { status: 403 },
      );
    }

    let ingredientsText = payload.ingredientsText || "";
    let ingredients: string[] = [];

    if (inputMode === "audio") {
      if (payload.file) {
        const uploadError = validateUpload(payload.file, inputMode);
        if (uploadError) return uploadError;
        const usage = await consumeAiUsage({ userId, bucket: "recipe_ai", feature: "suggestions", inputMode });
        usageEventId = usage.eventId;
        const typedIngredientsText = ingredientsText.trim();
        const transcribedIngredientsText = await transcribeAudioWithOpenAi(payload.file);
        ingredientsText = [transcribedIngredientsText, typedIngredientsText].filter(Boolean).join(", ");
        ingredients = parseIngredientsText(ingredientsText);
      } else {
        ingredientsText = readRequiredString(payload as Record<string, unknown>, "ingredientsText", {
          fieldName: "Ingredientes por áudio",
          minLength: 1,
          maxLength: 4000,
        });
        ingredients = parseIngredientsText(ingredientsText);
        if (!ingredients.length) {
          return NextResponse.json({ message: "Não foi possível identificar ingredientes válidos." }, { status: 400 });
        }
        const usage = await consumeAiUsage({ userId, bucket: "recipe_ai", feature: "suggestions", inputMode });
        usageEventId = usage.eventId;
      }
    } else if (inputMode === "photo") {
      if (!payload.file) {
        return NextResponse.json({ message: "Envie uma foto dos ingredientes." }, { status: 400 });
      }
      const uploadError = validateUpload(payload.file, inputMode);
      if (uploadError) return uploadError;
      const usage = await consumeAiUsage({ userId, bucket: "recipe_ai", feature: "suggestions", inputMode });
      usageEventId = usage.eventId;
      const photoIngredients = await identifyIngredientsFromPhotoWithOpenAi(payload.file);
      ingredients = uniqueIngredients([...photoIngredients, ...parseIngredientsText(ingredientsText)]);
      ingredientsText = ingredients.join(", ");
    } else {
      ingredientsText = readRequiredString(payload as Record<string, unknown>, "ingredientsText", {
        fieldName: "Ingredientes",
        minLength: 1,
        maxLength: 4000,
      });
      ingredients = parseIngredientsText(ingredientsText);
      if (!ingredients.length) {
        return NextResponse.json({ message: "Não foi possível identificar ingredientes válidos." }, { status: 400 });
      }
      const usage = await consumeAiUsage({ userId, bucket: "recipe_ai", feature: "suggestions", inputMode });
      usageEventId = usage.eventId;
    }

    if (!ingredients.length) {
      await refundAiUsageEvent(userId, usageEventId).catch(() => undefined);
      return NextResponse.json({ message: "Não foi possível identificar ingredientes válidos." }, { status: 400 });
    }

    const response = await generateRecipeSuggestionsWithOpenAi(ingredients);
    const generationId = await persistSuggestionLog({
      userId,
      inputMode,
      ingredientsText,
      normalizedIngredients: response.normalizedIngredients,
      suggestions: [...response.suggestions, ...response.alsoCanMake],
    });

    return NextResponse.json({ ...response, generationId });
  } catch (error) {
    if (userIdForRefund && usageEventId && isOpenAiGenerationError(error)) {
      await refundAiUsageEvent(userIdForRefund, usageEventId).catch(() => undefined);
    }
    const usageResponse = aiUsageErrorResponse(error);
    if (usageResponse) return usageResponse;
    const validationResponse = validationErrorResponse(error);
    if (validationResponse) return validationResponse;
    if (isOpenAiGenerationError(error)) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    return NextResponse.json({ message: "Erro ao gerar sugestões." }, { status: 500 });
  }
}
