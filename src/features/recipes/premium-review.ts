import type { ImportedRecipeDraft } from "@/features/recipes/import-from-url";
import { serverEnv } from "@/lib/env-server";

interface PremiumRecipeShape {
  title: string;
  description: string;
  ingredients: string[];
  steps: string[];
}

function cleanupLine(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function fallbackPolish(recipe: ImportedRecipeDraft): ImportedRecipeDraft {
  return {
    ...recipe,
    title: cleanupLine(recipe.title),
    description: cleanupLine(recipe.description),
    ingredients: recipe.ingredients.map((item) => cleanupLine(item)).filter(Boolean),
    steps: recipe.steps.map((step) => cleanupLine(step)).filter(Boolean),
  };
}

function safeParseJsonObject(value: string): PremiumRecipeShape | null {
  const start = value.indexOf("{");
  const end = value.lastIndexOf("}");
  if (start < 0 || end <= start) return null;

  try {
    const parsed = JSON.parse(value.slice(start, end + 1)) as PremiumRecipeShape;
    if (
      !parsed ||
      typeof parsed.title !== "string" ||
      typeof parsed.description !== "string" ||
      !Array.isArray(parsed.ingredients) ||
      !Array.isArray(parsed.steps)
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

async function requestPremiumReview(input: PremiumRecipeShape): Promise<PremiumRecipeShape | null> {
  const apiKey = serverEnv.openaiApiKey();
  if (!apiKey) return null;

  const model = serverEnv.openaiTranslationModel();
  const prompt = [
    "Revise a receita para PT-BR natural e culinario, sem inventar ingredientes ou etapas.",
    "Mantenha sentido original, ajuste concordancia, fluidez, medidas e termos de cozinha.",
    "Retorne SOMENTE JSON valido no formato:",
    '{"title":"...","description":"...","ingredients":["..."],"steps":["..."]}',
  ].join("\n");

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      input: [
        {
          role: "system",
          content: [{ type: "input_text", text: prompt }],
        },
        {
          role: "user",
          content: [{ type: "input_text", text: JSON.stringify(input) }],
        },
      ],
      max_output_tokens: 900,
      temperature: 0.2,
    }),
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as {
    output_text?: string;
  };

  if (!payload.output_text) return null;
  return safeParseJsonObject(payload.output_text);
}

export async function premiumReviewRecipe(recipe: ImportedRecipeDraft): Promise<ImportedRecipeDraft> {
  const polished = fallbackPolish(recipe);
  const reviewed = await requestPremiumReview({
    title: polished.title,
    description: polished.description,
    ingredients: polished.ingredients,
    steps: polished.steps,
  });

  if (!reviewed) return polished;

  return {
    ...polished,
    title: cleanupLine(reviewed.title) || polished.title,
    description: cleanupLine(reviewed.description) || polished.description,
    ingredients: reviewed.ingredients.map(cleanupLine).filter(Boolean).slice(0, 40),
    steps: reviewed.steps.map(cleanupLine).filter(Boolean).slice(0, 30),
  };
}
