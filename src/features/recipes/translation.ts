type TranslationMode = "general" | "ingredient" | "instruction" | "title";

const translationCache = new Map<string, string>();

const phraseGlossary: Array<[RegExp, string]> = [
  [/\bground beef\b/gi, "carne moida"],
  [/\bbeef broth\b/gi, "caldo de carne"],
  [/\bvegetable broth\b/gi, "caldo de legumes"],
  [/\bchicken broth\b/gi, "caldo de frango"],
  [/\bblack pepper\b/gi, "pimenta-do-reino"],
  [/\bolive oil\b/gi, "azeite de oliva"],
  [/\bsoy sauce\b/gi, "molho shoyu"],
  [/\bgreen onion\b/gi, "cebolinha"],
  [/\bbell pepper\b/gi, "pimentao"],
  [/\bsour cream\b/gi, "creme de leite"],
  [/\bbrown sugar\b/gi, "acucar mascavo"],
  [/\bpowdered sugar\b/gi, "acucar de confeiteiro"],
  [/\bself-rising flour\b/gi, "farinha com fermento"],
  [/\ball-purpose flour\b/gi, "farinha de trigo"],
  [/\bbaking powder\b/gi, "fermento em po"],
  [/\bbaking soda\b/gi, "bicarbonato de sodio"],
  [/\bvanilla extract\b/gi, "extrato de baunilha"],
  [/\blemon juice\b/gi, "suco de limao"],
  [/\btomato sauce\b/gi, "molho de tomate"],
  [/\btomato paste\b/gi, "extrato de tomate"],
  [/\bmashed potatoes\b/gi, "pure de batata"],
  [/\bfrench fries\b/gi, "batata frita"],
  [/\bmedium heat\b/gi, "fogo medio"],
  [/\blow heat\b/gi, "fogo baixo"],
  [/\bhigh heat\b/gi, "fogo alto"],
  [/\bto taste\b/gi, "a gosto"],
];

const wordGlossary: Array<[RegExp, string]> = [
  [/\bbeef\b/gi, "carne bovina"],
  [/\bchicken\b/gi, "frango"],
  [/\bpork\b/gi, "carne suina"],
  [/\bfish\b/gi, "peixe"],
  [/\bseafood\b/gi, "frutos do mar"],
  [/\bcarrot\b/gi, "cenoura"],
  [/\bpotato(es)?\b/gi, "batata"],
  [/\bbroccoli\b/gi, "brocolis"],
  [/\bonion\b/gi, "cebola"],
  [/\bgarlic\b/gi, "alho"],
  [/\bsalad\b/gi, "salada"],
  [/\bsauce\b/gi, "molho"],
  [/\bstew\b/gi, "ensopado"],
  [/\bpie\b/gi, "torta"],
  [/\bcake\b/gi, "bolo"],
  [/\btart\b/gi, "torta"],
  [/\brolls?\b/gi, "rolinhos"],
  [/\bdip\b/gi, "pasta"],
  [/\bbuns?\b/gi, "paes"],
  [/\bpancakes?\b/gi, "panquecas"],
  [/\bhotpot\b/gi, "ensopado"],
  [/\bwith\b/gi, "com"],
  [/\band\b/gi, "e"],
  [/\bbaked\b/gi, "assado"],
  [/\bstir-fry\b/gi, "salteado"],
];

const areaGlossary: Array<[RegExp, string]> = [
  [/\bamerican\b/gi, "americana"],
  [/\bbritish\b/gi, "britanica"],
  [/\bcanadian\b/gi, "canadense"],
  [/\bchinese\b/gi, "chinesa"],
  [/\bfrench\b/gi, "francesa"],
  [/\bindian\b/gi, "indiana"],
  [/\bitalian\b/gi, "italiana"],
  [/\bjapanese\b/gi, "japonesa"],
  [/\bmalaysian\b/gi, "malaia"],
  [/\bmexican\b/gi, "mexicana"],
  [/\bspanish\b/gi, "espanhola"],
  [/\bthai\b/gi, "tailandesa"],
  [/\bturkish\b/gi, "turca"],
  [/\bvenezuelan\b/gi, "venezuelana"],
  [/\bvenezulan\b/gi, "venezuelana"],
  [/\bportuguese\b/gi, "portuguesa"],
  [/\bfilipino\b/gi, "filipina"],
  [/\bargentinian\b/gi, "argentina"],
  [/\bmoroccan\b/gi, "marroquina"],
  [/\baustralian\b/gi, "australiana"],
  [/\bsyrian\b/gi, "siria"],
  [/\buruguayan\b/gi, "uruguaia"],
  [/\bvietnamese\b/gi, "vietnamita"],
  [/\bdutch\b/gi, "holandesa"],
];

