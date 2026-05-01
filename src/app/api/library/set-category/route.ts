import { NextResponse } from "next/server";
import type { LibraryCategory } from "@/features/recipes/types";
import { updateRecipeCategoryInSupabase } from "@/features/recipes/supabase-library";
import {
  parseJsonObjectBody,
  readRequiredString,
  validationErrorResponse,
} from "@/lib/input-validation";
import { consumeAuthRateLimit } from "@/features/security/auth-rate-limit";
import { rateLimitResponse } from "@/features/security/auth-user";
import { requireAdminUserId } from "@/features/security/admin-guard";

interface UpdateCategoryPayload {
  recipeId?: string;
  category?: LibraryCategory;
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

export async function POST(request: Request) {
  try {
    const endpointRateLimit = await consumeAuthRateLimit({
      route: "library-set-category",
      request,
    });
    if (!endpointRateLimit.allowed) {
      return rateLimitResponse(endpointRateLimit.retryAfterSeconds);
    }

    const admin = await requireAdminUserId(request);
    if (!admin.ok) return admin.response;

    const payload = (await parseJsonObjectBody(request, {
      maxBytes: 8 * 1024,
      allowedKeys: ["recipeId", "category"],
    })) as UpdateCategoryPayload &
      Record<string, unknown>;
    const recipeId = readRequiredString(payload, "recipeId", {
      fieldName: "ID da receita",
      minLength: 3,
      maxLength: 160,
      pattern: /^[a-z0-9._-]+$/i,
    });
    const categoryRaw = readRequiredString(payload, "category", {
      fieldName: "Categoria",
      minLength: 3,
      maxLength: 20,
      lowercase: true,
      pattern: /^[a-z_]+$/,
    });
    if (!allowedCategories.has(categoryRaw as LibraryCategory)) {
      return NextResponse.json({ message: "Categoria inválida." }, { status: 400 });
    }
    const category = categoryRaw as LibraryCategory;

    const recipe = await updateRecipeCategoryInSupabase(recipeId, category);
    return NextResponse.json({ recipe, source: "supabase" });
  } catch (error) {
    const validationResponse = validationErrorResponse(error);
    if (validationResponse) return validationResponse;

    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Falha ao atualizar categoria da receita.",
      },
      { status: 500 },
    );
  }
}
