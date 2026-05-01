import { serverEnv } from "@/lib/env-server";
import type { Recipe, RecipeSuggestion, SuggestionsResponse } from "@/features/recipes/types";

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
    if (!match) throw new Error("JSON não encontrado.");
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

async function callOpenAiJson(params: {
  model: string;
  prompt: string | Array<unknown>;
  maxOutputTokens?: number;
}): Promise<unknown> {
  const apiKey = serverEnv.openaiApiKey();
  if (!apiKey) {
    throw new OpenAiGenerationError("IA real ainda não configurada. Adicione OPENAI_API_KEY e faça redeploy.", 503);
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
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
      throw new OpenAiGenerationError("IA indisponivel: verifique creditos/billing da OpenAI.", 402);
    }

    throw new OpenAiGenerationError(message, response.status);
  }

  return extractJsonObject(readOutputText(payload));
}

async function callOpenAiText(params: {
  model: string;
  prompt: string;
  maxOutputTokens?: number;
}): Promise<string> {
  const apiKey = serverEnv.openaiApiKey();
  if (!apiKey) {
    throw new OpenAiGenerationError("IA real ainda não configurada. Adicione OPENAI_API_KEY e faça redeploy.", 503);
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
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

  return readOutputText(payload);
}

function normalizeSuggestion(value: unknown, fallbackId: string): RecipeSuggestion {
  const item = value as Partial<RecipeSuggestion>;
  return {
    id: typeof item.id === "string" && item.id.trim() ? item.id.trim() : fallbackId,
    title: typeof item.title === "string" ? item.title.trim() : "Receita sugerida",
    description: typeof item.description === "string" ? item.description.trim() : "Sugestao criada pela IA.",
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

export async function generateRecipeSuggestionsWithOpenAi(
  normalizedIngredients: string[],
): Promise<SuggestionsResponse> {
  const prompt = `
Você é o chef do app TemAi. Gere sugestões em português brasileiro usando SOMENTE os ingredientes informados como base.

Ingredientes disponiveis:
${normalizedIngredients.map((item) => `- ${item}`).join("\n")}

Regras:
- Priorize receitas que usem exatamente os ingredientes disponiveis.
- Não marque como faltante um ingrediente que aparece na lista.
- Se precisar sugerir ingrediente faltante, limite a no maximo 2 itens por receita.
- Retorne apenas JSON valido, sem markdown.
- Formato:
{
  "suggestions": [
    {
      "id": "slug-curto",
      "title": "Nome da receita",
      "description": "Descricao curta",
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
    maxOutputTokens: 1400,
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

export async function transcribeAudioWithOpenAi(file: File): Promise<string> {
  const apiKey = serverEnv.openaiApiKey();
  if (!apiKey) {
    throw new OpenAiGenerationError("IA real ainda não configurada. Adicione OPENAI_API_KEY e faça redeploy.", 503);
  }

  const formData = new FormData();
  formData.append("model", serverEnv.openaiAudioModel());
  formData.append("file", file);

  const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: formData,
  });

  const payload = (await response.json().catch(() => ({}))) as { text?: string; error?: { message?: string } };
  if (!response.ok) {
    const message = payload.error?.message || "Falha ao transcrever áudio.";
    const normalized = message.toLowerCase();
    if (response.status === 402 || response.status === 429 || normalized.includes("quota") || normalized.includes("billing")) {
      throw new OpenAiGenerationError("IA indisponivel: verifique creditos/billing da OpenAI.", 402);
    }
    throw new OpenAiGenerationError(message, response.status);
  }

  return payload.text?.trim() || "";
}

export async function identifyIngredientsFromPhotoWithOpenAi(file: File): Promise<string[]> {
  const bytes = Buffer.from(await file.arrayBuffer());
  const dataUrl = `data:${file.type || "image/jpeg"};base64,${bytes.toString("base64")}`;
  const parsed = (await callOpenAiJson({
    model: serverEnv.openaiSuggestionsModel(),
    prompt: [
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text:
              "Identifique ingredientes visíveis nesta foto para gerar receitas. Retorne apenas JSON válido no formato {\"ingredients\":[\"ingrediente\"]}. Use nomes simples em português brasileiro.",
          },
          { type: "input_image", image_url: dataUrl },
        ],
      },
    ],
    maxOutputTokens: 500,
  })) as { ingredients?: unknown };

  return Array.isArray(parsed.ingredients)
    ? parsed.ingredients.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];
}

export async function generateFullRecipeWithOpenAi(params: {
  suggestionTitle: string;
  ingredients: string[];
  includeNutrition: boolean;
}): Promise<Recipe> {
  const prompt = `
Crie uma receita completa em portugues brasileiro.

Receita escolhida: ${params.suggestionTitle}
Ingredientes disponiveis:
${params.ingredients.map((item) => `- ${item}`).join("\n")}

Regras:
- Use os ingredientes disponiveis como base.
- Escreva de forma didatica para cozinheiros iniciantes.
- Inclua quantidades aproximadas nos ingredientes sempre que fizer sentido.
- Os passos devem conter fogo baixo/médio/alto, tempo de cada etapa, ponto visual esperado e temperatura de forno quando houver forno.
- Se incluir ingrediente extra indispensavel, deixe claro na lista.
- prepMinutes deve representar o tempo medio total.
- Retorne apenas JSON valido, sem markdown.
- Formato:
{
  "id": "slug-curto",
  "title": "Nome",
  "description": "Descricao curta",
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
    maxOutputTokens: 1800,
  })) as Partial<Recipe>;

  return {
    id: typeof parsed.id === "string" && parsed.id.trim() ? parsed.id.trim() : "receita-ia",
    title: typeof parsed.title === "string" && parsed.title.trim() ? parsed.title.trim() : params.suggestionTitle,
    description: typeof parsed.description === "string" ? parsed.description.trim() : "Receita criada pela IA.",
    ingredients: Array.isArray(parsed.ingredients)
      ? parsed.ingredients.filter((entry): entry is string => typeof entry === "string")
      : params.ingredients,
    steps: Array.isArray(parsed.steps)
      ? parsed.steps.filter((entry): entry is string => typeof entry === "string")
      : ["Prepare os ingredientes, cozinhe até o ponto desejado e ajuste o tempero."],
    prepMinutes: typeof parsed.prepMinutes === "number" ? parsed.prepMinutes : 25,
    servings: typeof parsed.servings === "number" ? parsed.servings : 2,
    sourceLabel: "TemAi IA",
    origin: "ai",
  };
}

export async function polishAuthorRecipeWithOpenAi(params: {
  title: string;
  description: string;
  ingredientsText: string;
  stepsText: string;
}): Promise<{ description: string; ingredientsText: string; stepsText: string; prepMinutes: number; servings: number }> {
  const parsed = (await callOpenAiJson({
    model: serverEnv.openaiAuthorRecipeModel(),
    prompt: `
Organize uma receita autoral em português brasileiro, mantendo a ideia do usuário.

Titulo: ${params.title}
Descricao atual: ${params.description}
Ingredientes/transcricao: ${params.ingredientsText}
Preparo/transcricao: ${params.stepsText}

Retorne apenas JSON valido:
{
  "description": "descrição curta bonita",
  "ingredientsText": "um ingrediente por linha, com quantidade quando possível",
  "stepsText": "um passo didático por linha, com tempos, ponto visual, fogo/forno e temperatura quando aplicável",
  "prepMinutes": 30,
  "servings": 2
}
`,
    maxOutputTokens: 1400,
  })) as Partial<{ description: string; ingredientsText: string; stepsText: string; prepMinutes: number; servings: number }>;

  return {
    description: typeof parsed.description === "string" ? parsed.description : params.description,
    ingredientsText: typeof parsed.ingredientsText === "string" ? parsed.ingredientsText : params.ingredientsText,
    stepsText: typeof parsed.stepsText === "string" ? parsed.stepsText : params.stepsText,
    prepMinutes: typeof parsed.prepMinutes === "number" ? parsed.prepMinutes : 20,
    servings: typeof parsed.servings === "number" ? parsed.servings : 2,
  };
}

export async function answerSupportWithOpenAi(message: string): Promise<string> {
  return callOpenAiText({
    model: serverEnv.openaiSupportModel(),
    prompt: `
Você é o agente de suporte do app TemAi. Responda em português brasileiro, com clareza e gentileza.
Ajude com login, cadastro, exclusão de conta, assinatura, limites de IA, foto/áudio/texto, receitas e privacidade.
Se for problema sensível de conta/cobrança, oriente a abrir ticket e enviar email da conta, print e descrição.
Não invente políticas legais ou promessas de reembolso.

Usuario: ${message}
`,
    maxOutputTokens: 500,
  });
}
