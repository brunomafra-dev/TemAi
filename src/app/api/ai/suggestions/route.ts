import { NextResponse } from "next/server";
import { compactIngredientsForAi, parseIngredientsText, uniqueIngredients } from "@/features/recipes/helpers";
import {
  generateRecipeSuggestionsWithOpenAi,
  identifyIngredientsFromPhotoWithOpenAi,
  isOpenAiGenerationError,
  transcribeAudioWithOpenAi,
} from "@/features/recipes/openai-generator";
import type {
  InputMode,
  RecipeSuggestion,
  RecipeSuggestionFilter,
  SuggestionsResponse,
} from "@/features/recipes/types";
import type { CookingEquipment } from "@/features/recipes/types";
import {
  COOKING_EQUIPMENT_VALUES,
  DEFAULT_COOKING_EQUIPMENT,
  normalizeCookingEquipment,
} from "@/features/recipes/cooking-equipment";
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
  readStringArray,
  validationErrorResponse,
} from "@/lib/input-validation";

interface SuggestionsPayload {
  ingredientsText?: string;
  inputMode?: InputMode;
  recipeFilter?: RecipeSuggestionFilter;
  cookingEquipment?: unknown;
  excludedSuggestionTitles?: unknown;
}

const MAX_PHOTO_BYTES = 8 * 1024 * 1024;
const MAX_AUDIO_BYTES = 15 * 1024 * 1024;
const MAX_MULTIPART_BYTES = 16 * 1024 * 1024;
const MAX_INGREDIENTS_TEXT_LENGTH = 8000;
const RECIPE_FILTERS: readonly RecipeSuggestionFilter[] = [
  "all",
  "meal",
  "fit",
  "vegetarian",
  "dessert",
  "drink",
];
const TITLE_STOP_WORDS = new Set([
  "a",
  "as",
  "ao",
  "com",
  "da",
  "de",
  "do",
  "dos",
  "e",
  "em",
  "na",
  "no",
  "para",
  "rapida",
  "rapido",
  "simples",
  "caseira",
  "caseiro",
]);
const MEAT_TERMS =
  /\b(carne|frango|peixe|atum|sardinha|camarao|camar[aã]o|bacon|calabresa|linguica|lingui[cç]a|presunto|peru|porco|boi|costela|salmao|salm[aã]o|bacalhau|tilapia|til[aá]pia|lombo|picanha)\b/i;

async function readSuggestionsInput(request: Request): Promise<SuggestionsPayload & { file?: File }> {
  const contentType = request.headers.get("content-type")?.toLowerCase() || "";
  if (!contentType.includes("multipart/form-data")) {
    return (await parseJsonObjectBody(request, {
      maxBytes: 16 * 1024,
      allowedKeys: [
        "ingredientsText",
        "inputMode",
        "recipeFilter",
        "cookingEquipment",
        "excludedSuggestionTitles",
      ],
    })) as SuggestionsPayload;
  }

  assertRequestContentLength(request, MAX_MULTIPART_BYTES);
  const form = await request.formData();
  for (const key of form.keys()) {
    if (
      ![
        "ingredientsText",
        "inputMode",
        "recipeFilter",
        "cookingEquipment",
        "excludedSuggestionTitles",
        "file",
      ].includes(key)
    ) {
      throw new InputValidationError(`Campo inesperado: ${key}.`);
    }
  }

  const file = form.get("file");
  const rawIngredientsText = String(form.get("ingredientsText") || "").trim();
  const rawInputMode = String(form.get("inputMode") || "").trim();
  const rawRecipeFilter = String(form.get("recipeFilter") || "").trim();
  const rawCookingEquipment = String(form.get("cookingEquipment") || "").trim();
  const rawExcludedSuggestionTitles = String(form.get("excludedSuggestionTitles") || "").trim();
  if (rawIngredientsText.length > MAX_INGREDIENTS_TEXT_LENGTH) {
    throw new InputValidationError(
      "Texto de ingredientes muito grande. Resuma a lista e tente novamente.",
      413,
    );
  }
  if (!/^(text|audio|photo)$/i.test(rawInputMode)) {
    throw new InputValidationError("Modo de entrada malformado.");
  }

  return {
    ingredientsText: rawIngredientsText,
    inputMode: rawInputMode as InputMode,
    recipeFilter: rawRecipeFilter as RecipeSuggestionFilter,
    cookingEquipment: rawCookingEquipment,
    excludedSuggestionTitles: rawExcludedSuggestionTitles,
    file: file instanceof File ? file : undefined,
  };
}

