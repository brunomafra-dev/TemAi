import { NextResponse } from "next/server";
import { importRecipeFromUrl } from "@/features/recipes/import-from-url";
import { upsertImportedRecipeToSupabase } from "@/features/recipes/supabase-library";
import {
  InputValidationError,
  parseJsonObjectBody,
  readRequiredString,
  validationErrorResponse,
} from "@/lib/input-validation";
import { consumeAuthRateLimit } from "@/features/security/auth-rate-limit";
import { rateLimitResponse } from "@/features/security/auth-user";
import { requireAdminUserId } from "@/features/security/admin-guard";
import { assertSafeExternalHttpUrl } from "@/features/security/url-guard";

interface ImportPayload {
  url?: string;
}

export async function POST(request: Request) {
  try {
    const endpointRateLimit = await consumeAuthRateLimit({
      route: "library-import-url",
      request,
    });
    if (!endpointRateLimit.allowed) {
      return rateLimitResponse(endpointRateLimit.retryAfterSeconds);
    }

    const admin = await requireAdminUserId(request);
    if (!admin.ok) return admin.response;

    const payload = (await parseJsonObjectBody(request, {
      maxBytes: 8 * 1024,
      allowedKeys: ["url"],
    })) as ImportPayload &
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
    await assertSafeExternalHttpUrl(parsed);

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