const measurementGlossary: Array<[RegExp, string]> = [
  [/\b(\d+(?:[.,]\d+)?)\s*cups?\b/gi, "$1 xicara(s)"],
  [/\b(\d+(?:[.,]\d+)?)\s*tbsp\b/gi, "$1 colher(es) de sopa"],
  [/\b(\d+(?:[.,]\d+)?)\s*tablespoons?\b/gi, "$1 colher(es) de sopa"],
  [/\b(\d+(?:[.,]\d+)?)\s*tsp\b/gi, "$1 colher(es) de cha"],
  [/\b(\d+(?:[.,]\d+)?)\s*teaspoons?\b/gi, "$1 colher(es) de cha"],
];

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&nbsp;/gi, " ")
    .replace(/&deg;/gi, " graus")
    .replace(/&ordm;/gi, "o")
    .replace(/&ordf;/gi, "a")
    .replace(/&frac12;/gi, "1/2")
    .replace(/&frac14;/gi, "1/4")
    .replace(/&frac34;/gi, "3/4")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([\da-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/\s+/g, " ")
    .trim();
}

function shouldTranslate(value: string): boolean {
  const text = value.trim();
  if (!text) return false;
  return /[a-z]/i.test(text);
}

function applyRules(value: string, rules: Array<[RegExp, string]>): string {
  let out = value;
  for (const [pattern, replacement] of rules) {
    out = out.replace(pattern, replacement);
  }
  return out;
}

async function translateWithMyMemory(value: string): Promise<string | null> {
  const response = await fetch(
    `https://api.mymemory.translated.net/get?q=${encodeURIComponent(value)}&langpair=en|pt-BR`,
    { next: { revalidate: 60 * 60 * 24 } },
  );
  if (!response.ok) return null;
  const payload = (await response.json()) as { responseData?: { translatedText?: string } };
  return payload.responseData?.translatedText?.trim() || null;
}

async function translateWithLibreTranslate(value: string): Promise<string | null> {
  const response = await fetch("https://libretranslate.de/translate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      q: value,
      source: "en",
      target: "pt",
      format: "text",
    }),
    next: { revalidate: 60 * 60 * 24 },
  });

  if (!response.ok) return null;
  const payload = (await response.json()) as { translatedText?: string };
  return payload.translatedText?.trim() || null;
}

async function machineTranslate(value: string): Promise<string | null> {
  try {
    const translated = await translateWithMyMemory(value);
    if (translated && translated.toLowerCase() !== value.toLowerCase()) return translated;
  } catch {
    // ignore
  }

  try {
    const translated = await translateWithLibreTranslate(value);
    if (translated) return translated;
  } catch {
    // ignore
  }

  return null;
}

function polishInstruction(value: string): string {
  return value
    .replace(/\bthen\b/gi, "depois")
    .replace(/\buntil\b/gi, "ate")
    .replace(/\bminutes?\b/gi, "minutos")
    .replace(/\badd\b/gi, "adicione")
    .replace(/\bmix\b/gi, "misture")
    .replace(/\bstir\b/gi, "mexa")
    .replace(/\bbake\b/gi, "asse")
    .replace(/\bfry\b/gi, "frite")
    .replace(/\bboil\b/gi, "ferva");
}

function finalize(value: string): string {
  const cleaned = decodeHtmlEntities(value)
    .replace(/\s+([,.!?;:])/g, "$1")
    .replace(/\(\s+/g, "(")
    .replace(/\s+\)/g, ")")
    .replace(/\s{2,}/g, " ")
    .trim();
  if (!cleaned) return cleaned;
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

export async function translateToPortuguese(value: string, mode: TranslationMode = "general"): Promise<string> {
  const normalized = decodeHtmlEntities(value.trim());
  if (!shouldTranslate(normalized)) return normalized;

  const cacheKey = `${mode}:${normalized.toLowerCase()}`;
  const cached = translationCache.get(cacheKey);
  if (cached) return cached;

  let translated = normalized;
  const machine = await machineTranslate(normalized);
  if (machine) translated = machine;

  translated = applyRules(translated, phraseGlossary);
  translated = applyRules(translated, wordGlossary);
  translated = applyRules(translated, areaGlossary);
  translated = applyRules(translated, measurementGlossary);

  if (mode === "instruction") {
    translated = polishInstruction(translated);
  }

  const finalValue = finalize(translated);
  translationCache.set(cacheKey, finalValue || normalized);
  return finalValue || normalized;
}

export async function translateIngredientToPortuguese(value: string): Promise<string> {
  return translateToPortuguese(value, "ingredient");
}

export async function translateInstructionToPortuguese(value: string): Promise<string> {
  return translateToPortuguese(value, "instruction");
}

