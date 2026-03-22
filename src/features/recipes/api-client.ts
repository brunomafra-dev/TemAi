import type {
  FullRecipeRequestBody,
  Recipe,
  SuggestionRequestBody,
  SuggestionsResponse,
} from "@/features/recipes/types";

async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new Error("Nao foi possivel concluir a solicitacao.");
  }

  return (await response.json()) as T;
}

export async function fetchAiSuggestions(
  body: SuggestionRequestBody,
): Promise<SuggestionsResponse> {
  const response = await fetch("/api/ai/suggestions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  return parseResponse<SuggestionsResponse>(response);
}

export async function fetchFullRecipe(body: FullRecipeRequestBody): Promise<Recipe> {
  const response = await fetch("/api/ai/recipe", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  return parseResponse<Recipe>(response);
}
