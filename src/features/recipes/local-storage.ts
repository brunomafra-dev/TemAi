"use client";

import {
  AUTHORED_RECIPES_KEY,
  SAVED_RECIPE_REFS_KEY,
  SAVED_RECIPES_KEY,
} from "@/features/recipes/constants";
import type { Recipe, RecipeOrigin } from "@/features/recipes/types";

export interface SavedRecipeRef {
  recipeId: string;
  sourceOrigin: Exclude<RecipeOrigin, "manual">;
  savedAt: string;
  ingredientsSnapshot?: string[];
}

function hasWindow(): boolean {
  return typeof window !== "undefined";
}

function readJsonArray<T>(key: string): T[] {
  if (!hasWindow()) return [];
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as T[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeJsonArray<T>(key: string, value: T[]): void {
  if (!hasWindow()) return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function getAuthoredRecipes(): Recipe[] {
  const authored = readJsonArray<Recipe>(AUTHORED_RECIPES_KEY);
  if (authored.length > 0) return authored;

  // Backward compatibility: migrate old key once.
  const legacy = readJsonArray<Recipe>(SAVED_RECIPES_KEY);
  if (legacy.length > 0) {
    writeJsonArray(AUTHORED_RECIPES_KEY, legacy);
    window.localStorage.removeItem(SAVED_RECIPES_KEY);
  }
  return legacy;
}

export function saveAuthoredRecipes(recipes: Recipe[]): void {
  writeJsonArray(AUTHORED_RECIPES_KEY, recipes);
}

export function upsertAuthoredRecipe(recipe: Recipe): Recipe[] {
  const currentRecipes = getAuthoredRecipes();
  const exists = currentRecipes.some((item) => item.id === recipe.id);

  const nextRecipes = exists
    ? currentRecipes.map((item) => (item.id === recipe.id ? recipe : item))
    : [recipe, ...currentRecipes];

  saveAuthoredRecipes(nextRecipes);
  return nextRecipes;
}

export function removeAuthoredRecipe(recipeId: string): Recipe[] {
  const currentRecipes = getAuthoredRecipes();
  const nextRecipes = currentRecipes.filter((recipe) => recipe.id !== recipeId);
  saveAuthoredRecipes(nextRecipes);
  return nextRecipes;
}

export function getSavedRecipeRefs(): SavedRecipeRef[] {
  return readJsonArray<SavedRecipeRef>(SAVED_RECIPE_REFS_KEY);
}

export function saveSavedRecipeRefs(next: SavedRecipeRef[]): void {
  writeJsonArray(SAVED_RECIPE_REFS_KEY, next);
}

export function upsertSavedRecipeRef(ref: SavedRecipeRef): SavedRecipeRef[] {
  const current = getSavedRecipeRefs();
  const exists = current.some((item) => item.recipeId === ref.recipeId);
  const next = exists
    ? current.map((item) => (item.recipeId === ref.recipeId ? ref : item))
    : [ref, ...current];

  saveSavedRecipeRefs(next);
  return next;
}

export function removeSavedRecipeRef(recipeId: string): SavedRecipeRef[] {
  const current = getSavedRecipeRefs();
  const next = current.filter((item) => item.recipeId !== recipeId);
  saveSavedRecipeRefs(next);
  return next;
}

export function isRecipeSaved(recipeId: string): boolean {
  return getSavedRecipeRefs().some((item) => item.recipeId === recipeId);
}

// Backward-compatible aliases
export const getMyRecipes = getAuthoredRecipes;
export const saveMyRecipes = saveAuthoredRecipes;
export const upsertMyRecipe = upsertAuthoredRecipe;
export const removeMyRecipe = removeAuthoredRecipe;
