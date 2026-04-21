import { NextResponse } from "next/server";
import { generateRecipeSuggestions } from "@/features/recipes/ai-generator";
import { parseIngredientsText } from "@/features/recipes/helpers";
import type { InputMode } from "@/features/recipes/types";
import { getSupabaseServiceRoleClient } from "@/lib/supabase-admin";
import {
  parseJsonObjectBody,
  readRequiredString,
  validationErrorResponse,
} from "@/lib/input-validation";

interface SuggestionsPayload {
  ingredientsText?: string;
  inputMode?: InputMode;
}

function startOfCurrentMonthIso(): string {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
  return start.toISOString();
}

async function resolveUserAndPlan(authorizationHeader: string | null): Promise<{
  userId: string | null;
  isPremium: boolean;
}> {
  if (!authorizationHeader?.startsWith("Bearer ")) {
    return { userId: null, isPremium: false };
  }

  const token = authorizationHeader.slice(7).trim();
  if (!token) return { userId: null, isPremium: false };

  try {
    const supabase = getSupabaseServiceRoleClient();
    const userRes = await supabase.auth.getUser(token);
    const userId = userRes.data.user?.id || null;
    if (!userId) return { userId: null, isPremium: false };

    const subRes = await supabase
      .from("user_subscriptions")
      .select("plan,status")
      .eq("user_id", userId)
      .maybeSingle();

    const isPremium = Boolean(
      subRes.data && subRes.data.plan === "premium" && subRes.data.status === "active",
    );

    return { userId, isPremium };
  } catch {
    return { userId: null, isPremium: false };
  }
}

export async function POST(request: Request) {
  try {
    const payload = (await parseJsonObjectBody(request, { maxBytes: 12 * 1024 })) as SuggestionsPayload &
      Record<string, unknown>;
    const ingredientsText = readRequiredString(payload, "ingredientsText", {
      fieldName: "Ingredientes",
      minLength: 1,
      maxLength: 4000,
    });
    const inputModeRaw = readRequiredString(payload, "inputMode", {
      fieldName: "Modo de entrada",
      minLength: 4,
      maxLength: 10,
      pattern: /^(text|audio|photo)$/i,
    }).toLowerCase();
    const inputMode = inputModeRaw as InputMode;

    const { userId, isPremium } = await resolveUserAndPlan(request.headers.get("authorization"));

    if (!isPremium && inputMode !== "text") {
      return NextResponse.json(
        { message: "Plano free permite IA apenas por texto." },
        { status: 403 },
      );
    }

    if (!isPremium && userId) {
      const supabase = getSupabaseServiceRoleClient();
      const monthStartIso = startOfCurrentMonthIso();
      const countRes = await supabase
        .from("ai_generation_logs")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte("created_at", monthStartIso);

      const count = countRes.count || 0;
      if (count >= 3) {
        return NextResponse.json(
          { message: "Plano free atingiu o limite de 3 geracoes de IA neste mes." },
          { status: 429 },
        );
      }
    }

    const ingredients = parseIngredientsText(ingredientsText);
    if (!ingredients.length) {
      return NextResponse.json({ message: "Nao foi possivel identificar ingredientes validos." }, { status: 400 });
    }

    const response = generateRecipeSuggestions(ingredients);

    if (userId) {
      try {
        const supabase = getSupabaseServiceRoleClient();
        await supabase.from("ai_generation_logs").insert({
          user_id: userId,
          input_mode: inputMode,
          ingredients_text: ingredientsText,
          normalized_ingredients: response.normalizedIngredients,
          suggestions: response.suggestions,
        });
      } catch {
        // non-blocking log persistence
      }
    }

    return NextResponse.json(response);
  } catch (error) {
    const validationResponse = validationErrorResponse(error);
    if (validationResponse) return validationResponse;
    return NextResponse.json({ message: "Erro ao gerar sugestoes." }, { status: 500 });
  }
}
