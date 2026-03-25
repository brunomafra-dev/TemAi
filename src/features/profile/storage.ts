"use client";

export interface UserProfile {
  firstName: string;
  lastName: string;
  photoDataUrl: string;
  selectedBadge: string;
  unlockedBadges: string[];
}

const PROFILE_STORAGE_KEY = "temai_user_profile";

const defaultProfile: UserProfile = {
  firstName: "Bruno",
  lastName: "Mafra",
  photoDataUrl: "",
  selectedBadge: "estagiario",
  unlockedBadges: ["estagiario"],
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
      photoDataUrl: parsed.photoDataUrl?.trim() || "",
      selectedBadge:
        parsed.selectedBadge?.trim() || defaultProfile.selectedBadge,
      unlockedBadges:
        Array.isArray(parsed.unlockedBadges) && parsed.unlockedBadges.length > 0
          ? parsed.unlockedBadges.filter((item): item is string => typeof item === "string")
          : defaultProfile.unlockedBadges,
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
