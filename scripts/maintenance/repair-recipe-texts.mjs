import fs from "node:fs";
import path from "node:path";

const BROKEN_MARKERS = [
  "Ningu?m",
  "voc?",
  "Voc?",
  "n?o",
  "anivers?rio",
  "m?goa",
  "h? d",
  "pa?s",
  "f?cil",
  "Al?m",
  "refei??",
  "tradi??",
  "vers?o",
  "cl?ssic",
  "culin?ria",
  "sand?che",
  "?rabe",
  "?tima",
  "camar?o",
  "pur?",
  "? grega",
  "explos?o",
];

const HTML_ENTITY_PATTERN = /&(?:[a-z]{2,12}|#\d{2,6}|#x[\da-f]{2,6});/gi;

function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) return;
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index < 0) continue;
    const key = trimmed.slice(0, index).trim();
    let value = trimmed.slice(index + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[key] ||= value;
  }
}

loadEnv(path.join(process.cwd(), ".env.local"));
loadEnv(path.join(process.cwd(), ".env"));

const args = new Set(process.argv.slice(2));
const apply = args.has("--apply");
const slugArg = process.argv.find((arg) => arg.startsWith("--slug="));
const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
const slugFilter = slugArg ? slugArg.slice("--slug=".length).trim() : "";
const limit = limitArg ? Math.max(1, Math.min(500, Number(limitArg.slice("--limit=".length)) || 50)) : 50;

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const openAiKey = process.env.OPENAI_API_KEY;
const openAiModel = process.env.OPENAI_IMPORT_MODEL || "gpt-5.4-mini";

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Supabase env ausente. Configure SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.");
}

if (apply && !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("SUPABASE_SERVICE_ROLE_KEY é obrigatória para aplicar reparos.");
}

function combinedText(recipe) {
  return [
    recipe.title || "",
    recipe.description || "",
    ...(Array.isArray(recipe.ingredients) ? recipe.ingredients : []),
    ...(Array.isArray(recipe.steps) ? recipe.steps : []),
  ].join("\n");
}

function decodeHtmlEntities(value) {
  let decoded = value;
  const named = {
    "&aacute;": "á",
    "&agrave;": "à",
    "&acirc;": "â",
    "&atilde;": "ã",
    "&eacute;": "é",
    "&ecirc;": "ê",
    "&iacute;": "í",
    "&oacute;": "ó",
    "&ocirc;": "ô",
    "&otilde;": "õ",
    "&uacute;": "ú",
    "&uuml;": "ü",
    "&ccedil;": "ç",
    "&Aacute;": "Á",
    "&Agrave;": "À",
    "&Acirc;": "Â",
    "&Atilde;": "Ã",
    "&Eacute;": "É",
    "&Ecirc;": "Ê",
    "&Iacute;": "Í",
    "&Oacute;": "Ó",
    "&Ocirc;": "Ô",
    "&Otilde;": "Õ",
    "&Uacute;": "Ú",
    "&Uuml;": "Ü",
    "&Ccedil;": "Ç",
  };

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
      .replace(/&([a-z]+);/gi, (entity) => named[entity] || entity)
      .replace(/\s+/g, " ")
      .trim();

    if (next === decoded) break;
    decoded = next;
  }

  return decoded;
}

function suspicionScore(value) {
  if (!value) return 0;
  let score = 0;
  for (const marker of BROKEN_MARKERS) {
    if (value.includes(marker)) score += 3;
  }
  score += (value.match(HTML_ENTITY_PATTERN) || []).length * 2;
  score += (value.match(/[A-Za-zÀ-ÿ]\?[A-Za-zÀ-ÿ]/g) || []).length * 2;
  score += (value.match(/\?\?/g) || []).length * 2;
  return score;
}

function readOutputText(payload) {
  if (typeof payload.output_text === "string") return payload.output_text;
  return (
    payload.output
      ?.flatMap((item) => item.content || [])
      .map((content) => content.text || "")
      .join("\n")
      .trim() || ""
  );
}

function parseJsonObject(text) {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("IA não retornou JSON válido.");
    return JSON.parse(match[0]);
  }
}

