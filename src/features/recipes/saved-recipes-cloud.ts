"use client";

import { buildAuthHeaders } from "@/features/recipes/api-client";
import {
  getSavedRecipeRefs,
  mergeSavedRecipeRefs,
  saveSavedRecipeRefs,
  upsertSavedRecipeRef,
} from "@/features/recipes/local-storage";
import type { SavedRecipeRef } from "@/features/recipes/types";

async function parseSavedRecipeResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let message = "Não foi possível sincronizar receitas salvas.";
    try {
      const payload = (await response.json()) as { message?: string };
      if (payload.message) message = payload.message;
    } catch {
      // keep default message
    }
    throw new Error(message);
  }

  return (await response.json()) as T;
}

async function readAuthHeaders(): Promise<Record<string, string> | null> {
  const authHeaders = await buildAuthHeaders();
  return authHeaders.Authorization ? authHeaders : null;
}

export async function syncSavedRecipeRefsFromCloud(): Promise<SavedRecipeRef[]> {
  const authHeaders = await readAuthHeaders();
  const localRefs = getSavedRecipeRefs();
  if (!authHeaders) return localRefs;

  const response = await fetch("/api/saved-recipes", {
    headers: authHeaders,
  });
  const payload = await parseSavedRecipeResponse<{ recipes: SavedRecipeRef[] }>(response);
  const merged = mergeSavedRecipeRefs(localRefs, payload.recipes || []);
  saveSavedRecipeRefs(merged);
  return merged;
}

export async function saveSavedRecipeRefToCloud(ref: SavedRecipeRef): Promise<boolean> {
  const authHeaders = await readAuthHeaders();
  if (!authHeaders) return false;

  const response = await fetch("/api/saved-recipes", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders,
    },
    body: JSON.stringify(ref),
  });
  const payload = await parseSavedRecipeResponse<{ recipe: SavedRecipeRef }>(response);
  if (payload.recipe) {
    upsertSavedRecipeRef(payload.recipe);
  }
  return true;
}

export async function deleteSavedRecipeRefFromCloud(ref: SavedRecipeRef): Promise<boolean> {
  const authHeaders = await readAuthHeaders();
  if (!authHeaders) return false;

  const params = new URLSearchParams({
    source: ref.sourceOrigin,
    recipeId: ref.recipeId,
  });
  const response = await fetch(`/api/saved-recipes?${params.toString()}`, {
    method: "DELETE",
    headers: authHeaders,
  });
  await parseSavedRecipeResponse<{ ok: boolean }>(response);
  return true;
}
