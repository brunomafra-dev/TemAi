import { normalizeText } from "@/lib/utils";

const MAX_AI_INGREDIENTS = 80;
const MAX_AI_INGREDIENT_LENGTH = 120;

export function parseIngredientsText(input: string): string[] {
  const normalizedInput = input
    .replace(/\s+\+\s+/g, ",")
    .replace(/\s+e\s+/gi, ",")
    .replace(/\s+com\s+/gi, ",");

  const separatorPattern = /[,;\n]/g;
  const hasExplicitSeparator = separatorPattern.test(normalizedInput);

  return normalizedInput
    .split(hasExplicitSeparator ? separatorPattern : /\s+/g)
    .map((item) => normalizeText(item))
    .filter(Boolean);
}

export function uniqueIngredients(ingredients: string[]): string[] {
  return Array.from(new Set(ingredients.map((item) => normalizeText(item)).filter(Boolean)));
}

export function compactIngredientsForAi(
  ingredients: string[],
  options?: { maxItems?: number; maxLength?: number },
): string[] {
  const maxItems = options?.maxItems ?? MAX_AI_INGREDIENTS;
  const maxLength = options?.maxLength ?? MAX_AI_INGREDIENT_LENGTH;

  return uniqueIngredients(
    ingredients.map((ingredient) =>
      ingredient
        .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, maxLength),
    ),
  ).slice(0, maxItems);
}
