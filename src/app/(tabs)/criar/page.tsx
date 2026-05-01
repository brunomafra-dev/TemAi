"use client";

import Image from "next/image";
import Link from "next/link";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RecipeCard } from "@/components/recipes/recipe-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { parseIngredientsText } from "@/features/recipes/helpers";
import { buildAuthHeaders } from "@/features/recipes/api-client";
import { getMyRecipes, removeMyRecipe, upsertMyRecipe } from "@/features/recipes/local-storage";
import { getSubscriptionState, syncSubscriptionFromCloud, type SubscriptionState } from "@/features/profile/subscription-storage";
import type { Recipe } from "@/features/recipes/types";
import { slugify } from "@/lib/utils";

const heroImage =
  "https://images.unsplash.com/photo-1495521821757-a1efb6729352?auto=format&fit=crop&w=1500&q=80";

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

type SpeechRecognitionAlternativeLike = {
  transcript: string;
};

type SpeechRecognitionResultLike = {
  0: SpeechRecognitionAlternativeLike;
  isFinal?: boolean;
};

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
};

type VoiceWindow = Window & {
  SpeechRecognition?: SpeechRecognitionCtor;
  webkitSpeechRecognition?: SpeechRecognitionCtor;
};

function mapSteps(value: string): string[] {
  return value
    .split(/\n/g)
    .map((step) => step.trim())
    .filter(Boolean);
}

const SavedRecipeRow = memo(function SavedRecipeRow({
  recipe,
  onDelete,
}: {
  recipe: Recipe;
  onDelete: (recipeId: string) => void;
}) {
  return (
    <div className="space-y-2">
      <RecipeCard recipe={recipe} href={`/receita/${recipe.id}?origin=manual`} />
      <Button
        variant="outline"
        size="sm"
        className="w-full border-[#E5D7C1] bg-[#FFFCF7]"
        onClick={() => onDelete(recipe.id)}
      >
        Remover da lista
      </Button>
    </div>
  );
});

SavedRecipeRow.displayName = "SavedRecipeRow";