async function supabaseFetch(pathAndQuery, init = {}) {
  const response = await fetch(`${supabaseUrl}/rest/v1/${pathAndQuery}`, {
    ...init,
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      ...(init.headers || {}),
    },
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Supabase ${response.status}: ${text}`);
  }
  return text ? JSON.parse(text) : null;
}

async function loadRecipes() {
  let query =
    "recipes_br?select=id,slug,title,description,ingredients,steps&is_published=eq.true&moderation_status=eq.approved&limit=5000";
  if (slugFilter) query += `&slug=eq.${encodeURIComponent(slugFilter)}`;
  const rows = await supabaseFetch(query);
  return (rows || [])
    .map((recipe) => ({ recipe, score: suspicionScore(combinedText(recipe)) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

function repairHtmlEntities(recipe) {
  const next = {
    title: decodeHtmlEntities(String(recipe.title || "")),
    description: decodeHtmlEntities(String(recipe.description || "")),
    ingredients: Array.isArray(recipe.ingredients)
      ? recipe.ingredients.map((item) => decodeHtmlEntities(String(item || "")))
      : [],
    steps: Array.isArray(recipe.steps)
      ? recipe.steps.map((item) => decodeHtmlEntities(String(item || "")))
      : [],
  };

  return combinedText(next) === combinedText(recipe) ? null : next;
}

function validateRepair(original, repaired) {
  if (!repaired || typeof repaired !== "object" || Array.isArray(repaired)) {
    throw new Error("Resposta de reparo inválida.");
  }
  const next = {
    title: typeof repaired.title === "string" ? repaired.title.trim() : "",
    description: typeof repaired.description === "string" ? repaired.description.trim() : "",
    ingredients: Array.isArray(repaired.ingredients)
      ? repaired.ingredients.map((item) => String(item).trim())
      : [],
    steps: Array.isArray(repaired.steps) ? repaired.steps.map((item) => String(item).trim()) : [],
  };

  if (!next.title || !next.description || !next.ingredients.length || !next.steps.length) {
    throw new Error("Reparo deixou campos obrigatórios vazios.");
  }
  if (
    next.ingredients.length !== original.ingredients.length ||
    next.steps.length !== original.steps.length
  ) {
    throw new Error("Reparo alterou tamanho dos arrays.");
  }

  const beforeScore = suspicionScore(combinedText(original));
  const afterScore = suspicionScore(combinedText(next));
  if (afterScore >= beforeScore) {
    throw new Error(`Reparo não reduziu suspeita (${beforeScore} -> ${afterScore}).`);
  }

  return next;
}

async function repairWithOpenAi(recipe) {
  if (!openAiKey) {
    throw new Error("OPENAI_API_KEY ausente. Não é possível reparar com IA.");
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openAiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: openAiModel,
      max_output_tokens: 4200,
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text: "Você corrige textos de receitas em PT-BR quando acentos viraram '?'. Preserve exatamente o sentido, ingredientes, quantidades, ordem dos arrays e pontuação possível. Não reescreva estilo, não adicione informação e não remova itens. Retorne somente JSON válido.",
            },
          ],
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: JSON.stringify({
                title: recipe.title,
                description: recipe.description,
                ingredients: recipe.ingredients,
                steps: recipe.steps,
              }),
            },
          ],
        },
      ],
    }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.error?.message || "Falha ao chamar OpenAI.");
  }

  return validateRepair(recipe, parseJsonObject(readOutputText(payload)));
}

async function updateRecipe(id, repaired) {
  await supabaseFetch(`recipes_br?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(repaired),
  });
}

const audit = {
  createdAt: new Date().toISOString(),
  apply,
  model: openAiModel,
  limit,
  slugFilter,
  repaired: [],
  failed: [],
};

const candidates = await loadRecipes();
console.log(`Receitas suspeitas encontradas: ${candidates.length}`);

for (const { recipe, score } of candidates) {
  try {
    console.log(`${apply ? "Reparando" : "Auditando"} ${recipe.slug} (score ${score})`);
    const localRepair = repairHtmlEntities(recipe);
    const repaired = apply ? validateRepair(recipe, localRepair || (await repairWithOpenAi(recipe))) : null;
    if (apply && repaired) {
      await updateRecipe(recipe.id, repaired);
    }
    audit.repaired.push({
      slug: recipe.slug,
      scoreBefore: score,
      scoreAfter: repaired ? suspicionScore(combinedText(repaired)) : null,
      before: {
        title: recipe.title,
        description: recipe.description,
        ingredients: recipe.ingredients,
        steps: recipe.steps,
      },
      after: repaired,
    });
  } catch (error) {
    audit.failed.push({
      slug: recipe.slug,
      reason: error instanceof Error ? error.message : String(error),
    });
    console.error(`Falhou ${recipe.slug}:`, error instanceof Error ? error.message : error);
  }
}

const auditDir = path.join(process.cwd(), "supabase", ".temp");
fs.mkdirSync(auditDir, { recursive: true });
const auditPath = path.join(
  auditDir,
  `recipe-text-repair-${new Date().toISOString().replace(/[:.]/g, "-")}.json`,
);
fs.writeFileSync(auditPath, JSON.stringify(audit, null, 2), "utf8");

console.log(`Audit salvo em ${auditPath}`);
console.log(JSON.stringify({ repaired: audit.repaired.length, failed: audit.failed.length }, null, 2));

if (!apply) {
  console.log("Modo auditoria. Rode com --apply para atualizar o Supabase.");
}
