export interface NotificationPrefs {
  recipeRating: boolean;
  newBadge: boolean;
  publishSuccess: boolean;
  shoppingUpdates: boolean;
}

const NOTIFICATION_PREFS_KEY = "temai_notification_prefs_v1";

const defaultPrefs: NotificationPrefs = {
  recipeRating: true,
  newBadge: true,
  publishSuccess: true,
  shoppingUpdates: true,
};

function hasWindow(): boolean {
  return typeof window !== "undefined";
}

export function getNotificationPrefs(): NotificationPrefs {
  if (!hasWindow()) return defaultPrefs;
  try {
    const raw = window.localStorage.getItem(NOTIFICATION_PREFS_KEY);
    if (!raw) return defaultPrefs;
    const parsed = JSON.parse(raw) as Partial<NotificationPrefs>;
    return {
      recipeRating: parsed.recipeRating ?? defaultPrefs.recipeRating,
      newBadge: parsed.newBadge ?? defaultPrefs.newBadge,
      publishSuccess: parsed.publishSuccess ?? defaultPrefs.publishSuccess,
      shoppingUpdates: parsed.shoppingUpdates ?? defaultPrefs.shoppingUpdates,
    };
  } catch {
    return defaultPrefs;
  }
}

export function saveNotificationPrefs(prefs: NotificationPrefs): void {
  if (!hasWindow()) return;
  window.localStorage.setItem(NOTIFICATION_PREFS_KEY, JSON.stringify(prefs));
}
