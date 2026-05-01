import { NextResponse } from "next/server";
import {
  collectTudoGostosoRecipeUrls,
  importRecipeFromUrl,
} from "@/features/recipes/import-from-url";
import { upsertImportedRecipeToSupabase } from "@/features/recipes/supabase-library";
import { collectMealDbRecipesForImport } from "@/features/recipes/themealdb";
import {
  parseJsonObjectBody,
  readOptionalBoolean,
  readOptionalEnum,
  readOptionalNumber,
  validationErrorResponse,
} from "@/lib/input-validation";
import { consumeAuthRateLimit } from "@/features/security/auth-rate-limit";
import { rateLimitResponse } from "@/features/security/auth-user";
import { requireAdminUserId } from "@/features/security/admin-guard";

interface ImportBatchPayload {
  source?: "tudogostoso" | "themealdb";
  count?: number;
  minRating?: number;
  premiumReview?: boolean;
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function POST(request: Request) {
  try {
    const endpointRateLimit = await consumeAuthRateLimit({
      route: "library-import-batch",
      request,
    });
    if (!endpointRateLimit.allowed) {
      return rateLimitResponse(endpointRateLimit.retryAfterSeconds);
    }

    const admin = await requireAdminUserId(request);
    if (!admin.ok) return admin.response;

    const payload = (await parseJsonObjectBody(request, {
      maxBytes: 8 * 1024,
      allowedKeys: ["source", "count", "minRating", "premiumReview"],
    })) as ImportBatchPayload &
      Record<string, unknown>;
    const source = readOptionalEnum(payload, "source", ["tudogostoso", "themealdb"] as const, "tudogostoso", "Fonte");
    const requestedCount = readOptionalNumber(payload, "count", {
      fieldName: "Quantidade",
      min: 1,
      max: 500,
      integer: true,
      defaultValue: 20,
    });
    const count = Math.max(20, Math.min(50, requestedCount));
    const minRating = Math.max(
      0,
      Math.min(
        5,
        readOptionalNumber(payload, "minRating", {
          fieldName: "Nota mínima",
          min: 0,
          max: 5,
          integer: false,
          defaultValue: 4.5,
        }),
      ),
    );
    const premiumReview = readOptionalBoolean(payload, "premiumReview", true);

    if (source === "themealdb") {
      const drafts = await collectMealDbRecipesForImport(count, { premiumReview });
      const imported: Array<{ slug: string; title: string; sourceUrl: string }> = [];
      const failed: Array<{ url: string; reason: string }> = [];

      for (const draft of drafts) {
        try {
          const recipe = await upsertImportedRecipeToSupabase(draft);
          imported.push({
            slug: recipe.id,
            title: recipe.title,
            sourceUrl: draft.sourceUrl,
          });
        } catch (error) {
          failed.push({
            url: draft.sourceUrl,
            reason: error instanceof Error ? error.message : "Falha desconhecida.",
          });
        }
        await delay(180);
      }

      return NextResponse.json({
        source,
        requested: count,
        premiumReview,
        importedCount: imported.length,
        failedCount: failed.length,
        imported,
        failed: failed.slice(0, 20),
      });
    }

    const urls = await collectTudoGostosoRecipeUrls(count * 6);
    if (!urls.length) {
      return NextResponse.json({ message: "Não foi possível localizar URLs de receitas para importar." }, { status: 500 });
    }

    const imported: Array<{ slug: string; title: string; sourceUrl: string }> = [];
    const failed: Array<{ url: string; reason: string }> = [];

    for (const url of urls) {
      try {
        const draft = await importRecipeFromUrl(url);
        if (!draft.sourceRating || draft.sourceRating < minRating) {
          failed.push({
            url,
            reason: `Rating abaixo do mínimo (${minRating}) ou ausente.`,
          });
          continue;
        }

        const recipe = await upsertImportedRecipeToSupabase(draft);
        imported.push({
          slug: recipe.id,
          title: recipe.title,
          sourceUrl: url,
        });
      } catch (error) {
        failed.push({
          url,
          reason: error instanceof Error ? error.message : "Falha desconhecida.",
        });
      }

      await delay(220);
      if (imported.length >= count) {
        break;
      }
    }

    return NextResponse.json({
      source,
      requested: count,
      minRating,
      importedCount: imported.length,
      failedCount: failed.length,
      imported,
      failed: failed.slice(0, 20),
    });
  } catch (error) {
    const validationResponse = validationErrorResponse(error);
    if (validationResponse) return validationResponse;
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Erro na importação em lote." },
      { status: 500 },
    );
  }
}
