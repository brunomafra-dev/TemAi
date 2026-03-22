"use client";

export interface UserProfile {
  firstName: string;
  lastName: string;
  photoDataUrl: string;
}

const PROFILE_STORAGE_KEY = "temai_user_profile";

const defaultProfile: UserProfile = {
  firstName: "Bruno",
  lastName: "Mafra",
  photoDataUrl: "",
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
}
