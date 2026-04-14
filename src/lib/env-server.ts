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
  openaiTranslationModel: () => process.env.OPENAI_TRANSLATION_MODEL?.trim() || "gpt-4.1-mini",
  theMealDbApiKey: () => process.env.THEMEALDB_API_KEY?.trim() || "1",
};
