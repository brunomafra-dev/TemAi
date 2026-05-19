import { serverEnv } from "@/lib/env-server";
import {
  formatCookingEquipmentForPrompt,
  normalizeCookingEquipment,
} from "@/features/recipes/cooking-equipment";
import type {
  CookingEquipment,
  Recipe,
  RecipeSuggestion,
  RecipeSuggestionFilter,
  SuggestionsResponse,
} from "@/features/recipes/types";
import {
  type AiTelemetryContext,
  extractOpenAiUsage,
  logOpenAiTelemetry,
} from "@/features/security/ai-telemetry";
import { getRecipeDifficulty, normalizePrepMinutesForRecipe } from "@/features/recipes/quality";

export const SUGGESTIONS_PROMPT_VERSION = "suggestions-v4-fit-equipment";
export const FULL_RECIPE_PROMPT_VERSION = "full-recipe-v4-fit-equipment";

class OpenAiGenerationError extends Error {
  status: number;

  constructor(message: string, status = 502) {
    super(message);
    this.name = "OpenAiGenerationError";
    this.status = status;
  }
}

function extractJsonObject(text: string): unknown {
  const trimmed = text.trim();
  if (!trimmed) throw new Error("Resposta vazia.");

  try {
    return JSON.parse(trimmed);
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("JSON nao encontrado.");
    return JSON.parse(match[0]);
  }
}

function readOutputText(payload: unknown): string {
  const response = payload as {
    output_text?: string;
    output?: Array<{ content?: Array<{ text?: string; type?: string }> }>;
  };

  if (typeof response.output_text === "string") return response.output_text;

  return (
    response.output
      ?.flatMap((item) => item.content || [])
      .map((content) => content.text || "")
      .join("\n")
      .trim() || ""
  );
}

function isRetryableOpenAiStatus(status: number): boolean {
  return status === 408 || status === 429 || status === 500 || status === 502 || status === 503 || status === 504;
}

async function fetchOpenAiWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const attempts = 2;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), serverEnv.openaiTimeoutMs());
    try {
      const response = await fetch(url, {
        ...init,
        signal: controller.signal,
      });

      if (attempt < attempts - 1 && isRetryableOpenAiStatus(response.status)) {
        await response.body?.cancel().catch(() => undefined);
        continue;
      }

      return response;
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new OpenAiGenerationError("IA demorou demais para responder. Tente novamente em instantes.", 504);
      }

      if (attempt >= attempts - 1) {
        throw new OpenAiGenerationError("Falha temporaria ao chamar IA. Tente novamente em instantes.", 502);
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  throw new OpenAiGenerationError("Falha temporaria ao chamar IA.", 502);
}

async function callOpenAiJson(params: {
  model: string;
  prompt: string | Array<unknown>;
  maxOutputTokens?: number;
  telemetry?: AiTelemetryContext;
}): Promise<unknown> {
  const apiKey = serverEnv.openaiApiKey();
  if (!apiKey) {
    throw new OpenAiGenerationError("IA real ainda nao configurada. Adicione OPENAI_API_KEY e faca redeploy.", 503);
  }

  const response = await fetchOpenAiWithTimeout("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: params.model,
      input: params.prompt,
      max_output_tokens: params.maxOutputTokens ?? 1200,
    }),
  });

  const payload = (await response.json().catch(() => ({}))) as {
    error?: { message?: string; code?: string; type?: string };
  };

  if (!response.ok) {
    const message = payload.error?.message || "Falha ao chamar IA.";
    const normalized = message.toLowerCase();
    if (
      response.status === 402 ||
      response.status === 429 ||
      normalized.includes("quota") ||
      normalized.includes("billing") ||
      normalized.includes("credit")
    ) {
      throw new OpenAiGenerationError("IA indisponível: verifique créditos/billing da OpenAI.", 402);
    }

    throw new OpenAiGenerationError(message, response.status);
  }

  await logOpenAiTelemetry({
    model: params.model,
    usage: extractOpenAiUsage(payload),
    context: params.telemetry,
  });

  return extractJsonObject(readOutputText(payload));
}

