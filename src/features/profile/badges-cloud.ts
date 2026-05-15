"use client";

import { getSupabaseBrowserClient } from "@/lib/supabase-client";
import { fetchPersonalBadgeSlugs } from "@/features/recipes/api-client";

export function normalizeAuthorHandle(value: string): string {
  return (
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 40) || "usuario_temai"
  );
}

export async function getAuthorBadgesFromCloud(authorHandle: string): Promise<string[]> {
  const client = getSupabaseBrowserClient();
  if (!client) return ["estagiario"];

  const normalized = normalizeAuthorHandle(authorHandle);
  const { data, error } = await client
    .from("author_badges")
    .select("badge_slug")
    .eq("author_handle", normalized);

  if (error) return ["estagiario"];
  const badges = (data || [])
    .map((row) => (typeof row.badge_slug === "string" ? row.badge_slug : ""))
    .filter(Boolean);

  return Array.from(new Set(["estagiario", ...badges]));
}

export async function getPersonalBadgesFromCloud(): Promise<string[]> {
  try {
    return await fetchPersonalBadgeSlugs();
  } catch {
    return [];
  }
}
