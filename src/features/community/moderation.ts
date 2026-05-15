import "server-only";
import { serverEnv } from "@/lib/env-server";

export type CommunityModerationDecision = {
  allowed: boolean;
  status: "approved" | "rejected" | "review";
  reason: string;
  result: Record<string, unknown>;
};

type ModerationResult = {
  flagged?: boolean;
  categories?: Record<string, boolean>;
  category_scores?: Record<string, number>;
};

const BLOCKED_TEXT_TERMS = [
  "nudez",
  "pornografia",
  "sexo explicito",
  "órgão sexual",
  "orgao sexual",
  "fezes",
  "urina",
  "vômito",
  "vomito",
  "morte",
  "cadáver",
  "cadaver",
  "sangue",
  "veneno",
  "envenenar",
  "autoextermínio",
  "autoexterminio",
  "suicídio",
  "suicidio",
  "droga ilícita",
  "droga ilicita",
];

function normalizeForScan(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function readOutputText(payload: unknown): string {
  const response = payload as {
    output_text?: string;
    output?: Array<{ content?: Array<{ text?: string }> }>;
  };

  if (typeof response.output_text === "string") return response.output_text;
  return (
    response.output
      ?.flatMap((item) => item.content || [])
      .map((content) => content.text || "")
      .join("\n")
      .trim() || ""
  );
}

function extractJson(text: string): Record<string, unknown> {
  const trimmed = text.trim();
  if (!trimmed) return {};
  try {
    const parsed = JSON.parse(trimmed);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (!match) return {};
    const parsed = JSON.parse(match[0]);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  }
}

function isSupportedImageInput(imageUrl?: string | null): boolean {
  if (!imageUrl) return false;
  const value = imageUrl.trim();
  if (/^data:image\/[a-z0-9.+-]+;base64,/i.test(value)) return true;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

async function callModeration(params: {
  text: string;
  imageUrl?: string | null;
}): Promise<ModerationResult> {
  const apiKey = serverEnv.openaiApiKey();
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY não configurada para moderação.");
  }

  const input: Array<Record<string, unknown>> = [
    { type: "text", text: params.text.slice(0, 12000) },
  ];

  if (isSupportedImageInput(params.imageUrl)) {
    input.push({
      type: "image_url",
      image_url: { url: params.imageUrl },
    });
  }

  const response = await fetch("https://api.openai.com/v1/moderations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "omni-moderation-latest",
      input,
    }),
  });

  const payload = (await response.json().catch(() => ({}))) as {
    results?: ModerationResult[];
    error?: { message?: string };
  };

  if (!response.ok) {
    throw new Error(payload.error?.message || "Falha na moderação.");
  }

  return payload.results?.[0] || {};
}

async function classifyFoodImage(imageUrl?: string | null): Promise<{
  foodRelated: boolean;
  reason: string;
  raw: Record<string, unknown>;
}> {
  if (!isSupportedImageInput(imageUrl)) {
    return { foodRelated: true, reason: "", raw: {} };
  }

  const apiKey = serverEnv.openaiApiKey();
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY não configurada para análise de imagem.");
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: serverEnv.openaiSuggestionsModel(),
      max_output_tokens: 120,
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text:
                "Analise se a imagem é apropriada para uma receita culinária. Retorne apenas JSON válido: {\"foodRelated\":true,\"reason\":\"curto\"}. Marque false se for nudez, violência, conteúdo nojento, pessoa sem relação culinária, meme, print ou imagem que não ajude uma receita.",
            },
            { type: "input_image", image_url: imageUrl, detail: "low" },
          ],
        },
      ],
    }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = (payload as { error?: { message?: string } }).error?.message;
    throw new Error(message || "Falha ao validar imagem da receita.");
  }

  const parsed = extractJson(readOutputText(payload));
  return {
    foodRelated: parsed.foodRelated === true,
    reason: typeof parsed.reason === "string" ? parsed.reason.slice(0, 180) : "",
    raw: parsed,
  };
}

function localUnsafeReason(text: string): string {
  const normalized = normalizeForScan(text);
  const matched = BLOCKED_TEXT_TERMS.find((term) =>
    normalized.includes(normalizeForScan(term)),
  );
  return matched ? `Conteúdo impróprio detectado: ${matched}.` : "";
}

function summarizeModeration(result: ModerationResult): string {
  const categories = Object.entries(result.categories || {})
    .filter(([, flagged]) => flagged)
    .map(([category]) => category);

  if (!categories.length) return "Conteúdo sinalizado pela moderação.";
  return `Conteúdo sinalizado pela moderação: ${categories.join(", ")}.`;
}

export async function moderateRecipePublication(params: {
  title: string;
  description: string;
  ingredients: string[];
  steps: string[];
  imageUrl?: string | null;
}): Promise<CommunityModerationDecision> {
  const text = [
    `Título: ${params.title}`,
    `Descrição: ${params.description}`,
    `Ingredientes: ${params.ingredients.join("; ")}`,
    `Modo de preparo: ${params.steps.join("; ")}`,
  ].join("\n");

  const localReason = localUnsafeReason(text);
  if (localReason) {
    return {
      allowed: false,
      status: "rejected",
      reason: localReason,
      result: { localReason },
    };
  }

  const moderation = await callModeration({ text, imageUrl: params.imageUrl });
  if (moderation.flagged) {
    return {
      allowed: false,
      status: "rejected",
      reason: summarizeModeration(moderation),
      result: { moderation },
    };
  }

  const imageCheck = await classifyFoodImage(params.imageUrl);
  if (!imageCheck.foodRelated) {
    return {
      allowed: false,
      status: "review",
      reason: imageCheck.reason || "A imagem não parece adequada para uma receita.",
      result: { moderation, imageCheck: imageCheck.raw },
    };
  }

  return {
    allowed: true,
    status: "approved",
    reason: "",
    result: { moderation, imageCheck: imageCheck.raw },
  };
}

export async function moderateCommunityText(text: string): Promise<CommunityModerationDecision> {
  const localReason = localUnsafeReason(text);
  if (localReason) {
    return {
      allowed: false,
      status: "rejected",
      reason: localReason,
      result: { localReason },
    };
  }

  const moderation = await callModeration({ text });
  if (moderation.flagged) {
    return {
      allowed: false,
      status: "rejected",
      reason: summarizeModeration(moderation),
      result: { moderation },
    };
  }

  return {
    allowed: true,
    status: "approved",
    reason: "",
    result: { moderation },
  };
}
