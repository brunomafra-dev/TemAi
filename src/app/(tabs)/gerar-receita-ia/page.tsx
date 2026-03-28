"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { SuggestionCard } from "@/components/recipes/suggestion-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { fetchAiSuggestions } from "@/features/recipes/api-client";
import type { InputMode, RecipeSuggestion, SuggestionsResponse } from "@/features/recipes/types";
import { cn } from "@/lib/utils";

const modes: Array<{ value: InputMode; label: string; emoji: string }> = [
  { value: "photo", label: "Foto", emoji: "📷" },
  { value: "audio", label: "Audio", emoji: "🎤" },
  { value: "text", label: "Texto", emoji: "📝" },
];

function isValidMode(value: string | null): value is InputMode {
  return value === "text" || value === "audio" || value === "photo";
}

function CreateRecipePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);

  const [mode, setMode] = useState<InputMode>("text");
  const [ingredientsText, setIngredientsText] = useState("");
  const [response, setResponse] = useState<SuggestionsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isPhotoPickerOpen, setIsPhotoPickerOpen] = useState(false);
  const [selectedAudioName, setSelectedAudioName] = useState("");
  const [selectedPhotoName, setSelectedPhotoName] = useState("");

  useEffect(() => {
    const requestedMode = searchParams.get("mode");
    if (!isValidMode(requestedMode)) {
      return;
    }

    setMode(requestedMode);
    if (requestedMode === "photo") {
      setIsPhotoPickerOpen(true);
    }
  }, [searchParams]);

  const canGenerate = useMemo(
    () => ingredientsText.trim().length > 0 && !isLoading,
    [ingredientsText, isLoading],
  );

  async function handleGenerateSuggestions() {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const data = await fetchAiSuggestions({
        ingredientsText,
        inputMode: mode,
      });

      setResponse(data);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Erro ao buscar sugestoes.");
    } finally {
      setIsLoading(false);
    }
  }

  function openRecipe(suggestion: RecipeSuggestion) {
    const ingredientsQuery = response?.normalizedIngredients.join(",") ?? "";
    router.push(`/receita/${suggestion.id}?origin=ai&ingredients=${encodeURIComponent(ingredientsQuery)}`);
  }

  function pickFromCamera() {
    cameraInputRef.current?.click();
    setIsPhotoPickerOpen(false);
  }

  function pickFromGallery() {
    galleryInputRef.current?.click();
    setIsPhotoPickerOpen(false);
  }

  function handlePhotoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedPhotoName(file.name);
    }
  }

  function handleAudioChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedAudioName(file.name);
    }
  }

  return (
    <section className="space-y-5 pb-2">
      <header className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#A88A57]">TemAi IA</p>
        <h1 className="font-display text-3xl text-[#2A1E17]">Gerar receita</h1>
        <p className="text-sm text-[#726457]">
          Escolha o formato, informe ingredientes e receba 3 sugestoes inteligentes.
        </p>
      </header>

      <Card className="border-[#E5D7C1] bg-[#FFFCF7]">
        <CardHeader>
          <CardTitle>Criar receita com IA</CardTitle>
          <CardDescription>Fluxo em duas etapas: sugestoes primeiro, receita completa depois.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            {modes.map((entry) => (
              <button
                key={entry.value}
                onClick={() => {
                  setMode(entry.value);
                  if (entry.value === "photo") {
                    setIsPhotoPickerOpen(true);
                  }
                }}
                className={cn(
                  "rounded-2xl border px-2 py-3 text-center transition",
                  mode === entry.value
                    ? "border-[#C66A3D] bg-[#F8E8E1] text-[#7A4733]"
                    : "border-[#E8DDC8] bg-[#FAF5EC] text-[#6E6258]",
                )}
              >
                <p className="text-xl">{entry.emoji}</p>
                <p className="mt-1 text-xs font-semibold">{entry.label}</p>
              </button>
            ))}
          </div>

          {mode === "audio" ? (
            <div className="space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-wide text-[#8C775A]">
                Audio
              </label>
              <input
                type="file"
                accept="audio/*"
                onChange={handleAudioChange}
                className="block w-full rounded-2xl border border-[#E5D7C1] bg-[#FAF5EC] px-3 py-3 text-sm"
              />
              {selectedAudioName ? (
                <p className="text-xs text-[#7A6D60]">Arquivo: {selectedAudioName}</p>
              ) : null}
            </div>
          ) : null}

          {mode === "photo" ? (
            <div className="space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-wide text-[#8C775A]">
                Foto
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setIsPhotoPickerOpen(true)}
                  className="flex-1 rounded-2xl border border-[#E5D7C1] bg-[#FAF5EC] px-3 py-3 text-sm font-semibold text-[#5D5348]"
                >
                  Abrir opcoes de foto
                </button>
              </div>
              {selectedPhotoName ? (
                <p className="text-xs text-[#7A6D60]">Imagem: {selectedPhotoName}</p>
              ) : null}
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handlePhotoChange}
                className="hidden"
              />
              <input
                ref={galleryInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                className="hidden"
              />
            </div>
          ) : null}

          <div className="space-y-2">
            <label className="block text-xs font-semibold uppercase tracking-wide text-[#8C775A]">
              Ingredientes
            </label>
            <Textarea
              value={ingredientsText}
              onChange={(event) => setIngredientsText(event.target.value)}
              placeholder="Ex: ovo, arroz, alho, cebola..."
              className="min-h-[120px] border-[#E5D7C1] bg-[#FAF5EC]"
            />
          </div>

          <Button
            onClick={handleGenerateSuggestions}
            disabled={!canGenerate}
            className="h-12 w-full rounded-2xl bg-[#C66A3D] text-[#FFF9EE] hover:brightness-95"
          >
            {isLoading ? "Buscando sugestoes..." : "Gerar 3 sugestoes"}
          </Button>
        </CardContent>
      </Card>

      {errorMessage ? (
        <Card className="border-[#E4D5BC] bg-[#FFF9F2]">
          <CardContent className="pt-5">
            <p className="text-sm text-red-700">{errorMessage}</p>
          </CardContent>
        </Card>
      ) : null}

      {response ? (
        <section className="space-y-4">
          <div className="space-y-2">
            <h2 className="text-xl font-semibold">Sugestoes para voce</h2>
            <p className="text-xs text-[#7A6D60]">
              Geradas com base nos ingredientes: {response.normalizedIngredients.join(", ")}.
            </p>
          </div>

          <div className="space-y-3">
            {response.suggestions.map((suggestion) => (
              <SuggestionCard
                key={suggestion.id}
                suggestion={suggestion}
                buttonLabel="Ver receita completa"
                onOpenRecipe={openRecipe}
              />
            ))}
          </div>

          <Card className="border-[#E5D7C1] bg-[#FFFCF7]">
            <CardHeader>
              <CardTitle>Voce tambem pode fazer</CardTitle>
              <CardDescription>Receitas que faltam so 1 ou 2 ingredientes.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {response.alsoCanMake.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nada por enquanto. Tente adicionar mais ingredientes.
                </p>
              ) : (
                response.alsoCanMake.map((suggestion) => (
                  <button
                    key={`also-${suggestion.id}`}
                    className="w-full rounded-2xl border border-[#E6D8C2] bg-[#F7F0E2] px-4 py-3 text-left transition hover:bg-[#EFE3CD]"
                    onClick={() => openRecipe(suggestion)}
                  >
                    <p className="text-sm font-semibold">{suggestion.title}</p>
                    <p className="text-xs text-[#7A6D60]">
                      Precisa de: {suggestion.missingIngredients.join(", ")}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {suggestion.matchedIngredients.slice(0, 3).map((ingredient) => (
                        <Badge key={`also-${suggestion.id}-${ingredient}`}>tem {ingredient}</Badge>
                      ))}
                    </div>
                  </button>
                ))
              )}
            </CardContent>
          </Card>
        </section>
      ) : null}

      {isPhotoPickerOpen ? (
        <div className="fixed inset-0 z-50 flex items-end bg-black/45 p-4 sm:items-center sm:justify-center">
          <div className="w-full rounded-[1.8rem] bg-[#FFFCF7] p-5 shadow-2xl sm:max-w-sm">
            <h3 className="text-xl font-semibold text-[#2A1E17]">Selecionar foto</h3>
            <p className="mt-1 text-sm text-[#7E7366]">Como voce quer enviar a imagem?</p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <button
                onClick={pickFromCamera}
                className="rounded-2xl border border-[#E7DCC8] bg-[#F8F2E7] px-3 py-4 text-center"
              >
                <p className="text-2xl">📸</p>
                <p className="mt-1 text-xs font-semibold text-[#5E5348]">Tirar foto</p>
              </button>
              <button
                onClick={pickFromGallery}
                className="rounded-2xl border border-[#E7DCC8] bg-[#F8F2E7] px-3 py-4 text-center"
              >
                <p className="text-2xl">🖼️</p>
                <p className="mt-1 text-xs font-semibold text-[#5E5348]">Selecionar imagem</p>
              </button>
            </div>
            <button
              onClick={() => setIsPhotoPickerOpen(false)}
              className="mt-4 w-full rounded-full border border-[#E0D2BA] py-2 text-sm font-semibold text-[#6E6154]"
            >
              Fechar
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}

export default function CreateRecipePage() {
  return (
    <Suspense
      fallback={
        <section className="space-y-5 pb-2">
          <Card className="border-[#E5D7C1] bg-[#FFFCF7]">
            <CardContent className="py-8">
              <p className="text-sm text-[#7A6D60]">Carregando criador de receitas...</p>
            </CardContent>
          </Card>
        </section>
      }
    >
      <CreateRecipePageContent />
    </Suspense>
  );
}
