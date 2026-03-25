export type InputMode = "text" | "audio" | "photo";
export type LibraryCategory =
  | "principais"
  | "veggie"
  | "massas"
  | "kids"
  | "sobremesas"
  | "bebidas"
  | "lanches";

export type RecipeOrigin = "ai" | "library" | "manual";

export interface RecipeSuggestion {
  id: string;
  title: string;
  description: string;
  matchedIngredients: string[];
  missingIngredients: string[];
}

export interface Recipe {
  id: string;
  title: string;
  description: string;
  category?: LibraryCategory;
  ingredients: string[];
  steps: string[];
  prepMinutes: number;
  servings: number;
  imageUrl?: string;
  sourceLabel: string;
  origin: RecipeOrigin;
}

export interface SuggestionsResponse {
  suggestions: RecipeSuggestion[];
  alsoCanMake: RecipeSuggestion[];
  normalizedIngredients: string[];
}

export interface SuggestionRequestBody {
  ingredientsText: string;
  inputMode: InputMode;
}

export interface FullRecipeRequestBody {
  suggestionId: string;
  ingredients: string[];
}
