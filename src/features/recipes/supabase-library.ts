import type { LibraryCategory, Recipe } from "@/features/recipes/types";
import type { ImportedRecipeDraft } from "@/features/recipes/import-from-url";
import { serverEnv } from "@/lib/env-server";

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
  created_at?: string;
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

export interface PagedRecipeResult {
  recipes: Recipe[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

function decodeHtmlEntities(value: string): string {
  let decoded = value;
  const named: Record<string, string> = {
    "&aacute;": "\u00E1",
    "&agrave;": "\u00E0",
    "&acirc;": "\u00E2",
    "&atilde;": "\u00E3",
    "&eacute;": "\u00E9",
    "&ecirc;": "\u00EA",
    "&iacute;": "\u00ED",
    "&oacute;": "\u00F3",
    "&ocirc;": "\u00F4",
    "&otilde;": "\u00F5",
    "&uacute;": "\u00FA",
    "&ccedil;": "\u00E7",
    "&Aacute;": "\u00C1",
    "&Agrave;": "\u00C0",
    "&Acirc;": "\u00C2",
    "&Atilde;": "\u00C3",
    "&Eacute;": "\u00C9",
    "&Ecirc;": "\u00CA",
    "&Iacute;": "\u00CD",
    "&Oacute;": "\u00D3",
    "&Ocirc;": "\u00D4",
    "&Otilde;": "\u00D5",
    "&Uacute;": "\u00DA",
    "&Ccedil;": "\u00C7"
  };

  for (let i = 0; i < 3; i += 1) {
    const next = decoded
      .replace(/&amp;/gi, "&")
      .replace(/&nbsp;/gi, " ")
      .replace(/&deg;/gi, "\u00B0")
      .replace(/&ordm;/gi, "\u00BA")
      .replace(/&ordf;/gi, "\u00AA")
      .replace(/&frac12;/gi, "1/2")
      .replace(/&frac14;/gi, "1/4")
      .replace(/&frac34;/gi, "3/4")
      .replace(/&quot;/gi, '"')
      .replace(/&#39;|&apos;/gi, "'")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
      .replace(/&#x([\da-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
      .replace(/&([a-z]+);/gi, (entity) => named[entity] || entity)
      .replace(/\s+/g, " ")
      .trim();
    if (next === decoded) break;
    decoded = next;
  }

  return decoded;
}

function getSupabaseEnv() {
  try {
    let key = "";
    try {
      key = serverEnv.supabaseServiceRoleKey();
    } catch {
      key = serverEnv.supabaseAnonKey();
    }

    return {
      url: serverEnv.supabaseUrl(),
      key,
    };
  } catch {
    return { url: "", key: "" };
  }
}

function canUseSupabase(): boolean {
  const { url, key } = getSupabaseEnv();
  return Boolean(url && key);
}

function mapRowToRecipe(row: SupabaseRecipeRow): Recipe {
  const category = allowedCategories.has(row.category as LibraryCategory)
    ? (row.category as LibraryCategory)
    : undefined;

  return {
    id: row.slug,
    title: decodeHtmlEntities(row.title || ""),
    description: decodeHtmlEntities(row.description || ""),
    category,
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
  seed?: string;
}): Promise<PagedRecipeResult> {
  const page = sanitizePage(params.page);
  const pageSize = sanitizePageSize(params.pageSize);

  if (!canUseSupabase()) {
    return { recipes: [], total: 0, page, pageSize, totalPages: 1 };
  }

  const search = params.query?.trim();
  const category = params.category?.trim();
  const seed = params.seed?.trim() || "default-seed";
  let query =
    "recipes_br?select=id,slug,title,description,category,ingredients,steps,prep_minutes,servings,image_url,source_name&is_published=eq.true";

  if (category && category !== "todas") {
    query += `&category=eq.${encodeURIComponent(category)}`;
  }
  if (search) {
    const encoded = encodeURIComponent(`%${search}%`);
    query += `&or=(title.ilike.${encoded},description.ilike.${encoded})`;
  }

  query += "&limit=5000";

  const response = await supabaseFetch(query);
  const rows = (await response.json()) as SupabaseRecipeRow[];
  const mapped = rows.map(mapRowToRecipe);
  const safe =
    category === "veggie"
      ? mapped.filter((recipe) => !hasAnimalProtein(`${recipe.title} ${recipe.description} ${recipe.ingredients.join(" ")}`))
      : mapped;

  const ranked = safe
    .map((recipe) => ({
      recipe,
      rank: hashString(`${seed}:${recipe.id}`),
    }))
    .sort((a, b) => a.rank - b.rank || a.recipe.id.localeCompare(b.recipe.id))
    .map((entry) => entry.recipe);

  const total = ranked.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const safeOffset = (safePage - 1) * pageSize;
  const paged = ranked.slice(safeOffset, safeOffset + pageSize);

  return {
    recipes: paged,
    total,
    page: safePage,
    pageSize,
    totalPages,
  };
}

function hashString(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash +=
      (hash << 1) +
      (hash << 4) +
      (hash << 7) +
      (hash << 8) +
      (hash << 24);
  }
  return hash >>> 0;
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
  const categories: LibraryCategory[] = [
    "principais",
    "veggie",
    "massas",
    "kids",
    "sobremesas",
    "bebidas",
    "lanches",
  ];

  const recipesResponse = await supabaseFetch(
    "recipes_br?select=id,slug,title,description,category,ingredients,steps,prep_minutes,servings,image_url,source_name,created_at&is_published=eq.true&order=created_at.desc&limit=5000",
  );
  const recipeRows = (await recipesResponse.json()) as SupabaseRecipeRow[];

  const ratingsResponse = await supabaseFetch(
    "recipe_ratings?select=recipe_id,rating&limit=20000",
  );
  const ratingRows = (await ratingsResponse.json()) as Array<{ recipe_id: string; rating: number }>;

  const ratingMap = new Map<string, { sum: number; count: number }>();
  ratingRows.forEach((entry) => {
    const current = ratingMap.get(entry.recipe_id) ?? { sum: 0, count: 0 };
    current.sum += Number(entry.rating) || 0;
    current.count += 1;
    ratingMap.set(entry.recipe_id, current);
  });

  const byCategory = new Map<LibraryCategory, SupabaseRecipeRow[]>();
  categories.forEach((category) => byCategory.set(category, []));
  recipeRows.forEach((row) => {
    const category = row.category as LibraryCategory;
    if (byCategory.has(category)) {
      byCategory.get(category)?.push(row);
    }
  });

  const picks: Array<{ recipe: Recipe; rating: number }> = [];
  categories.forEach((category) => {
    const rows = byCategory.get(category) || [];
    if (!rows.length) return;

    const rated = rows
      .map((row) => {
        const stats = ratingMap.get(row.id);
        const avg = stats && stats.count > 0 ? stats.sum / stats.count : 0;
        return { row, avg, count: stats?.count || 0 };
      })
      .sort((a, b) => b.avg - a.avg || b.count - a.count || (b.row.created_at || "").localeCompare(a.row.created_at || ""));

    const chosen = rated.find((entry) => entry.count > 0) || rated[0];
    picks.push({
      recipe: mapRowToRecipe(chosen.row),
      rating: chosen.count > 0 ? Number(chosen.avg.toFixed(1)) : 4.3,
    });
  });

  return picks.slice(0, safeLimit);
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



export async function updateRecipeCategoryInSupabase(
  slug: string,
  category: LibraryCategory,
): Promise<Recipe> {
  const { url, key } = getSupabaseEnv();
  if (!url || !key) {
    throw new Error("Supabase nao configurado.");
  }

  const response = await fetch(
    `${url}/rest/v1/recipes_br?slug=eq.${encodeURIComponent(slug)}&is_published=eq.true`,
    {
      method: "PATCH",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({ category }),
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Falha ao atualizar categoria no Supabase: ${errorText}`);
  }

  const rows = (await response.json()) as SupabaseRecipeRow[];
  if (!rows.length) {
    throw new Error("Receita nao encontrada para atualizar categoria.");
  }

  return mapRowToRecipe(rows[0]);
}

export async function refreshAuthorBadgesInSupabase(authorHandle: string): Promise<void> {
  const { url, key } = getSupabaseEnv();
  if (!url || !key) {
    throw new Error("Supabase nao configurado.");
  }

  const response = await fetch(`${url}/rest/v1/rpc/refresh_author_badges`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ p_author_handle: authorHandle }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Falha ao atualizar badges do autor: ${errorText}`);
  }
}


