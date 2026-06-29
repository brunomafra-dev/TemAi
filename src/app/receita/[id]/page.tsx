"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { RatingStars } from "@/components/recipes/rating-stars";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  deleteLibraryRecipeComment,
  deleteLibraryRecipeRating,
  fetchFullRecipe,
  fetchLibraryRecipeFeedback,
  postLibraryRecipeComment,
  recordLibraryRecipeView,
  reportLibraryRecipe,
  reportLibraryRecipeComment,
  saveLibraryRecipeRating,
  updateLibraryRecipeComment,
  type LibraryRecipeFeedback,
} from "@/features/recipes/api-client";
import { LIBRARY_RECIPES } from "@/features/recipes/library-recipes";
import { addShoppingItemsFromRecipe } from "@/features/recipes/shopping-storage";
import {
  getAuthoredRecipes,
  getSavedRecipeRefs,
  isRecipeSaved,
  removeSavedRecipeRef,
  upsertAuthoredRecipe,
  upsertSavedRecipeRef,
} from "@/features/recipes/local-storage";
import {
  deleteSavedRecipeRefFromCloud,
  saveSavedRecipeRefToCloud,
  syncSavedRecipeRefsFromCloud,
} from "@/features/recipes/saved-recipes-cloud";
import {
  getUserRecipeRating,
  removeUserRecipeRating,
  setUserRecipeRating,
} from "@/features/recipes/ratings-storage";
import { getRecipeDifficulty } from "@/features/recipes/quality";
import type {
  CookingEquipment,
  Recipe,
  RecipeSuggestionFilter,
  SavedRecipeRef,
} from "@/features/recipes/types";
import { normalizeCookingEquipment } from "@/features/recipes/cooking-equipment";
import { parseIngredientsText } from "@/features/recipes/helpers";
import { slugify } from "@/lib/utils";

type RecipeOriginQuery = "ai" | "library" | "saved" | "manual";
type PortionMultiplier = 0.5 | 1 | 2 | 3;

const PORTION_MULTIPLIERS: Array<{ value: PortionMultiplier; label: string }> = [
  { value: 0.5, label: "1/2x" },
  { value: 1, label: "1x" },
  { value: 2, label: "2x" },
  { value: 3, label: "3x" },
];

const reportOptions = [
  { value: "wrong_info", label: "Informação incorreta" },
  { value: "wrong_image", label: "Foto errada" },
  { value: "inappropriate", label: "Conteúdo impróprio" },
  { value: "dangerous", label: "Receita perigosa" },
  { value: "other", label: "Outro motivo" },
];

const commentReportOptions = [
  { value: "inappropriate", label: "Conteúdo impróprio" },
  { value: "harassment", label: "Ofensa ou xingamento" },
  { value: "spam", label: "Spam" },
  { value: "dangerous", label: "Conteúdo perigoso" },
  { value: "other", label: "Outro motivo" },
];

const HIDDEN_COMMENT_IDS_KEY = "temai_hidden_comment_ids_v1";
const INITIAL_VISIBLE_COMMENTS = 3;

function readHiddenCommentIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(HIDDEN_COMMENT_IDS_KEY) || "[]") as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function saveHiddenCommentIds(ids: string[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(HIDDEN_COMMENT_IDS_KEY, JSON.stringify(Array.from(new Set(ids))));
}

function parseIngredientsQuery(rawIngredients: string | null): string[] {
  if (!rawIngredients) {
    return [];
  }

  return rawIngredients
    .split(",")
    .map((ingredient) => ingredient.trim())
    .filter(Boolean);
}

function parseCookingEquipmentQuery(rawEquipment: string | null): CookingEquipment[] {
  if (!rawEquipment) return normalizeCookingEquipment(undefined);
  return normalizeCookingEquipment(rawEquipment.split(",").map((item) => item.trim()));
}

function parseRecipeFilterQuery(rawFilter: string | null): RecipeSuggestionFilter {
  if (
    rawFilter === "all" ||
    rawFilter === "meal" ||
    rawFilter === "fit" ||
    rawFilter === "vegetarian" ||
    rawFilter === "dessert" ||
    rawFilter === "drink"
  ) {
    return rawFilter;
  }
  return "all";
}

function normalizeList(values: string[]): string[] {
  return values
    .map((value) =>
      value
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, ""),
    )
    .filter(Boolean);
}

function mapSteps(value: string): string[] {
  return value
    .split(/\n/g)
    .map((step) => step.trim())
    .filter(Boolean);
}

function symmetricDiffCount(base: string[], next: string[]): number {
  const baseSet = new Set(base);
  const nextSet = new Set(next);
  let count = 0;
  baseSet.forEach((item) => {
    if (!nextSet.has(item)) count += 1;
  });
  nextSet.forEach((item) => {
    if (!baseSet.has(item)) count += 1;
  });
  return count;
}

function parseFraction(fragment: string): number | null {
  const parts = fragment.split("/");
  if (parts.length !== 2) return null;
  const num = Number(parts[0]);
  const den = Number(parts[1]);
  if (!Number.isFinite(num) || !Number.isFinite(den) || den === 0) return null;
  return num / den;
}

