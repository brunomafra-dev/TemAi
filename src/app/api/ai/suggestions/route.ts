import { NextResponse } from "next/server";
import { parseIngredientsText, uniqueIngredients } from "@/features/recipes/helpers";
import {
  generateRecipeSuggestionsWithOpenAi,
  identifyIngredientsFromPhotoWithOpenAi,
  isOpenAiGenerationError,
  transcribeAudioWithOpenAi,
} from "@/features/recipes/openai-generator";
import type { InputMode } from "@/features/recipes/types";
import { consumeAuthRateLimit } from "@/features/security/auth-rate-limit";
import { rateLimitResponse, requireAuthUserId } from "@/features/security/auth-user";
import { getSupabaseServiceRoleClient } from "@/lib/supabase-admin";
import {
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

async function readSuggestionsInput(request: Request): Promise<SuggestionsPayload & { file?: File }> {
  const contentType = request.headers.get("content-type")?.toLowerCase() || "";
  if (!contentType.includes("multipart/form-data")) {
    return (await parseJsonObjectBody(request, { maxBytes: 12 * 1024 })) as SuggestionsPayload;
  }

  const form = await request.formData();
  const file = form.get("file");
  return {
    ingredientsText: String(form.get("ingredientsText") || ""),
    inputMode: String(form.get("inputMode") || "") as InputMode,
    file: file instanceof File ? file : undefined,
  };
}

function validateUpload(file: File, inputMode: InputMode): NextResponse | null {
  if (inputMode === "photo") {
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ message: "Envie um arquivo de imagem valido." }, { status: 415 });
    }
    if (file.size > MAX_PHOTO_BYTES) {
      return NextResponse.json({ message: "Foto muito grande. Envie uma imagem de ate 8 MB." }, { status: 413 });
    }
  }

  if (inputMode === "audio") {
    if (!file.type.startsWith("audio/")) {
      return NextResponse.json({ message: "Envie um arquivo de audio valido." }, { status: 415 });
    }
    if (file.size > MAX_AUDIO_BYTES) {
      return NextResponse.json({ message: "Audio muito grande. Envie um arquivo de ate 15 MB." }, { status: 413 });
    }
  }

  return null;
}

function startOfCurrentMonthIso(): string {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
  return start.toISOString();
}

async function resolveUserAndPlan(authorizationHeader: string | null): Promise<{
  userId: string | null;
  isPremium: boolean;
}> {
  if (!authorizationHeader?.startsWith("Bearer ")) {
    return { userId: null, isPremium: false };
  }

  const token = authorizationHeader.slice(7).trim();
  if (!token) return { userId: null, isPremium: false };

  try {
    const supabase = getSupabaseServiceRoleClient();
    const userRes = await supabase.auth.getUser(token);
    const userId = userRes.data.user?.id || null;
    if (!userId) return { userId: null, isPremium: false };

    const subRes = await supabase
      .from("user_subscriptions")
      .select("plan,status")
      .eq("user_id", userId)
      .maybeSingle();

    const isPremium = Boolean(
      subRes.data && subRes.data.plan === "premium" && subRes.data.status === "active",
    );

    return { userId, isPremium };
  } catch {
    return { userId: null, isPremium: false };
  }
}

export async function POST(request: Request) {
  try {
    const payload = await readSuggestionsInput(request);
    const inputModeRaw = readRequiredString(payload as Record<string, unknown>, "inputMode", {
      fieldName: "Modo de entrada",
      minLength: 4,
      maxLength: 10,
      pattern: /^(text|audio|photo)$/i,
    }).toLowerCase();
    const inputMode = inputModeRaw as InputMode;

    const authenticatedUserId = await requireAuthUserId(request);
    if (!authenticatedUserId) {
      return NextResponse.json({ message: "Sessao obrigatoria para usar IA." }, { status: 401 });
    }

    const endpointRateLimit = await consumeAuthRateLimit({
      route: "ai-suggestions",
      request,
      identifier: authenticatedUserId,
    });
    if (!endpointRateLimit.allowed) {
      return rateLimitResponse(endpointRateLimit.retryAfterSeconds);
    }

    const { userId, isPremium } = await resolveUserAndPlan(request.headers.get("authorization"));

    if (!isPremium && inputMode !== "text") {
      return NextResponse.json(
        { message: "Plano free permite IA apenas por texto." },
        { status: 403 },
      );
    }

    if (!isPremium && userId) {
      const supabase = getSupabaseServiceRoleClient();
      const monthStartIso = startOfCurrentMonthIso();
      const countRes = await supabase
        .from("ai_generation_logs")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte("created_at", monthStartIso);

      const count = countRes.count || 0;
      if (count >= 3) {
        return NextResponse.json(
          { message: "Plano free atingiu o limite de 3 geracoes de IA neste mes." },
          { status: 429 },
        );
      }
    }

    let ingredientsText = payload.ingredientsText || "";
    let ingredients: string[] = [];

    if (inputMode === "audio") {
      if (!payload.file) {
        return NextResponse.json({ message: "Envie um arquivo de audio." }, { status: 400 });
      }
      const uploadError = validateUpload(payload.file, inputMode);
      if (uploadError) return uploadError;
      ingredientsText = await transcribeAudioWithOpenAi(payload.file);
      ingredients = parseIngredientsText(ingredientsText);
    } else if (inputMode === "photo") {
      if (!payload.file) {
        return NextResponse.json({ message: "Envie uma foto dos ingredientes." }, { status: 400 });
      }
      const uploadError = validateUpload(payload.file, inputMode);
      if (uploadError) return uploadError;
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
    }

    if (!ingredients.length) {
      return NextResponse.json({ message: "Nao foi possivel identificar ingredientes validos." }, { status: 400 });
    }

    const response = await generateRecipeSuggestionsWithOpenAi(ingredients);

    if (userId) {
      try {
        const supabase = getSupabaseServiceRoleClient();
        await supabase.from("ai_generation_logs").insert({
          user_id: userId,
          input_mode: inputMode,
          ingredients_text: ingredientsText,
          normalized_ingredients: response.normalizedIngredients,
          suggestions: response.suggestions,
        });
      } catch {
        // non-blocking log persistence
      }
    }

    return NextResponse.json(response);
  } catch (error) {
    const validationResponse = validationErrorResponse(error);
    if (validationResponse) return validationResponse;
    if (isOpenAiGenerationError(error)) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    return NextResponse.json({ message: "Erro ao gerar sugestoes." }, { status: 500 });
  }
}
