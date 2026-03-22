import { normalizeText } from "@/lib/utils";

export function parseIngredientsText(input: string): string[] {
  return input
    .split(/[,;\n]/g)
    .map((item) => normalizeText(item))
    .filter(Boolean);
}

export function uniqueIngredients(ingredients: string[]): string[] {
  return Array.from(new Set(ingredients.map((item) => normalizeText(item)).filter(Boolean)));
}