async function callOpenAiText(params: {
  model: string;
  prompt: string;
  maxOutputTokens?: number;
  telemetry?: AiTelemetryContext;
}): Promise<string> {
  const apiKey = serverEnv.openaiApiKey();
  if (!apiKey) {
    throw new OpenAiGenerationError("IA real ainda nao configurada. Adicione OPENAI_API_KEY e faca redeploy.", 503);
  }

  const response = await fetchOpenAiWithTimeout("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: params.model,
      input: params.prompt,
      max_output_tokens: params.maxOutputTokens ?? 800,
    }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = (payload as { error?: { message?: string } }).error?.message || "Falha ao chamar IA.";
    throw new OpenAiGenerationError(message, response.status);
  }

  await logOpenAiTelemetry({
    model: params.model,
    usage: extractOpenAiUsage(payload),
    context: params.telemetry,
  });

  return readOutputText(payload);
}

function normalizeSuggestion(value: unknown, fallbackId: string): RecipeSuggestion {
  const item = value as Partial<RecipeSuggestion>;
  return {
    id: typeof item.id === "string" && item.id.trim() ? item.id.trim() : fallbackId,
    title: typeof item.title === "string" ? item.title.trim() : "Receita sugerida",
    description: typeof item.description === "string" ? item.description.trim() : "Sugestão criada pela IA.",
    matchedIngredients: Array.isArray(item.matchedIngredients)
      ? item.matchedIngredients.filter((entry): entry is string => typeof entry === "string")
      : [],
    missingIngredients: Array.isArray(item.missingIngredients)
      ? item.missingIngredients.filter((entry): entry is string => typeof entry === "string")
      : [],
  };
}

export function isOpenAiGenerationError(error: unknown): error is OpenAiGenerationError {
  return error instanceof OpenAiGenerationError;
}

function recipeFilterInstruction(recipeFilter: RecipeSuggestionFilter): string {
  switch (recipeFilter) {
    case "meal":
      return "Filtro escolhido: Refeicao. Gere pratos principais salgados para almoco ou jantar; evite bebidas e sobremesas.";
    case "fit":
      return "Filtro escolhido: Fit/Saudavel. Gere receitas equilibradas para quem treina ou busca alimentacao mais leve: priorize proteina, vegetais, fibras e carboidratos de boa qualidade quando fizer sentido. Evite fritura pesada, excesso de acucar, excesso de creme/queijo/embutidos e ultraprocessados. Nao transforme automaticamente em low carb, vegano ou sem gordura; a receita deve continuar saborosa, pratica e viavel com os ingredientes informados.";
    case "vegetarian":
      return "Filtro escolhido: Vegano/Vegetariano. Nao use carne, frango, peixe, frutos do mar, bacon, presunto ou embutidos. Ovos, leite e queijo podem ser usados se estiverem nos ingredientes.";
    case "dessert":
      return "Filtro escolhido: Sobremesas. Gere receitas doces; evite pratos principais salgados e bebidas.";
    case "drink":
      return "Filtro escolhido: Bebidas/Drinks. Gere bebidas, sucos, vitaminas, smoothies ou drinks sem alcool; evite comida solida.";
    case "all":
    default:
      return "Filtro escolhido: Sem filtro. Escolha as melhores receitas possiveis para os ingredientes.";
  }
}

function cookingEquipmentInstruction(cookingEquipment: CookingEquipment[]): string {
  const normalized = normalizeCookingEquipment(cookingEquipment);
  const hasOven = normalized.includes("oven");
  const hasAirFryer = normalized.includes("air_fryer");
  const hasMicrowave = normalized.includes("microwave");
  const hasBlender = normalized.includes("blender");

  return [
    `Equipamentos disponiveis: ${formatCookingEquipmentForPrompt(normalized)}.`,
    hasOven
      ? "Forno disponivel: receitas assadas podem aparecer quando fizer sentido."
      : "Forno NAO disponivel: nao sugira nem escreva preparo que dependa de forno.",
    hasAirFryer
      ? "Air fryer disponivel: pode adaptar receitas com temperatura e tempo quando fizer sentido."
      : "Air fryer nao disponivel: nao dependa dela.",
    hasMicrowave ? "Micro-ondas disponivel para preparos rapidos." : "Micro-ondas nao disponivel.",
    hasBlender ? "Liquidificador disponivel para massas, cremes e bebidas." : "Liquidificador nao disponivel.",
    "Fritura comum pode ser feita no fogao em panela ou frigideira quando fizer sentido; nao cite fritadeira industrial.",
  ].join("\n");
}

