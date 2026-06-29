import type { Recipe, RecipeDifficulty } from "@/features/recipes/types";

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function getRecipeDifficulty(
  recipe: Pick<Recipe, "prepMinutes" | "ingredients" | "steps">,
): RecipeDifficulty {
  const ingredientCount = recipe.ingredients.length;
  const stepCount = recipe.steps.length;

  if (recipe.prepMinutes <= 25 && ingredientCount <= 8 && stepCount <= 6) {
    return "Fácil";
  }

  if (recipe.prepMinutes <= 55 && ingredientCount <= 13 && stepCount <= 9) {
    return "Médio";
  }

  return "Avançado";
}

export function normalizePrepMinutesForRecipe(params: {
  title: string;
  ingredients: string[];
  steps: string[];
  prepMinutes: number;
}): number {
  const text = normalize([params.title, ...params.ingredients, ...params.steps].join(" "));
  const current = Number.isFinite(params.prepMinutes) ? Math.round(params.prepMinutes) : 25;
  const bounded = Math.max(5, Math.min(360, current));

  const minimums: Array<[RegExp, number]> = [
    [/\bfeijao\b|\bfeijoada\b/, 45],
    [/\barroz\b|\brisoto\b/, 18],
    [/\blasanh/, 45],
    [/\bbolo\b|\btorta\b/, 35],
    [/\bfricasse\b|\bescondidinho\b/, 35],
    [/\bcarne\b|\bfrango\b|\bpeixe\b/, 15],
    [/\bmacarrao\b|\bmassa\b|\bspaghetti\b/, 12],
    [/\bbrigadeiro\b|\bbeijinho\b/, 15],
    [/\bcuscuz\b|\btapioca\b|\bomelete\b/, 10],
  ];

  const requiredMinimum = minimums.reduce(
    (minimum, [pattern, minutes]) => (pattern.test(text) ? Math.max(minimum, minutes) : minimum),
    0,
  );

  return Math.max(bounded, requiredMinimum);
}
