import type {
  FullRecipeRequestBody,
  Recipe,
  SuggestionRequestBody,
  SuggestionsResponse,
} from "@/features/recipes/types";
import { getSupabaseBrowserClient } from "@/lib/supabase-client";

async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let message = "Não foi possível concluir a solicitação.";
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
    requestBody.append("recipeFilter", body.recipeFilter || "all");
    if (body.cookingEquipment?.length) {
      requestBody.append("cookingEquipment", JSON.stringify(body.cookingEquipment));
    }
    if (body.excludedSuggestionTitles?.length) {
      requestBody.append("excludedSuggestionTitles", JSON.stringify(body.excludedSuggestionTitles));
    }
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

export type UserNotificationView = {
  id: string;
  type: string;
  title: string;
  body: string;
  href?: string;
  readAt?: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
};

export type RecipeCommentView = {
  id: string;
  body: string;
  authorName: string;
  authorUsername?: string;
  authorAvatarUrl?: string;
  createdAt: string;
};

export type LibraryRecipeFeedback = {
  averageRating: number;
  ratingCount: number;
  userRating: number;
  comments: RecipeCommentView[];
};

export async function fetchUserNotifications(): Promise<{
  notifications: UserNotificationView[];
  unreadCount: number;
}> {
  const authHeaders = await buildAuthHeaders();
  const response = await fetch("/api/notifications", {
    headers: authHeaders,
    cache: "no-store",
  });
  return parseResponse(response);
}

export async function markUserNotificationsRead(all = true, notificationId?: string): Promise<void> {
  const authHeaders = await buildAuthHeaders();
  const response = await fetch("/api/notifications", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders,
    },
    body: JSON.stringify({ all, notificationId }),
  });
  await parseResponse<{ ok: boolean }>(response);
}

export async function fetchLibraryRecipeFeedback(recipeId: string): Promise<LibraryRecipeFeedback> {
  const authHeaders = await buildAuthHeaders();
  const response = await fetch(`/api/library/meal/${encodeURIComponent(recipeId)}/feedback`, {
    headers: authHeaders,
    cache: "no-store",
  });
  return parseResponse(response);
}

export async function saveLibraryRecipeRating(recipeId: string, rating: number): Promise<LibraryRecipeFeedback> {
  const authHeaders = await buildAuthHeaders();
  const response = await fetch(`/api/library/meal/${encodeURIComponent(recipeId)}/rating`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders,
    },
    body: JSON.stringify({ rating }),
  });
  return parseResponse(response);
}

export async function postLibraryRecipeComment(recipeId: string, body: string): Promise<LibraryRecipeFeedback> {
  const authHeaders = await buildAuthHeaders();
  const response = await fetch(`/api/library/meal/${encodeURIComponent(recipeId)}/comments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders,
    },
    body: JSON.stringify({ body }),
  });
  return parseResponse(response);
}

export async function reportLibraryRecipe(params: {
  recipeId: string;
  reason: string;
  detail?: string;
}): Promise<{ ok: boolean; hiddenForReview: boolean; message: string }> {
  const authHeaders = await buildAuthHeaders();
  const response = await fetch(`/api/library/meal/${encodeURIComponent(params.recipeId)}/report`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders,
    },
    body: JSON.stringify({ reason: params.reason, detail: params.detail || "" }),
  });
  return parseResponse(response);
}