export async function generateRecipeSuggestionsWithOpenAi(
  normalizedIngredients: string[],
  options?: {
    recipeFilter?: RecipeSuggestionFilter;
    excludedSuggestionTitles?: string[];
    cookingEquipment?: CookingEquipment[];
    userId?: string;
    inputMode?: string;
  },
): Promise<SuggestionsResponse> {
  const recipeFilter = options?.recipeFilter || "all";
  const excludedSuggestionTitles = (options?.excludedSuggestionTitles || []).slice(0, 30);
  const cookingEquipment = normalizeCookingEquipment(options?.cookingEquipment);
  const prompt = `
Voce e o chef do app TemAi. Gere sugestoes em portugues brasileiro usando os ingredientes informados como base.

Ingredientes disponiveis:
${normalizedIngredients.map((item) => `- ${item}`).join("\n")}

${recipeFilterInstruction(recipeFilter)}

${cookingEquipmentInstruction(cookingEquipment)}

Receitas ja exibidas que NAO podem ser repetidas nem por variacao parecida:
${excludedSuggestionTitles.length ? excludedSuggestionTitles.map((item) => `- ${item}`).join("\n") : "- nenhuma"}

Regras:
- Priorize receitas que usem exatamente os ingredientes disponiveis.
- Nao marque como faltante um ingrediente que aparece na lista.
- Se precisar sugerir ingrediente faltante, limite a no maximo 2 itens por receita.
- Nao repita nome, ideia central ou variacao obvia das receitas ja exibidas.
- Se nao houver 3 receitas novas e boas, retorne apenas 1 ou 2 em suggestions. Nao preencha com repeticao.
- Nao sugira receita que dependa de equipamento nao disponivel.
- Retorne apenas JSON valido, sem markdown.
- Formato:
{
  "suggestions": [
    {
      "id": "slug-curto",
      "title": "Nome da receita",
      "description": "Descrição curta",
      "matchedIngredients": ["ingrediente usado"],
      "missingIngredients": ["ingrediente faltante"]
    }
  ],
  "alsoCanMake": [],
  "normalizedIngredients": ["ingredientes normalizados"]
}
`;

  const parsed = (await callOpenAiJson({
    model: serverEnv.openaiSuggestionsModel(),
    prompt,
    maxOutputTokens: 1000,
    telemetry: {
      userId: options?.userId,
      route: "ai-suggestions",
      operation: "recipe_suggestions",
      feature: "suggestions",
      inputMode: options?.inputMode || "text",
      metadata: {
        promptVersion: SUGGESTIONS_PROMPT_VERSION,
        recipeFilter,
        cookingEquipment,
        excludedCount: excludedSuggestionTitles.length,
      },
    },
  })) as Partial<SuggestionsResponse>;

  return {
    suggestions: Array.isArray(parsed.suggestions)
      ? parsed.suggestions.slice(0, 3).map((item, index) => normalizeSuggestion(item, `ai-sugestao-${index + 1}`))
      : [],
    alsoCanMake: Array.isArray(parsed.alsoCanMake)
      ? parsed.alsoCanMake.slice(0, 3).map((item, index) => normalizeSuggestion(item, `ai-extra-${index + 1}`))
      : [],
    normalizedIngredients,
  };
}

export async function transcribeAudioWithOpenAi(
  file: File,
  options?: { userId?: string; inputMode?: string },
): Promise<string> {
  const apiKey = serverEnv.openaiApiKey();
  if (!apiKey) {
    throw new OpenAiGenerationError("IA real ainda nao configurada. Adicione OPENAI_API_KEY e faca redeploy.", 503);
  }

  const formData = new FormData();
  formData.append("model", serverEnv.openaiAudioModel());
  formData.append("file", file);

  const response = await fetchOpenAiWithTimeout("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: formData,
  });

  const payload = (await response.json().catch(() => ({}))) as { text?: string; error?: { message?: string } };
  if (!response.ok) {
    const message = payload.error?.message || "Falha ao transcrever audio.";
    const normalized = message.toLowerCase();
    if (response.status === 402 || response.status === 429 || normalized.includes("quota") || normalized.includes("billing")) {
      throw new OpenAiGenerationError("IA indisponível: verifique créditos/billing da OpenAI.", 402);
    }
    throw new OpenAiGenerationError(message, response.status);
  }

  await logOpenAiTelemetry({
    model: serverEnv.openaiAudioModel(),
    usage: null,
    context: {
      userId: options?.userId,
      route: "ai-suggestions",
      operation: "audio_transcription",
      feature: "suggestions",
      inputMode: options?.inputMode || "audio",
      metadata: { fileSize: file.size, fileType: file.type || "" },
    },
  });

  return payload.text?.trim() || "";
}

