import { uniqueIngredients } from "@/features/recipes/helpers";
import type {
  NutritionEstimate,
  Recipe,
  RecipeSuggestion,
  SuggestionsResponse,
} from "@/features/recipes/types";

interface RecipeTemplate {
  id: string;
  title: string;
  description: string;
  requiredIngredients: string[];
  optionalIngredients: string[];
  baseSteps: string[];
  prepMinutes: number;
  servings: number;
}

const AI_TEMPLATES: RecipeTemplate[] = [
  {
    id: "ai-arroz-frito-caseiro",
    title: "Arroz frito caseiro",
    description: "Arroz salteado rapido com vegetais e ovo.",
    requiredIngredients: ["arroz", "ovo", "cebola"],
    optionalIngredients: ["cenoura", "alho", "shoyu", "ervilha"],
    baseSteps: [
      "Aquece uma frigideira grande com fio de oleo.",
      "Refoga cebola e os vegetais até ficarem macios.",
      "Empurra os vegetais para o lado e mexe os ovos no centro.",
      "Adiciona o arroz cozido, tempera e salteia por 3 minutos.",
    ],
    prepMinutes: 18,
    servings: 2,
  },
  {
    id: "ai-torta-frigideira-atum",
    title: "Torta de frigideira de atum",
    description: "Massa simples e recheio pratico para o dia a dia.",
    requiredIngredients: ["atum", "ovo", "farinha de trigo"],
    optionalIngredients: ["tomate", "cebola", "queijo", "oregano"],
    baseSteps: [
      "Mistura ovos com farinha e pitada de sal até formar massa leve.",
      "Refoga rapidamente o atum com tomate e cebola.",
      "Despeja metade da massa na frigideira, adiciona recheio e cobre com o restante.",
      "Cozinha em fogo baixo até firmar e virar para dourar o outro lado.",
    ],
    prepMinutes: 22,
    servings: 2,
  },
  {
    id: "ai-panqueca-banana",
    title: "Panqueca de banana",
    description: "Doce rapido para cafe da manha ou lanche.",
    requiredIngredients: ["banana", "ovo", "aveia"],
    optionalIngredients: ["canela", "mel", "iogurte"],
    baseSteps: [
      "Amasse a banana e misture com ovo e aveia.",
      "Aquece frigideira antiaderente e distribui pequenas porcoes.",
      "Doura os dois lados até firmar.",
      "Finaliza com canela ou mel, se quiser.",
    ],
    prepMinutes: 12,
    servings: 1,
  },
  {
    id: "ai-frango-cremoso-mostarda",
    title: "Frango cremoso na mostarda",
    description: "Frango suculento com molho cremoso e rapido.",
    requiredIngredients: ["frango", "creme de leite", "mostarda"],
    optionalIngredients: ["alho", "cebola", "pimenta", "salsinha"],
    baseSteps: [
      "Tempera o frango com sal e pimenta e sela em frigideira quente.",
      "Refoga alho e cebola na mesma panela.",
      "Adiciona creme de leite e mostarda, mistura e volta o frango.",
      "Cozinha por alguns minutos até o molho engrossar.",
    ],
    prepMinutes: 28,
    servings: 3,
  },
  {
    id: "ai-salada-grao-bico",
    title: "Salada morna de grao-de-bico",
    description: "Leve, nutritiva e pronta em poucos minutos.",
    requiredIngredients: ["grao de bico", "tomate", "cebola"],
    optionalIngredients: ["azeite", "limao", "salsinha", "pepino"],
    baseSteps: [
      "Escorra e lave o grao-de-bico cozido.",
      "Misture tomate, cebola e pepino em cubos.",
      "Tempere com azeite, limao e sal.",
      "Finalize com salsinha picada e sirva.",
    ],
    prepMinutes: 15,
    servings: 2,
  },
  {
    id: "ai-macarrao-cremoso-queijo",
    title: "Macarrao cremoso de queijo",
    description: "Conforto em uma panela só, com molho encorpado.",
    requiredIngredients: ["macarrao", "queijo", "leite"],
    optionalIngredients: ["manteiga", "alho", "noz moscada"],
    baseSteps: [
      "Cozinhe o macarrão até ficar al dente.",
      "Derreta manteiga com alho e adicione leite.",
      "Incorpore queijo aos poucos até formar molho.",
      "Misture o macarrao ao molho e finalize com noz-moscada.",
    ],
    prepMinutes: 25,
    servings: 3,
  },
  {
    id: "ai-sanduiche-forno",
    title: "Sanduiche de forno dourado",
    description: "Lanche quente e rapido para compartilhar.",
    requiredIngredients: ["pao de forma", "queijo", "presunto"],
    optionalIngredients: ["tomate", "oregano", "requeijao"],
    baseSteps: [
      "Monte camadas de pao, presunto e queijo em refratario untado.",
      "Adicione tomate em rodelas e oregano.",
      "Finalize com requeijao e cubra com uma ultima camada de pao.",
      "Leve ao forno até dourar e o queijo derreter.",
    ],
    prepMinutes: 20,
    servings: 4,
  },
  {
    id: "ai-sopa-lentilha",
    title: "Sopa rapida de lentilha",
    description: "Prato quente e nutritivo para dias corridos.",
    requiredIngredients: ["lentilha", "cebola", "alho"],
    optionalIngredients: ["cenoura", "louro", "azeite"],
    baseSteps: [
      "Refogue cebola e alho em azeite.",
      "Adicione lentilha e cenoura picada.",
      "Cubra com água, junte louro e cozinhe até amaciar.",
      "Ajuste o sal e sirva quente.",
    ],
    prepMinutes: 35,
    servings: 4,
  },
];

