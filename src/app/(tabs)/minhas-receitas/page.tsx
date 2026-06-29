"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { RecipeCard } from "@/components/recipes/recipe-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getUserProfile } from "@/features/profile/storage";
import { getMyRecipes, removeMyRecipe } from "@/features/recipes/local-storage";
import { buildAuthHeaders } from "@/features/recipes/api-client";
import type { Recipe } from "@/features/recipes/types";

export default function MyRecipesPage() {
  const router = useRouter();
  const [recipes, setRecipes] = useState<Recipe[]>(() => getMyRecipes());
  const [publishingById, setPublishingById] = useState<Record<string, boolean>>({});
  const [publishedById, setPublishedById] = useState<Record<string, boolean>>({});
  const [publishErrorById, setPublishErrorById] = useState<Record<string, string>>({});

  function goBack() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    router.push("/perfil");
  }

  function handleDeleteRecipe(recipeId: string) {
    setRecipes(removeMyRecipe(recipeId));
  }

  async function handlePublishRecipe(recipe: Recipe) {
    if (publishingById[recipe.id]) return;

    const profile = getUserProfile();
    const authorName = `${profile.firstName} ${profile.lastName}`.trim() || "Usuário TemAi";

    setPublishErrorById((current) => ({ ...current, [recipe.id]: "" }));
    setPublishingById((current) => ({ ...current, [recipe.id]: true }));

    try {
      const authHeaders = await buildAuthHeaders();
      const response = await fetch("/api/library/publish-manual", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({
          title: recipe.title,
          description: recipe.description,
          ingredients: recipe.ingredients,
          steps: recipe.steps,
          prepMinutes: recipe.prepMinutes,
          servings: recipe.servings,
          imageUrl: recipe.imageUrl || null,
          category: recipe.category || "principais",
          authorName,
        }),
      });

      const data = (await response.json().catch(() => ({}))) as { message?: string };
      if (!response.ok) {
        throw new Error(data.message || "Falha ao publicar receita.");
      }

      setPublishedById((current) => ({ ...current, [recipe.id]: true }));
    } catch (error) {
      setPublishErrorById((current) => ({
        ...current,
        [recipe.id]: error instanceof Error ? error.message : "Falha ao publicar receita.",
      }));
    } finally {
      setPublishingById((current) => ({ ...current, [recipe.id]: false }));
    }
  }

  return (
    <section className="space-y-5 pb-2">
      <header className="space-y-2">
        <button type="button" onClick={goBack} className="inline-flex text-sm font-semibold text-primary">
          ← Voltar
        </button>
        <h1 className="text-2xl font-semibold">Minhas receitas</h1>
        <p className="text-sm text-muted-foreground">
          Suas receitas autorais ficam aqui. Para criar uma nova, use o fluxo principal de criação.
        </p>
      </header>

      <Link
        href="/criar"
        className="flex h-11 w-full items-center justify-center rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground"
      >
        Criar receita
      </Link>

      <div className="space-y-3">
        {recipes.length === 0 ? (
          <Card>
            <CardContent className="pt-5">
              <p className="text-sm text-muted-foreground">
                Você ainda não salvou receitas. Crie uma na aba Criar ou gere pela IA.
              </p>
            </CardContent>
          </Card>
        ) : (
          recipes.map((recipe) => (
            <div key={recipe.id} className="space-y-2">
              <RecipeCard recipe={recipe} href={`/receita/${recipe.id}?origin=manual`} />
              <Button
                variant={publishedById[recipe.id] ? "secondary" : "default"}
                size="sm"
                className="w-full"
                onClick={() => handlePublishRecipe(recipe)}
                disabled={Boolean(publishingById[recipe.id]) || Boolean(publishedById[recipe.id])}
              >
                {publishedById[recipe.id]
                  ? "Publicada na biblioteca"
                  : publishingById[recipe.id]
                    ? "Publicando..."
                    : "Publicar na biblioteca"}
              </Button>
              {publishErrorById[recipe.id] ? (
                <p className="text-xs text-red-700">{publishErrorById[recipe.id]}</p>
              ) : null}
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => handleDeleteRecipe(recipe.id)}
              >
                Remover da lista
              </Button>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
