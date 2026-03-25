import { NextResponse } from "next/server";
import { slugify } from "@/lib/utils";
import {
  refreshAuthorBadgesInSupabase,
  upsertImportedRecipeToSupabase,
} from "@/features/recipes/supabase-library";
import type { LibraryCategory } from "@/features/recipes/types";

interface PublishManualPayload {
  title?: string;
  description?: string;
  ingredients?: string[];
  steps?: string[];
  prepMinutes?: number;
  servings?: number;
  imageUrl?: string | null;
  category?: LibraryCategory;
  authorName?: string;
}

const allowedCategories = new Set<LibraryCategory>([
  "principais",
  "veggie",
  "massas",
  "kids",
  "sobremesas",
  "bebidas",
  "lanches",
]);

function normalizeAuthorHandle(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40) || "usuario_temai";
}

function isPremiumAllowed(authorHandle: string): boolean {
  const mode = (process.env.COMMUNITY_PUBLISH_MODE || "open").trim().toLowerCase();
  if (mode !== "premium") return true;

  const allowed = (process.env.COMMUNITY_PREMIUM_AUTHORS || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => normalizeAuthorHandle(item));

  return allowed.includes(authorHandle);
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as PublishManualPayload;

    const title = payload.title?.trim() || "";
    const description = payload.description?.trim() || "";
    const ingredients = Array.isArray(payload.ingredients) ? payload.ingredients.map((i) => i.trim()).filter(Boolean) : [];
    const steps = Array.isArray(payload.steps) ? payload.steps.map((s) => s.trim()).filter(Boolean) : [];
    const category = payload.category && allowedCategories.has(payload.category) ? payload.category : "principais";
    const authorName = payload.authorName?.trim() || "Usuario TemAi";
    const authorHandle = normalizeAuthorHandle(authorName);

    if (!isPremiumAllowed(authorHandle)) {
      return NextResponse.json(
        {
          message:
            "Publicacao na biblioteca disponivel apenas para premium no momento.",
        },
        { status: 403 },
      );
    }

    if (!title || ingredients.length === 0 || steps.length === 0) {
      return NextResponse.json({ message: "Dados insuficientes para publicar receita." }, { status: 400 });
    }

    const unique = Date.now().toString(36).slice(-6);
    const slug = `manual-${slugify(title)}-${unique}`.slice(0, 120);

    await upsertImportedRecipeToSupabase({
      slug,
      title,
      description: description || "Receita autoral publicada no TemAi.",
      category,
      ingredients,
      steps,
      prepMinutes: Math.max(5, Math.min(240, Number(payload.prepMinutes) || 20)),
      servings: Math.max(1, Math.min(20, Number(payload.servings) || 2)),
      imageUrl: payload.imageUrl || undefined,
      sourceName: `@${authorHandle}`,
      sourceUrl: `temai://community/${slug}`,
    });

    try {
      await refreshAuthorBadgesInSupabase(authorHandle);
    } catch {
      // non-blocking: recipe publish should succeed even if badge refresh fails
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Falha ao publicar receita." },
      { status: 500 },
    );
  }
}
