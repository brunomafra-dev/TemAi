import { NextResponse } from "next/server";
import { slugify } from "@/lib/utils";
import { upsertImportedRecipeToSupabase } from "@/features/recipes/supabase-library";

interface PublishManualPayload {
  title?: string;
  description?: string;
  ingredients?: string[];
  steps?: string[];
  prepMinutes?: number;
  servings?: number;
  imageUrl?: string | null;
}

function inferCategory(title: string, ingredients: string[]): "principais" | "veggie" | "massas" | "kids" | "sobremesas" {
  const text = `${title} ${ingredients.join(" ")}`.toLowerCase();
  if (/(bolo|mousse|pudim|sobremesa|chocolate|brigadeiro|torta doce|doce|cookie|brownie|pave)/.test(text)) return "sobremesas";
  if (/(massa|macarrao|spaghetti|penne|lasanha|nhoque|ravioli|fettuccine|talharim)/.test(text)) return "massas";
  if (/(vegetar|vegano|salada|abobrinha|berinjela|cenoura|brocolis|grao de bico|tofu)/.test(text)) return "veggie";
  if (/(kids|infantil|lancheira|papinha|panqueca|nugget|hamburguinho)/.test(text)) return "kids";
  return "principais";
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as PublishManualPayload;

    const title = payload.title?.trim() || "";
    const description = payload.description?.trim() || "";
    const ingredients = Array.isArray(payload.ingredients) ? payload.ingredients.map((i) => i.trim()).filter(Boolean) : [];
    const steps = Array.isArray(payload.steps) ? payload.steps.map((s) => s.trim()).filter(Boolean) : [];

    if (!title || ingredients.length === 0 || steps.length === 0) {
      return NextResponse.json({ message: "Dados insuficientes para publicar receita." }, { status: 400 });
    }

    const unique = Date.now().toString(36).slice(-6);
    const slug = `manual-${slugify(title)}-${unique}`.slice(0, 120);

    await upsertImportedRecipeToSupabase({
      slug,
      title,
      description: description || "Receita autoral publicada no TemAi.",
      category: inferCategory(title, ingredients),
      ingredients,
      steps,
      prepMinutes: Math.max(5, Math.min(240, Number(payload.prepMinutes) || 20)),
      servings: Math.max(1, Math.min(20, Number(payload.servings) || 2)),
      imageUrl: payload.imageUrl || undefined,
      sourceName: "Comunidade TemAi",
      sourceUrl: `temai://manual/${slug}`,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Falha ao publicar receita." },
      { status: 500 },
    );
  }
}

