import { NextResponse } from "next/server";
import { normalizeCookingEquipment } from "@/features/recipes/cooking-equipment";
import type { CookingEquipment, Recipe, SavedRecipeRef } from "@/features/recipes/types";
import { consumeAuthRateLimit } from "@/features/security/auth-rate-limit";
import { rateLimitResponse, requireAuthUserId } from "@/features/security/auth-user";
import { getSupabaseServiceRoleClient } from "@/lib/supabase-admin";
import {
  parseJsonObjectBody,
  readOptionalString,
  readRequiredString,
  validationErrorResponse,
} from "@/lib/input-validation";

interface SavedRecipeRow {
  id: string;
  source: "library" | "ai" | "user";
  recipe_slug: string | null;
  recipe_external_id: string | null;
  saved_at: string;
  title: string | null;
  description: string | null;
  image_url: string | null;
  source_label: string | null;
  recipe_snapshot: unknown;
  ingredients_snapshot: string[] | null;
  generation_id: string | null;
  source_suggestion_id: string | null;
  cooking_equipment: CookingEquipment[] | null;
}

type SavedRecipeSource = "library" | "ai";

function isSavedRecipeSource(value: string): value is SavedRecipeSource {
  return value === "library" || value === "ai";
}

function isRecipeSnapshot(value: unknown): value is Recipe {
  if (!value || typeof value !== "object") return false;
  const recipe = value as Partial<Recipe>;
  return (
    typeof recipe.id === "string" &&
    typeof recipe.title === "string" &&
    typeof recipe.description === "string" &&
    Array.isArray(recipe.ingredients) &&
    Array.isArray(recipe.steps) &&
    typeof recipe.prepMinutes === "number" &&
    typeof recipe.servings === "number" &&
    typeof recipe.sourceLabel === "string" &&
    (recipe.origin === "ai" || recipe.origin === "library" || recipe.origin === "manual")
  );
}

function readOptionalStringArray(input: Record<string, unknown>, key: string): string[] | undefined {
  const raw = input[key];
  if (!Array.isArray(raw)) return undefined;
  return raw
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean)
    .slice(0, 80);
}

function rowToSavedRecipeRef(row: SavedRecipeRow): SavedRecipeRef | null {
  if (row.source !== "library" && row.source !== "ai") return null;
  const sourceOrigin = row.source;
  const recipeId = sourceOrigin === "library" ? row.recipe_slug : row.recipe_external_id;
  if (!recipeId) return null;

  const snapshot = isRecipeSnapshot(row.recipe_snapshot) ? row.recipe_snapshot : undefined;
  const cookingEquipment = Array.isArray(row.cooking_equipment)
    ? normalizeCookingEquipment(row.cooking_equipment)
    : undefined;

  return {
    recipeId,
    sourceOrigin,
    savedAt: row.saved_at,
    title: row.title || snapshot?.title || recipeId,
    description: row.description || snapshot?.description || "",
    imageUrl: row.image_url || snapshot?.imageUrl || undefined,
    sourceLabel: row.source_label || snapshot?.sourceLabel || (sourceOrigin === "library" ? "Biblioteca" : "TemAi IA"),
    recipeSnapshot: snapshot,
    ingredientsSnapshot: row.ingredients_snapshot || snapshot?.ingredients || undefined,
    generationId: row.generation_id || undefined,
    sourceSuggestionId: row.source_suggestion_id || undefined,
    cookingEquipment,
  };
}

async function authenticateAndRateLimit(request: Request): Promise<{ userId: string } | Response> {
  const userId = await requireAuthUserId(request);
  if (!userId) {
    return NextResponse.json({ message: "Sessão expirada. Entre novamente." }, { status: 401 });
  }

  const rateLimit = await consumeAuthRateLimit({
    route: "saved-recipes",
    request,
    identifier: userId,
  });
  if (!rateLimit.allowed) return rateLimitResponse(rateLimit.retryAfterSeconds);

  return { userId };
}

