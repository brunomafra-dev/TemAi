import { NextResponse } from "next/server";
import { importRecipeFromUrl } from "@/features/recipes/import-from-url";
import { upsertImportedRecipeToSupabase } from "@/features/recipes/supabase-library";

interface ImportPayload {
  url?: string;
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as ImportPayload;
    const url = payload.url?.trim();

    if (!url) {
      return NextResponse.json({ message: "Informe uma URL para importar." }, { status: 400 });
    }

    const draft = await importRecipeFromUrl(url);
    const recipe = await upsertImportedRecipeToSupabase(draft);

    return NextResponse.json({ recipe, source: "import-url" });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Falha ao importar receita por URL." },
      { status: 500 },
    );
  }
}
