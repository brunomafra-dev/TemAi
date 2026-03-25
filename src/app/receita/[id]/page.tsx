"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { RatingStars } from "@/components/recipes/rating-stars";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchFullRecipe } from "@/features/recipes/api-client";
import { LIBRARY_RECIPES } from "@/features/recipes/library-recipes";
import { addShoppingItemsFromRecipe } from "@/features/recipes/shopping-storage";
import {
  getMyRecipes,
  isRecipeSaved,
  removeMyRecipe,
  upsertMyRecipe,
} from "@/features/recipes/local-storage";
import { getUserRecipeRating, setUserRecipeRating } from "@/features/recipes/ratings-storage";
import type { Recipe } from "@/features/recipes/types";

type RecipeOriginQuery = "ai" | "library" | "saved";

function parseIngredientsQuery(rawIngredients: string | null): string[] {
  if (!rawIngredients) {
    return [];
  }

  return rawIngredients
    .split(",")
    .map((ingredient) => ingredient.trim())
    .filter(Boolean);
}

export default function RecipeDetailsPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();

  const recipeId = params.id;
  const origin = (searchParams.get("origin") ?? "ai") as RecipeOriginQuery;
  const ingredientList = useMemo(
    () => parseIngredientsQuery(searchParams.get("ingredients")),
    [searchParams],
  );

  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [isLoading, setIsLoading] = useState(origin === "ai");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSaved, setIsSaved] = useState(false);
  const [userRating, setUserRating] = useState(0);
  const [isShoppingOpen, setIsShoppingOpen] = useState(false);
  const [ownedIngredients, setOwnedIngredients] = useState<Record<string, boolean>>({});
  const [shoppingMessage, setShoppingMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadRecipe() {
      setErrorMessage("");

      if (origin === "library") {
        try {
          setIsLoading(true);
          const response = await fetch(`/api/library/meal/${encodeURIComponent(recipeId)}`);
          if (!response.ok) {
            throw new Error("Receita da biblioteca nao encontrada.");
          }

          const data = (await response.json()) as { recipe: Recipe };
        if (isMounted) {
          setRecipe(data.recipe);
          setIsSaved(isRecipeSaved(data.recipe.id));
          setUserRating(getUserRecipeRating(data.recipe.id));
        }
        } catch (error) {
          if (isMounted) {
            const fallbackRecipe = LIBRARY_RECIPES.find((item) => item.id === recipeId) ?? null;
            setRecipe(fallbackRecipe);
            setErrorMessage(
              fallbackRecipe
                ? ""
                : error instanceof Error
                  ? error.message
                  : "Nao foi possivel carregar receita da biblioteca.",
            );
            setIsSaved(Boolean(fallbackRecipe && isRecipeSaved(recipeId)));
          }
        } finally {
          if (isMounted) {
            setIsLoading(false);
          }
        }
        return;
      }

      if (origin === "saved") {
        const savedRecipe = getMyRecipes().find((item) => item.id === recipeId) ?? null;
        if (isMounted) {
          setRecipe(savedRecipe);
          setIsLoading(false);
          setIsSaved(Boolean(savedRecipe));
          if (savedRecipe) {
            setUserRating(getUserRecipeRating(savedRecipe.id));
          }
        }
        return;
      }

      try {
        setIsLoading(true);
        const fullRecipe = await fetchFullRecipe({
          suggestionId: recipeId,
          ingredients: ingredientList,
        });

        if (isMounted) {
          setRecipe(fullRecipe);
          setIsSaved(isRecipeSaved(fullRecipe.id));
          setUserRating(getUserRecipeRating(fullRecipe.id));
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(
            error instanceof Error ? error.message : "Nao foi possivel gerar a receita.",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadRecipe();

    return () => {
      isMounted = false;
    };
  }, [ingredientList, origin, recipeId]);

  function handleSaveRecipe() {
    if (!recipe) {
      return;
    }

    upsertMyRecipe(recipe);
    setIsSaved(true);
  }

  function handleUnsaveRecipe() {
    if (!recipe) {
      return;
    }

    removeMyRecipe(recipe.id);
    setIsSaved(false);
  }

  function handleRate(rating: number) {
    if (!recipe) {
      return;
    }
    setUserRecipeRating(recipe.id, rating);
    setUserRating(rating);
  }

  function openShoppingSelector() {
    if (!recipe) return;
    setOwnedIngredients(
      Object.fromEntries(recipe.ingredients.map((ingredient) => [ingredient, false])),
    );
    setShoppingMessage("");
    setIsShoppingOpen(true);
  }

  function confirmShoppingList() {
    if (!recipe) return;
    const missing = recipe.ingredients.filter((ingredient) => !ownedIngredients[ingredient]);
    if (missing.length === 0) {
      setShoppingMessage("Perfeito! Voce ja tem todos os ingredientes.");
      return;
    }

    addShoppingItemsFromRecipe({
      recipeId: recipe.id,
      recipeTitle: recipe.title,
      ingredientNames: missing,
    });
    setShoppingMessage(`${missing.length} item(ns) enviado(s) para sua lista de compras.`);
  }

  return (
    <div className="mx-auto min-h-screen w-full max-w-md px-4 pb-12 pt-5">
      <div className="mb-4">
        <Link href="/" className="text-sm font-semibold text-primary">
          ← Voltar
        </Link>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="py-8">
            <p className="text-sm text-muted-foreground">Gerando receita completa...</p>
          </CardContent>
        </Card>
      ) : null}

      {errorMessage ? (
        <Card>
          <CardContent className="py-8">
            <p className="text-sm text-red-700">{errorMessage}</p>
          </CardContent>
        </Card>
      ) : null}

      {!isLoading && !errorMessage && !recipe ? (
        <Card>
          <CardContent className="py-8">
            <p className="text-sm text-muted-foreground">Receita nao encontrada.</p>
          </CardContent>
        </Card>
      ) : null}

      {recipe ? (
        <article className="space-y-4">
          <Card>
            <CardHeader className="space-y-2">
              <CardTitle className="text-2xl">{recipe.title}</CardTitle>
              <CardDescription>{recipe.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Badge>{recipe.prepMinutes} min</Badge>
                <Badge>{recipe.servings} porcoes</Badge>
                <Badge>{recipe.sourceLabel}</Badge>
              </div>
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[#7A6D60]">
                  Sua avaliacao
                </p>
                <RatingStars value={userRating} onChange={handleRate} />
              </div>
              <div className="flex gap-2">
                {isSaved ? (
                  <Button variant="secondary" className="flex-1" onClick={handleUnsaveRecipe}>
                    Remover dos salvos
                  </Button>
                ) : (
                  <Button className="flex-1" onClick={handleSaveRecipe}>
                    Salvar receita
                  </Button>
                )}
                <Link
                  href="/minhas-receitas"
                  className="flex flex-1 items-center justify-center rounded-full border border-border bg-surface px-4 text-sm font-semibold text-foreground transition hover:bg-surface-muted"
                >
                  Ver Minhas receitas
                </Link>
              </div>
              <Button
                variant="outline"
                className="w-full"
                onClick={openShoppingSelector}
              >
                Adicionar a lista de compras
              </Button>
              {isShoppingOpen ? (
                <div className="space-y-3 rounded-2xl border border-[#E5D7BF] bg-[#FFFCF7] p-3">
                  <p className="text-sm font-semibold text-[#5D5248]">
                    Marque os ingredientes que voce ja tem em casa:
                  </p>
                  <div className="space-y-2">
                    {recipe.ingredients.map((ingredient) => (
                      <label key={`own-${ingredient}`} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={Boolean(ownedIngredients[ingredient])}
                          onChange={(event) =>
                            setOwnedIngredients((current) => ({
                              ...current,
                              [ingredient]: event.target.checked,
                            }))
                          }
                        />
                        <span>{ingredient}</span>
                      </label>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Button className="flex-1" onClick={confirmShoppingList}>
                      Enviar faltantes
                    </Button>
                    <Button
                      variant="secondary"
                      className="flex-1"
                      onClick={() => setIsShoppingOpen(false)}
                    >
                      Fechar
                    </Button>
                  </div>
                  {shoppingMessage ? (
                    <p className="text-xs font-semibold text-[#6A5E52]">{shoppingMessage}</p>
                  ) : null}
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Ingredientes</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {recipe.ingredients.map((ingredient) => (
                  <li key={`${recipe.id}-${ingredient}`} className="text-sm text-foreground">
                    • {ingredient}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Passo a passo</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="space-y-3">
                {recipe.steps.map((step, index) => (
                  <li key={`${recipe.id}-step-${index + 1}`} className="flex gap-3 text-sm">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold">
                      {index + 1}
                    </span>
                    <span className="leading-relaxed">{step}</span>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </article>
      ) : null}
    </div>
  );
}
