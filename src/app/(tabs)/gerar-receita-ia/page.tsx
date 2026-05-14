"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SuggestionCard } from "@/components/recipes/suggestion-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { fetchAiSuggestions } from "@/features/recipes/api-client";
import {
  consumeAiGenerationAttempt,
  getSubscriptionState,
  syncSubscriptionFromCloud,
  type SubscriptionState,
} from "@/features/profile/subscription-storage";
import {
  getUserProfile,
  saveUserProfile,
  saveUserProfileToCloud,
  syncUserProfileFromCloud,
} from "@/features/profile/storage";
import {
  COOKING_EQUIPMENT_LABELS,
  COOKING_EQUIPMENT_VALUES,
  normalizeCookingEquipment,
} from "@/features/recipes/cooking-equipment";
import type {
  CookingEquipment,
  InputMode,
  RecipeSuggestion,
  RecipeSuggestionFilter,
  SuggestionsResponse,
} from "@/features/recipes/types";
import { cn } from "@/lib/utils";

const modes: Array<{ value: InputMode; label: string; emoji: string }> = [
  { value: "photo", label: "Foto", emoji: "📷" },
  { value: "audio", label: "Áudio", emoji: "🎤" },
  { value: "text", label: "Texto", emoji: "📝" },
];

const recipeFilters: Array<{ value: RecipeSuggestionFilter; label: string }> = [
  { value: "all", label: "Sem filtro" },
  { value: "meal", label: "Refeição" },
  { value: "vegetarian", label: "Veggie" },
  { value: "dessert", label: "Sobremesa" },
  { value: "drink", label: "Bebidas" },
];

const cookingEquipmentOptions = COOKING_EQUIPMENT_VALUES.map((value) => ({
  value,
  label: COOKING_EQUIPMENT_LABELS[value],
}));

const AI_SUGGESTIONS_CACHE_KEY = "temai:ai-suggestions:last";

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

interface SpeechRecognitionResultLike {
  isFinal: boolean;
  0?: { transcript?: string };
}

interface SpeechRecognitionEventLike extends Event {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: SpeechRecognitionResultLike;
  };
}

interface SpeechRecognitionErrorEventLike extends Event {
  error?: string;
}

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

type GeneratedSuggestion = RecipeSuggestion & { generationId?: string };

type CachedSuggestionsState = {
  mode: InputMode;
  ingredientsText: string;
  recipeFilter: RecipeSuggestionFilter;
  cookingEquipment: CookingEquipment[];
  response: SuggestionsResponse;
  extraSuggestions: GeneratedSuggestion[];
  suggestionsNotice: string;
  includeNutritionEstimate: boolean;
  selectedPhotoName: string;
  savedAt: number;
};

function getSpeechRecognitionConstructor(): SpeechRecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  const speechWindow = window as Window &
    typeof globalThis & {
      SpeechRecognition?: SpeechRecognitionConstructor;
      webkitSpeechRecognition?: SpeechRecognitionConstructor;
    };
  return speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition || null;
}

function isValidMode(value: string | null): value is InputMode {
  return value === "text" || value === "audio" || value === "photo";
}

function isValidRecipeFilter(value: unknown): value is RecipeSuggestionFilter {
  return value === "all" || value === "meal" || value === "vegetarian" || value === "dessert" || value === "drink";
}

function normalizeSuggestionKey(value: string): string {
  const stopWords = new Set([
    "a",
    "as",
    "ao",
    "com",
    "da",
    "de",
    "do",
    "dos",
    "e",
    "em",
    "na",
    "no",
    "para",
    "rapida",
    "rapido",
    "simples",
    "caseira",
    "caseiro",
  ]);

  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/g)
    .map((token) => token.trim())
    .filter((token) => token.length > 1 && !stopWords.has(token))
    .map((token) => (token.length > 3 && token.endsWith("s") ? token.slice(0, -1) : token))
    .sort()
    .join(" ");
}

function isRecipeSuggestion(value: unknown): value is RecipeSuggestion {
  if (!value || typeof value !== "object") return false;
  const suggestion = value as Partial<RecipeSuggestion>;
  return (
    typeof suggestion.id === "string" &&
    typeof suggestion.title === "string" &&
    typeof suggestion.description === "string" &&
    Array.isArray(suggestion.matchedIngredients) &&
    Array.isArray(suggestion.missingIngredients)
  );
}