function validateUpload(file: File, inputMode: InputMode): NextResponse | null {
  if (inputMode === "photo") {
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ message: "Envie um arquivo de imagem válido." }, { status: 415 });
    }
    if (file.size > MAX_PHOTO_BYTES) {
      return NextResponse.json(
        { message: "Foto muito grande. Envie uma imagem de até 8 MB." },
        { status: 413 },
      );
    }
  }

  if (inputMode === "audio") {
    if (!file.type.startsWith("audio/")) {
      return NextResponse.json({ message: "Envie um arquivo de áudio válido." }, { status: 415 });
    }
    if (file.size > MAX_AUDIO_BYTES) {
      return NextResponse.json(
        { message: "Áudio muito grande. Envie um arquivo de até 15 MB." },
        { status: 413 },
      );
    }
  }

  return null;
}

function readRecipeFilter(raw: unknown): RecipeSuggestionFilter {
  if (raw === undefined || raw === null || raw === "") return "all";
  if (typeof raw !== "string") {
    throw new InputValidationError("Filtro de receita malformado.");
  }
  const value = raw.trim() as RecipeSuggestionFilter;
  if (!RECIPE_FILTERS.includes(value)) {
    throw new InputValidationError("Filtro de receita inválido.");
  }
  return value;
}

function normalizeExcludedTitlesValue(raw: unknown): unknown {
  if (typeof raw !== "string") return raw;
  const value = raw.trim();
  if (!value) return [];
  try {
    return JSON.parse(value);
  } catch {
    throw new InputValidationError("Receitas excluidas malformadas.");
  }
}

function normalizeJsonArrayString(raw: unknown, fieldName: string): unknown {
  if (typeof raw !== "string") return raw;
  const value = raw.trim();
  if (!value) return undefined;
  try {
    return JSON.parse(value);
  } catch {
    throw new InputValidationError(`${fieldName} malformado.`);
  }
}

function readExcludedSuggestionTitles(payload: Record<string, unknown>): string[] {
  const raw = normalizeExcludedTitlesValue(payload.excludedSuggestionTitles);
  if (raw === undefined || raw === null) return [];
  return readStringArray({ excludedSuggestionTitles: raw }, "excludedSuggestionTitles", {
    fieldName: "Receitas excluidas",
    maxItems: 30,
    itemMaxLength: 120,
    minItems: 0,
  });
}

function readCookingEquipment(payload: Record<string, unknown>): CookingEquipment[] {
  const raw = normalizeJsonArrayString(payload.cookingEquipment, "Equipamentos");
  if (raw === undefined || raw === null) return [...DEFAULT_COOKING_EQUIPMENT];

  const values = readStringArray({ cookingEquipment: raw }, "cookingEquipment", {
    fieldName: "Equipamentos",
    maxItems: COOKING_EQUIPMENT_VALUES.length,
    itemMaxLength: 32,
    minItems: 0,
  });
  const normalized = normalizeCookingEquipment(values);

  if (values.some((value) => !COOKING_EQUIPMENT_VALUES.includes(value as CookingEquipment))) {
    throw new InputValidationError("Equipamentos inválidos.");
  }

  return normalized;
}

function normalizeTitleKey(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/g)
    .map((token) => token.trim())
    .filter((token) => token.length > 1 && !TITLE_STOP_WORDS.has(token))
    .map((token) => (token.length > 3 && token.endsWith("s") ? token.slice(0, -1) : token))
    .sort()
    .join(" ");
}

function normalizeIdKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function suggestionMatchesFilter(
  suggestion: RecipeSuggestion,
  recipeFilter: RecipeSuggestionFilter,
): boolean {
  if (recipeFilter !== "vegetarian") return true;
  const searchable = [
    suggestion.title,
    suggestion.description,
    ...suggestion.matchedIngredients,
    ...suggestion.missingIngredients,
  ].join(" ");
  return !MEAT_TERMS.test(searchable);
}

function filterDuplicateSuggestions(params: {
  response: SuggestionsResponse;
  excludedSuggestionTitles: string[];
  recipeFilter: RecipeSuggestionFilter;
}): { response: SuggestionsResponse; removedCount: number } {
  const seenTitleKeys = new Set(params.excludedSuggestionTitles.map(normalizeTitleKey).filter(Boolean));
  const seenIdKeys = new Set<string>();
  let removedCount = 0;

  function keepUnique(suggestion: RecipeSuggestion): boolean {
    const titleKey = normalizeTitleKey(suggestion.title);
    const idKey = normalizeIdKey(suggestion.id);
    const isDuplicate =
      Boolean(titleKey && seenTitleKeys.has(titleKey)) || Boolean(idKey && seenIdKeys.has(idKey));
    const matchesFilter = suggestionMatchesFilter(suggestion, params.recipeFilter);

    if (isDuplicate || !matchesFilter) {
      removedCount += 1;
      return false;
    }

    if (titleKey) seenTitleKeys.add(titleKey);
    if (idKey) seenIdKeys.add(idKey);
    return true;
  }

  return {
    removedCount,
    response: {
      ...params.response,
      suggestions: params.response.suggestions.filter(keepUnique).slice(0, 3),
      alsoCanMake: params.response.alsoCanMake.filter(keepUnique).slice(0, 3),
    },
  };
}

