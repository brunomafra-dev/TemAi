import "server-only";

function required(name: string, value?: string): string {
  const normalized = value?.trim();
  if (!normalized) {
    throw new Error(`${name} nao configurado.`);
  }
  return normalized;
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
  openaiAudioModel: () => process.env.OPENAI_AUDIO_MODEL?.trim() || "gpt-4o-mini-transcribe",
  openaiSupportModel: () => process.env.OPENAI_SUPPORT_MODEL?.trim() || process.env.OPENAI_SUGGESTIONS_MODEL?.trim() || "gpt-5.4-mini",
  openaiAuthorRecipeModel: () => process.env.OPENAI_AUTHOR_RECIPE_MODEL?.trim() || process.env.OPENAI_RECIPE_MODEL?.trim() || "gpt-5.4-mini",
  openaiTranslationModel: () => process.env.OPENAI_TRANSLATION_MODEL?.trim() || "gpt-4.1-mini",
  theMealDbApiKey: () => process.env.THEMEALDB_API_KEY?.trim() || "1",
  theMealDbBaseUrl: () => process.env.THEMEALDB_BASE_URL?.trim() || "https://www.themealdb.com/api/json/v1",
  communityPublishMode: () => process.env.COMMUNITY_PUBLISH_MODE?.trim().toLowerCase() || "open",
  communityPremiumAuthors: () => process.env.COMMUNITY_PREMIUM_AUTHORS?.trim() || "",
  adminUserIds: () =>
    (process.env.ADMIN_USER_IDS || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
};
