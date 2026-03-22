"use client";

import { useMemo, useState } from "react";
import { RecipeCard } from "@/components/recipes/recipe-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  getMyRecipes,
  removeMyRecipe,
  upsertMyRecipe,
} from "@/features/recipes/local-storage";
import type { Recipe } from "@/features/recipes/types";
import { parseIngredientsText } from "@/features/recipes/helpers";
import { slugify } from "@/lib/utils";

function mapSteps(value: string): string[] {
  return value
    .split(/\n/g)
    .map((step) => step.trim())
    .filter(Boolean);
}

export default function MyRecipesPage() {
  const [recipes, setRecipes] = useState<Recipe[]>(() => getMyRecipes());
  const [isAdding, setIsAdding] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [ingredientsText, setIngredientsText] = useState("");
  const [stepsText, setStepsText] = useState("");

  const hasFormData = useMemo(
    () => title.trim().length > 0 && ingredientsText.trim().length > 0 && stepsText.trim().length > 0,
    [ingredientsText, stepsText, title],
  );

  function clearForm() {
    setTitle("");
    setDescription("");
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
