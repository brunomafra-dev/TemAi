import { NextResponse } from "next/server";
import { slugify } from "@/lib/utils";
import {
  refreshAuthorBadgesInSupabase,
  upsertImportedRecipeToSupabase,
} from "@/features/recipes/supabase-library";
import type { LibraryCategory } from "@/features/recipes/types";
import {
  InputValidationError,
  parseJsonObjectBody,
  readOptionalEnum,
  readOptionalNumber,
  readOptionalString,
  readRequiredString,
  readStringArray,
  validationErrorResponse,
} from "@/lib/input-validation";
import { consumeAuthRateLimit } from "@/features/security/auth-rate-limit";
import { rateLimitResponse, requireAuthUserId } from "@/features/security/auth-user";
import { serverEnv } from "@/lib/env-server";

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
  const mode = serverEnv.communityPublishMode();
  if (mode !== "premium") return true;

  const allowed = serverEnv.communityPremiumAuthors()
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => normalizeAuthorHandle(item));

  return allowed.includes(authorHandle);
}

export async function POST(request: Request) {
  try {
    const endpointRateLimit = await consumeAuthRateLimit({
      route: "library-publish-manual",
      request,
    });
    if (!endpointRateLimit.allowed) {
      return rateLimitResponse(endpointRateLimit.retryAfterSeconds);
    }

    const userId = await requireAuthUserId(request);
    if (!userId) {
      return NextResponse.json({ message: "Sessão obrigatória." }, { status: 401 });
    }

    const payload = (await parseJsonObjectBody(request, {
      maxBytes: 96 * 1024,
      allowedKeys: [
        "title",
        "description",
        "ingredients",
        "steps",
        "prepMinutes",
        "servings",
        "imageUrl",
        "category",
        "authorName",
      ],
    })) as PublishManualPayload &
      Record<string, unknown>;

    const title = readRequiredString(payload, "title", {
      fieldName: "Título",
      minLength: 3,
      maxLength: 160,
    });
    const description =
      readOptionalString(payload, "description", {
        fieldName: "Descrição",
        maxLength: 5000,
      }) || "";
    const ingredients = readStringArray(payload, "ingredients", {
      fieldName: "Ingredientes",
      maxItems: 120,
      itemMaxLength: 160,
      minItems: 1,
    });
    const steps = readStringArray(payload, "steps", {
      fieldName: "Modo de preparo",
      maxItems: 120,
      itemMaxLength: 800,
      minItems: 1,
    });
    const category = readOptionalEnum(
      payload,
      "category",
      [...allowedCategories] as LibraryCategory[],
      "principais",
      "Categoria",
    );
    const authorName =
      readOptionalString(payload, "authorName", {
        fieldName: "Autor",
        maxLength: 80,
      }) || "Usuario TemAi";
    const authorHandle = normalizeAuthorHandle(authorName);
    const prepMinutes = readOptionalNumber(payload, "prepMinutes", {
      fieldName: "Tempo de preparo",
      min: 5,
      max: 240,
      integer: true,
      defaultValue: 20,
    });
    const servings = readOptionalNumber(payload, "servings", {
      fieldName: "Porções",
      min: 1,
      max: 20,
      integer: true,
      defaultValue: 2,
    });
    const imageUrl = readOptionalString(payload, "imageUrl", {
      fieldName: "Imagem",
      maxLength: 1000,
    });
    if (imageUrl) {
      let parsedImageUrl: URL;
      try {
        parsedImageUrl = new URL(imageUrl);
      } catch {
        throw new InputValidationError("URL da imagem malformada.");
      }
      if (!["http:", "https:"].includes(parsedImageUrl.protocol)) {
        throw new InputValidationError("URL da imagem inválida.");
      }
    }

    if (!isPremiumAllowed(authorHandle)) {
      return NextResponse.json(
        {
          message:
            "Publicação na biblioteca disponível apenas para premium no momento.",
        },
        { status: 403 },
      );
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
      prepMinutes,
      servings,
      imageUrl: imageUrl || undefined,
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
    const validationResponse = validationErrorResponse(error);
    if (validationResponse) return validationResponse;
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Falha ao publicar receita." },
      { status: 500 },
    );
  }
}
