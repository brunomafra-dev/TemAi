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
  isMine: boolean;
};

export type LibraryRecipeFeedback = {
  averageRating: number;
  ratingCount: number;
  userRating: number;
  comments: RecipeCommentView[];
};

export type PopularRecipeView = {
  recipe: Recipe;
  ratingAverage: number;
  ratingCount: number;
  viewCount: number;
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
  const feedback = await parseResponse<LibraryRecipeFeedback>(response);
  notifyPopularMetricsChanged();
  return feedback;
}

export async function deleteLibraryRecipeRating(recipeId: string): Promise<LibraryRecipeFeedback> {
  const authHeaders = await buildAuthHeaders();
  const response = await fetch(`/api/library/meal/${encodeURIComponent(recipeId)}/rating`, {
    method: "DELETE",
    headers: authHeaders,
  });
  const feedback = await parseResponse<LibraryRecipeFeedback>(response);
  notifyPopularMetricsChanged();
  return feedback;
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

export async function updateLibraryRecipeComment(params: {
  recipeId: string;
  commentId: string;
  body: string;
}): Promise<LibraryRecipeFeedback> {
  const authHeaders = await buildAuthHeaders();
  const response = await fetch(
    `/api/library/meal/${encodeURIComponent(params.recipeId)}/comments/${encodeURIComponent(params.commentId)}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders,
      },
      body: JSON.stringify({ body: params.body }),
    },
  );
  return parseResponse(response);
}

export async function deleteLibraryRecipeComment(params: {
  recipeId: string;
  commentId: string;
}): Promise<LibraryRecipeFeedback> {
  const authHeaders = await buildAuthHeaders();
  const response = await fetch(
    `/api/library/meal/${encodeURIComponent(params.recipeId)}/comments/${encodeURIComponent(params.commentId)}`,
    {
      method: "DELETE",
      headers: authHeaders,
    },
  );
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

export async function reportLibraryRecipeComment(params: {
  recipeId: string;
  commentId: string;
  reason: string;
  detail?: string;
}): Promise<{ ok: boolean; hiddenForReview: boolean; message: string }> {
  const authHeaders = await buildAuthHeaders();
  const response = await fetch(
    `/api/library/meal/${encodeURIComponent(params.recipeId)}/comments/${encodeURIComponent(params.commentId)}/report`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders,
      },
      body: JSON.stringify({ reason: params.reason, detail: params.detail || "" }),
    },
  );
  return parseResponse(response);
}

function getRecipeVisitorKey(): string {
  if (typeof window === "undefined") return "";
  const key = "temai_recipe_visitor_key_v1";
  const existing = window.localStorage.getItem(key);
  if (existing && existing.length >= 12) return existing;
  const next =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  window.localStorage.setItem(key, next);
  return next;
}

export async function recordLibraryRecipeView(recipeId: string): Promise<void> {
  const authHeaders = await buildAuthHeaders();
  const visitorKey = getRecipeVisitorKey();
  const response = await fetch(`/api/library/meal/${encodeURIComponent(recipeId)}/view`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders,
    },
    body: JSON.stringify({ visitorKey }),
  });
  await parseResponse<{ ok: boolean }>(response);
  notifyPopularMetricsChanged();
}

function notifyPopularMetricsChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("temai:popular-metrics-changed"));
}

export async function fetchPersonalBadgeSlugs(): Promise<string[]> {
  const authHeaders = await buildAuthHeaders();
  const response = await fetch("/api/profile/badges", {
    headers: authHeaders,
    cache: "no-store",
  });
  const payload = await parseResponse<{ badges: string[] }>(response);
  return payload.badges;
}