interface NutritionMacro {
  caloriesKcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

const nutritionKeywordMap: Array<{ regex: RegExp; macro: NutritionMacro }> = [
  { regex: /\b(frango|peito de frango)\b/i, macro: { caloriesKcal: 165, proteinG: 31, carbsG: 0, fatG: 3.6 } },
  { regex: /\b(ovo|ovos)\b/i, macro: { caloriesKcal: 78, proteinG: 6.3, carbsG: 0.6, fatG: 5.3 } },
  { regex: /\b(arroz)\b/i, macro: { caloriesKcal: 130, proteinG: 2.7, carbsG: 28, fatG: 0.3 } },
  { regex: /\b(macarrao|massa|spaghetti|penne)\b/i, macro: { caloriesKcal: 157, proteinG: 5.8, carbsG: 30.9, fatG: 0.9 } },
  { regex: /\b(queijo)\b/i, macro: { caloriesKcal: 113, proteinG: 7, carbsG: 0.9, fatG: 9 } },
  { regex: /\b(atum)\b/i, macro: { caloriesKcal: 132, proteinG: 28, carbsG: 0, fatG: 1 } },
  { regex: /\b(lentilha|grao de bico)\b/i, macro: { caloriesKcal: 116, proteinG: 9, carbsG: 20, fatG: 0.4 } },
  { regex: /\b(banana)\b/i, macro: { caloriesKcal: 89, proteinG: 1.1, carbsG: 23, fatG: 0.3 } },
  { regex: /\b(aveia)\b/i, macro: { caloriesKcal: 389, proteinG: 16.9, carbsG: 66.3, fatG: 6.9 } },
  { regex: /\b(creme de leite)\b/i, macro: { caloriesKcal: 340, proteinG: 2.1, carbsG: 3, fatG: 35 } },
  { regex: /\b(mostarda)\b/i, macro: { caloriesKcal: 66, proteinG: 3.7, carbsG: 5.8, fatG: 4.4 } },
  { regex: /\b(tomate|cebola|cenoura|alho)\b/i, macro: { caloriesKcal: 30, proteinG: 1, carbsG: 6, fatG: 0.2 } },
];

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function estimateNutritionPerServing(ingredients: string[], servings: number): NutritionEstimate {
  const totals: NutritionMacro = { caloriesKcal: 0, proteinG: 0, carbsG: 0, fatG: 0 };

  ingredients.forEach((ingredient) => {
    const match = nutritionKeywordMap.find((entry) => entry.regex.test(ingredient));
    if (!match) return;
    totals.caloriesKcal += match.macro.caloriesKcal;
    totals.proteinG += match.macro.proteinG;
    totals.carbsG += match.macro.carbsG;
    totals.fatG += match.macro.fatG;
  });

  const divisor = Math.max(1, servings);
  return {
    caloriesKcal: round1(totals.caloriesKcal / divisor),
    proteinG: round1(totals.proteinG / divisor),
    carbsG: round1(totals.carbsG / divisor),
    fatG: round1(totals.fatG / divisor),
    perServing: true,
    disclaimer: "Estimativa aproximada por porcao. Pode variar conforme marca e preparo.",
  };
}

function scoreTemplate(template: RecipeTemplate, normalizedIngredients: string[]): {
  suggestion: RecipeSuggestion;
  score: number;
} {
  const matchedIngredients = template.requiredIngredients.filter((ingredient) =>
    normalizedIngredients.includes(ingredient),
  );
  const missingIngredients = template.requiredIngredients.filter(
    (ingredient) => !normalizedIngredients.includes(ingredient),
  );

  const score = matchedIngredients.length * 3 - missingIngredients.length;

  return {
    suggestion: {
      id: template.id,
      title: template.title,
      description: template.description,
      matchedIngredients,
      missingIngredients,
    },
    score,
  };
}

export function generateRecipeSuggestions(ingredients: string[]): SuggestionsResponse {
  const normalizedIngredients = uniqueIngredients(ingredients);

  const ranked = AI_TEMPLATES.map((template) => scoreTemplate(template, normalizedIngredients))
    .sort((a, b) => b.score - a.score || a.suggestion.missingIngredients.length - b.suggestion.missingIngredients.length);

  const suggestions = ranked.slice(0, 3).map((item) => item.suggestion);

  const suggestionIds = new Set(suggestions.map((suggestion) => suggestion.id));
  const alsoCanMake = ranked
    .map((item) => item.suggestion)
    .filter(
      (suggestion) =>
        !suggestionIds.has(suggestion.id) &&
        suggestion.missingIngredients.length > 0 &&
        suggestion.missingIngredients.length <= 2 &&
        suggestion.matchedIngredients.length > 0,
    )
    .slice(0, 3);

  return {
    suggestions,
    alsoCanMake,
    normalizedIngredients,
  };
}

export function generateFullRecipe(
  suggestionId: string,
  ingredients: string[],
  includeNutrition = false,
): Recipe {
  const template = AI_TEMPLATES.find((item) => item.id === suggestionId);
  const normalizedIngredients = uniqueIngredients(ingredients);

  if (!template) {
    const fallbackRecipe: Recipe = {
      id: suggestionId,
      title: "Receita personalizada",
      description: "Receita sugerida pelo TemAi a partir dos seus ingredientes.",
      ingredients: normalizedIngredients.length
        ? normalizedIngredients
        : ["sal", "alho", "azeite"],
      steps: [
        "Separe todos os ingredientes em uma bancada limpa.",
        "Aquece uma panela com um fio de azeite e inicie os refogados.",
        "Adicione os ingredientes principais e cozinhe até atingir o ponto desejado.",
        "Finalize com ajuste de sal e ervas frescas.",
      ],
      prepMinutes: 25,
      servings: 2,
      sourceLabel: "TemAi IA",
      origin: "ai",
    };
    if (includeNutrition) {
      fallbackRecipe.nutrition = estimateNutritionPerServing(
        fallbackRecipe.ingredients,
        fallbackRecipe.servings,
      );
    }
    return fallbackRecipe;
  }

  const combinedIngredients = uniqueIngredients([
    ...template.requiredIngredients,
    ...template.optionalIngredients.filter((ingredient) => normalizedIngredients.includes(ingredient)),
    ...normalizedIngredients,
  ]);

  const recipe: Recipe = {
    id: template.id,
    title: template.title,
    description: template.description,
    ingredients: combinedIngredients,
    steps: [
      ...template.baseSteps,
      "Finalize provando e ajustando o tempero de acordo com o seu gosto.",
    ],
    prepMinutes: template.prepMinutes,
    servings: template.servings,
    sourceLabel: "TemAi IA",
    origin: "ai",
  };
  if (includeNutrition) {
    recipe.nutrition = estimateNutritionPerServing(recipe.ingredients, recipe.servings);
  }
  return recipe;
}
