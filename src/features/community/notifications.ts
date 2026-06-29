import "server-only";
import { getSupabaseServiceRoleClient } from "@/lib/supabase-admin";

export type UserNotificationType =
  | "recipe_published"
  | "recipe_blocked"
  | "recipe_review"
  | "comment"
  | "comment_report"
  | "rating"
  | "general";

export interface UserNotification {
  id: string;
  type: UserNotificationType;
  title: string;
  body: string;
  href?: string;
  readAt?: string;
  createdAt: string;
  metadata: Record<string, unknown>;
}

interface NotificationRow {
  id: string;
  type: string;
  title: string;
  body: string;
  href: string | null;
  read_at: string | null;
  created_at: string;
  metadata: Record<string, unknown> | null;
}

function mapNotification(row: NotificationRow): UserNotification {
  return {
    id: row.id,
    type: row.type as UserNotificationType,
    title: row.title,
    body: row.body,
    href: row.href || undefined,
    readAt: row.read_at || undefined,
    createdAt: row.created_at,
    metadata: row.metadata || {},
  };
}

export async function createUserNotification(params: {
  userId: string;
  type: UserNotificationType;
  title: string;
  body: string;
  href?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  if (!params.userId) return;

  const supabase = getSupabaseServiceRoleClient();
  await supabase.from("user_notifications").insert({
    user_id: params.userId,
    type: params.type,
    title: params.title.slice(0, 120),
    body: params.body.slice(0, 500),
    href: params.href || null,
    metadata: params.metadata || {},
  });
}

export async function listUserNotifications(
  userId: string,
  limit = 20,
): Promise<{
  notifications: UserNotification[];
  unreadCount: number;
}> {
  const supabase = getSupabaseServiceRoleClient();
  const safeLimit = Math.max(1, Math.min(50, Math.floor(limit)));

  const [itemsRes, unreadRes] = await Promise.all([
    supabase
      .from("user_notifications")
      .select("id,type,title,body,href,read_at,created_at,metadata")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(safeLimit),
    supabase
      .from("user_notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .is("read_at", null),
  ]);

  if (itemsRes.error) {
    throw itemsRes.error;
  }

  return {
    notifications: ((itemsRes.data || []) as NotificationRow[]).map(mapNotification),
    unreadCount: unreadRes.count || 0,
  };
}

export async function markUserNotificationsRead(params: {
  userId: string;
  notificationId?: string;
  all?: boolean;
}): Promise<void> {
  const supabase = getSupabaseServiceRoleClient();
  const query = supabase
    .from("user_notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", params.userId)
    .is("read_at", null);

  if (!params.all && params.notificationId) {
    await query.eq("id", params.notificationId);
    return;
  }

  await query;
}
