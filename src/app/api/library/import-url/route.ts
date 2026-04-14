import { NextResponse } from "next/server";
import { importRecipeFromUrl } from "@/features/recipes/import-from-url";
import { upsertImportedRecipeToSupabase } from "@/features/recipes/supabase-library";
import {
  InputValidationError,
  parseJsonObjectBody,
  readRequiredString,
  validationErrorResponse,
} from "@/lib/input-validation";

interface ImportPayload {
  url?: string;
}

export async function POST(request: Request) {
  try {
    const payload = (await parseJsonObjectBody(request, { maxBytes: 8 * 1024 })) as ImportPayload &
      Record<string, unknown>;
    const url = readRequiredString(payload, "url", {
      fieldName: "URL",
      minLength: 8,
      maxLength: 500,
    });

    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      throw new InputValidationError("URL malformada.");
    }
    if (!["http:", "https:"].includes(parsed.protocol)) {
      throw new InputValidationError("URL invalida.");
    }

    const draft = await importRecipeFromUrl(parsed.toString());
    const recipe = await upsertImportedRecipeToSupabase(draft);

    return NextResponse.json({ recipe, source: "import-url" });
  } catch (error) {
    const validationResponse = validationErrorResponse(error);
    if (validationResponse) return validationResponse;
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Falha ao importar receita por URL." },
      { status: 500 },
    );
  }
}