async function persistSuggestionLog(params: {
  userId: string;
  inputMode: InputMode;
  ingredientsText: string;
  normalizedIngredients: string[];
  cookingEquipment: CookingEquipment[];
  suggestions: unknown[];
}): Promise<string | undefined> {
  const insertPayload = {
    user_id: params.userId,
    input_mode: params.inputMode,
    ingredients_text: params.ingredientsText,
    normalized_ingredients: params.normalizedIngredients,
    cooking_equipment: params.cookingEquipment,
    suggestions: params.suggestions,
  };

  try {
    const supabase = getSupabaseServiceRoleClient();
    const { data, error } = await supabase
      .from("ai_generation_logs")
      .insert(insertPayload)
      .select("id")
      .single();

    if (error) throw error;
    return typeof data?.id === "string" ? data.id : undefined;
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message.toLowerCase()
        : typeof (error as { message?: unknown })?.message === "string"
          ? (error as { message: string }).message.toLowerCase()
          : "";
    if (!message.includes("cooking_equipment")) {
      return undefined;
    }
  }

  try {
    const supabase = getSupabaseServiceRoleClient();
    const fallbackPayload: Omit<typeof insertPayload, "cooking_equipment"> = {
      user_id: insertPayload.user_id,
      input_mode: insertPayload.input_mode,
      ingredients_text: insertPayload.ingredients_text,
      normalized_ingredients: insertPayload.normalized_ingredients,
      suggestions: insertPayload.suggestions,
    };
    const { data, error } = await supabase
      .from("ai_generation_logs")
      .insert(fallbackPayload)
      .select("id")
      .single();

    if (error) return undefined;
    return typeof data?.id === "string" ? data.id : undefined;
  } catch {
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
    const recipeFilter = readRecipeFilter(payload.recipeFilter);
    const cookingEquipment = readCookingEquipment(payload as Record<string, unknown>);
    const excludedSuggestionTitles = readExcludedSuggestionTitles(payload as Record<string, unknown>);

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
      return NextResponse.json({ message: "Plano free permite IA apenas por texto." }, { status: 403 });
    }

    let ingredientsText = payload.ingredientsText || "";
    let ingredients: string[] = [];

    if (inputMode === "audio") {
      if (payload.file) {
        const uploadError = validateUpload(payload.file, inputMode);
        if (uploadError) return uploadError;
        const usage = await consumeAiUsage({
          userId,
          bucket: "recipe_ai",
          feature: "suggestions",
          inputMode,
        });
        usageEventId = usage.eventId;
        const typedIngredientsText = ingredientsText.trim();
        const transcribedIngredientsText = await transcribeAudioWithOpenAi(payload.file, {
          userId,
          inputMode,
        });
        ingredientsText = [transcribedIngredientsText, typedIngredientsText].filter(Boolean).join(", ");
        ingredients = compactIngredientsForAi(parseIngredientsText(ingredientsText));
      } else {
        ingredientsText = readRequiredString(payload as Record<string, unknown>, "ingredientsText", {
          fieldName: "Ingredientes por áudio",
          minLength: 1,
          maxLength: MAX_INGREDIENTS_TEXT_LENGTH,
        });
        ingredients = compactIngredientsForAi(parseIngredientsText(ingredientsText));
        if (!ingredients.length) {
          return NextResponse.json(
            { message: "Não foi possível identificar ingredientes válidos." },
            { status: 400 },
          );
        }
        const usage = await consumeAiUsage({
          userId,
          bucket: "recipe_ai",
          feature: "suggestions",
          inputMode,
        });
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
      let photoIngredients = await identifyIngredientsFromPhotoWithOpenAi(payload.file, {
        userId,
        detail: "low",
      });
      if (photoIngredients.length < 2) {
        photoIngredients = await identifyIngredientsFromPhotoWithOpenAi(payload.file, {
          userId,
          detail: "high",
        });
      }
      ingredients = compactIngredientsForAi(
        uniqueIngredients([...photoIngredients, ...parseIngredientsText(ingredientsText)]),
      );
      ingredientsText = ingredients.join(", ");
    } else {
      ingredientsText = readRequiredString(payload as Record<string, unknown>, "ingredientsText", {
        fieldName: "Ingredientes",
        minLength: 1,
        maxLength: MAX_INGREDIENTS_TEXT_LENGTH,
      });
      ingredients = compactIngredientsForAi(parseIngredientsText(ingredientsText));
      if (!ingredients.length) {
        return NextResponse.json(
          { message: "Não foi possível identificar ingredientes válidos." },
          { status: 400 },
        );
      }
      const usage = await consumeAiUsage({ userId, bucket: "recipe_ai", feature: "suggestions", inputMode });
      usageEventId = usage.eventId;
    }

    if (!ingredients.length) {
      await refundAiUsageEvent(userId, usageEventId).catch(() => undefined);
      return NextResponse.json(
        { message: "Não foi possível identificar ingredientes válidos." },
        { status: 400 },
      );
    }

    const rawResponse = await generateRecipeSuggestionsWithOpenAi(ingredients, {
      recipeFilter,
      excludedSuggestionTitles,
      cookingEquipment,
      userId,
      inputMode,
    });
    const { response, removedCount } = filterDuplicateSuggestions({
      response: rawResponse,
      excludedSuggestionTitles,
      recipeFilter,
    });
    const dedupeNotice =
      excludedSuggestionTitles.length > 0 && (removedCount > 0 || response.suggestions.length < 3)
        ? "Mostrei só receitas novas para não repetir opções anteriores."
        : undefined;
    const generationId = await persistSuggestionLog({
      userId,
      inputMode,
      ingredientsText,
      normalizedIngredients: response.normalizedIngredients,
      cookingEquipment,
      suggestions: [...response.suggestions, ...response.alsoCanMake],
    });

    return NextResponse.json({ ...response, generationId, dedupeNotice });
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