function readGeneratedSuggestions(value: unknown): GeneratedSuggestion[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isRecipeSuggestion).map((suggestion) => {
    const generationId = (suggestion as RecipeSuggestion & { generationId?: unknown }).generationId;
    return {
      ...suggestion,
      generationId: typeof generationId === "string" ? generationId : undefined,
    };
  });
}

function attachGenerationId(
  suggestions: RecipeSuggestion[],
  generationId: string | undefined,
): GeneratedSuggestion[] {
  return suggestions.map((suggestion) => ({ ...suggestion, generationId }));
}

function appendUniqueSuggestions(params: {
  current: GeneratedSuggestion[];
  next: GeneratedSuggestion[];
  blocked: RecipeSuggestion[];
}): GeneratedSuggestion[] {
  const base = [...params.blocked, ...params.current];
  const seenIds = new Set(base.map((suggestion) => suggestion.id));
  const seenTitles = new Set(base.map((suggestion) => normalizeSuggestionKey(suggestion.title)).filter(Boolean));
  const additions = params.next.filter((suggestion) => {
    const titleKey = normalizeSuggestionKey(suggestion.title);
    if (seenIds.has(suggestion.id) || (titleKey && seenTitles.has(titleKey))) return false;
    seenIds.add(suggestion.id);
    if (titleKey) seenTitles.add(titleKey);
    return true;
  });
  return [...params.current, ...additions];
}

function collectVisibleSuggestionTitles(
  response: SuggestionsResponse | null,
  extraSuggestions: GeneratedSuggestion[],
): string[] {
  if (!response) return [];
  return [...response.suggestions, ...response.alsoCanMake, ...extraSuggestions]
    .map((suggestion) => suggestion.title.trim())
    .filter(Boolean);
}

function readCachedSuggestions(): CachedSuggestionsState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(AI_SUGGESTIONS_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CachedSuggestionsState>;
    const parsedMode = parsed.mode || null;
    if (
      !isValidMode(parsedMode) ||
      !parsed.response ||
      !Array.isArray(parsed.response.suggestions) ||
      !Array.isArray(parsed.response.alsoCanMake) ||
      !Array.isArray(parsed.response.normalizedIngredients)
    ) {
      return null;
    }

    return {
      mode: parsedMode,
      ingredientsText: parsed.ingredientsText || "",
      recipeFilter: isValidRecipeFilter(parsed.recipeFilter) ? parsed.recipeFilter : "all",
      cookingEquipment: normalizeCookingEquipment(parsed.cookingEquipment),
      response: parsed.response,
      extraSuggestions: readGeneratedSuggestions(parsed.extraSuggestions),
      suggestionsNotice: parsed.suggestionsNotice || parsed.response.dedupeNotice || "",
      includeNutritionEstimate: Boolean(parsed.includeNutritionEstimate),
      selectedPhotoName: parsed.selectedPhotoName || "",
      savedAt: typeof parsed.savedAt === "number" ? parsed.savedAt : Date.now(),
    };
  } catch {
    return null;
  }
}

function writeCachedSuggestions(state: Omit<CachedSuggestionsState, "savedAt">): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(
    AI_SUGGESTIONS_CACHE_KEY,
    JSON.stringify({ ...state, savedAt: Date.now() }),
  );
}

function CreateRecipePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const [mode, setMode] = useState<InputMode>("text");
  const [ingredientsText, setIngredientsText] = useState("");
  const [recipeFilter, setRecipeFilter] = useState<RecipeSuggestionFilter>("all");
  const [cookingEquipment, setCookingEquipment] = useState<CookingEquipment[]>(
    () => getUserProfile().cookingEquipment,
  );
  const [response, setResponse] = useState<SuggestionsResponse | null>(null);
  const [extraSuggestions, setExtraSuggestions] = useState<GeneratedSuggestion[]>([]);
  const [suggestionsNotice, setSuggestionsNotice] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [speechSupported, setSpeechSupported] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isPhotoPickerOpen, setIsPhotoPickerOpen] = useState(false);
  const [selectedPhotoName, setSelectedPhotoName] = useState("");
  const [recordedAudioFile, setRecordedAudioFile] = useState<File | null>(null);
  const [selectedPhotoFile, setSelectedPhotoFile] = useState<File | null>(null);
  const [includeNutritionEstimate, setIncludeNutritionEstimate] = useState(false);
  const [subscription, setSubscription] = useState<SubscriptionState>(() => getSubscriptionState());

  const isPremium = subscription.plan === "premium" && subscription.status === "active";

  useEffect(() => {
    if (searchParams.get("restore") === "1") {
      const cached = readCachedSuggestions();
      if (cached) {
        setMode(cached.mode);
        setIngredientsText(cached.ingredientsText);
        setRecipeFilter(cached.recipeFilter);
        setCookingEquipment(cached.cookingEquipment);
        setResponse(cached.response);
        setExtraSuggestions(cached.extraSuggestions);
        setSuggestionsNotice(cached.suggestionsNotice);
        setIncludeNutritionEstimate(cached.includeNutritionEstimate);
        setSelectedPhotoName(cached.selectedPhotoName);
        setErrorMessage("");
      }
      return;
    }

    const requestedMode = searchParams.get("mode");
    if (!isValidMode(requestedMode)) {
      return;
    }

    if (!isPremium && requestedMode !== "text") {
      setMode("text");
      setErrorMessage("Áudio e foto são recursos premium.");
      return;
    }

    setMode(requestedMode);
    if (requestedMode === "photo") {
      setIsPhotoPickerOpen(true);
    }
  }, [isPremium, searchParams]);

  useEffect(() => {
    setSpeechSupported(Boolean(getSpeechRecognitionConstructor()));

    return () => {
      recognitionRef.current?.abort();
      recognitionRef.current = null;
      mediaRecorderRef.current?.stream.getTracks().forEach((track) => track.stop());
      mediaRecorderRef.current = null;
    };
  }, []);

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

  useEffect(() => {
    let mounted = true;
    setCookingEquipment(normalizeCookingEquipment(getUserProfile().cookingEquipment));
    syncUserProfileFromCloud()
      .then((profile) => {
        if (!mounted || !profile) return;
        setCookingEquipment(normalizeCookingEquipment(profile.cookingEquipment));
      })
      .catch(() => undefined);

    return () => {
      mounted = false;
    };
  }, []);

  const isAudioCaptureActive = isListening || isRecordingAudio;

  const canGenerate = useMemo(() => {
    if (isLoading || isAudioCaptureActive) return false;
    if (mode === "photo") return Boolean(selectedPhotoFile);
    if (mode === "audio") return ingredientsText.trim().length > 0 || Boolean(recordedAudioFile);
    return ingredientsText.trim().length > 0;
  }, [ingredientsText, isAudioCaptureActive, isLoading, mode, recordedAudioFile, selectedPhotoFile]);

  const ingredientsFieldLabel = mode === "photo" ? "Complemento opcional" : "Ingredientes";
  const ingredientsPlaceholder =
    mode === "audio"
      ? "Toque no microfone e fale: ovo, arroz, alho, cebola..."
      : mode === "photo"
        ? "Opcional: adicione algo que a foto não mostra..."
        : "Ex: ovo, arroz, alho, cebola...";

  const toggleCookingEquipment = useCallback((equipment: CookingEquipment) => {
    setCookingEquipment((current) => {
      const next = current.includes(equipment)
        ? current.filter((item) => item !== equipment)
        : [...current, equipment];
      const normalized = normalizeCookingEquipment(next);
      const nextProfile = { ...getUserProfile(), cookingEquipment: normalized };
      saveUserProfile(nextProfile);
      void saveUserProfileToCloud(nextProfile);
      return normalized;
    });
  }, []);

  const stopVoiceCapture = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  const stopAudioRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    }
    setIsRecordingAudio(false);
  }, []);

  const startAudioRecording = useCallback(async () => {
    if (!isPremium) {
      setErrorMessage("Áudio é um recurso premium.");
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setErrorMessage("Microfone indisponível neste aparelho. Use o microfone do teclado no campo de ingredientes.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const preferredMimeType = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "";
      const recorder = new MediaRecorder(stream, preferredMimeType ? { mimeType: preferredMimeType } : undefined);

      audioChunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      recorder.onstop = () => {
        const mimeType = recorder.mimeType || "audio/webm";
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        if (audioBlob.size > 0) {
          setRecordedAudioFile(new File([audioBlob], `temai-audio-${Date.now()}.webm`, { type: mimeType }));
        }
        stream.getTracks().forEach((track) => track.stop());
        mediaRecorderRef.current = null;
        setIsRecordingAudio(false);
      };

      mediaRecorderRef.current = recorder;
      setRecordedAudioFile(null);
      setErrorMessage("");
      setIsRecordingAudio(true);
      recorder.start();
    } catch {
      setIsRecordingAudio(false);
      setErrorMessage("Não foi possível acessar o microfone. Verifique a permissão e tente novamente.");
    }
  }, [isPremium]);

  const startVoiceCapture = useCallback(() => {
    if (!isPremium) {
      setErrorMessage("Áudio é um recurso premium.");
      return;
    }

    const Recognition = getSpeechRecognitionConstructor();
    if (!Recognition) {
      void startAudioRecording();
      return;
    }

    try {
      recognitionRef.current?.abort();
      const recognition = new Recognition();
      const baseText = ingredientsText.trim();
      let finalTranscript = "";

      recognition.lang = "pt-BR";
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.onresult = (event) => {
        const finalParts: string[] = [];
        const interimParts: string[] = [];

        for (let index = event.resultIndex; index < event.results.length; index += 1) {
          const result = event.results[index];
          const transcript = result?.[0]?.transcript?.trim();
          if (!transcript) continue;
          if (result.isFinal) {
            finalParts.push(transcript);
          } else {
            interimParts.push(transcript);
          }
        }

        if (finalParts.length > 0) {
          finalTranscript = [finalTranscript, ...finalParts].filter(Boolean).join(", ");
          setIngredientsText([baseText, finalTranscript].filter(Boolean).join(", "));
        }
        setLiveTranscript(interimParts.join(" "));
      };
      recognition.onerror = (event) => {
        if (event.error && !["no-speech", "aborted"].includes(event.error)) {
          setErrorMessage("Não consegui captar sua voz. Verifique a permissão do microfone e tente de novo.");
        }
      };
      recognition.onend = () => {
        setIsListening(false);
        setLiveTranscript("");
        recognitionRef.current = null;
      };

      recognitionRef.current = recognition;
      setRecordedAudioFile(null);
      setErrorMessage("");
      setLiveTranscript("");
      setIsListening(true);
      recognition.start();
    } catch {
      setIsListening(false);
      setLiveTranscript("");
      recognitionRef.current = null;
      setErrorMessage("Não foi possível abrir o microfone agora.");
    }
  }, [ingredientsText, isPremium, startAudioRecording]);

  async function handleGenerateSuggestions() {
    if (!isPremium && mode !== "text") {
      setErrorMessage("Plano free permite IA apenas por texto.");
      return;
    }

    if (mode === "audio" && !ingredientsText.trim() && !recordedAudioFile) {
      setErrorMessage("Fale, grave ou digite os ingredientes antes de gerar.");
      return;
    }

    if (mode === "photo" && !selectedPhotoFile) {
      setErrorMessage("Selecione ou tire uma foto dos ingredientes.");
      return;
    }

    if (!isPremium && subscription.aiGenerationsUsedThisMonth >= subscription.aiGenerationsLimitThisMonth) {
      setErrorMessage("Plano free atingiu o limite de 3 gerações de IA neste mês.");
      return;
    }

    if (isListening) {
      stopVoiceCapture();
    }
    if (isRecordingAudio) {
      stopAudioRecording();
    }

    setIsLoading(true);
    setErrorMessage("");

    try {
      const data = await fetchAiSuggestions({
        ingredientsText,
        inputMode: mode,
        recipeFilter,
        cookingEquipment,
        file:
          mode === "photo"
            ? selectedPhotoFile || undefined
            : mode === "audio"
              ? recordedAudioFile || undefined
              : undefined,
      });

      setResponse(data);
      setExtraSuggestions([]);
      setSuggestionsNotice(data.dedupeNotice || "");
      writeCachedSuggestions({
        mode,
        ingredientsText,
        recipeFilter,
        cookingEquipment,
        response: data,
        extraSuggestions: [],
        suggestionsNotice: data.dedupeNotice || "",
        includeNutritionEstimate,
        selectedPhotoName,
      });
      router.replace("/gerar-receita-ia?restore=1", { scroll: false });
      if (!isPremium) {
        setSubscription(consumeAiGenerationAttempt());
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Erro ao buscar sugestões.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSuggestMoreRecipes() {
    if (!response) return;

    if (!isPremium && subscription.aiGenerationsUsedThisMonth >= subscription.aiGenerationsLimitThisMonth) {
      setErrorMessage("Plano free atingiu o limite de 3 gerações de IA neste mês.");
      return;
    }

    const normalizedText = response.normalizedIngredients.join(", ");
    const nextIngredientsText = normalizedText || ingredientsText;
    if (!nextIngredientsText.trim()) {
      setErrorMessage("Informe ingredientes para sugerir mais receitas.");
      return;
    }

    const excludedSuggestionTitles = collectVisibleSuggestionTitles(response, extraSuggestions);
    setIsLoadingMore(true);
    setErrorMessage("");
    setSuggestionsNotice("");

    try {
      const data = await fetchAiSuggestions({
        ingredientsText: nextIngredientsText,
        inputMode: "text",
        recipeFilter,
        cookingEquipment,
        excludedSuggestionTitles,
      });
      const nextSuggestions = attachGenerationId(data.suggestions, data.generationId);
      const nextNotice =
        data.dedupeNotice ||
        (nextSuggestions.length < 3 ? "Mostrei só receitas novas para não repetir opções anteriores." : "");
      setSuggestionsNotice(nextNotice);

      setExtraSuggestions((current) => {
        const merged = appendUniqueSuggestions({
          current,
          next: nextSuggestions,
          blocked: [...response.suggestions, ...response.alsoCanMake],
        });
        writeCachedSuggestions({
          mode,
          ingredientsText,
          recipeFilter,
          cookingEquipment,
          response,
          extraSuggestions: merged,
          suggestionsNotice: nextNotice,
          includeNutritionEstimate,
          selectedPhotoName,
        });
        return merged;
      });

      if (!isPremium) {
        setSubscription(consumeAiGenerationAttempt());
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Erro ao buscar mais sugestões.");
    } finally {
      setIsLoadingMore(false);
    }
  }

  const openRecipe = useCallback((suggestion: RecipeSuggestion, generationId?: string) => {
    const ingredientsQuery = response?.normalizedIngredients.join(",") ?? "";
    const nutritionFlag = includeNutritionEstimate ? "&nutrition=1" : "";
    const generationFlag = generationId ? `&generationId=${encodeURIComponent(generationId)}` : "";
    const equipmentFlag = `&equipment=${encodeURIComponent(cookingEquipment.join(","))}`;
    const titleQuery = encodeURIComponent(suggestion.title);
    router.push(`/receita/${suggestion.id}?origin=ai&ingredients=${encodeURIComponent(ingredientsQuery)}&title=${titleQuery}${nutritionFlag}${generationFlag}${equipmentFlag}`);
  }, [cookingEquipment, includeNutritionEstimate, response?.normalizedIngredients, router]);

  const pickFromCamera = useCallback(() => {
    cameraInputRef.current?.click();
    setIsPhotoPickerOpen(false);
  }, []);

  const pickFromGallery = useCallback(() => {
    galleryInputRef.current?.click();
    setIsPhotoPickerOpen(false);
  }, []);

  function handlePhotoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedPhotoName(file.name);
      setSelectedPhotoFile(file);
    }
  }

  return (
    <section className="space-y-5 pb-2">
      <header className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#A88A57]">TemAi IA</p>
        <h1 className="font-display text-3xl text-[#2A1E17]">Gerar receita</h1>
        <p className="text-sm text-[#726457]">
          Escolha o formato, informe ingredientes e receba 3 sugestões inteligentes.
        </p>
      </header>

      <Card className="border-[#E5D7C1] bg-[#FFFCF7]">
        <CardHeader>
          <CardTitle>Criar receita com IA</CardTitle>
          <CardDescription>Fluxo em duas etapas: sugestões primeiro, receita completa depois.</CardDescription>
          {!isPremium ? (
            <p className="text-xs text-[#7A6D60]">
              Plano free: {subscription.aiGenerationsUsedThisMonth}/{subscription.aiGenerationsLimitThisMonth} gerações neste mês.
            </p>
          ) : (
            <p className="text-xs text-[#7A6D60]">Plano premium: gerações ilimitadas + áudio e foto.</p>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            {modes.map((entry) => (
              <button
                key={entry.value}
                onClick={() => {
                  if (!isPremium && entry.value !== "text") {
                    setErrorMessage("Áudio e foto são recursos premium.");
                    return;
                  }
                  if (entry.value !== "audio" && isListening) {
                    stopVoiceCapture();
                  }
                  if (entry.value !== "audio" && isRecordingAudio) {
                    stopAudioRecording();
                  }
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

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#8C775A]">Filtro opcional</p>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {recipeFilters.map((filter) => (
                <button
                  key={filter.value}
                  type="button"
                  onClick={() => setRecipeFilter(filter.value)}
                  className={cn(
                    "shrink-0 rounded-full border px-4 py-2 text-xs font-semibold transition",
                    recipeFilter === filter.value
                      ? "border-[#C66A3D] bg-[#F8E8E1] text-[#7A4733]"
                      : "border-[#E5D7C1] bg-[#FAF5EC] text-[#6E6258]",
                  )}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#8C775A]">Minha cozinha</p>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {cookingEquipmentOptions.map((equipment) => {
                const isSelected = cookingEquipment.includes(equipment.value);
                return (
                  <button
                    key={equipment.value}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => toggleCookingEquipment(equipment.value)}
                    className={cn(
                      "shrink-0 rounded-full border px-4 py-2 text-xs font-semibold transition",
                      isSelected
                        ? "border-[#3F7D58] bg-[#E5F4E9] text-[#28573A]"
                        : "border-[#E5D7C1] bg-[#FAF5EC] text-[#6E6258]",
                    )}
                  >
                    {equipment.label}
                  </button>
                );
              })}
            </div>
          </div>

          {mode === "audio" ? (
            <div className="space-y-3 rounded-2xl border border-[#E5D7C1] bg-[#FAF5EC] p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-[#8C775A]">
                    Microfone
                  </label>
                  <p className="mt-1 text-xs text-[#7A6D60]">
                    Fale os ingredientes e confira o texto antes de gerar.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={
                    isListening
                      ? stopVoiceCapture
                      : isRecordingAudio
                        ? stopAudioRecording
                        : startVoiceCapture
                  }
                  className={cn(
                    "flex h-14 w-14 shrink-0 items-center justify-center rounded-full border text-2xl shadow-sm transition",
                    isAudioCaptureActive
                      ? "border-[#B94E3E] bg-[#C66A3D] text-white"
                      : "border-[#E0D1B8] bg-white text-[#6A5B4C]",
                  )}
                  aria-label={isAudioCaptureActive ? "Parar microfone" : "Falar ingredientes"}
                >
                  🎙️
                </button>
              </div>
              <Button
                type="button"
                variant={isAudioCaptureActive ? "default" : "secondary"}
                onClick={
                  isListening
                    ? stopVoiceCapture
                    : isRecordingAudio
                      ? stopAudioRecording
                      : startVoiceCapture
                }
                className="h-11 w-full rounded-2xl"
              >
                {isListening
                  ? "Parar ditado"
                  : isRecordingAudio
                    ? "Parar gravação"
                    : speechSupported
                      ? "Falar ingredientes"
                      : "Gravar áudio"}
              </Button>
              {liveTranscript ? (
                <p className="rounded-xl border border-[#E4D6C0] bg-white px-3 py-2 text-sm text-[#5E5348]">
                  Ouvindo: {liveTranscript}
                </p>
              ) : null}
              {recordedAudioFile ? (
                <p className="rounded-xl border border-[#E4D6C0] bg-white px-3 py-2 text-sm text-[#5E5348]">
                  Áudio pronto. Toque em Gerar 3 sugestões.
                </p>
              ) : null}
              {!speechSupported ? (
                <p className="text-xs text-[#7A6D60]">
                  Neste aparelho o app grava o áudio e a IA interpreta tudo direto, sem anexar arquivo.
                </p>
              ) : null}
            </div>
          ) : null}

          {mode === "photo" ? (
            <div className="space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-wide text-[#8C775A]">Foto</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setIsPhotoPickerOpen(true)}
                  className="flex-1 rounded-2xl border border-[#E5D7C1] bg-[#FAF5EC] px-3 py-3 text-sm font-semibold text-[#5D5348]"
                >
                  Abrir opções de foto
                </button>
              </div>
              <p className="text-xs text-[#7A6D60]">A foto já basta; o texto abaixo é só complemento.</p>
              {selectedPhotoName ? <p className="text-xs text-[#7A6D60]">Imagem: {selectedPhotoName}</p> : null}
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
            <label className="block text-xs font-semibold uppercase tracking-wide text-[#8C775A]">{ingredientsFieldLabel}</label>
            <Textarea
              value={ingredientsText}
              onChange={(event) => setIngredientsText(event.target.value)}
              placeholder={ingredientsPlaceholder}
              className="min-h-[120px] border-[#E5D7C1] bg-[#FAF5EC]"
            />
          </div>

          <label className="flex items-center gap-2 rounded-2xl border border-[#E5D7C1] bg-[#FAF5EC] px-3 py-2 text-sm text-[#5E5348]">
            <input
              type="checkbox"
              checked={includeNutritionEstimate}
              onChange={(event) => setIncludeNutritionEstimate(event.target.checked)}
            />
            Incluir estimativa nutricional (opcional)
          </label>

          <Button
            onClick={handleGenerateSuggestions}
            disabled={!canGenerate}
            className="h-12 w-full rounded-2xl bg-[#C66A3D] text-[#FFF9EE] hover:brightness-95"
          >
            {isLoading ? "Buscando sugestões..." : "Gerar 3 sugestões"}
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
            <h2 className="text-xl font-semibold">Sugestões para você</h2>
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
                onOpenRecipe={(selected) => openRecipe(selected, response.generationId)}
              />
            ))}
          </div>

          <Button
            type="button"
            variant="secondary"
            onClick={handleSuggestMoreRecipes}
            disabled={isLoading || isLoadingMore}
            className="h-11 w-full rounded-2xl"
          >
            {isLoadingMore ? "Buscando mais receitas..." : "Sugerir mais receitas"}
          </Button>

          {suggestionsNotice ? (
            <p className="rounded-2xl border border-[#E5D7C1] bg-[#FFFCF7] px-3 py-2 text-xs text-[#7A6D60]">
              {suggestionsNotice}
            </p>
          ) : null}

          {extraSuggestions.length > 0 ? (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">Mais sugestões</h3>
              {extraSuggestions.map((suggestion) => (
                <SuggestionCard
                  key={`extra-${suggestion.generationId || "local"}-${suggestion.id}`}
                  suggestion={suggestion}
                  buttonLabel="Ver receita completa"
                  onOpenRecipe={(selected) => openRecipe(selected, suggestion.generationId)}
                />
              ))}
            </div>
          ) : null}

          <Card className="border-[#E5D7C1] bg-[#FFFCF7]">
            <CardHeader>
              <CardTitle>Você também pode fazer</CardTitle>
              <CardDescription>Receitas que faltam só 1 ou 2 ingredientes.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {response.alsoCanMake.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nada por enquanto. Tente adicionar mais ingredientes.</p>
              ) : (
                response.alsoCanMake.map((suggestion) => (
                  <button
                    key={`also-${suggestion.id}`}
                    className="w-full rounded-2xl border border-[#E6D8C2] bg-[#F7F0E2] px-4 py-3 text-left transition hover:bg-[#EFE3CD]"
                    onClick={() => openRecipe(suggestion, response.generationId)}
                  >
                    <p className="text-sm font-semibold">{suggestion.title}</p>
                    <p className="text-xs text-[#7A6D60]">Precisa de: {suggestion.missingIngredients.join(", ")}</p>
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
          <div className="max-h-[calc(100dvh-2rem)] w-full overflow-y-auto rounded-[1.8rem] bg-[#FFFCF7] p-5 shadow-2xl sm:max-w-sm">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-xl font-semibold text-[#2A1E17]">Selecionar foto</h3>
              <button onClick={() => setIsPhotoPickerOpen(false)} className="text-xs font-semibold text-[#7A6D60]">
                ← Voltar
              </button>
            </div>
            <p className="mt-1 text-sm text-[#7E7366]">Como você quer enviar a imagem?</p>
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