export default function CreatePage() {
  const [recipes, setRecipes] = useState<Recipe[]>(() => getMyRecipes());
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [ingredientsText, setIngredientsText] = useState("");
  const [stepsText, setStepsText] = useState("");
  const [imageDataUrl, setImageDataUrl] = useState("");
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isSaveChoiceOpen, setIsSaveChoiceOpen] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isPolishing, setIsPolishing] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState("");
  const [voiceTarget, setVoiceTarget] = useState<"ingredients" | "steps" | null>(null);
  const [voiceMessage, setVoiceMessage] = useState("");
  const [subscription, setSubscription] = useState<SubscriptionState>(() => getSubscriptionState());
  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => {
    let mounted = true;
    syncSubscriptionFromCloud()
      .then((remote) => {
        if (!mounted || !remote) return;
        setSubscription(remote);
      })
      .catch(() => undefined);
    return () => {
      mounted = false;
    };
  }, []);

  const hasFormData = useMemo(
    () => title.trim().length > 0 && ingredientsText.trim().length > 0 && stepsText.trim().length > 0,
    [ingredientsText, stepsText, title],
  );
  const visibleRecipes = useMemo(() => recipes.slice(0, 4), [recipes]);

  function clearForm() {
    setTitle("");
    setDescription("");
    setIngredientsText("");
    setStepsText("");
    setImageDataUrl("");
    setIsDetailsOpen(false);
  }

  function buildManualRecipe(): Recipe {
    return {
      id: `manual-${slugify(title)}-${Date.now()}`,
      title: title.trim(),
      description: description.trim() || "Receita criada por você no TemAi.",
      ingredients: parseIngredientsText(ingredientsText),
      steps: mapSteps(stepsText),
      prepMinutes: 20,
      servings: 2,
      imageUrl: imageDataUrl || undefined,
      sourceLabel: "Criada por você",
      origin: "manual",
    };
  }

  async function polishRecipeWithAi() {
    if (!title.trim() || !ingredientsText.trim() || !stepsText.trim()) {
      setSaveFeedback("Preencha titulo, ingredientes e preparo antes de organizar com IA.");
      return;
    }

    setIsPolishing(true);
    setSaveFeedback("");
    try {
      const authHeaders = await buildAuthHeaders();
      const response = await fetch("/api/ai/author-recipe", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({
          title,
          description,
          ingredientsText,
          stepsText,
        }),
      });
      const data = (await response.json()) as {
        message?: string;
        description?: string;
        ingredientsText?: string;
        stepsText?: string;
      };
      if (!response.ok) {
        setSaveFeedback(data.message || "Não foi possível organizar com IA.");
        return;
      }
      setDescription(data.description || description);
      setIngredientsText(data.ingredientsText || ingredientsText);
      setStepsText(data.stepsText || stepsText);
      setSaveFeedback("Receita organizada com IA. Revise antes de salvar.");
    } catch {
      setSaveFeedback("Não foi possível organizar com IA.");
    } finally {
      setIsPolishing(false);
    }
  }

  function handleCreateRecipe() {
    if (!hasFormData) {
      return;
    }
    setSaveFeedback("");
    setIsSaveChoiceOpen(true);
  }

  const handleDeleteRecipe = useCallback((recipeId: string) => {
    setRecipes(removeMyRecipe(recipeId));
  }, []);

  function handleImageChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setImageDataUrl(typeof reader.result === "string" ? reader.result : "");
    };
    reader.readAsDataURL(file);
  }

  function isPremiumUser(): boolean {
    return subscription.plan === "premium" && subscription.status === "active";
  }

  function formatIngredientsFromVoice(raw: string): string {
    return raw
      .replace(/\s+(virgula|vírgula)\s+/gi, ", ")
      .replace(/\s+(ponto e virgula|ponto e vírgula)\s+/gi, ", ")
      .replace(/\s+quebra de linha\s+/gi, ", ")
      .replace(/\s{2,}/g, " ")
      .split(/,|\n/g)
      .map((item) => item.trim())
      .filter(Boolean)
      .join(", ");
  }

  function formatStepsFromVoice(raw: string): string {
    return raw
      .replace(/\s+(depois|em seguida|na sequencia|na sequência)\s+/gi, ". ")
      .replace(/\s+quebra de linha\s+/gi, ". ")
      .replace(/\s{2,}/g, " ")
      .split(/\.|\n/g)
      .map((item) => item.trim())
      .filter(Boolean)
      .join("\n");
  }

  function stopVoiceCapture() {
    const current = recognitionRef.current;
    if (!current) return;
    current.stop();
    recognitionRef.current = null;
    setVoiceTarget(null);
  }

  function startVoiceCapture(target: "ingredients" | "steps") {
    if (!isPremiumUser()) {
      setVoiceMessage("Recurso premium: ative o plano para adicionar por voz.");
      return;
    }

    const voiceWindow = window as VoiceWindow;
    const SpeechRecognitionCtor =
      typeof window !== "undefined"
        ? (voiceWindow.SpeechRecognition || voiceWindow.webkitSpeechRecognition || null)
        : null;

    if (!SpeechRecognitionCtor) {
      setVoiceMessage("Seu navegador não suporta transcrição por voz.");
      return;
    }

    if (voiceTarget) {
      stopVoiceCapture();
      return;
    }

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = "pt-BR";
    recognition.interimResults = true;
    recognition.continuous = true;

    recognition.onresult = (event: SpeechRecognitionEventLike) => {
      let transcript = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        transcript += event.results[i][0].transcript || "";
      }

      if (!transcript.trim()) return;
      if (target === "ingredients") {
        setIngredientsText(formatIngredientsFromVoice(transcript));
      } else {
        setStepsText(formatStepsFromVoice(transcript));
      }
    };

    recognition.onerror = () => {
      setVoiceMessage("Não foi possível transcrever o áudio.");
      stopVoiceCapture();
    };

    recognition.onend = () => {
      recognitionRef.current = null;
      setVoiceTarget(null);
    };

    setVoiceMessage("Transcrevendo áudio... fale naturalmente.");
    setVoiceTarget(target);
    recognitionRef.current = recognition;
    recognition.start();
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
      const authHeaders = await buildAuthHeaders();
      const response = await fetch("/api/library/publish-manual", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
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
            Monte sua receita e gerencie suas receitas salvas em um só lugar.
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
              className="rounded-full bg-[#C66A3D] px-4 py-2 text-xs font-semibold text-[#FFF8EA]"
            >
              Abrir IA
            </Link>
          </div>
          <p className="mt-3 text-xs text-[#E6D7BF]">
            Por voz: gravar áudio -&gt; transcrever -&gt; IA estrutura ingredientes e preparo -&gt; você revisa antes de salvar.
          </p>
        </div>
      </header>

      <Card className="border-[#E5D7C1] bg-[#FFFCF7] shadow-[0_20px_35px_-25px_rgba(42,30,23,0.7)]">
        <CardHeader>
          <CardTitle className="font-display text-2xl text-[#2A1E17]">Nova receita</CardTitle>
          <CardDescription>
            Comece pelo nome. Depois, adicione os detalhes quando quiser.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="rounded-2xl border border-[#EADFCC] bg-[#FFF9EF] p-4">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8A7351]">
              Nome da receita
            </p>
            <div className="space-y-3">
              <Input
                placeholder="Titulo da receita"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="h-11 border-[#E5D7C1] bg-[#FAF5EC]"
              />
            </div>
          </div>

          <div className="rounded-2xl border border-[#EADFCC] bg-[#FFF9EF] p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8A7351]">
                Adicionar
              </p>
              <Button
                type="button"
                variant="outline"
                className="h-8 border-[#E5D7C1] bg-[#FFFCF7] px-3 text-xs"
                onClick={() => setIsDetailsOpen((current) => !current)}
              >
                {isDetailsOpen ? "Ocultar" : "Adicionar"}
              </Button>
            </div>
            {!isDetailsOpen ? (
              <p className="mt-2 text-xs text-[#7A6D60]">
                Ingredientes, preparo, descrição e imagem ficam escondidos para deixar a tela mais limpa.
              </p>
            ) : (
              <div className="mt-3 space-y-4">
                <Textarea
                  placeholder="Descrição curta (opcional)"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  className="min-h-[84px] border-[#E5D7C1] bg-[#FAF5EC]"
                />
                <Textarea
                  placeholder="Ingredientes separados por virgula"
                  value={ingredientsText}
                  onChange={(event) => setIngredientsText(event.target.value)}
                  className="min-h-[96px] border-[#E5D7C1] bg-[#FAF5EC]"
                />
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-9 border-[#E5D7C1] bg-[#FFFCF7] text-xs"
                    onClick={() => startVoiceCapture("ingredients")}
                  >
                    {voiceTarget === "ingredients" ? "Parar voz (ingredientes)" : "Adicionar ingredientes por voz"}
                  </Button>
                </div>
                <Textarea
                  placeholder="Modo de preparo (um passo por linha)"
                  value={stepsText}
                  onChange={(event) => setStepsText(event.target.value)}
                  className="min-h-[135px] border-[#E5D7C1] bg-[#FAF5EC]"
                />
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-9 border-[#E5D7C1] bg-[#FFFCF7] text-xs"
                    onClick={() => startVoiceCapture("steps")}
                  >
                    {voiceTarget === "steps" ? "Parar voz (preparo)" : "Adicionar preparo por voz"}
                  </Button>
                </div>
                {voiceMessage ? (
                  <p className="text-xs font-medium text-[#7A6D60]">{voiceMessage}</p>
                ) : null}
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 w-full border-[#C66A3D] bg-[#FFF8EF] text-xs"
                  onClick={() => void polishRecipeWithAi()}
                  disabled={isPolishing}
                >
                  {isPolishing ? "Organizando com IA..." : "Organizar receita com IA"}
                </Button>
              </div>
            )}
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
          {isDetailsOpen ? (
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
                  <p className="mt-1 text-xs text-[#9B8B78]">Você pode anexar da galeria ou tirar na hora.</p>
                </div>
              )}
            </div>
          ) : null}
          {saveFeedback ? (
            <div className="rounded-xl border border-[#E5D7C1] bg-[#FAF5EC] px-3 py-2 text-sm text-[#6A5E52]">
              {saveFeedback}
            </div>
          ) : null}

          <Button
            className="h-12 w-full rounded-2xl bg-[#C66A3D] text-[#FFF9EE] shadow-[0_16px_28px_-20px_rgba(42,30,23,0.8)] hover:brightness-95"
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
                Você ainda não possui receitas salvas. Crie uma acima ou gere pela IA.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {visibleRecipes.map((recipe) => (
              <SavedRecipeRow key={recipe.id} recipe={recipe} onDelete={handleDeleteRecipe} />
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
                className="h-11 rounded-2xl bg-[#C66A3D] text-[#FFF9EE] hover:brightness-95"
                onClick={() => handleSave(false)}
                disabled={isPublishing}
              >
                Salvar só em Minhas receitas
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