export async function identifyIngredientsFromPhotoWithOpenAi(
  file: File,
  options?: { userId?: string; detail?: "low" | "high" },
): Promise<string[]> {
  const bytes = Buffer.from(await file.arrayBuffer());
  const dataUrl = `data:${file.type || "image/jpeg"};base64,${bytes.toString("base64")}`;
  const detail = options?.detail || "low";
  const parsed = (await callOpenAiJson({
    model: serverEnv.openaiSuggestionsModel(),
    prompt: [
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text:
              "Identifique ingredientes visiveis nesta foto para gerar receitas. Retorne apenas JSON valido no formato {\"ingredients\":[\"ingrediente\"]}. Use nomes simples em portugues brasileiro.",
          },
          { type: "input_image", image_url: dataUrl, detail },
        ],
      },
    ],
    maxOutputTokens: 220,
    telemetry: {
      userId: options?.userId,
      route: "ai-suggestions",
      operation: "photo_ingredient_detection",
      feature: "suggestions",
      inputMode: "photo",
      metadata: { detail, fileSize: file.size, fileType: file.type || "" },
    },
  })) as { ingredients?: unknown };

  return Array.isArray(parsed.ingredients)
    ? parsed.ingredients.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];
}

export async function generateFullRecipeWithOpenAi(params: {
  suggestionTitle: string;
  ingredients: string[];
  includeNutrition: boolean;
  recipeFilter?: RecipeSuggestionFilter;
  cookingEquipment?: CookingEquipment[];
  userId?: string;
}): Promise<Recipe> {
  const cookingEquipment = normalizeCookingEquipment(params.cookingEquipment);
  const recipeFilter = params.recipeFilter || "all";
  const prompt = `
Crie uma receita completa em portugues brasileiro.

Receita escolhida: ${params.suggestionTitle}
Ingredientes disponiveis:
${params.ingredients.map((item) => `- ${item}`).join("\n")}

${recipeFilterInstruction(recipeFilter)}

${cookingEquipmentInstruction(cookingEquipment)}

Regras:
- Use os ingredientes disponiveis como base.
- Escreva de forma didatica para cozinheiros iniciantes.
- Inclua quantidades aproximadas nos ingredientes sempre que fizer sentido.
- Os passos devem respeitar os equipamentos disponiveis.
- Se usar fogao, inclua fogo baixo/medio/alto, tempo de cada etapa e ponto visual esperado.
- Se usar air fryer, inclua temperatura e tempo.
- Se forno nao estiver disponivel, nao escreva "leve ao forno" nem dependa dele.
- Se forno estiver disponivel e for usado, inclua temperatura e tempo.
- Se incluir ingrediente extra indispensavel, deixe claro na lista.
- prepMinutes deve representar o tempo medio total realista. Exemplos: arroz nao leva 2 minutos; feijao nao leva 15 minutos.
- Retorne apenas JSON valido, sem markdown.
- Formato:
{
  "id": "slug-curto",
  "title": "Nome",
  "description": "Descrição curta",
  "ingredients": ["ingrediente"],
  "steps": ["passo"],
  "prepMinutes": 20,
  "servings": 2,
  "sourceLabel": "TemAi IA",
  "origin": "ai"
}
`;

  const parsed = (await callOpenAiJson({
    model: serverEnv.openaiRecipeModel(),
    prompt,
    maxOutputTokens: 1600,
    telemetry: {
      userId: params.userId,
      route: "ai-recipe",
      operation: "full_recipe",
      feature: "recipe",
      inputMode: "text",
      metadata: {
        promptVersion: FULL_RECIPE_PROMPT_VERSION,
        includeNutrition: params.includeNutrition,
        recipeFilter,
        cookingEquipment,
      },
    },
  })) as Partial<Recipe>;

  const recipe: Recipe = {
    id: typeof parsed.id === "string" && parsed.id.trim() ? parsed.id.trim() : "receita-ia",
    title: typeof parsed.title === "string" && parsed.title.trim() ? parsed.title.trim() : params.suggestionTitle,
    description: typeof parsed.description === "string" ? parsed.description.trim() : "Receita criada pela IA.",
    ingredients: Array.isArray(parsed.ingredients)
      ? parsed.ingredients.filter((entry): entry is string => typeof entry === "string")
      : params.ingredients,
    steps: Array.isArray(parsed.steps)
      ? parsed.steps.filter((entry): entry is string => typeof entry === "string")
      : ["Prepare os ingredientes, cozinhe ate o ponto desejado e ajuste o tempero."],
    prepMinutes: typeof parsed.prepMinutes === "number" ? parsed.prepMinutes : 25,
    servings: typeof parsed.servings === "number" ? parsed.servings : 2,
    sourceLabel: "TemAi IA",
    origin: "ai",
  };

  const prepMinutes = normalizePrepMinutesForRecipe({
    title: recipe.title,
    ingredients: recipe.ingredients,
    steps: recipe.steps,
    prepMinutes: recipe.prepMinutes,
  });

  return {
    ...recipe,
    prepMinutes,
    difficulty: getRecipeDifficulty({ ...recipe, prepMinutes }),
  };
}

