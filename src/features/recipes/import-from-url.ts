import { slugify } from "@/lib/utils";
import type { LibraryCategory } from "@/features/recipes/types";

export interface ImportedRecipeDraft {
  slug: string;
  title: string;
  description: string;
  category: LibraryCategory;
  ingredients: string[];
  steps: string[];
  prepMinutes: number;
  servings: number;
  imageUrl?: string;
  sourceName: string;
  sourceUrl: string;
  sourceRating?: number;
}

interface RecipeJsonLd {
  "@type"?: string | string[];
  name?: string;
  description?: string;
  recipeIngredient?: string[];
  recipeInstructions?: Array<string | { text?: string }>;
  image?: string | string[];
  prepTime?: string;
  totalTime?: string;
  recipeYield?: string | string[];
  aggregateRating?: { ratingValue?: string | number };
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

function extractImageFromHtml(html: string): string | undefined {
  const patterns = [
    /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["'][^>]*>/i,
    /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["'][^>]*>/i,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) {
      return decodeHtmlEntities(match[1]);
    }
  }

  return undefined;
}

function isRecipeType(type: unknown): boolean {
  if (!type) return false;
  if (typeof type === "string") return type.toLowerCase() === "recipe";
  if (Array.isArray(type)) return type.some((item) => typeof item === "string" && item.toLowerCase() === "recipe");
  return false;
}

function parseDurationToMinutes(value?: string): number {
  if (!value) return 30;
  const match = value.match(/P(?:\d+D)?T(?:(\d+)H)?(?:(\d+)M)?/i);
  if (!match) return 30;
  const hours = Number(match[1] || 0);
  const minutes = Number(match[2] || 0);
  const total = hours * 60 + minutes;
  return total > 0 ? total : 30;
}

function parseYield(value?: string | string[]): number {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return 2;
  const match = raw.match(/\d+/);
  return match ? Number(match[0]) : 2;
}

function extractInstructions(instructions: RecipeJsonLd["recipeInstructions"]): string[] {
  if (!instructions || !Array.isArray(instructions)) return [];
  return instructions
    .map((step) => (typeof step === "string" ? step.trim() : step?.text?.trim() || ""))
    .map((step) => decodeHtmlEntities(step))
    .filter(Boolean);
}

function inferCategory(title: string, ingredients: string[]): ImportedRecipeDraft["category"] {
  const text = `${title} ${ingredients.join(" ")}`.toLowerCase();
  if (/(suco|smoothie|vitamina|drink|coquetel|caipirinha|cha|cafe|refrigerante|limonada)/.test(text)) return "bebidas";
  if (/(lanche|sanduiche|sanduíche|hamburguer|hambúrguer|wrap|tostex|toast|hot dog|cachorro-quente|esfirra)/.test(text)) return "lanches";
  if (/(bolo|mousse|pudim|sobremesa|chocolate|brigadeiro|torta doce)/.test(text)) return "sobremesas";
  if (/(massa|macarrao|spaghetti|penne|lasanha|nhoque|ravioli)/.test(text)) return "massas";
  if (/(vegetar|vegano|salada|abobrinha|berinjela|cenoura|brocolis)/.test(text)) return "veggie";
  if (/(kids|infantil|mini|lancheira|panqueca)/.test(text)) return "kids";
  return "principais";
}

function extractJsonLdScripts(html: string): unknown[] {
  const regex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  const matches: unknown[] = [];
  let match: RegExpExecArray | null;

  while ((match = regex.exec(html)) !== null) {
    const raw = match[1]?.trim();
    if (!raw) continue;
    try {
      const parsed = JSON.parse(raw);
      matches.push(parsed);
    } catch {
      // ignore invalid json-ld
    }
  }

  return matches;
}

function findRecipeNode(candidate: unknown): RecipeJsonLd | null {
  if (!candidate || typeof candidate !== "object") return null;
  const obj = candidate as Record<string, unknown>;

  if (isRecipeType(obj["@type"])) return obj as RecipeJsonLd;

  if (Array.isArray(obj["@graph"])) {
    for (const node of obj["@graph"]) {
      const recipe = findRecipeNode(node);
      if (recipe) return recipe;
    }
  }

  if (Array.isArray(candidate)) {
    for (const node of candidate) {
      const recipe = findRecipeNode(node);
      if (recipe) return recipe;
    }
  }

  return null;
}

export async function importRecipeFromUrl(url: string): Promise<ImportedRecipeDraft> {
  const parsedUrl = new URL(url);
  const response = await fetch(parsedUrl.toString());
  if (!response.ok) {
    throw new Error("Nao foi possivel acessar a URL da receita.");
  }

  const html = await response.text();
  const jsonLdCandidates = extractJsonLdScripts(html);
  let recipeNode: RecipeJsonLd | null = null;

  for (const candidate of jsonLdCandidates) {
    recipeNode = findRecipeNode(candidate);
    if (recipeNode) break;
  }

  if (!recipeNode?.name) {
    throw new Error("Nao encontrei dados estruturados de receita nesta URL.");
  }

  const title = decodeHtmlEntities(recipeNode.name.trim());
  const ingredients = (recipeNode.recipeIngredient || [])
    .map((item) => decodeHtmlEntities(item.trim()))
    .filter(Boolean);
  const steps = extractInstructions(recipeNode.recipeInstructions);

  if (!ingredients.length || !steps.length) {
    throw new Error("A receita encontrada nao tem ingredientes ou passos suficientes.");
  }

  const description = recipeNode.description
    ? decodeHtmlEntities(recipeNode.description.trim())
    : "Receita importada automaticamente por URL.";
  const imageRaw = Array.isArray(recipeNode.image) ? recipeNode.image[0] : recipeNode.image;
  const imageFromMeta = extractImageFromHtml(html);
  const prepMinutes = parseDurationToMinutes(recipeNode.totalTime || recipeNode.prepTime);
  const servings = parseYield(recipeNode.recipeYield);
  const slug = slugify(title);
  const category = inferCategory(title, ingredients);
  const sourceRatingRaw = recipeNode.aggregateRating?.ratingValue;
  const sourceRating =
    typeof sourceRatingRaw === "number"
      ? sourceRatingRaw
      : typeof sourceRatingRaw === "string"
        ? Number(sourceRatingRaw.replace(",", "."))
        : undefined;

  return {
    slug,
    title,
    description,
    category,
    ingredients,
    steps,
    prepMinutes,
    servings,
    imageUrl: decodeHtmlEntities(imageRaw || imageFromMeta || "") || undefined,
    sourceName: parsedUrl.hostname.replace("www.", ""),
    sourceUrl: parsedUrl.toString(),
    sourceRating: Number.isFinite(sourceRating) ? sourceRating : undefined,
  };
}

async function fetchXml(url: string): Promise<string> {
  const response = await fetch(url, { next: { revalidate: 60 * 60 } });
  if (!response.ok) {
    throw new Error(`Falha ao carregar sitemap: ${url}`);
  }
  return response.text();
}

function extractLocEntries(xml: string): string[] {
  const regex = /<loc>([^<]+)<\/loc>/gi;
  const urls: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(xml)) !== null) {
    const value = match[1]?.trim();
    if (value) urls.push(value);
  }
  return urls;
}

export async function collectTudoGostosoRecipeUrls(targetCount: number): Promise<string[]> {
  const root = "https://www.tudogostoso.com.br/sitemap.xml";
  const indexXml = await fetchXml(root);
  const sitemapUrls = extractLocEntries(indexXml).filter((url) =>
    /sitemap/i.test(url),
  );

  const recipeUrls: string[] = [];
  for (const sitemapUrl of sitemapUrls) {
    if (recipeUrls.length >= targetCount) break;

    try {
      const sitemapXml = await fetchXml(sitemapUrl);
      const urls = extractLocEntries(sitemapXml).filter((url) =>
        /tudogostoso\.com\.br\/(receita|receitas)\//i.test(url),
      );

      for (const url of urls) {
        if (recipeUrls.length >= targetCount) break;
        if (!recipeUrls.includes(url)) {
          recipeUrls.push(url);
        }
      }
    } catch {
      // ignore broken sitemap and continue
    }
  }

  return recipeUrls.slice(0, targetCount);
}