function parseQuantityToken(token: string): number | null {
  const normalized = token.trim().replace(",", ".");
  if (!normalized) return null;
  if (normalized.includes("/")) return parseFraction(normalized);
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

function formatScaledValue(value: number): string {
  if (Math.abs(value - Math.round(value)) < 0.001) return String(Math.round(value));
  if (value < 1) {
    if (Math.abs(value - 0.5) < 0.05) return "1/2";
    if (Math.abs(value - 0.25) < 0.05) return "1/4";
    if (Math.abs(value - 0.75) < 0.05) return "3/4";
  }
  return value
    .toFixed(2)
    .replace(/\.?0+$/, "")
    .replace(".", ",");
}

function inflectUnit(unitRaw: string, quantity: number): string {
  const normalized = unitRaw
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  const forms: Record<string, { singular: string; plural: string }> = {
    unidade: { singular: "unidade", plural: "unidades" },
    unidades: { singular: "unidade", plural: "unidades" },
    item: { singular: "item", plural: "itens" },
    itens: { singular: "item", plural: "itens" },
    porcao: { singular: "porção", plural: "porções" },
    porcoes: { singular: "porção", plural: "porções" },
    xicara: { singular: "xícara", plural: "xícaras" },
    xicaras: { singular: "xícara", plural: "xícaras" },
    colher: { singular: "colher", plural: "colheres" },
    colheres: { singular: "colher", plural: "colheres" },
    colherzinha: { singular: "colherzinha", plural: "colherzinhas" },
    colherzinhas: { singular: "colherzinha", plural: "colherzinhas" },
    copo: { singular: "copo", plural: "copos" },
    copos: { singular: "copo", plural: "copos" },
    caneca: { singular: "caneca", plural: "canecas" },
    canecas: { singular: "caneca", plural: "canecas" },
    taca: { singular: "taça", plural: "taças" },
    tacas: { singular: "taça", plural: "taças" },
    quilo: { singular: "quilo", plural: "quilos" },
    quilos: { singular: "quilo", plural: "quilos" },
    kilo: { singular: "kilo", plural: "kilos" },
    kilos: { singular: "kilo", plural: "kilos" },
    kg: { singular: "kg", plural: "kg" },
    grama: { singular: "grama", plural: "gramas" },
    gramas: { singular: "grama", plural: "gramas" },
    g: { singular: "g", plural: "g" },
    miligrama: { singular: "miligrama", plural: "miligramas" },
    miligramas: { singular: "miligrama", plural: "miligramas" },
    mg: { singular: "mg", plural: "mg" },
    litro: { singular: "litro", plural: "litros" },
    litros: { singular: "litro", plural: "litros" },
    mililitro: { singular: "mililitro", plural: "mililitros" },
    mililitros: { singular: "mililitro", plural: "mililitros" },
    ml: { singular: "ml", plural: "ml" },
    lata: { singular: "lata", plural: "latas" },
    latas: { singular: "lata", plural: "latas" },
    latinha: { singular: "latinha", plural: "latinhas" },
    latinhas: { singular: "latinha", plural: "latinhas" },
    garrafa: { singular: "garrafa", plural: "garrafas" },
    garrafas: { singular: "garrafa", plural: "garrafas" },
    vidro: { singular: "vidro", plural: "vidros" },
    vidros: { singular: "vidro", plural: "vidros" },
    pote: { singular: "pote", plural: "potes" },
    potes: { singular: "pote", plural: "potes" },
    pacote: { singular: "pacote", plural: "pacotes" },
    pacotes: { singular: "pacote", plural: "pacotes" },
    saquinho: { singular: "saquinho", plural: "saquinhos" },
    saquinhos: { singular: "saquinho", plural: "saquinhos" },
    sache: { singular: "sache", plural: "saches" },
    saches: { singular: "sache", plural: "saches" },
    envelope: { singular: "envelope", plural: "envelopes" },
    envelopes: { singular: "envelope", plural: "envelopes" },
    caixa: { singular: "caixa", plural: "caixas" },
    caixas: { singular: "caixa", plural: "caixas" },
    fatia: { singular: "fatia", plural: "fatias" },
    fatias: { singular: "fatia", plural: "fatias" },
    pedaco: { singular: "pedaço", plural: "pedaços" },
    pedacos: { singular: "pedaço", plural: "pedaços" },
    ramo: { singular: "ramo", plural: "ramos" },
    ramos: { singular: "ramo", plural: "ramos" },
    folha: { singular: "folha", plural: "folhas" },
    folhas: { singular: "folha", plural: "folhas" },
    dente: { singular: "dente", plural: "dentes" },
    dentes: { singular: "dente", plural: "dentes" },
    cubo: { singular: "cubo", plural: "cubos" },
    cubos: { singular: "cubo", plural: "cubos" },
    tablete: { singular: "tablete", plural: "tabletes" },
    tabletes: { singular: "tablete", plural: "tabletes" },
    barra: { singular: "barra", plural: "barras" },
    barras: { singular: "barra", plural: "barras" },
    pitada: { singular: "pitada", plural: "pitadas" },
    pitadas: { singular: "pitada", plural: "pitadas" },
    fio: { singular: "fio", plural: "fios" },
    fios: { singular: "fio", plural: "fios" },
    gota: { singular: "gota", plural: "gotas" },
    gotas: { singular: "gota", plural: "gotas" },
  };

  const target = forms[normalized];
  if (!target) return unitRaw;
  return quantity > 1 ? target.plural : target.singular;
}

function inflectIngredientUnit(line: string): string {
  const pattern = /^(\s*(\d+(?:[.,]\d+)?|\d+\/\d+)\s+)([A-Za-z\u00C0-\u00FF]+)\b/;
  const match = line.match(pattern);
  if (!match) return line;
  const quantity = parseQuantityToken(match[2]);
  if (quantity === null) return line;
  const adjustedUnit = inflectUnit(match[3], quantity);
  if (adjustedUnit === match[3]) return line;
  return line.replace(pattern, `${match[1]}${adjustedUnit}`);
}

function scaleIngredientLine(line: string, multiplier: number): string {
  if (multiplier === 1) return line;
  const rangePattern = /^\s*(\d+\/\d+|\d+(?:[.,]\d+)?)\s*(a|até|ate|-|–|—)\s*(\d+\/\d+|\d+(?:[.,]\d+)?)\b/i;
  const mixedFractionPattern = /^\s*(\d+(?:[.,]\d+)?)\s+(\d+\/\d+)\b/;
  const singleTokenPattern = /^\s*(\d+\/\d+|\d+(?:[.,]\d+)?)\b/;

  const range = line.match(rangePattern);
  if (range) {
    const start = parseQuantityToken(range[1]);
    const end = parseQuantityToken(range[3]);
    if (start !== null && end !== null) {
      const scaledStart = formatScaledValue(start * multiplier);
      const scaledEnd = formatScaledValue(end * multiplier);
      return inflectIngredientUnit(line.replace(range[0], `${scaledStart} ${range[2]} ${scaledEnd}`));
    }
  }

  const mixed = line.match(mixedFractionPattern);
  if (mixed) {
    const whole = parseQuantityToken(mixed[1]);
    const frac = parseQuantityToken(mixed[2]);
    if (whole !== null && frac !== null) {
      const scaled = (whole + frac) * multiplier;
      return inflectIngredientUnit(line.replace(mixed[0], `${formatScaledValue(scaled)} `));
    }
  }

  const single = line.match(singleTokenPattern);
  if (single) {
    const value = parseQuantityToken(single[1]);
    if (value !== null) {
      const scaled = value * multiplier;
      return inflectIngredientUnit(line.replace(single[1], formatScaledValue(scaled)));
    }
  }

  return line;
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
  const cookingEquipment = useMemo(
    () => parseCookingEquipmentQuery(searchParams.get("equipment")),
    [searchParams],
  );
  const recipeFilter = useMemo(() => parseRecipeFilterQuery(searchParams.get("filter")), [searchParams]);
  const suggestionTitle = searchParams.get("title") || undefined;
  const shouldIncludeNutrition = searchParams.get("nutrition") === "1";
  const generationId = searchParams.get("generationId") || undefined;
  const backHref =
    origin === "ai"
      ? "/gerar-receita-ia?restore=1"
      : origin === "library"
        ? "/biblioteca"
        : "/minhas-receitas";
  const backLabel = origin === "ai" ? "Voltar para sugestões" : "Voltar";

  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [isLoading, setIsLoading] = useState(origin === "ai");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSaved, setIsSaved] = useState(false);
  const [userRating, setUserRating] = useState(0);
  const [draftRating, setDraftRating] = useState(0);
  const [isRatingOpen, setIsRatingOpen] = useState(false);
  const [isRatingSaving, setIsRatingSaving] = useState(false);
  const [libraryFeedback, setLibraryFeedback] = useState<LibraryRecipeFeedback | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [commentText, setCommentText] = useState("");
  const [isCommenting, setIsCommenting] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("wrong_info");
  const [reportDetail, setReportDetail] = useState("");
  const [isReporting, setIsReporting] = useState(false);
  const [visibleCommentCount, setVisibleCommentCount] = useState(INITIAL_VISIBLE_COMMENTS);
  const [hiddenCommentIds, setHiddenCommentIds] = useState<string[]>(() => readHiddenCommentIds());
  const [reportingCommentId, setReportingCommentId] = useState("");
  const [commentReportReason, setCommentReportReason] = useState("inappropriate");
  const [commentReportDetail, setCommentReportDetail] = useState("");
  const [isReportingComment, setIsReportingComment] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState("");
  const [editingCommentText, setEditingCommentText] = useState("");
  const [isMutatingComment, setIsMutatingComment] = useState(false);
  const [isShoppingOpen, setIsShoppingOpen] = useState(false);
  const [ownedIngredients, setOwnedIngredients] = useState<Record<string, boolean>>({});
  const [shoppingMessage, setShoppingMessage] = useState("");
  const [savedRecipeMessage, setSavedRecipeMessage] = useState("");
  const [isSyncingSavedRecipe, setIsSyncingSavedRecipe] = useState(false);
  const [isTouchOpen, setIsTouchOpen] = useState(false);
  const [touchTitle, setTouchTitle] = useState("");
  const [touchImageUrl, setTouchImageUrl] = useState("");
  const [touchIngredientsText, setTouchIngredientsText] = useState("");
  const [touchStepsText, setTouchStepsText] = useState("");
  const [touchError, setTouchError] = useState("");
  const [isTouchClosing, setIsTouchClosing] = useState(false);
  const [portionMultiplier, setPortionMultiplier] = useState<PortionMultiplier>(1);
  const scaledIngredients = useMemo(() => {
    if (!recipe) return [];
    return recipe.ingredients.map((ingredient) => scaleIngredientLine(ingredient, portionMultiplier));
  }, [portionMultiplier, recipe]);

  const scaledServings = useMemo(() => {
    if (!recipe) return 0;
    return Math.max(1, recipe.servings * portionMultiplier);
  }, [portionMultiplier, recipe]);
  const scaledServingsLabel = useMemo(() => formatScaledValue(scaledServings), [scaledServings]);
  const recipeDifficulty = recipe ? recipe.difficulty || getRecipeDifficulty(recipe) : "";

  useEffect(() => {
    setDraftRating(userRating || 0);
  }, [userRating]);
  const publicComments = useMemo(() => {
    const hiddenIds = new Set(hiddenCommentIds);
    return (libraryFeedback?.comments ?? []).filter((comment) => !hiddenIds.has(comment.id));
  }, [hiddenCommentIds, libraryFeedback?.comments]);
  const visibleComments = useMemo(
    () => publicComments.slice(0, visibleCommentCount),
    [publicComments, visibleCommentCount],
  );
  const hasMoreComments = publicComments.length > visibleComments.length;

  useEffect(() => {
    let isMounted = true;

    async function loadRecipe() {
      setErrorMessage("");
      setSavedRecipeMessage("");

      if (origin === "library") {
        try {
          setIsLoading(true);
          const response = await fetch(`/api/library/meal/${encodeURIComponent(recipeId)}`);
          if (!response.ok) {
            throw new Error("Receita da biblioteca não encontrada.");
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
                  : "Não foi possível carregar receita da biblioteca.",
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
        try {
          setIsLoading(true);
          let savedRef = getSavedRecipeRefs().find((item) => item.recipeId === recipeId);
          if (!savedRef) {
            const cloudRefs = await syncSavedRecipeRefsFromCloud().catch(() => []);
            savedRef = cloudRefs.find((item) => item.recipeId === recipeId);
          }
          if (!savedRef) {
            throw new Error("Receita salva não encontrada.");
          }

          if (savedRef.recipeSnapshot) {
            if (isMounted) {
              setRecipe(savedRef.recipeSnapshot);
              setIsSaved(true);
              setUserRating(getUserRecipeRating(savedRef.recipeSnapshot.id));
            }
            return;
          }

          if (savedRef.sourceOrigin === "library") {
            const response = await fetch(`/api/library/meal/${encodeURIComponent(recipeId)}`);
            if (!response.ok) throw new Error("Receita da biblioteca não encontrada.");
            const data = (await response.json()) as { recipe: Recipe };
            if (isMounted) {
              setRecipe(data.recipe);
              setIsSaved(true);
              setUserRating(getUserRecipeRating(data.recipe.id));
            }
            return;
          }

          const rebuilt = await fetchFullRecipe({
            suggestionId: savedRef.sourceSuggestionId || recipeId,
            suggestionTitle,
            ingredients: savedRef.ingredientsSnapshot || ingredientList,
            cookingEquipment: savedRef.cookingEquipment || cookingEquipment,
            includeNutrition: shouldIncludeNutrition,
            recipeFilter,
            generationId: savedRef.generationId,
          });
          if (isMounted) {
            setRecipe(rebuilt);
            setIsSaved(true);
            setUserRating(getUserRecipeRating(rebuilt.id));
          }
        } catch (error) {
          if (isMounted) {
            setErrorMessage(
              error instanceof Error ? error.message : "Não foi possível carregar receita salva.",
            );
          }
        } finally {
          if (isMounted) setIsLoading(false);
        }
        return;
      }

      if (origin === "manual") {
        const authored = getAuthoredRecipes().find((item) => item.id === recipeId) ?? null;
        if (isMounted) {
          setRecipe(authored);
          setIsLoading(false);
          setIsSaved(false);
          if (authored) {
            setUserRating(getUserRecipeRating(authored.id));
          }
        }
        return;
      }

      try {
        setIsLoading(true);
        const fullRecipe = await fetchFullRecipe({
          suggestionId: recipeId,
          suggestionTitle,
          ingredients: ingredientList,
          cookingEquipment,
          includeNutrition: shouldIncludeNutrition,
          recipeFilter,
          generationId,
        });

        if (isMounted) {
          setRecipe(fullRecipe);
          setIsSaved(isRecipeSaved(fullRecipe.id));
          setUserRating(getUserRecipeRating(fullRecipe.id));
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error instanceof Error ? error.message : "Não foi possível gerar a receita.");
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
  }, [
    cookingEquipment,
    generationId,
    ingredientList,
    origin,
    recipeFilter,
    recipeId,
    shouldIncludeNutrition,
    suggestionTitle,
  ]);

  useEffect(() => {
    if (!isShoppingOpen) return;
    setOwnedIngredients((current) =>
      Object.fromEntries(scaledIngredients.map((ingredient) => [ingredient, Boolean(current[ingredient])])),
    );
  }, [isShoppingOpen, scaledIngredients]);

  useEffect(() => {
    if (origin !== "library") {
      setLibraryFeedback(null);
      return;
    }

    let isMounted = true;
    setVisibleCommentCount(INITIAL_VISIBLE_COMMENTS);
    fetchLibraryRecipeFeedback(recipeId)
      .then((feedback) => {
        if (!isMounted) return;
        setLibraryFeedback(feedback);
        setUserRating(feedback.userRating);
      })
      .catch(() => {
        if (!isMounted) return;
        setFeedbackMessage("Não foi possível carregar avaliações e comentários.");
      });

    return () => {
      isMounted = false;
    };
  }, [origin, recipeId]);

  useEffect(() => {
    if (origin !== "library" || !recipe) return;
    void recordLibraryRecipeView(recipe.id).catch(() => undefined);
  }, [origin, recipe]);

  function buildSavedRecipeRef(currentRecipe: Recipe): SavedRecipeRef {
    const sourceOrigin = origin === "library" ? "library" : "ai";
    return {
      recipeId: currentRecipe.id,
      sourceOrigin,
      savedAt: new Date().toISOString(),
      title: currentRecipe.title,
      description: currentRecipe.description,
      imageUrl: currentRecipe.imageUrl,
      sourceLabel: currentRecipe.sourceLabel,
      recipeSnapshot: currentRecipe,
      ingredientsSnapshot:
        sourceOrigin === "ai"
          ? ingredientList.length
            ? ingredientList
            : currentRecipe.ingredients
          : currentRecipe.ingredients,
      generationId,
      cookingEquipment,
      sourceSuggestionId: sourceOrigin === "ai" ? recipeId : undefined,
    };
  }

  async function handleSaveRecipe() {
    if (!recipe) {
      return;
    }
    if (origin === "manual") {
      return;
    }

    const savedRef = buildSavedRecipeRef(recipe);
    upsertSavedRecipeRef(savedRef);
    setIsSaved(true);
    setSavedRecipeMessage("Receita salva.");

    setIsSyncingSavedRecipe(true);
    try {
      const synced = await saveSavedRecipeRefToCloud(savedRef);
      setSavedRecipeMessage(
        synced
          ? "Receita salva e sincronizada."
          : "Receita salva neste aparelho. Entre na conta para sincronizar.",
      );
    } catch {
      setSavedRecipeMessage("Receita salva neste aparelho. Sincronização pendente.");
    } finally {
      setIsSyncingSavedRecipe(false);
    }
  }

  async function handleUnsaveRecipe() {
    if (!recipe) {
      return;
    }

    const savedRef = getSavedRecipeRefs().find((item) => item.recipeId === recipe.id);
    removeSavedRecipeRef(recipe.id);
    setIsSaved(false);
    setSavedRecipeMessage("Receita removida dos salvos.");

    if (!savedRef) return;
    setIsSyncingSavedRecipe(true);
    try {
      await deleteSavedRecipeRefFromCloud(savedRef);
    } catch {
      setSavedRecipeMessage("Receita removida deste aparelho. Sincronização pendente.");
    } finally {
      setIsSyncingSavedRecipe(false);
    }
  }

  async function handleRate(rating: number) {
    if (!recipe) {
      return;
    }
    if (rating < 1) {
      setFeedbackMessage("Escolha uma nota antes de salvar.");
      return;
    }
    setIsRatingSaving(true);
    setUserRecipeRating(recipe.id, rating);
    setUserRating(rating);
    setFeedbackMessage("");

    if (origin !== "library") {
      setFeedbackMessage("Avaliação salva.");
      setIsRatingOpen(false);
      setIsRatingSaving(false);
      return;
    }

    try {
      const feedback = await saveLibraryRecipeRating(recipe.id, rating);
      setLibraryFeedback(feedback);
      setUserRating(feedback.userRating || rating);
      setFeedbackMessage("Avaliação salva.");
      setIsRatingOpen(false);
    } catch (error) {
      setFeedbackMessage(error instanceof Error ? error.message : "Não foi possível salvar avaliação.");
    } finally {
      setIsRatingSaving(false);
    }
  }

  async function undoRating() {
    if (!recipe) {
      return;
    }
    setIsRatingSaving(true);
    removeUserRecipeRating(recipe.id);
    setUserRating(0);
    setDraftRating(0);
    setFeedbackMessage("");

    if (origin !== "library") {
      setFeedbackMessage("Avaliação desfeita.");
      setIsRatingOpen(false);
      setIsRatingSaving(false);
      return;
    }

    try {
      const feedback = await deleteLibraryRecipeRating(recipe.id);
      setLibraryFeedback(feedback);
      setUserRating(feedback.userRating || 0);
      setFeedbackMessage("Avaliação desfeita.");
      setIsRatingOpen(false);
    } catch (error) {
      setFeedbackMessage(error instanceof Error ? error.message : "Não foi possível desfazer avaliação.");
    } finally {
      setIsRatingSaving(false);
    }
  }

  async function submitComment() {
    if (!recipe || origin !== "library" || isCommenting) return;
    const body = commentText.trim();
    if (body.length < 3) {
      setFeedbackMessage("Escreva um comentário um pouco mais completo.");
      return;
    }

    setIsCommenting(true);
    setFeedbackMessage("");
    try {
      const feedback = await postLibraryRecipeComment(recipe.id, body);
      setLibraryFeedback(feedback);
      setCommentText("");
      setVisibleCommentCount(INITIAL_VISIBLE_COMMENTS);
      setFeedbackMessage("Comentário publicado.");
    } catch (error) {
      setFeedbackMessage(error instanceof Error ? error.message : "Não foi possível publicar comentário.");
    } finally {
      setIsCommenting(false);
    }
  }

  async function submitReport() {
    if (!recipe || origin !== "library" || isReporting) return;
    setIsReporting(true);
    setFeedbackMessage("");
    try {
      const result = await reportLibraryRecipe({
        recipeId: recipe.id,
        reason: reportReason,
        detail: reportDetail,
      });
      setFeedbackMessage(result.message);
      setReportDetail("");
      setIsReportOpen(false);
    } catch (error) {
      setFeedbackMessage(error instanceof Error ? error.message : "Não foi possível enviar denúncia.");
    } finally {
      setIsReporting(false);
    }
  }

  function hideComment(commentId: string) {
    setHiddenCommentIds((current) => {
      const next = current.includes(commentId) ? current : [...current, commentId];
      saveHiddenCommentIds(next);
      return next;
    });
    setReportingCommentId("");
    setFeedbackMessage("Comentário ocultado neste aparelho.");
  }

  async function submitCommentReport(commentId: string) {
    if (!recipe || origin !== "library" || isReportingComment) return;
    setIsReportingComment(true);
    setFeedbackMessage("");
    try {
      const result = await reportLibraryRecipeComment({
        recipeId: recipe.id,
        commentId,
        reason: commentReportReason,
        detail: commentReportDetail,
      });
      setFeedbackMessage(result.message);
      setReportingCommentId("");
      setCommentReportDetail("");
      if (result.hiddenForReview) {
        const feedback = await fetchLibraryRecipeFeedback(recipe.id).catch(() => null);
        if (feedback) {
          setLibraryFeedback(feedback);
          setUserRating(feedback.userRating);
        }
      }
    } catch (error) {
      setFeedbackMessage(error instanceof Error ? error.message : "Não foi possível denunciar comentário.");
    } finally {
      setIsReportingComment(false);
    }
  }

  function startEditComment(commentId: string, body: string) {
    setReportingCommentId("");
    setEditingCommentId(commentId);
    setEditingCommentText(body);
    setFeedbackMessage("");
  }

  async function submitCommentEdit(commentId: string) {
    if (!recipe || origin !== "library" || isMutatingComment) return;
    const body = editingCommentText.trim();
    if (body.length < 3) {
      setFeedbackMessage("Escreva um comentário um pouco mais completo.");
      return;
    }

    setIsMutatingComment(true);
    setFeedbackMessage("");
    try {
      const feedback = await updateLibraryRecipeComment({
        recipeId: recipe.id,
        commentId,
        body,
      });
      setLibraryFeedback(feedback);
      setEditingCommentId("");
      setEditingCommentText("");
      setFeedbackMessage("Comentário atualizado.");
    } catch (error) {
      setFeedbackMessage(error instanceof Error ? error.message : "Não foi possível editar comentário.");
    } finally {
      setIsMutatingComment(false);
    }
  }

  async function deleteComment(commentId: string) {
    if (!recipe || origin !== "library" || isMutatingComment) return;
    const confirmed = window.confirm("Excluir este comentário?");
    if (!confirmed) return;

    setIsMutatingComment(true);
    setFeedbackMessage("");
    try {
      const feedback = await deleteLibraryRecipeComment({
        recipeId: recipe.id,
        commentId,
      });
      setLibraryFeedback(feedback);
      setEditingCommentId("");
      setEditingCommentText("");
      setFeedbackMessage("Comentário excluído.");
    } catch (error) {
      setFeedbackMessage(error instanceof Error ? error.message : "Não foi possível excluir comentário.");
    } finally {
      setIsMutatingComment(false);
    }
  }

  function openShoppingSelector() {
    if (!recipe) return;
    setOwnedIngredients(Object.fromEntries(scaledIngredients.map((ingredient) => [ingredient, false])));
    setShoppingMessage("");
    setIsShoppingOpen(true);
  }

  function confirmShoppingList() {
    if (!recipe) return;
    const missing = scaledIngredients.filter((ingredient) => !ownedIngredients[ingredient]);
    if (missing.length === 0) {
      setShoppingMessage("Perfeito! Você já tem todos os ingredientes.");
      return;
    }

    addShoppingItemsFromRecipe({
      recipeId: recipe.id,
      recipeTitle: recipe.title,
      ingredientNames: missing,
    });
    setShoppingMessage(`${missing.length} item(ns) enviado(s) para sua lista de compras.`);
  }

  function openTouchEditor() {
    if (!recipe) return;
    setIsTouchClosing(false);
    setTouchTitle(recipe.title);
    setTouchImageUrl(recipe.imageUrl || "");
    setTouchIngredientsText(recipe.ingredients.join(", "));
    setTouchStepsText(recipe.steps.join("\n"));
    setTouchError("");
    setIsTouchOpen(true);
  }

  function closeTouchEditor() {
    setIsTouchClosing(true);
    setTimeout(() => {
      setIsTouchOpen(false);
      setIsTouchClosing(false);
    }, 180);
  }

  const touchValidation = useMemo(() => {
    if (!recipe) {
      return {
        hasNewTitle: false,
        hasNewImage: false,
        ingredientsChanged: false,
        stepsChanged: false,
        canCreate: false,
      };
    }

    const baseTitle = recipe.title.trim().toLowerCase();
    const nextTitle = touchTitle.trim().toLowerCase();
    const hasNewTitle = nextTitle.length >= 6 && nextTitle !== baseTitle;

    const baseImage = (recipe.imageUrl || "").trim();
    const nextImage = touchImageUrl.trim();
    const hasNewImage = nextImage.length > 0 && nextImage !== baseImage;

    const baseIngredients = normalizeList(recipe.ingredients);
    const nextIngredients = normalizeList(parseIngredientsText(touchIngredientsText));
    const ingredientDiff = symmetricDiffCount(baseIngredients, nextIngredients);
    const ingredientsChanged =
      ingredientDiff >= 2 &&
      ingredientDiff / Math.max(baseIngredients.length, nextIngredients.length || 1) >= 0.3;

    const baseSteps = normalizeList(recipe.steps);
    const nextSteps = normalizeList(mapSteps(touchStepsText));
    const stepDiff = symmetricDiffCount(baseSteps, nextSteps);
    const stepsChanged =
      stepDiff >= 2 && stepDiff / Math.max(baseSteps.length, nextSteps.length || 1) >= 0.25;

    return {
      hasNewTitle,
      hasNewImage,
      ingredientsChanged,
      stepsChanged,
      canCreate: hasNewTitle && hasNewImage && ingredientsChanged && stepsChanged,
    };
  }, [recipe, touchImageUrl, touchIngredientsText, touchStepsText, touchTitle]);

  function createAuthoredFromTouch() {
    if (!recipe) return;
    if (!touchValidation.canCreate) {
      setTouchError("Seu toque ainda não passou na validação completa.");
      return;
    }

    const nextIngredients = parseIngredientsText(touchIngredientsText);
    const nextSteps = mapSteps(touchStepsText);
    if (!nextIngredients.length || !nextSteps.length) {
      setTouchError("Ingredientes e preparo não podem ficar vazios.");
      return;
    }

    const authored: Recipe = {
      id: `manual-${slugify(touchTitle)}-${Date.now()}`,
      title: touchTitle.trim(),
      description: `Versão autoral inspirada em: ${recipe.title}`,
      category: recipe.category,
      ingredients: nextIngredients,
      steps: nextSteps,
      prepMinutes: recipe.prepMinutes,
      servings: recipe.servings,
      imageUrl: touchImageUrl.trim(),
      sourceLabel: "Criada por você",
      origin: "manual",
    };

    upsertAuthoredRecipe(authored);
    setIsTouchOpen(false);
    setIsTouchClosing(false);
    setTouchError("");
    window.location.href = `/receita/${authored.id}?origin=manual`;
  }

  return (
    <div className="native-page mx-auto w-full max-w-md px-4">
      <div className="mb-4">
        <Link href={backHref} className="text-sm font-semibold text-primary">
          ← {backLabel}
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
            <p className="text-sm text-muted-foreground">Receita não encontrada.</p>
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
                <Badge>{scaledServingsLabel} porções</Badge>
                <Badge>Serve ~{scaledServingsLabel} pessoa(s)</Badge>
                <Badge>{recipeDifficulty}</Badge>
                <Badge>{recipe.sourceLabel}</Badge>
              </div>
              {recipe.nutrition ? (
                <details className="rounded-2xl border border-[#E5D7BF] bg-[#FFFCF7] p-3">
                  <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wide text-[#7A6D60]">
                    Resumo nutricional (estimativa)
                  </summary>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-sm text-[#4F4338]">
                    <p>Kcal: {recipe.nutrition.caloriesKcal}</p>
                    <p>Proteína: {recipe.nutrition.proteinG} g</p>
                    <p>Carbo: {recipe.nutrition.carbsG} g</p>
                    <p>Gordura: {recipe.nutrition.fatG} g</p>
                  </div>
                  <p className="mt-2 text-xs text-[#7A6D60]">{recipe.nutrition.disclaimer}</p>
                </details>
              ) : null}
              <div className="space-y-2 rounded-2xl border border-[#E5D7BF] bg-[#FFFCF7] p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#7A6D60]">
                  Multiplicador de porções
                </p>
                <div className="flex gap-2">
                  {PORTION_MULTIPLIERS.map(({ value, label }) => (
                    <Button
                      key={`portion-${value}`}
                      type="button"
                      variant={portionMultiplier === value ? "default" : "secondary"}
                      className="flex-1"
                      onClick={() => setPortionMultiplier(value)}
                    >
                      {label}
                    </Button>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[#7A6D60]">Avaliação</p>
                {origin === "library" ? (
                  libraryFeedback && libraryFeedback.ratingCount > 0 ? (
                    <p className="mb-2 rounded-2xl border border-[#E5D7BF] bg-[#FFFCF7] px-3 py-2 text-xs font-semibold text-[#6A5E52]">
                      Média {libraryFeedback.averageRating.toFixed(1)}/10 com {libraryFeedback.ratingCount}{" "}
                      avaliação(ões).
                    </p>
                  ) : (
                    <p className="mb-2 rounded-2xl border border-[#E5D7BF] bg-[#FFFCF7] px-3 py-2 text-xs font-semibold text-[#6A5E52]">
                      Receita ainda não foi avaliada.
                    </p>
                  )
                ) : null}
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#E5D7BF] bg-[#FFFCF7] px-3 py-3">
                  <div>
                    <RatingStars readonly value={userRating || libraryFeedback?.averageRating || 0} />
                    {userRating > 0 ? (
                      <p className="mt-1 text-xs font-semibold text-[#7A6D60]">Sua nota: {userRating}/10</p>
                    ) : null}
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    className="h-9 rounded-full px-4 text-xs"
                    onClick={() => {
                      setDraftRating(userRating || 0);
                      setIsRatingOpen(true);
                    }}
                  >
                    Avaliar receita
                  </Button>
                </div>
                {feedbackMessage ? (
                  <p className="mt-2 rounded-2xl border border-[#E5D7BF] bg-[#FFFCF7] px-3 py-2 text-xs font-semibold text-[#6A5E52]">
                    {feedbackMessage}
                  </p>
                ) : null}
              </div>
              <div className="grid grid-cols-1 gap-2">
                {origin === "manual" ? (
                  <Button variant="secondary" className="w-full" disabled>
                    Receita autoral
                  </Button>
                ) : isSaved ? (
                  <Button
                    variant="secondary"
                    className="w-full"
                    onClick={() => void handleUnsaveRecipe()}
                    disabled={isSyncingSavedRecipe}
                  >
                    {isSyncingSavedRecipe ? "Sincronizando..." : "Remover dos salvos"}
                  </Button>
                ) : (
                  <Button
                    className="w-full"
                    onClick={() => void handleSaveRecipe()}
                    disabled={isSyncingSavedRecipe}
                  >
                    {isSyncingSavedRecipe ? "Salvando..." : "Salvar receita"}
                  </Button>
                )}
                <Link
                  href="/minhas-receitas"
                  className="flex h-11 w-full items-center justify-center rounded-full border border-border bg-surface px-4 text-center text-sm font-semibold text-foreground transition hover:bg-surface-muted"
                >
                  Ver minhas receitas
                </Link>
              </div>
              {savedRecipeMessage ? (
                <p className="rounded-2xl border border-[#E5D7BF] bg-[#FFFCF7] px-3 py-2 text-center text-xs font-semibold text-[#6A5E52]">
                  {savedRecipeMessage}
                </p>
              ) : null}
              <Button variant="outline" className="w-full" onClick={openShoppingSelector}>
                Adicionar à lista de compras
              </Button>
              {isShoppingOpen ? (
                <div className="space-y-3 rounded-2xl border border-[#E5D7BF] bg-[#FFFCF7] p-3">
                  <p className="text-sm font-semibold text-[#5D5248]">
                    Marque os ingredientes que você já tem em casa:
                  </p>
                  <div className="space-y-2">
                    {scaledIngredients.map((ingredient) => (
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
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <Button className="w-full justify-center text-center" onClick={confirmShoppingList}>
                      Adicionar itens à lista
                    </Button>
                    <Button
                      variant="secondary"
                      className="w-full justify-center text-center"
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
              {origin !== "manual" && isSaved ? (
                <Button variant="secondary" className="w-full" onClick={openTouchEditor}>
                  Dar seu toque e criar autoral
                </Button>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Ingredientes</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {scaledIngredients.map((ingredient) => (
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

          {origin === "library" ? (
            <Card>
              <CardHeader>
                <CardTitle>Comentários</CardTitle>
                <CardDescription>
                  Dicas de quem já testou. Perfis de usuários não ficam clicáveis.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <textarea
                    value={commentText}
                    onChange={(event) => setCommentText(event.target.value)}
                    placeholder="Conte como ficou, uma adaptação que deu certo ou uma dica de preparo."
                    className="min-h-[92px] w-full rounded-2xl border border-[#E5D7BF] bg-[#FFFCF7] px-3 py-2 text-sm outline-none"
                  />
                  <Button className="w-full" onClick={() => void submitComment()} disabled={isCommenting}>
                    {isCommenting ? "Publicando..." : "Comentar"}
                  </Button>
                </div>

                <div className="space-y-2">
                  {publicComments.length ? (
                    <>
                      {visibleComments.map((comment) => (
                        <div
                          key={comment.id}
                          className="space-y-3 rounded-2xl border border-[#E5D7BF] bg-[#FFFCF7] p-3"
                        >
                          <div className="flex items-center gap-2">
                            <span className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#EAD7BB] text-xs font-bold text-[#7A4A31]">
                              {comment.authorAvatarUrl ? (
                                <Image
                                  src={comment.authorAvatarUrl}
                                  alt={comment.authorName}
                                  fill
                                  unoptimized
                                  className="object-cover"
                                />
                              ) : (
                                comment.authorName.slice(0, 1).toUpperCase()
                              )}
                            </span>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-[#4F4338]">
                                {comment.authorName}
                              </p>
                              {comment.authorUsername ? (
                                <p className="text-xs text-[#8A7A69]">@{comment.authorUsername}</p>
                              ) : null}
                            </div>
                          </div>
                          {editingCommentId === comment.id ? (
                            <div className="space-y-2">
                              <textarea
                                value={editingCommentText}
                                onChange={(event) => setEditingCommentText(event.target.value)}
                                className="min-h-[84px] w-full rounded-xl border border-[#E5D7BF] bg-white px-3 py-2 text-sm"
                              />
                              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                <Button
                                  className="w-full"
                                  onClick={() => void submitCommentEdit(comment.id)}
                                  disabled={isMutatingComment}
                                >
                                  {isMutatingComment ? "Salvando..." : "Salvar edição"}
                                </Button>
                                <Button
                                  variant="secondary"
                                  className="w-full"
                                  onClick={() => {
                                    setEditingCommentId("");
                                    setEditingCommentText("");
                                  }}
                                  disabled={isMutatingComment}
                                >
                                  Cancelar
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <p className="mt-2 text-sm leading-relaxed text-[#5D5248]">{comment.body}</p>
                          )}
                          <div className="flex flex-wrap items-center gap-3 border-t border-[#E5D7BF] pt-2">
                            {comment.isMine ? (
                              <>
                                <button
                                  type="button"
                                  className="text-xs font-semibold text-[#7A6D60]"
                                  onClick={() => startEditComment(comment.id, comment.body)}
                                  disabled={isMutatingComment}
                                >
                                  Editar
                                </button>
                                <button
                                  type="button"
                                  className="text-xs font-semibold text-[#9A4635]"
                                  onClick={() => void deleteComment(comment.id)}
                                  disabled={isMutatingComment}
                                >
                                  Excluir
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  className="text-xs font-semibold text-[#7A6D60]"
                                  onClick={() => hideComment(comment.id)}
                                >
                                  Ocultar
                                </button>
                                <button
                                  type="button"
                                  className="text-xs font-semibold text-[#9A4635]"
                                  onClick={() => {
                                    setReportingCommentId((current) =>
                                      current === comment.id ? "" : comment.id,
                                    );
                                    setCommentReportReason("inappropriate");
                                    setCommentReportDetail("");
                                  }}
                                >
                                  Denunciar
                                </button>
                              </>
                            )}
                          </div>
                          {reportingCommentId === comment.id ? (
                            <div className="space-y-2 rounded-2xl border border-[#E5D7BF] bg-white p-3">
                              <select
                                value={commentReportReason}
                                onChange={(event) => setCommentReportReason(event.target.value)}
                                className="h-10 w-full rounded-xl border border-[#E5D7BF] bg-white px-3 text-sm"
                              >
                                {commentReportOptions.map((option) => (
                                  <option key={option.value} value={option.value}>
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                              <textarea
                                value={commentReportDetail}
                                onChange={(event) => setCommentReportDetail(event.target.value)}
                                placeholder="Conte o problema, se quiser."
                                className="min-h-[72px] w-full rounded-xl border border-[#E5D7BF] bg-white px-3 py-2 text-sm"
                              />
                              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                <Button
                                  variant="outline"
                                  className="w-full"
                                  onClick={() => void submitCommentReport(comment.id)}
                                  disabled={isReportingComment}
                                >
                                  {isReportingComment ? "Enviando..." : "Enviar denúncia"}
                                </Button>
                                <Button
                                  variant="secondary"
                                  className="w-full"
                                  onClick={() => setReportingCommentId("")}
                                  disabled={isReportingComment}
                                >
                                  Cancelar
                                </Button>
                              </div>
                            </div>
                          ) : null}
                        </div>
                      ))}
                      {hasMoreComments ? (
                        <Button
                          variant="secondary"
                          className="w-full"
                          onClick={() =>
                            setVisibleCommentCount((current) => current + INITIAL_VISIBLE_COMMENTS)
                          }
                        >
                          Ver mais comentários
                        </Button>
                      ) : null}
                    </>
                  ) : (
                    <p className="rounded-2xl border border-[#E5D7BF] bg-[#FFFCF7] px-3 py-4 text-sm text-[#6A5E52]">
                      Ainda não há comentários nesta receita.
                    </p>
                  )}
                </div>

                {feedbackMessage ? (
                  <p className="rounded-2xl border border-[#E5D7BF] bg-[#FFFCF7] px-3 py-2 text-xs font-semibold text-[#6A5E52]">
                    {feedbackMessage}
                  </p>
                ) : null}

                <div className="border-t border-[#E5D7BF] pt-3">
                  <button
                    type="button"
                    className="text-sm font-semibold text-[#9A4635]"
                    onClick={() => setIsReportOpen((current) => !current)}
                  >
                    Denunciar receita
                  </button>
                  {isReportOpen ? (
                    <div className="mt-3 space-y-2 rounded-2xl border border-[#E5D7BF] bg-[#FFFCF7] p-3">
                      <select
                        value={reportReason}
                        onChange={(event) => setReportReason(event.target.value)}
                        className="h-10 w-full rounded-xl border border-[#E5D7BF] bg-white px-3 text-sm"
                      >
                        {reportOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <textarea
                        value={reportDetail}
                        onChange={(event) => setReportDetail(event.target.value)}
                        placeholder="Detalhe o problema, se quiser."
                        className="min-h-[80px] w-full rounded-xl border border-[#E5D7BF] bg-white px-3 py-2 text-sm"
                      />
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => void submitReport()}
                        disabled={isReporting}
                      >
                        {isReporting ? "Enviando..." : "Enviar denúncia"}
                      </Button>
                    </div>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ) : null}
        </article>
      ) : null}

      {isRatingOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-end bg-black/45 p-4 sm:items-center sm:justify-center"
          onClick={() => {
            if (!isRatingSaving) setIsRatingOpen(false);
          }}
        >
          <div
            className="w-full rounded-[1.6rem] border border-[#E5D7BF] bg-[#FFFCF7] p-5 shadow-2xl sm:max-w-sm"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-lg font-semibold text-[#2A1E17]">Avaliar receita</h3>
              <button
                type="button"
                className="text-xs font-semibold text-[#7A6D60]"
                onClick={() => setIsRatingOpen(false)}
                disabled={isRatingSaving}
              >
                ← Voltar
              </button>
            </div>
            <div className="mt-4 rounded-2xl border border-[#E5D7BF] bg-white p-3">
              <RatingStars value={draftRating} onChange={setDraftRating} />
            </div>
            <div className="mt-4 grid grid-cols-1 gap-2">
              <Button
                type="button"
                className="w-full"
                onClick={() => void handleRate(draftRating)}
                disabled={isRatingSaving || draftRating < 1}
              >
                {isRatingSaving ? "Salvando..." : "Salvar avaliação"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="w-full"
                onClick={() => void undoRating()}
                disabled={isRatingSaving || userRating < 1}
              >
                Desfazer avaliação
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {isTouchOpen ? (
        <div
          className={`fixed inset-0 z-50 flex items-end p-4 sm:items-center sm:justify-center ${
            isTouchClosing ? "bg-black/0" : "bg-black/45"
          }`}
          style={{ transition: "background-color 180ms ease" }}
          onClick={closeTouchEditor}
        >
          <div
            className={`flex max-h-[calc(100dvh-2rem)] w-full flex-col rounded-[1.6rem] border border-[#E5D7BF] bg-[#FFFCF7] shadow-2xl sm:max-w-lg ${
              isTouchClosing ? "translate-y-2 opacity-0" : "translate-y-0 opacity-100"
            }`}
            style={{ transition: "opacity 180ms ease, transform 180ms ease" }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[#E5D7BF] px-4 py-3">
              <p className="text-sm font-semibold text-[#5D5248]">Transforme em receita autoral</p>
              <button className="text-xs font-semibold text-[#7A6D60]" onClick={closeTouchEditor}>
                ← Voltar
              </button>
            </div>
            <div className="space-y-2 overflow-y-auto px-4 py-3">
              <input
                value={touchTitle}
                onChange={(event) => setTouchTitle(event.target.value)}
                placeholder="Novo título da receita"
                className="h-10 w-full rounded-xl border border-[#E5D7BF] bg-white px-3 text-sm"
              />
              <input
                value={touchImageUrl}
                onChange={(event) => setTouchImageUrl(event.target.value)}
                placeholder="Nova URL de imagem"
                className="h-10 w-full rounded-xl border border-[#E5D7BF] bg-white px-3 text-sm"
              />
              <textarea
                value={touchIngredientsText}
                onChange={(event) => setTouchIngredientsText(event.target.value)}
                placeholder="Ingredientes separados por vírgula"
                className="min-h-[90px] w-full rounded-xl border border-[#E5D7BF] bg-white px-3 py-2 text-sm"
              />
              <textarea
                value={touchStepsText}
                onChange={(event) => setTouchStepsText(event.target.value)}
                placeholder="Modo de preparo (um passo por linha)"
                className="min-h-[120px] w-full rounded-xl border border-[#E5D7BF] bg-white px-3 py-2 text-sm"
              />

              <div className="mt-3 grid gap-1 rounded-xl border border-[#E5D7BF] bg-[#FAF4EA] p-2 text-xs">
                <p>{touchValidation.hasNewTitle ? "✅" : "❌"} Novo título relevante</p>
                <p>{touchValidation.hasNewImage ? "✅" : "❌"} Nova imagem obrigatória</p>
                <p>{touchValidation.ingredientsChanged ? "✅" : "❌"} Ingredientes mudaram de forma válida</p>
                <p>{touchValidation.stepsChanged ? "✅" : "❌"} Preparo mudou de forma válida</p>
              </div>

              <div className="mt-3 flex gap-2">
                <Button
                  className="flex-1"
                  disabled={!touchValidation.canCreate}
                  onClick={createAuthoredFromTouch}
                >
                  Criar receita autoral
                </Button>
                <Button variant="secondary" className="flex-1" onClick={closeTouchEditor}>
                  Cancelar
                </Button>
              </div>
              {touchError ? <p className="mt-2 text-xs font-semibold text-red-700">{touchError}</p> : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