export async function polishAuthorRecipeWithOpenAi(params: {
  title: string;
  description: string;
  ingredientsText: string;
  stepsText: string;
  userId?: string;
}): Promise<{ description: string; ingredientsText: string; stepsText: string; prepMinutes: number; servings: number }> {
  const parsed = (await callOpenAiJson({
    model: serverEnv.openaiAuthorRecipeModel(),
    prompt: `
Organize uma receita autoral em português brasileiro, mantendo a ideia do usuário.

Título: ${params.title}
Descrição atual: ${params.description}
Ingredientes/transcricao: ${params.ingredientsText}
Preparo/transcricao: ${params.stepsText}

Retorne apenas JSON valido:
{
  "description": "descricao curta bonita",
  "ingredientsText": "um ingrediente por linha, com quantidade quando possível",
  "stepsText": "um passo didatico por linha, com tempos, ponto visual, fogo/forno e temperatura quando aplicavel",
  "prepMinutes": 30,
  "servings": 2
}
`,
    maxOutputTokens: 1400,
    telemetry: {
      userId: params.userId,
      route: "ai-author-recipe",
      operation: "author_recipe_polish",
      feature: "author_recipe",
      inputMode: "text",
    },
  })) as Partial<{ description: string; ingredientsText: string; stepsText: string; prepMinutes: number; servings: number }>;

  return {
    description: typeof parsed.description === "string" ? parsed.description : params.description,
    ingredientsText: typeof parsed.ingredientsText === "string" ? parsed.ingredientsText : params.ingredientsText,
    stepsText: typeof parsed.stepsText === "string" ? parsed.stepsText : params.stepsText,
    prepMinutes: typeof parsed.prepMinutes === "number" ? parsed.prepMinutes : 20,
    servings: typeof parsed.servings === "number" ? parsed.servings : 2,
  };
}

export async function answerSupportWithOpenAi(message: string, userId?: string): Promise<string> {
  return callOpenAiText({
    model: serverEnv.openaiSupportModel(),
    prompt: `
Você é o agente de suporte do app TemAi. Responda em português brasileiro, com clareza e gentileza.
Ajude com login, cadastro, exclusão de conta, assinatura, limites de IA, foto/áudio/texto, receitas e privacidade.
Se for problema sensível de conta/cobrança, oriente a abrir ticket e enviar email da conta, print e descrição.
Não invente políticas legais ou promessas de reembolso.

Usuário: ${message}
`,
    maxOutputTokens: 500,
    telemetry: {
      userId,
      route: "support-agent",
      operation: "support_answer",
      feature: "support_agent",
      inputMode: "none",
    },
  });
}
