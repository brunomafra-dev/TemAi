import { uniqueIngredients } from "@/features/recipes/helpers";
import type { Recipe, RecipeSuggestion, SuggestionsResponse } from "@/features/recipes/types";

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
      "Refoga cebola e os vegetais ate ficarem macios.",
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
      "Mistura ovos com farinha e pitada de sal ate formar massa leve.",
      "Refoga rapidamente o atum com tomate e cebola.",
      "Despeja metade da massa na frigideira, adiciona recheio e cobre com o restante.",
      "Cozinha em fogo baixo ate firmar e virar para dourar o outro lado.",
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
      "Doura os dois lados ate firmar.",
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
      "Cozinha por alguns minutos ate o molho engrossar.",
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
    description: "Conforto em uma panela so, com molho encorpado.",
    requiredIngredients: ["macarrao", "queijo", "leite"],
    optionalIngredients: ["manteiga", "alho", "noz moscada"],
    baseSteps: [
      "Cozinhe o macarrao ate ficar al dente.",
      "Derreta manteiga com alho e adicione leite.",
      "Incorpore queijo aos poucos ate formar molho.",
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
      "Leve ao forno ate dourar e o queijo derreter.",
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
      "Cubra com agua, junte louro e cozinhe ate amaciar.",
      "Ajuste o sal e sirva quente.",
    ],
    prepMinutes: 35,
    servings: 4,
  },
];

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

export function generateFullRecipe(suggestionId: string, ingredients: string[]): Recipe {
  const template = AI_TEMPLATES.find((item) => item.id === suggestionId);
  const normalizedIngredients = uniqueIngredients(ingredients);

  if (!template) {
    return {
      id: suggestionId,
      title: "Receita personalizada",
      description: "Receita sugerida pelo TemAi a partir dos seus ingredientes.",
      ingredients: normalizedIngredients.length
        ? normalizedIngredients
        : ["sal", "alho", "azeite"],
      steps: [
        "Separe todos os ingredientes em uma bancada limpa.",
        "Aquece uma panela com um fio de azeite e inicie os refogados.",
        "Adicione os ingredientes principais e cozinhe ate atingir o ponto desejado.",
        "Finalize com ajuste de sal e ervas frescas.",
      ],
      prepMinutes: 25,
      servings: 2,
      sourceLabel: "TemAi IA",
      origin: "ai",
    };
  }

  const combinedIngredients = uniqueIngredients([
    ...template.requiredIngredients,
    ...template.optionalIngredients.filter((ingredient) => normalizedIngredients.includes(ingredient)),
    ...normalizedIngredients,
  ]);

  return {
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
}
