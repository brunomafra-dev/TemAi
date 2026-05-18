import type { LibraryCategory, Recipe } from "@/features/recipes/types";
import type { ImportedRecipeDraft } from "@/features/recipes/import-from-url";
import { getRecipeDifficulty } from "@/features/recipes/quality";
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
  author_user_id?: string | null;
  moderation_status?: string;
}

type SupabasePopularRecipeRow = SupabaseRecipeRow & {
  rating_average: number | string | null;
  rating_count: number | string | null;
  view_count: number | string | null;
};

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
    "&uuml;": "\u00FC",
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
    "&Uuml;": "\u00DC",
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

  const recipe: Recipe = {
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

  return {
    ...recipe,
    difficulty: getRecipeDifficulty(recipe),
  };
}

function hasAnimalProtein(text: string): boolean {
  return /(carne bovina|carne suina|frango|peixe|camarao|atum|salmao|bacalhau|linguica|presunto|bacon|chicken|beef|pork|fish|shrimp|tuna|salmon|ham|sausage|meat|seafood)/i.test(
    text,
  );
}

function normalizeSearchText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenizeSearchText(value: string): string[] {
  const normalized = normalizeSearchText(value)
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) return [];
  return Array.from(new Set(normalized.split(" ").filter((token) => token.length >= 2)));
}

function tokenMatches(queryToken: string, fieldTokens: string[]): boolean {
  return fieldTokens.some(
    (fieldToken) =>
      fieldToken === queryToken ||
      (queryToken.length >= 4 && fieldToken.startsWith(queryToken)),
  );
}

function scoreRecipeSearch(recipe: Recipe, queryTokens: string[]): number {
  if (!queryTokens.length) return 0;

  const titleTokens = tokenizeSearchText(recipe.title);
  const ingredientTokens = tokenizeSearchText(recipe.ingredients.join(" "));
  const categoryTokens = tokenizeSearchText(recipe.category || "");
  const allTokens = [...titleTokens, ...ingredientTokens, ...categoryTokens];

  if (!queryTokens.every((token) => tokenMatches(token, allTokens))) {
    return 0;
  }

  return queryTokens.reduce((score, token) => {
    if (tokenMatches(token, titleTokens)) return score + 100;
    if (tokenMatches(token, ingredientTokens)) return score + 70;
    if (tokenMatches(token, categoryTokens)) return score + 35;
    return score;
  }, 0);
}

type SupabaseFetchOptions = RequestInit & {
  withCount?: boolean;
  next?: { revalidate?: number | false };
};

async function supabaseFetch(pathAndQuery: string, options: boolean | SupabaseFetchOptions = false) {
  const { url, key } = getSupabaseEnv();
  if (!url || !key) {
    throw new Error("Supabase não configurado.");
  }

  const withCount = typeof options === "boolean" ? options : Boolean(options.withCount);
  const init = typeof options === "boolean" ? {} : options;
  const shouldUseDefaultCache = !("cache" in init) && !("next" in init);
  const response = await fetch(`${url}/rest/v1/${pathAndQuery}`, {
    ...init,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      ...(withCount ? { Prefer: "count=exact" } : {}),
      ...(init.headers || {}),
    },
    ...(shouldUseDefaultCache ? { next: { revalidate: 60 * 5 } } : {}),
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
    "recipes_br?select=id,slug,title,description,category,ingredients,steps,prep_minutes,servings,image_url,source_name&is_published=eq.true&moderation_status=eq.approved";

  if (category && category !== "todas") {
    query += `&category=eq.${encodeURIComponent(category)}`;
  }
  query += "&limit=5000";

  const response = await supabaseFetch(query);
  const rows = (await response.json()) as SupabaseRecipeRow[];
  const mapped = rows.map(mapRowToRecipe);
  const searchTokens = search ? tokenizeSearchText(search) : [];
  const searched = searchTokens.length
    ? mapped
        .map((recipe) => ({
          recipe,
          searchScore: scoreRecipeSearch(recipe, searchTokens),
        }))
        .filter((entry) => entry.searchScore > 0)
    : mapped.map((recipe) => ({ recipe, searchScore: 0 }));
  const safe =
    category === "veggie"
      ? searched.filter((entry) => !hasAnimalProtein(`${entry.recipe.title} ${entry.recipe.description} ${entry.recipe.ingredients.join(" ")}`))
      : searched;

  const ranked = safe
    .map((entry) => ({
      recipe: entry.recipe,
      searchScore: entry.searchScore,
      rank: hashString(`${seed}:${entry.recipe.id}`),
    }))
    .sort((a, b) => b.searchScore - a.searchScore || a.rank - b.rank || a.recipe.id.localeCompare(b.recipe.id))
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
    `recipes_br?select=id,slug,title,description,category,ingredients,steps,prep_minutes,servings,image_url,source_name&slug=eq.${encodeURIComponent(slug)}&is_published=eq.true&moderation_status=eq.approved&limit=1`,
  );
  const rows = (await response.json()) as SupabaseRecipeRow[];
  if (!rows.length) return null;
  return mapRowToRecipe(rows[0]);
}

