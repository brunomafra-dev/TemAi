import { NextResponse } from "next/server";
import {
  collectTudoGostosoRecipeUrls,
  importRecipeFromUrl,
} from "@/features/recipes/import-from-url";
import { upsertImportedRecipeToSupabase } from "@/features/recipes/supabase-library";
import { collectMealDbRecipesForImport } from "@/features/recipes/themealdb";

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
    const payload = (await request.json()) as ImportBatchPayload;
    const source = payload.source || "tudogostoso";
    const requestedCount = payload.count ?? 20;
    const count = Math.max(20, Math.min(50, requestedCount));
    const minRating = Math.max(0, Math.min(5, payload.minRating ?? 4.5));
    const premiumReview = payload.premiumReview ?? true;

    if (source !== "tudogostoso" && source !== "themealdb") {
      return NextResponse.json({ message: "Fonte nao suportada para importacao em lote." }, { status: 400 });
    }

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
      return NextResponse.json({ message: "Nao foi possivel localizar URLs de receitas para importar." }, { status: 500 });
    }

    const imported: Array<{ slug: string; title: string; sourceUrl: string }> = [];
    const failed: Array<{ url: string; reason: string }> = [];

    for (const url of urls) {
      try {
        const draft = await importRecipeFromUrl(url);
        if (!draft.sourceRating || draft.sourceRating < minRating) {
          failed.push({
            url,
            reason: `Rating abaixo do minimo (${minRating}) ou ausente.`,
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
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Erro na importacao em lote." },
      { status: 500 },
    );
  }
}
