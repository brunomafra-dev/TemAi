import { normalizeText } from "@/lib/utils";

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