export async function getRecipesBySlugsFromSupabase(slugs: readonly string[]): Promise<Recipe[]> {
  if (!canUseSupabase()) {
    return [];
  }

  const safeSlugs = Array.from(
    new Set(slugs.map((slug) => slug.trim()).filter((slug) => /^[a-z0-9._-]+$/i.test(slug))),
  );
  if (!safeSlugs.length) return [];

  const response = await supabaseFetch(
    `recipes_br?select=id,slug,title,description,category,ingredients,steps,prep_minutes,servings,image_url,source_name&slug=in.(${safeSlugs.map(encodeURIComponent).join(",")})&is_published=eq.true&moderation_status=eq.approved&limit=${safeSlugs.length}`,
    { cache: "no-store" },
  );
  const rows = (await response.json()) as SupabaseRecipeRow[];
  const recipesById = new Map(rows.map((row) => [row.slug, mapRowToRecipe(row)]));
  return safeSlugs.map((slug) => recipesById.get(slug)).filter((recipe): recipe is Recipe => Boolean(recipe));
}

export async function getPopularRecipesFromSupabase(limit = 8): Promise<Array<{
  recipe: Recipe;
  ratingAverage: number;
  ratingCount: number;
  viewCount: number;
  rating: number;
}>> {
  if (!canUseSupabase()) {
    return [];
  }

  const safeLimit = Math.max(4, Math.min(20, Math.floor(limit)));
  const response = await supabaseFetch("rpc/get_popular_recipes_br", {
    method: "POST",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ p_limit: safeLimit }),
  });
  const rows = (await response.json()) as SupabasePopularRecipeRow[];

  return rows.map((row) => {
    const ratingAverage = Number(row.rating_average || 0);
    return {
      recipe: mapRowToRecipe(row),
      ratingAverage,
      ratingCount: Number(row.rating_count || 0),
      viewCount: Number(row.view_count || 0),
      rating: ratingAverage > 0 ? Number((ratingAverage / 2).toFixed(1)) : 0,
    };
  });
}

export async function upsertImportedRecipeToSupabase(recipe: ImportedRecipeDraft): Promise<Recipe> {
  const { url, key } = getSupabaseEnv();
  if (!url || !key) {
    throw new Error("Supabase não configurado.");
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
    is_published: recipe.isPublished ?? true,
    author_user_id: recipe.authorUserId || null,
    moderation_status: recipe.moderationStatus || "approved",
    moderation_reason: recipe.moderationReason || null,
    moderation_result: recipe.moderationResult || {},
    moderated_at: recipe.moderatedAt || new Date().toISOString(),
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
    throw new Error("Supabase não configurado.");
  }

  const response = await fetch(
    `${url}/rest/v1/recipes_br?slug=eq.${encodeURIComponent(slug)}&is_published=eq.true&moderation_status=eq.approved`,
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
    throw new Error("Receita não encontrada para atualizar categoria.");
  }

  return mapRowToRecipe(rows[0]);
}

export async function refreshAuthorBadgesInSupabase(authorHandle: string): Promise<void> {
  const { url, key } = getSupabaseEnv();
  if (!url || !key) {
    throw new Error("Supabase não configurado.");
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


