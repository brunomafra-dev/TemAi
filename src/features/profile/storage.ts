"use client";

import { getSupabaseBrowserClient } from "@/lib/supabase-client";
import {
  DEFAULT_COOKING_EQUIPMENT,
  normalizeCookingEquipment,
} from "@/features/recipes/cooking-equipment";
import type { CookingEquipment } from "@/features/recipes/types";
import { LEGAL_PRIVACY_VERSION, LEGAL_TERMS_VERSION } from "@/lib/legal";

export interface UserProfile {
  firstName: string;
  lastName: string;
  username: string;
  photoDataUrl: string;
  cookingEquipment: CookingEquipment[];
  selectedBadge: string;
  unlockedBadges: string[];
  acceptedTermsAt: string | null;
  acceptedPrivacyAt: string | null;
  acceptedTermsVersion: string | null;
  acceptedPrivacyVersion: string | null;
}

export type SaveUserProfileToCloudResult =
  | { ok: true }
  | {
      ok: false;
      code: "not_authenticated" | "username_taken" | "sync_failed";
      message: string;
    };

const PROFILE_STORAGE_KEY = "temai_user_profile";

const defaultProfile: UserProfile = {
  firstName: "Bruno",
  lastName: "Mafra",
  username: "",
  photoDataUrl: "",
  cookingEquipment: DEFAULT_COOKING_EQUIPMENT,
  selectedBadge: "estagiario",
  unlockedBadges: ["estagiario"],
  acceptedTermsAt: null,
  acceptedPrivacyAt: null,
  acceptedTermsVersion: null,
  acceptedPrivacyVersion: null,
};

export function getUserProfile(): UserProfile {
  if (typeof window === "undefined") {
    return defaultProfile;
  }

  try {
    const raw = window.localStorage.getItem(PROFILE_STORAGE_KEY);
    if (!raw) {
      return defaultProfile;
    }

    const parsed = JSON.parse(raw) as Partial<UserProfile>;
    return {
      firstName: parsed.firstName?.trim() || defaultProfile.firstName,
      lastName: parsed.lastName?.trim() || defaultProfile.lastName,
      username: parsed.username?.trim() || "",
      photoDataUrl: parsed.photoDataUrl?.trim() || "",
      cookingEquipment: normalizeCookingEquipment(parsed.cookingEquipment),
      selectedBadge:
        parsed.selectedBadge?.trim() || defaultProfile.selectedBadge,
      unlockedBadges:
        Array.isArray(parsed.unlockedBadges) && parsed.unlockedBadges.length > 0
          ? parsed.unlockedBadges.filter((item): item is string => typeof item === "string")
          : defaultProfile.unlockedBadges,
      acceptedTermsAt: parsed.acceptedTermsAt || null,
      acceptedPrivacyAt: parsed.acceptedPrivacyAt || null,
      acceptedTermsVersion: parsed.acceptedTermsVersion || null,
      acceptedPrivacyVersion: parsed.acceptedPrivacyVersion || null,
    };
  } catch {
    return defaultProfile;
  }
}

export function saveUserProfile(profile: UserProfile): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
  window.dispatchEvent(new CustomEvent("temai:profile-updated"));
}

function normalizeProfile(partial?: Partial<UserProfile> | null): UserProfile {
  if (!partial) return defaultProfile;
  return {
    firstName: partial.firstName?.trim() || defaultProfile.firstName,
    lastName: partial.lastName?.trim() || defaultProfile.lastName,
    username: partial.username?.trim() || "",
    photoDataUrl: partial.photoDataUrl?.trim() || "",
    cookingEquipment: normalizeCookingEquipment(partial.cookingEquipment),
    selectedBadge: partial.selectedBadge?.trim() || defaultProfile.selectedBadge,
    unlockedBadges:
      Array.isArray(partial.unlockedBadges) && partial.unlockedBadges.length > 0
        ? partial.unlockedBadges.filter((item): item is string => typeof item === "string")
        : defaultProfile.unlockedBadges,
    acceptedTermsAt: partial.acceptedTermsAt || null,
    acceptedPrivacyAt: partial.acceptedPrivacyAt || null,
    acceptedTermsVersion: partial.acceptedTermsVersion || null,
    acceptedPrivacyVersion: partial.acceptedPrivacyVersion || null,
  };
}

