"use client";

import { getSupabaseBrowserClient } from "@/lib/supabase-client";
import {
  DEFAULT_COOKING_EQUIPMENT,
  normalizeCookingEquipment,
} from "@/features/recipes/cooking-equipment";
import type { CookingEquipment } from "@/features/recipes/types";

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
}

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
    .select("first_name,last_name,username,avatar_url,cooking_equipment,selected_badge,unlocked_badges,accepted_terms_at,accepted_privacy_at")
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
  });

  saveUserProfile(normalized);
  return normalized;
}

export async function saveUserProfileToCloud(profile: UserProfile): Promise<boolean> {
  const client = getSupabaseBrowserClient();
  if (!client) return false;

  const userRes = await client.auth.getUser();
  const userId = userRes.data.user?.id;
  if (!userId) return false;

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
  };

  if (normalized.photoDataUrl) {
    payload.avatar_url = normalized.photoDataUrl;
  }

  const { error } = await client.from("profiles").upsert(payload, { onConflict: "id" });

  return !error;
}
