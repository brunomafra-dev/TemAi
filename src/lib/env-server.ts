import "server-only";

function required(name: string, value?: string): string {
  const normalized = value?.trim();
  if (!normalized) {
    throw new Error(`${name} nao configurado.`);
  }
  return normalized;
}

function optionalInt(name: string, fallback: number, options?: { min?: number; max?: number }): number {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return fallback;
  const min = options?.min ?? Number.MIN_SAFE_INTEGER;
  const max = options?.max ?? Number.MAX_SAFE_INTEGER;
  return Math.max(min, Math.min(max, Math.floor(parsed)));
}

export const serverEnv = {
  supabaseUrl: () =>
    required(
      "SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL",
      process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
    ),
  supabaseServiceRoleKey: () =>
    required("SUPABASE_SERVICE_ROLE_KEY", process.env.SUPABASE_SERVICE_ROLE_KEY),
  supabaseAnonKey: () =>
    required(
      "SUPABASE_ANON_KEY/NEXT_PUBLIC_SUPABASE_ANON_KEY",
      process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    ),
  openaiApiKey: () => (process.env.OPENAI_API_KEY?.trim() || ""),
  openaiRecipeModel: () => process.env.OPENAI_RECIPE_MODEL?.trim() || "gpt-5.4-mini",
  openaiSuggestionsModel: () => process.env.OPENAI_SUGGESTIONS_MODEL?.trim() || "gpt-5.4-mini",
  openaiImportModel: () => process.env.OPENAI_IMPORT_MODEL?.trim() || "gpt-5.4-mini",
  openaiAudioModel: () => process.env.OPENAI_AUDIO_MODEL?.trim() || "gpt-4o-mini-transcribe",
  openaiSupportModel: () => process.env.OPENAI_SUPPORT_MODEL?.trim() || process.env.OPENAI_SUGGESTIONS_MODEL?.trim() || "gpt-5.4-mini",
  openaiAuthorRecipeModel: () => process.env.OPENAI_AUTHOR_RECIPE_MODEL?.trim() || process.env.OPENAI_RECIPE_MODEL?.trim() || "gpt-5.4-mini",
  openaiTranslationModel: () => process.env.OPENAI_TRANSLATION_MODEL?.trim() || "gpt-4.1-mini",
  openaiTimeoutMs: () => optionalInt("OPENAI_TIMEOUT_MS", 45_000, { min: 10_000, max: 90_000 }),
  aiProtectionMode: () => {
    const value = process.env.AI_PROTECTION_MODE?.trim().toLowerCase();
    return value === "strict" || value === "readonly" ? value : "normal";
  },
  premiumRecipeAiDailyLimit: () => optionalInt("PREMIUM_RECIPE_AI_DAILY_LIMIT", 80, { min: 10, max: 500 }),
  premiumRecipeAiStrictDailyLimit: () => optionalInt("PREMIUM_RECIPE_AI_STRICT_DAILY_LIMIT", 20, { min: 5, max: 100 }),
  librarySearchEngine: () => {
    const value = process.env.LIBRARY_SEARCH_ENGINE?.trim().toLowerCase();
    return value === "legacy" ? "legacy" : "rpc";
  },
  publicReadRateLimitMode: () => {
    const value = process.env.PUBLIC_READ_RATE_LIMIT_MODE?.trim().toLowerCase();
    return value === "supabase" ? "supabase" : "memory";
  },
  adminUserIds: () =>
    (process.env.ADMIN_USER_IDS || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
};