export async function syncUserProfileFromCloud(): Promise<UserProfile | null> {
  const client = getSupabaseBrowserClient();
  if (!client) return null;

  const userRes = await client.auth.getUser();
  const userId = userRes.data.user?.id;
  if (!userId) return null;

  const { data, error } = await client
    .from("profiles")
    .select("first_name,last_name,username,avatar_url,cooking_equipment,selected_badge,unlocked_badges,accepted_terms_at,accepted_privacy_at,accepted_terms_version,accepted_privacy_version")
    .eq("id", userId)
    .single();

  if (error || !data) {
    const local = getUserProfile();
    await saveUserProfileToCloud(local);
    return local;
  }

  const normalized = normalizeProfile({
    firstName: data.first_name || "",
    lastName: data.last_name || "",
    username: data.username || "",
    photoDataUrl: data.avatar_url || "",
    cookingEquipment: normalizeCookingEquipment(data.cooking_equipment),
    selectedBadge: data.selected_badge || "estagiario",
    unlockedBadges: Array.isArray(data.unlocked_badges) ? data.unlocked_badges : ["estagiario"],
    acceptedTermsAt: data.accepted_terms_at || null,
    acceptedPrivacyAt: data.accepted_privacy_at || null,
    acceptedTermsVersion: data.accepted_terms_version || null,
    acceptedPrivacyVersion: data.accepted_privacy_version || null,
  });

  saveUserProfile(normalized);
  return normalized;
}

function mapProfileSaveError(error: { code?: string; message?: string }): SaveUserProfileToCloudResult {
  const message = (error.message || "").toLowerCase();
  if (
    error.code === "23505" ||
    message.includes("profiles_username_unique_idx") ||
    message.includes("duplicate key")
  ) {
    return {
      ok: false,
      code: "username_taken",
      message: "Esse @ já está em uso. Escolha outro.",
    };
  }

  return {
    ok: false,
    code: "sync_failed",
    message: "Não foi possível sincronizar seu perfil agora. Tente novamente.",
  };
}

export async function saveUserProfileToCloudDetailed(profile: UserProfile): Promise<SaveUserProfileToCloudResult> {
  const client = getSupabaseBrowserClient();
  if (!client) {
    return {
      ok: false,
      code: "sync_failed",
      message: "Supabase não configurado.",
    };
  }

  const userRes = await client.auth.getUser();
  const userId = userRes.data.user?.id;
  if (!userId) {
    return {
      ok: false,
      code: "not_authenticated",
      message: "Faça login para sincronizar seu perfil.",
    };
  }

  const normalized = normalizeProfile(profile);
  const payload: Record<string, unknown> = {
    id: userId,
    first_name: normalized.firstName,
    last_name: normalized.lastName,
    username: normalized.username || null,
    cooking_equipment: normalized.cookingEquipment,
    selected_badge: normalized.selectedBadge,
    unlocked_badges: normalized.unlockedBadges,
    accepted_terms_at: normalized.acceptedTermsAt,
    accepted_privacy_at: normalized.acceptedPrivacyAt,
    accepted_terms_version: normalized.acceptedTermsVersion || (normalized.acceptedTermsAt ? LEGAL_TERMS_VERSION : null),
    accepted_privacy_version:
      normalized.acceptedPrivacyVersion || (normalized.acceptedPrivacyAt ? LEGAL_PRIVACY_VERSION : null),
  };

  if (normalized.photoDataUrl) {
    payload.avatar_url = normalized.photoDataUrl;
  }

  const { error } = await client.from("profiles").upsert(payload, { onConflict: "id" });

  if (error) return mapProfileSaveError(error);
  return { ok: true };
}

export async function saveUserProfileToCloud(profile: UserProfile): Promise<boolean> {
  const result = await saveUserProfileToCloudDetailed(profile);
  return result.ok;
}
