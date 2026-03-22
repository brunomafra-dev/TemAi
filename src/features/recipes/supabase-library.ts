import type { Recipe } from "@/features/recipes/types";
import type { ImportedRecipeDraft } from "@/features/recipes/import-from-url";

interface SupabaseRecipeRow {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: string;
  ingredients: string[];
  steps: string[];
  prep_minutes: number;
  servings: number;
  image_url: string | null;
  source_name: string;
}

export interface PagedRecipeResult {
  recipes: Recipe[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

function decodeHtmlEntities(value: string): string {
  let decoded = value;
  for (let i = 0; i < 3; i += 1) {
    const next = decoded
      .replace(/&amp;/gi, "&")
      .replace(/&nbsp;/gi, " ")
      .replace(/&deg;/gi, "°")
      .replace(/&ordm;/gi, "º")
      .replace(/&ordf;/gi, "ª")
      .replace(/&frac12;/gi, "1/2")
      .replace(/&frac14;/gi, "1/4")
      .replace(/&frac34;/gi, "3/4")
      .replace(/&quot;/gi, '"')
      .replace(/&#39;|&apos;/gi, "'")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
      .replace(/&#x([\da-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
      .replace(/&aacute;/gi, "á")
      .replace(/&agrave;/gi, "à")
      .replace(/&acirc;/gi, "â")
      .replace(/&atilde;/gi, "ã")
      .replace(/&eacute;/gi, "é")
      .replace(/&ecirc;/gi, "ê")
      .replace(/&iacute;/gi, "í")
      .replace(/&oacute;/gi, "ó")
      .replace(/&ocirc;/gi, "ô")
      .replace(/&otilde;/gi, "õ")
      .replace(/&uacute;/gi, "ú")
      .replace(/&ccedil;/gi, "ç")
      .replace(/&Aacute;/gi, "Á")
      .replace(/&Agrave;/gi, "À")
      .replace(/&Acirc;/gi, "Â")
      .replace(/&Atilde;/gi, "Ã")
      .replace(/&Eacute;/gi, "É")
      .replace(/&Ecirc;/gi, "Ê")
      .replace(/&Iacute;/gi, "Í")
      .replace(/&Oacute;/gi, "Ó")
      .replace(/&Ocirc;/gi, "Ô")
      .replace(/&Otilde;/gi, "Õ")
      .replace(/&Uacute;/gi, "Ú")
      .replace(/&Ccedil;/gi, "Ç")
      .replace(/\s+/g, " ")
      .trim();
    if (next === decoded) break;
    decoded = next;
  }
  return decoded;
}

function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  return { url, key };
}

function canUseSupabase(): boolean {
  const { url, key } = getSupabaseEnv();
  return Boolean(url && key);
}

function mapRowToRecipe(row: SupabaseRecipeRow): Recipe {
  return {
    id: row.slug,
    title: decodeHtmlEntities(row.title || ""),
    description: decodeHtmlEntities(row.description || ""),
    category: row.category,
    ingredients: (row.ingredients || []).map((item) => decodeHtmlEntities(item)),
    steps: (row.steps || []).map((item) => decodeHtmlEntities(item)),
    prepMinutes: row.prep_minutes || 30,
    servings: row.servings || 2,
    imageUrl: row.image_url || undefined,
    sourceLabel: row.source_name || "TemAi Curadoria",
    origin: "library",
  };
}

function hasAnimalProtein(text: string): boolean {
  return /(carne bovina|carne suina|frango|peixe|camarao|atum|salmao|bacalhau|linguica|presunto|bacon|chicken|beef|pork|fish|shrimp|tuna|salmon|ham|sausage|meat|seafood)/i.test(
    text,
  );
}

async function supabaseFetch(pathAndQuery: string, withCount = false) {
  const { url, key } = getSupabaseEnv();
  if (!url || !key) {
    throw new Error("Supabase nao configurado.");
  }

  const response = await fetch(`${url}/rest/v1/${pathAndQuery}`, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      ...(withCount ? { Prefer: "count=exact" } : {}),
    },
    next: { revalidate: 60 * 5 },
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Falha ao consultar Supabase: ${message}`);
  }

  return response;
}

function parseTotalFromContentRange(value: string | null): number {
  if (!value) return 0;
  const parts = value.split("/");
  if (parts.length !== 2) return 0;
  const total = Number(parts[1]);
  return Number.isFinite(total) ? total : 0;
}

function sanitizePage(value?: number): number {
  if (!value || !Number.isFinite(value)) return 1;
  return Math.max(1, Math.floor(value));
}

function sanitizePageSize(value?: number): number {
  if (!value || !Number.isFinite(value)) return 12;
  return Math.max(6, Math.min(24, Math.floor(value)));
}

export async function searchRecipesFromSupabase(params: {
  query?: string;
  category?: string;
  page?: number;
  pageSize?: number;
}): Promise<PagedRecipeResult> {
  const page = sanitizePage(params.page);
  const pageSize = sanitizePageSize(params.pageSize);

  if (!canUseSupabase()) {
    return { recipes: [], total: 0, page, pageSize, totalPages: 1 };
  }

  const search = params.query?.trim();
  const category = params.category?.trim();
  const offset = (page - 1) * pageSize;

  let query =
    "recipes_br?select=id,slug,title,description,category,ingredients,steps,prep_minutes,servings,image_url,source_name&is_published=eq.true";

  if (category && category !== "todas") {
    query += `&category=eq.${encodeURIComponent(category)}`;
  }
  if (search) {
    const encoded = encodeURIComponent(`%${search}%`);
    query += `&or=(title.ilike.${encoded},description.ilike.${encoded})`;
  }

  query += `&order=created_at.desc&limit=${pageSize}&offset=${offset}`;

  const response = await supabaseFetch(query, true);
  const rows = (await response.json()) as SupabaseRecipeRow[];
  const mapped = rows.map(mapRowToRecipe);
  const safe =
    category === "veggie"
      ? mapped.filter((recipe) => !hasAnimalProtein(`${recipe.title} ${recipe.description} ${recipe.ingredients.join(" ")}`))
      : mapped;
  const total = parseTotalFromContentRange(response.headers.get("content-range"));
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return {
    recipes: safe,
    total,
    page: Math.min(page, totalPages),
    pageSize,
    totalPages,
  };
}

export async function getRecipeBySlugFromSupabase(slug: string): Promise<Recipe | null> {
  if (!canUseSupabase()) {
    return null;
  }

  const response = await supabaseFetch(
    `recipes_br?select=id,slug,title,description,category,ingredients,steps,prep_minutes,servings,image_url,source_name&slug=eq.${encodeURIComponent(slug)}&is_published=eq.true&limit=1`,
  );
  const rows = (await response.json()) as SupabaseRecipeRow[];
  if (!rows.length) return null;
  return mapRowToRecipe(rows[0]);
}

export async function getPopularRecipesFromSupabase(limit = 8): Promise<Array<{ recipe: Recipe; rating: number }>> {
  if (!canUseSupabase()) {
    return [];
  }

  const safeLimit = Math.max(4, Math.min(20, Math.floor(limit)));
  const response = await supabaseFetch(
    `recipes_br?select=id,slug,title,description,category,ingredients,steps,prep_minutes,servings,image_url,source_name&is_published=eq.true&order=created_at.desc&limit=${safeLimit}`,
  );
  const rows = (await response.json()) as SupabaseRecipeRow[];
  return rows.map((row, index) => ({
    recipe: mapRowToRecipe(row),
    rating: Math.max(4.2, 4.9 - index * 0.08),
  }));
}

export async function upsertImportedRecipeToSupabase(recipe: ImportedRecipeDraft): Promise<Recipe> {
  const { url, key } = getSupabaseEnv();
  if (!url || !key) {
    throw new Error("Supabase nao configurado.");
  }

  const payload = {
    slug: recipe.slug,
    title: recipe.title,
    description: recipe.description,
    category: recipe.category,
    ingredients: recipe.ingredients,
    steps: recipe.steps,
    prep_minutes: recipe.prepMinutes,
    servings: recipe.servings,
    image_url: recipe.imageUrl || null,
    source_name: recipe.sourceName,
    source_url: recipe.sourceUrl,
    is_published: true,
  };

  const response = await fetch(`${url}/rest/v1/recipes_br?on_conflict=slug`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=representation",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Falha ao salvar receita importada no Supabase: ${errorText}`);
  }

  const rows = (await response.json()) as SupabaseRecipeRow[];
  if (!rows.length) {
    throw new Error("Nenhuma receita retornada apos salvar.");
  }

  return mapRowToRecipe(rows[0]);
}
