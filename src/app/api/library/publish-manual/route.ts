import { NextResponse } from "next/server";
import { createUserNotification } from "@/features/community/notifications";
import { moderateRecipePublication } from "@/features/community/moderation";
import {
  refreshAuthorBadgesInSupabase,
  upsertImportedRecipeToSupabase,
} from "@/features/recipes/supabase-library";
import { getAiEntitlement } from "@/features/security/ai-usage";
import { consumeAuthRateLimit } from "@/features/security/auth-rate-limit";
import { rateLimitResponse, requireAuthUserId } from "@/features/security/auth-user";
import type { LibraryCategory } from "@/features/recipes/types";
import { getSupabaseServiceRoleClient } from "@/lib/supabase-admin";
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
import { slugify } from "@/lib/utils";

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
  return (
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 40) || "usuario_temai"
  );
}

function isSupportedImageReference(value: string): boolean {
  if (/^data:image\/[a-z0-9.+-]+;base64,/i.test(value)) return true;
  try {
    const parsedImageUrl = new URL(value);
    return ["http:", "https:"].includes(parsedImageUrl.protocol);
  } catch {
    return false;
  }
}

async function getAuthorProfile(userId: string): Promise<{
  authorName: string;
  authorHandle: string;
}> {
  const supabase = getSupabaseServiceRoleClient();
  const { data } = await supabase
    .from("profiles")
    .select("first_name,last_name,username")
    .eq("id", userId)
    .maybeSingle();

  const firstName = typeof data?.first_name === "string" ? data.first_name.trim() : "";
  const lastName = typeof data?.last_name === "string" ? data.last_name.trim() : "";
  const username = typeof data?.username === "string" ? data.username.trim() : "";
  const fullName = [firstName, lastName].filter(Boolean).join(" ");

  return {
    authorName: fullName || "Usuário TemAi",
    authorHandle: normalizeAuthorHandle(username || fullName || userId.slice(0, 8)),
  };
}

export async function POST(request: Request) {
  try {
    const userId = await requireAuthUserId(request);
    if (!userId) {
      return NextResponse.json({ message: "Sessão obrigatória." }, { status: 401 });
    }

    const endpointRateLimit = await consumeAuthRateLimit({
      route: "library-publish-manual",
      request,
      identifier: userId,
    });
    if (!endpointRateLimit.allowed) {
      return rateLimitResponse(endpointRateLimit.retryAfterSeconds);
    }

    const payload = (await parseJsonObjectBody(request, {
      maxBytes: 180 * 1024,
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
    })) as PublishManualPayload & Record<string, unknown>;

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
    const fallbackAuthorName =
      readOptionalString(payload, "authorName", {
        fieldName: "Autor",
        maxLength: 80,
      }) || "Usuário TemAi";
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
      maxLength: 120 * 1024,
    });

    if (imageUrl && !isSupportedImageReference(imageUrl)) {
      throw new InputValidationError("Imagem inválida.");
    }

    const entitlement = await getAiEntitlement(userId);
    if (!entitlement.isPremium) {
      return NextResponse.json(
        { message: "Publicação na Biblioteca disponível apenas para usuários Premium." },
        { status: 403 },
      );
    }

    const profile = await getAuthorProfile(userId);
    const authorHandle = profile.authorHandle || normalizeAuthorHandle(fallbackAuthorName);
    const moderation = await moderateRecipePublication({
      title,
      description,
      ingredients,
      steps,
      imageUrl: imageUrl || null,
    });
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
      isPublished: moderation.allowed,
      authorUserId: userId,
      moderationStatus: moderation.status,
      moderationReason: moderation.reason || undefined,
      moderationResult: moderation.result,
      moderatedAt: new Date().toISOString(),
    });

    if (!moderation.allowed) {
      await createUserNotification({
        userId,
        type: moderation.status === "review" ? "recipe_review" : "recipe_blocked",
        title: moderation.status === "review" ? "Receita em análise" : "Receita não publicada",
        body:
          moderation.status === "review"
            ? "Sua receita ficou em análise para proteger a comunidade."
            : "Sua receita foi bloqueada pela moderação e não apareceu na Biblioteca.",
        metadata: { slug, reason: moderation.reason, moderationStatus: moderation.status },
      }).catch(() => undefined);

      return NextResponse.json(
        {
          ok: false,
          status: moderation.status,
          message:
            moderation.status === "review"
              ? "Receita enviada para análise e ainda não aparece na Biblioteca."
              : "Receita bloqueada pela moderação.",
          reason: moderation.reason,
        },
        { status: 422 },
      );
    }

    await createUserNotification({
      userId,
      type: "recipe_published",
      title: "Receita publicada",
      body: `${title} já está na Biblioteca.`,
      href: `/receita/${slug}?origin=library`,
      metadata: { slug },
    }).catch(() => undefined);

    try {
      await refreshAuthorBadgesInSupabase(authorHandle);
    } catch {
      // A publicação não deve falhar se a atualização de insígnias atrasar.
    }

    return NextResponse.json({ ok: true, slug });
  } catch (error) {
    const validationResponse = validationErrorResponse(error);
    if (validationResponse) return validationResponse;
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Falha ao publicar receita." },
      { status: 500 },
    );
  }
}