export async function GET(request: Request) {
  try {
    const auth = await authenticateAndRateLimit(request);
    if (auth instanceof Response) return auth;

    const supabase = getSupabaseServiceRoleClient();
    const { data, error } = await supabase
      .from("saved_recipes")
      .select(
        "id,source,recipe_slug,recipe_external_id,saved_at,title,description,image_url,source_label,recipe_snapshot,ingredients_snapshot,generation_id,source_suggestion_id,cooking_equipment",
      )
      .eq("user_id", auth.userId)
      .order("saved_at", { ascending: false });

    if (error) {
      return NextResponse.json({ message: "Não foi possível carregar receitas salvas." }, { status: 500 });
    }

    const recipes = ((data || []) as SavedRecipeRow[])
      .map(rowToSavedRecipeRef)
      .filter((item): item is SavedRecipeRef => Boolean(item));

    return NextResponse.json({ recipes });
  } catch {
    return NextResponse.json({ message: "Não foi possível carregar receitas salvas." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await authenticateAndRateLimit(request);
    if (auth instanceof Response) return auth;

    const payload = await parseJsonObjectBody(request, {
      maxBytes: 128 * 1024,
      allowedKeys: [
        "recipeId",
        "sourceOrigin",
        "savedAt",
        "title",
        "description",
        "imageUrl",
        "sourceLabel",
        "recipeSnapshot",
        "ingredientsSnapshot",
        "generationId",
        "sourceSuggestionId",
        "cookingEquipment",
      ],
    });
    const sourceOrigin = readRequiredString(payload, "sourceOrigin", {
      fieldName: "Origem",
      minLength: 2,
      maxLength: 24,
    });
    if (!isSavedRecipeSource(sourceOrigin)) {
      return NextResponse.json({ message: "Origem da receita inválida." }, { status: 400 });
    }

    const recipeId = readRequiredString(payload, "recipeId", {
      fieldName: "Receita",
      minLength: 1,
      maxLength: 160,
    });
    const snapshot = isRecipeSnapshot(payload.recipeSnapshot) ? payload.recipeSnapshot : undefined;
    const title =
      readOptionalString(payload, "title", { fieldName: "Título", maxLength: 160 }) ||
      snapshot?.title ||
      recipeId;
    const description =
      readOptionalString(payload, "description", { fieldName: "Descrição", maxLength: 500 }) ||
      snapshot?.description ||
      "";
    const imageUrl =
      readOptionalString(payload, "imageUrl", { fieldName: "Imagem", maxLength: 2048 }) ||
      snapshot?.imageUrl ||
      null;
    const sourceLabel =
      readOptionalString(payload, "sourceLabel", { fieldName: "Fonte", maxLength: 120 }) ||
      snapshot?.sourceLabel ||
      (sourceOrigin === "library" ? "Biblioteca" : "TemAi IA");
    const ingredientsSnapshot = readOptionalStringArray(payload, "ingredientsSnapshot") || snapshot?.ingredients || [];
    const cookingEquipment = Array.isArray(payload.cookingEquipment)
      ? normalizeCookingEquipment(payload.cookingEquipment)
      : null;
    const generationId = readOptionalString(payload, "generationId", {
      fieldName: "Geração",
      maxLength: 120,
    });
    const sourceSuggestionId = readOptionalString(payload, "sourceSuggestionId", {
      fieldName: "Sugestão",
      maxLength: 160,
    });

    const supabase = getSupabaseServiceRoleClient();
    const existingQuery = supabase
      .from("saved_recipes")
      .select("id")
      .eq("user_id", auth.userId)
      .eq("source", sourceOrigin)
      .limit(1);
    const { data: existingRows, error: existingError } = await (sourceOrigin === "library"
      ? existingQuery.eq("recipe_slug", recipeId)
      : existingQuery.eq("recipe_external_id", recipeId));
    if (existingError) {
      return NextResponse.json({ message: "Não foi possível salvar receita." }, { status: 500 });
    }

    const rowPayload = {
      user_id: auth.userId,
      source: sourceOrigin,
      recipe_slug: sourceOrigin === "library" ? recipeId : null,
      recipe_external_id: sourceOrigin === "ai" ? recipeId : null,
      user_recipe_id: null,
      saved_at: new Date().toISOString(),
      title,
      description,
      image_url: imageUrl,
      source_label: sourceLabel,
      recipe_snapshot: snapshot || null,
      ingredients_snapshot: ingredientsSnapshot,
      generation_id: generationId || null,
      source_suggestion_id: sourceSuggestionId || null,
      cooking_equipment: cookingEquipment,
    };

    const existingId = Array.isArray(existingRows) && existingRows[0]?.id ? String(existingRows[0].id) : "";
    const writeQuery = existingId
      ? supabase.from("saved_recipes").update(rowPayload).eq("id", existingId)
      : supabase.from("saved_recipes").insert(rowPayload);
    const { data, error } = await writeQuery
      .select(
        "id,source,recipe_slug,recipe_external_id,saved_at,title,description,image_url,source_label,recipe_snapshot,ingredients_snapshot,generation_id,source_suggestion_id,cooking_equipment",
      )
      .single();

    if (error || !data) {
      return NextResponse.json({ message: "Não foi possível salvar receita." }, { status: 500 });
    }

    const recipe = rowToSavedRecipeRef(data as SavedRecipeRow);
    if (!recipe) {
      return NextResponse.json({ message: "Não foi possível salvar receita." }, { status: 500 });
    }
    return NextResponse.json({ recipe });
  } catch (error) {
    const validationResponse = validationErrorResponse(error);
    if (validationResponse) return validationResponse;
    return NextResponse.json({ message: "Não foi possível salvar receita." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const auth = await authenticateAndRateLimit(request);
    if (auth instanceof Response) return auth;

    const url = new URL(request.url);
    const source = (url.searchParams.get("source") || "").trim();
    const recipeId = (url.searchParams.get("recipeId") || "").trim();
    if (!isSavedRecipeSource(source) || !recipeId || recipeId.length > 160) {
      return NextResponse.json({ message: "Receita salva inválida." }, { status: 400 });
    }

    const supabase = getSupabaseServiceRoleClient();
    const deleteQuery = supabase
      .from("saved_recipes")
      .delete()
      .eq("user_id", auth.userId)
      .eq("source", source);
    const { error } = await (source === "library"
      ? deleteQuery.eq("recipe_slug", recipeId)
      : deleteQuery.eq("recipe_external_id", recipeId));

    if (error) {
      return NextResponse.json({ message: "Não foi possível remover receita salva." }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ message: "Não foi possível remover receita salva." }, { status: 500 });
  }
}
