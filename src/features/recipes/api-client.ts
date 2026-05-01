import type {
  FullRecipeRequestBody,
  Recipe,
  SuggestionRequestBody,
  SuggestionsResponse,
} from "@/features/recipes/types";
import { getSupabaseBrowserClient } from "@/lib/supabase-client";

async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let message = "Nao foi possivel concluir a solicitacao.";
    try {
      const payload = (await response.json()) as { message?: string };
      if (payload?.message) message = payload.message;
    } catch {
      // keep default message
    }
    throw new Error(message);
  }

  return (await response.json()) as T;
}

export async function buildAuthHeaders(): Promise<Record<string, string>> {
  const client = getSupabaseBrowserClient();
  if (!client) return {};
  const session = await client.auth.getSession();
  const token = session.data.session?.access_token;
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

export async function fetchAiSuggestions(
  body: SuggestionRequestBody,
): Promise<SuggestionsResponse> {
  const authHeaders = await buildAuthHeaders();
  const hasFile = Boolean(body.file);
  const requestBody = hasFile ? new FormData() : JSON.stringify(body);
  const headers: Record<string, string> = {
    ...authHeaders,
  };

  if (hasFile && requestBody instanceof FormData) {
    requestBody.append("ingredientsText", body.ingredientsText);
    requestBody.append("inputMode", body.inputMode);
    if (body.file) requestBody.append("file", body.file);
  } else {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch("/api/ai/suggestions", {
    method: "POST",
    headers,
    body: requestBody,
  });

  return parseResponse<SuggestionsResponse>(response);
}

export async function fetchFullRecipe(body: FullRecipeRequestBody): Promise<Recipe> {
  const authHeaders = await buildAuthHeaders();
  const response = await fetch("/api/ai/recipe", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders,
    },
    body: JSON.stringify(body),
  });

  return parseResponse<Recipe>(response);
}
