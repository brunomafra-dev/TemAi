"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { RecipeCard } from "@/components/recipes/recipe-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { parseIngredientsText } from "@/features/recipes/helpers";
import { getMyRecipes, removeMyRecipe, upsertMyRecipe } from "@/features/recipes/local-storage";
import type { Recipe } from "@/features/recipes/types";
import { slugify } from "@/lib/utils";

const heroImage =
  "https://images.unsplash.com/photo-1495521821757-a1efb6729352?auto=format&fit=crop&w=1500&q=80";

function mapSteps(value: string): string[] {
  return value
    .split(/\n/g)
    .map((step) => step.trim())
    .filter(Boolean);
}

export default function CreatePage() {
  const [recipes, setRecipes] = useState<Recipe[]>(() => getMyRecipes());
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [ingredientsText, setIngredientsText] = useState("");
  const [stepsText, setStepsText] = useState("");
  const [imageDataUrl, setImageDataUrl] = useState("");
  const [isSaveChoiceOpen, setIsSaveChoiceOpen] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState("");
  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  const hasFormData = useMemo(
    () => title.trim().length > 0 && ingredientsText.trim().length > 0 && stepsText.trim().length > 0,
    [ingredientsText, stepsText, title],
  );

  function clearForm() {
    setTitle("");
    setDescription("");
    setIngredientsText("");
    setStepsText("");
    setImageDataUrl("");
  }

  function buildManualRecipe(): Recipe {
    return {
      id: `manual-${slugify(title)}-${Date.now()}`,
      title: title.trim(),
      description: description.trim() || "Receita criada por voce no TemAi.",
      ingredients: parseIngredientsText(ingredientsText),
      steps: mapSteps(stepsText),
      prepMinutes: 20,
      servings: 2,
      imageUrl: imageDataUrl || undefined,
      sourceLabel: "Criada por voce",
      origin: "manual",
    };
  }

  function handleCreateRecipe() {
    if (!hasFormData) {
      return;
    }
    setSaveFeedback("");
    setIsSaveChoiceOpen(true);
  }

  function handleDeleteRecipe(recipeId: string) {
    setRecipes(removeMyRecipe(recipeId));
  }

  function handleImageChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setImageDataUrl(typeof reader.result === "string" ? reader.result : "");
    };
    reader.readAsDataURL(file);
  }

  async function handleSave(localOnly: boolean) {
    const recipe = buildManualRecipe();
    const nextRecipes = upsertMyRecipe(recipe);
    setRecipes(nextRecipes);

    if (localOnly) {
      setSaveFeedback("Receita salva em Minhas receitas.");
      setIsSaveChoiceOpen(false);
      clearForm();
      return;
    }

    setIsPublishing(true);
    try {
      const response = await fetch("/api/library/publish-manual", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: recipe.title,
          description: recipe.description,
          ingredients: recipe.ingredients,
          steps: recipe.steps,
          prepMinutes: recipe.prepMinutes,
          servings: recipe.servings,
          imageUrl: recipe.imageUrl || null,
        }),
      });

      const data = (await response.json()) as { message?: string };
      if (!response.ok) {
        setSaveFeedback(data.message || "Receita salva localmente, mas falhou ao publicar.");
      } else {
        setSaveFeedback("Receita salva e publicada na Biblioteca com sucesso.");
      }
    } catch {
      setSaveFeedback("Receita salva localmente, mas falhou ao publicar.");
    } finally {
      setIsPublishing(false);
      setIsSaveChoiceOpen(false);
      clearForm();
    }
  }

  return (
    <section className="space-y-6 pb-2">
      <header className="relative overflow-hidden rounded-[2rem] shadow-[0_20px_45px_-25px_rgba(42,30,23,0.55)]">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${heroImage})` }}
        />
        <div className="absolute inset-0 bg-[#2A1E17]/62 backdrop-blur-[2px]" />
        <div className="relative z-10 px-5 pb-6 pt-7 text-[#FDF7EC]">
          <p className="text-xs uppercase tracking-[0.2em] text-[#EADBC0]">Studio</p>
          <h1 className="mt-2 font-display text-3xl">Criar receita</h1>
          <p className="mt-2 max-w-xs text-sm text-[#E6D7BF]">
            Monte sua receita e gerencie suas receitas salvas em um so lugar.
          </p>
          <div className="mt-4 flex gap-2">
            <Link
              href="/minhas-receitas"
              className="rounded-full bg-white/20 px-4 py-2 text-xs font-semibold text-[#FFF7E9] backdrop-blur"
            >
              Ver minhas receitas
            </Link>
            <Link
              href="/gerar-receita-ia?mode=text"
              className="rounded-full bg-[#C9A86A] px-4 py-2 text-xs font-semibold text-[#FFF8EA]"
            >
              Abrir IA
            </Link>
          </div>
        </div>
      </header>

      <Card className="border-[#E5D7C1] bg-[#FFFCF7] shadow-[0_20px_35px_-25px_rgba(42,30,23,0.7)]">
        <CardHeader>
          <CardTitle className="font-display text-2xl text-[#2A1E17]">Nova receita</CardTitle>
          <CardDescription>
            Monte sua receita autoral com passos simples e imagem personalizada.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="rounded-2xl border border-[#EADFCC] bg-[#FFF9EF] p-4">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8A7351]">
              Informacoes basicas
            </p>
            <div className="space-y-3">
              <Input
                placeholder="Titulo da receita"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="h-11 border-[#E5D7C1] bg-[#FAF5EC]"
              />
              <Textarea
                placeholder="Descricao curta (opcional)"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                className="min-h-[84px] border-[#E5D7C1] bg-[#FAF5EC]"
              />
            </div>
          </div>

          <div className="rounded-2xl border border-[#EADFCC] bg-[#FFF9EF] p-4">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8A7351]">
              Ingredientes e preparo
            </p>
            <div className="space-y-3">
              <Textarea
                placeholder="Ingredientes separados por virgula"
                value={ingredientsText}
                onChange={(event) => setIngredientsText(event.target.value)}
                className="min-h-[96px] border-[#E5D7C1] bg-[#FAF5EC]"
              />
              <Textarea
                placeholder="Modo de preparo (um passo por linha)"
                value={stepsText}
                onChange={(event) => setStepsText(event.target.value)}
                className="min-h-[135px] border-[#E5D7C1] bg-[#FAF5EC]"
              />
            </div>
          </div>

          <input
            ref={galleryInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageChange}
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleImageChange}
          />
          <div className="rounded-2xl border border-[#EADFCC] bg-[#FFF9EF] p-4">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8A7351]">
              Imagem da receita
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="outline"
                className="border-[#E5D7C1] bg-[#FFFCF7]"
                onClick={() => galleryInputRef.current?.click()}
              >
                Anexar imagem
              </Button>
              <Button
                type="button"
                variant="outline"
                className="border-[#E5D7C1] bg-[#FFFCF7]"
                onClick={() => cameraInputRef.current?.click()}
              >
                Tirar foto
              </Button>
            </div>
            {imageDataUrl ? (
              <div className="relative mt-3 h-44 w-full overflow-hidden rounded-2xl border border-[#E5D7C1]">
                <Image
                  src={imageDataUrl}
                  alt="Preview da receita"
                  fill
                  unoptimized
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="mt-3 rounded-2xl border border-dashed border-[#DECDAF] bg-[#FBF4E8] px-4 py-6 text-center">
                <p className="text-sm font-medium text-[#7B6A56]">Adicione uma foto para destacar sua receita</p>
                <p className="mt-1 text-xs text-[#9B8B78]">Voce pode anexar da galeria ou tirar na hora.</p>
              </div>
            )}
          </div>
          {saveFeedback ? (
            <div className="rounded-xl border border-[#E5D7C1] bg-[#FAF5EC] px-3 py-2 text-sm text-[#6A5E52]">
              {saveFeedback}
            </div>
          ) : null}

          <Button
            className="h-12 w-full rounded-2xl bg-[#C9A86A] text-[#FFF9EE] shadow-[0_16px_28px_-20px_rgba(42,30,23,0.8)] hover:brightness-95"
            onClick={handleCreateRecipe}
            disabled={!hasFormData}
          >
            Salvar receita
          </Button>
        </CardContent>
      </Card>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Suas receitas</h2>
          <Link href="/minhas-receitas" className="text-xs font-semibold uppercase tracking-wide text-[#8E7752]">
            Ver todas
          </Link>
        </div>

        {recipes.length === 0 ? (
          <Card className="border-[#E5D7C1] bg-[#FFFCF7]">
            <CardContent className="py-8">
              <p className="text-sm text-[#7A6D60]">
                Voce ainda nao possui receitas salvas. Crie uma acima ou gere pela IA.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {recipes.slice(0, 4).map((recipe) => (
              <div key={recipe.id} className="space-y-2">
                <RecipeCard recipe={recipe} href={`/receita/${recipe.id}?origin=saved`} />
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full border-[#E5D7C1] bg-[#FFFCF7]"
                  onClick={() => handleDeleteRecipe(recipe.id)}
                >
                  Remover da lista
                </Button>
              </div>
            ))}
          </div>
        )}
      </section>

      {isSaveChoiceOpen ? (
        <div className="fixed inset-0 z-50 flex items-end bg-black/45 p-4 sm:items-center sm:justify-center">
          <div className="w-full rounded-[1.8rem] bg-[#FFFCF7] p-5 shadow-2xl sm:max-w-sm">
            <h3 className="text-xl font-semibold text-[#2A1E17]">Publicar receita?</h3>
            <p className="mt-1 text-sm text-[#7E7366]">
              Deseja disponibilizar esta receita na Biblioteca para outros usuarios?
            </p>
            <div className="mt-4 grid gap-2">
              <Button
                type="button"
                className="h-11 rounded-2xl bg-[#C9A86A] text-[#FFF9EE] hover:brightness-95"
                onClick={() => handleSave(false)}
                disabled={isPublishing}
              >
                Salvar so em Minhas receitas
              </Button>
              <Button
                type="button"
                className="h-11 rounded-2xl bg-[#2A1E17] text-[#FFF9EE] hover:brightness-110"
                onClick={() => handleSave(true)}
                disabled={isPublishing}
              >
                {isPublishing ? "Publicando..." : "Salvar e publicar na Biblioteca"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-10 rounded-2xl border-[#E5D7C1]"
                onClick={() => setIsSaveChoiceOpen(false)}
                disabled={isPublishing}
              >
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
