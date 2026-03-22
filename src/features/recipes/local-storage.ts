"use client";

import { SAVED_RECIPES_KEY } from "@/features/recipes/constants";
import type { Recipe } from "@/features/recipes/types";

function hasWindow(): boolean {
  return typeof window !== "undefined";
}

export function getMyRecipes(): Recipe[] {
  if (!hasWindow()) {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(SAVED_RECIPES_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as Recipe[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveMyRecipes(recipes: Recipe[]): void {
  if (!hasWindow()) {
    return;
  }

  window.localStorage.setItem(SAVED_RECIPES_KEY, JSON.stringify(recipes));
}

export function upsertMyRecipe(recipe: Recipe): Recipe[] {
  const currentRecipes = getMyRecipes();
  const exists = currentRecipes.some((item) => item.id === recipe.id);

  const nextRecipes = exists
    ? currentRecipes.map((item) => (item.id === recipe.id ? recipe : item))
    : [recipe, ...currentRecipes];

  saveMyRecipes(nextRecipes);
  return nextRecipes;
}

export function removeMyRecipe(recipeId: string): Recipe[] {
  const currentRecipes = getMyRecipes();
  const nextRecipes = currentRecipes.filter((recipe) => recipe.id !== recipeId);
  saveMyRecipes(nextRecipes);
  return nextRecipes;
}

export function isRecipeSaved(recipeId: string): boolean {
  return getMyRecipes().some((recipe) => recipe.id === recipeId);
}
