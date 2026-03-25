"use client";

import { useMemo, useState } from "react";
import { RecipeCard } from "@/components/recipes/recipe-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getUserProfile } from "@/features/profile/storage";
import {
  getMyRecipes,
  removeMyRecipe,
  upsertMyRecipe,
} from "@/features/recipes/local-storage";
import type { LibraryCategory, Recipe } from "@/features/recipes/types";
import { parseIngredientsText } from "@/features/recipes/helpers";
import { slugify } from "@/lib/utils";

function mapSteps(value: string): string[] {
  return value
    .split(/\n/g)
    .map((step) => step.trim())
    .filter(Boolean);
}

const categoryOptions: Array<{ id: LibraryCategory; label: string }> = [
  { id: "principais", label: "Principais" },
  { id: "veggie", label: "Veggie" },
  { id: "massas", label: "Massas" },
  { id: "kids", label: "Kids" },
  { id: "sobremesas", label: "Sobremesas" },
  { id: "bebidas", label: "Bebidas" },
  { id: "lanches", label: "Lanches" },
];

export default function MyRecipesPage() {
  const [recipes, setRecipes] = useState<Recipe[]>(() => getMyRecipes());
  const [isAdding, setIsAdding] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<LibraryCategory>("principais");
  const [ingredientsText, setIngredientsText] = useState("");
  const [stepsText, setStepsText] = useState("");
  const [publishingById, setPublishingById] = useState<Record<string, boolean>>({});
  const [publishedById, setPublishedById] = useState<Record<string, boolean>>({});
  const [publishErrorById, setPublishErrorById] = useState<Record<string, string>>({});

  const hasFormData = useMemo(
    () => title.trim().length > 0 && ingredientsText.trim().length > 0 && stepsText.trim().length > 0,
    [ingredientsText, stepsText, title],
  );

  function clearForm() {
    setTitle("");
    setDescription("");
    setCategory("principais");
    setIngredientsText("");
    setStepsText("");
    setImageUrl("");
  }

  function handleCreateRecipe() {
    if (!hasFormData) {
      return;
    }

    const recipe: Recipe = {
      id: `manual-${slugify(title)}-${Date.now()}`,
      title: title.trim(),
      description: description.trim() || "Receita criada por voce no TemAi.",
      category,
      ingredients: parseIngredientsText(ingredientsText),
      steps: mapSteps(stepsText),
      prepMinutes: 20,
      servings: 2,
      imageUrl: imageUrl.trim() || undefined,
      sourceLabel: "Criada por voce",
      origin: "manual",
    };

    const nextRecipes = upsertMyRecipe(recipe);
    setRecipes(nextRecipes);
    clearForm();
    setIsAdding(false);
  }

  function handleDeleteRecipe(recipeId: string) {
    setRecipes(removeMyRecipe(recipeId));
  }

  async function handlePublishRecipe(recipe: Recipe) {
    if (publishingById[recipe.id]) return;

    const profile = getUserProfile();
    const authorName = `${profile.firstName} ${profile.lastName}`.trim() || "Usuario TemAi";

    setPublishErrorById((current) => ({ ...current, [recipe.id]: "" }));
    setPublishingById((current) => ({ ...current, [recipe.id]: true }));

    try {
      const response = await fetch("/api/library/publish-manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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

      if (!response.ok) {
        const data = (await response.json()) as { message?: string };
        throw new Error(data.message || "Falha ao publicar receita.");
      }

      setPublishedById((current) => ({ ...current, [recipe.id]: true }));
    } catch (error) {
      setPublishErrorById((current) => ({
        ...current,
        [recipe.id]:
          error instanceof Error ? error.message : "Falha ao publicar receita.",
      }));
    } finally {
      setPublishingById((current) => ({ ...current, [recipe.id]: false }));
    }
  }

  return (
    <section className="space-y-5">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Minhas receitas</h1>
        <p className="text-sm text-muted-foreground">
          Salve receitas da IA e crie suas receitas manuais aqui.
        </p>
      </header>

      <Button variant={isAdding ? "secondary" : "default"} className="w-full" onClick={() => setIsAdding((value) => !value)}>
        {isAdding ? "Cancelar criacao" : "Criar receita"}
      </Button>

      {isAdding ? (
        <Card>
          <CardHeader>
            <CardTitle>Nova receita</CardTitle>
            <CardDescription>Titulo, ingredientes, preparo e imagem opcional.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              placeholder="Titulo da receita"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
            <Textarea
              placeholder="Descricao curta (opcional)"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="min-h-[70px]"
            />
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Categoria
              </p>
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value as LibraryCategory)}
                className="h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none"
              >
                {categoryOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <Textarea
              placeholder="Ingredientes separados por virgula"
              value={ingredientsText}
              onChange={(event) => setIngredientsText(event.target.value)}
              className="min-h-[90px]"
            />
            <Textarea
              placeholder="Modo de preparo (um passo por linha)"
              value={stepsText}
              onChange={(event) => setStepsText(event.target.value)}
              className="min-h-[120px]"
            />
            <Input
              placeholder="URL da imagem (opcional)"
              value={imageUrl}
              onChange={(event) => setImageUrl(event.target.value)}
            />
            <Button className="w-full" onClick={handleCreateRecipe} disabled={!hasFormData}>
              Salvar receita
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <div className="space-y-3">
        {recipes.length === 0 ? (
          <Card>
            <CardContent className="pt-5">
              <p className="text-sm text-muted-foreground">
                Voce ainda nao salvou receitas. Gere uma na Home para comecar.
              </p>
            </CardContent>
          </Card>
        ) : (
          recipes.map((recipe) => (
            <div key={recipe.id} className="space-y-2">
              <RecipeCard recipe={recipe} href={`/receita/${recipe.id}?origin=saved`} />
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
              <Button variant="outline" size="sm" className="w-full" onClick={() => handleDeleteRecipe(recipe.id)}>
                Remover da lista
              </Button>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
