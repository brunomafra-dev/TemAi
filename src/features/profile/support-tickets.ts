"use client";

import { getSupabaseBrowserClient } from "@/lib/supabase-client";

export type SupportTicket = {
  id: string;
  subject: string;
  message: string;
  status: "open" | "in_progress" | "resolved" | "closed";
  createdAt: string;
};

export async function createSupportTicket(params: {
  subject: string;
  message: string;
  metadata?: Record<string, unknown>;
}): Promise<SupportTicket | null> {
  const client = getSupabaseBrowserClient();
  if (!client) return null;

  const userRes = await client.auth.getUser();
  const userId = userRes.data.user?.id;
  if (!userId) return null;

  const { data, error } = await client
    .from("support_tickets")
    .insert({
      user_id: userId,
      subject: params.subject,
      message: params.message,
      source: "app_chat",
      metadata: params.metadata || {},
    })
    .select("id,subject,message,status,created_at")
    .single();

  if (error || !data) return null;

  return {
    id: data.id,
    subject: data.subject,
    message: data.message,
    status: data.status,
    createdAt: data.created_at,
  };
}

export async function getMySupportTickets(limit = 5): Promise<SupportTicket[]> {
  const client = getSupabaseBrowserClient();
  if (!client) return [];

  const userRes = await client.auth.getUser();
  const userId = userRes.data.user?.id;
  if (!userId) return [];

  const { data, error } = await client
    .from("support_tickets")
    .select("id,subject,message,status,created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) return [];

  return data.map((item) => ({
    id: item.id,
    subject: item.subject,
    message: item.message,
    status: item.status,
    createdAt: item.created_at,
  }));
}
