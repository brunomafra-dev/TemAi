"use client";

const RATING_KEY = "temai_recipe_ratings_v2";

type RatingMap = Record<string, number>;

function getMap(): RatingMap {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(RATING_KEY);
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw) as RatingMap;
    return parsed || {};
  } catch {
    return {};
  }
}

function saveMap(map: RatingMap): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(RATING_KEY, JSON.stringify(map));
}

export function getUserRecipeRating(recipeId: string): number {
  const map = getMap();
  return map[recipeId] ?? 0;
}

export function setUserRecipeRating(recipeId: string, rating: number): void {
  const rounded = Math.max(1, Math.min(10, Math.round(rating)));
  const map = getMap();
  map[recipeId] = rounded;
  saveMap(map);
}
