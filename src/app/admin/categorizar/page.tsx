"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buildAuthHeaders } from "@/features/recipes/api-client";
import type { LibraryCategory, Recipe } from "@/features/recipes/types";
import { cn } from "@/lib/utils";

const categories: Array<{ value: LibraryCategory; label: string }> = [
  { value: "principais", label: "Principais" },
  { value: "massas", label: "Massas" },
  { value: "lanches", label: "Lanches" },
  { value: "sobremesas", label: "Sobremesas" },
  { value: "bebidas", label: "Bebidas" },
  { value: "veggie", label: "Veggie" },
  { value: "kids", label: "Kids" },
];

type ReviewPayload = {
  batch: string;
  total: number;
  recipes: Recipe[];
};

async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let message = "Não foi possível concluir.";
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

export default function CategorizeRecipesPage() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [reviewedCount, setReviewedCount] = useState(0);
  const [message, setMessage] = useState("");
  const [loadError, setLoadError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [savingCategory, setSavingCategory] = useState<LibraryCategory | "">("");

  const currentRecipe = recipes[currentIndex] || null;
  const remainingRecipes = recipes.length;
  const sessionTotal = reviewedCount + remainingRecipes;
  const progressPercent = sessionTotal ? Math.round((reviewedCount / sessionTotal) * 100) : 0;

  const loadBatch = useCallback(async () => {
    setIsLoading(true);
    setMessage("");
    setLoadError("");
    try {
      const authHeaders = await buildAuthHeaders();
      const response = await fetch("/api/library/category-review?batch=basic-brazilian", {
        headers: authHeaders,
        cache: "no-store",
      });
      const data = await parseResponse<ReviewPayload>(response);
      setRecipes(data.recipes);
      setCurrentIndex(0);
      setReviewedCount(0);
      setMessage(data.recipes.length ? "" : "Todas as receitas deste lote já foram revisadas.");
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Não foi possível carregar o lote.");
      setRecipes([]);
      setCurrentIndex(0);
      setReviewedCount(0);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadBatch();
  }, [loadBatch]);

  const goNext = useCallback(() => {
    setCurrentIndex((current) => Math.min(recipes.length - 1, current + 1));
  }, [recipes.length]);

  const goPrevious = useCallback(() => {
    setCurrentIndex((current) => Math.max(0, current - 1));
  }, []);

  async function saveCategory(category: LibraryCategory) {
    if (!currentRecipe || savingCategory) return;

    setSavingCategory(category);
    setMessage("");
    try {
      const authHeaders = await buildAuthHeaders();
      const response = await fetch("/api/library/set-category", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
        body: JSON.stringify({
          recipeId: currentRecipe.id,
          category,
        }),
      });
      const data = await parseResponse<{ recipe: Recipe }>(response);
      const nextRecipes = recipes.filter((recipe) => recipe.id !== currentRecipe.id);
      setRecipes(nextRecipes);
      setReviewedCount((current) => current + 1);
      setMessage(`${data.recipe.title} foi salva em ${categories.find((item) => item.value === category)?.label}.`);
      setCurrentIndex((current) => Math.min(current, Math.max(0, nextRecipes.length - 1)));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível salvar categoria.");
    } finally {
      setSavingCategory("");
    }
  }

  return (
    <section className="min-h-dvh bg-[#F7F0E6] px-4 py-5 text-[#2A1E17]">
      <div className="mx-auto flex min-h-[calc(100dvh-2.5rem)] w-full max-w-md flex-col gap-4">
        <header className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#9A7A4A]">Curadoria interna</p>
              <h1 className="font-display text-3xl">Categorizar receitas</h1>
            </div>
            <Link href="/biblioteca" className="text-xs font-semibold text-[#7A6D60]">
              Biblioteca
            </Link>
          </div>
          <div className="rounded-full bg-[#E8DDC8] p-1">
            <div
              className="h-2 rounded-full bg-[#C66A3D] transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <p className="text-xs font-semibold text-[#7A6D60]">
            {reviewedCount}/{sessionTotal || 0} revisadas · {remainingRecipes} restantes
          </p>
        </header>

        {isLoading ? (
          <Card className="border-[#E5D7C1] bg-[#FFFCF7]">
            <CardContent className="py-8">
              <p className="text-sm text-[#7A6D60]">Puxando receitas novas...</p>
            </CardContent>
          </Card>
        ) : loadError ? (
          <Card className="border-[#E5D7C1] bg-[#FFFCF7]">
            <CardContent className="space-y-3 py-8 text-center">
              <p className="font-semibold text-[#5E5348]">Não consegui carregar o lote.</p>
              <p className="text-sm text-[#7A6D60]">{loadError}</p>
              <Button onClick={() => void loadBatch()}>Tentar novamente</Button>
            </CardContent>
          </Card>
        ) : currentRecipe ? (
          <Card className="flex flex-1 flex-col overflow-hidden border-[#E5D7C1] bg-[#FFFCF7] shadow-[0_24px_48px_-28px_rgba(42,30,23,0.75)]">
            {currentRecipe.imageUrl ? (
              <div className="relative h-56 shrink-0 overflow-hidden">
                <Image
                  src={currentRecipe.imageUrl}
                  alt={currentRecipe.title}
                  fill
                  sizes="(max-width: 768px) 100vw, 420px"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#2A1E17]/70 via-transparent to-transparent" />
                <div className="absolute bottom-3 left-3 flex flex-wrap gap-1.5">
                  <Badge className="bg-black/40 text-white">{currentRecipe.prepMinutes} min</Badge>
                  <Badge className="bg-black/40 text-white">{currentRecipe.servings} porções</Badge>
                  <Badge className="bg-black/40 text-white">{currentRecipe.category || "sem categoria"}</Badge>
                </div>
              </div>
            ) : null}
            <CardHeader>
              <CardTitle className="text-2xl">{currentRecipe.title}</CardTitle>
              <CardDescription>{currentRecipe.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col gap-4">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#8C775A]">Ingredientes</p>
                <div className="flex max-h-24 flex-wrap gap-1.5 overflow-y-auto">
                  {currentRecipe.ingredients.slice(0, 12).map((ingredient) => (
                    <Badge key={`${currentRecipe.id}-${ingredient}`} className="bg-[#F8F2E7] text-[#695C4C]">
                      {ingredient}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="mt-auto space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#8C775A]">Mover para</p>
                <div className="grid grid-cols-2 gap-2">
                  {categories.map((category) => {
                    const isCurrent = currentRecipe.category === category.value;
                    return (
                      <Button
                        key={category.value}
                        type="button"
                        variant={isCurrent ? "default" : "secondary"}
                        className={cn("h-11 rounded-2xl", isCurrent && "bg-[#C66A3D] text-[#FFF9EE]")}
                        onClick={() => void saveCategory(category.value)}
                        disabled={Boolean(savingCategory)}
                      >
                        {savingCategory === category.value ? "Salvando..." : category.label}
                      </Button>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-[#E5D7C1] bg-[#FFFCF7]">
            <CardContent className="space-y-3 py-8 text-center">
              <p className="font-semibold text-[#5E5348]">Nada para categorizar agora.</p>
              <Button onClick={() => void loadBatch()}>Recarregar lote</Button>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-3 gap-2">
          <Button variant="secondary" onClick={goPrevious} disabled={currentIndex <= 0 || isLoading}>
            Voltar
          </Button>
          <Button variant="secondary" onClick={goNext} disabled={currentIndex >= recipes.length - 1 || isLoading}>
            Pular
          </Button>
          <Button variant="secondary" onClick={() => void loadBatch()} disabled={isLoading}>
            Recarregar
          </Button>
        </div>

        {message ? (
          <p className="rounded-2xl border border-[#E5D7BF] bg-[#FFFCF7] px-3 py-2 text-center text-xs font-semibold text-[#6A5E52]">
            {message}
          </p>
        ) : null}
      </div>
    </section>
  );
}
