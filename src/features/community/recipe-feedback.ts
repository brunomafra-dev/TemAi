import "server-only";
import { createUserNotification } from "@/features/community/notifications";
import { getSupabaseServiceRoleClient } from "@/lib/supabase-admin";

export type LibraryRecipeFeedback = {
  averageRating: number;
  ratingCount: number;
  userRating: number;
  comments: RecipeCommentView[];
};

export type RecipeCommentView = {
  id: string;
  body: string;
  authorName: string;
  authorUsername?: string;
  authorAvatarUrl?: string;
  createdAt: string;
};

export type LibraryRecipeRow = {
  id: string;
  slug: string;
  title: string;
  author_user_id: string | null;
  source_name: string;
};

type RatingRow = {
  rating: number | string;
  user_id: string | null;
};

type CommentRow = {
  id: string;
  body: string;
  author_name: string;
  author_username: string | null;
  author_avatar_url: string | null;
  created_at: string;
};

export async function resolveApprovedRecipe(slug: string): Promise<LibraryRecipeRow | null> {
  const supabase = getSupabaseServiceRoleClient();
  const { data, error } = await supabase
    .from("recipes_br")
    .select("id,slug,title,author_user_id,source_name")
    .eq("slug", slug)
    .eq("is_published", true)
    .eq("moderation_status", "approved")
    .maybeSingle();

  if (error || !data) return null;
  return data as LibraryRecipeRow;
}

function toUiRating(value: number | string): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(1, Math.min(10, Math.round(numeric * 2)));
}

function mapComment(row: CommentRow): RecipeCommentView {
  return {
    id: row.id,
    body: row.body,
    authorName: row.author_name || "Usuário TemAi",
    authorUsername: row.author_username || undefined,
    authorAvatarUrl: row.author_avatar_url || undefined,
    createdAt: row.created_at,
  };
}

export async function getLibraryRecipeFeedback(params: {
  recipeSlug: string;
  userId?: string;
}): Promise<LibraryRecipeFeedback | null> {
  const recipe = await resolveApprovedRecipe(params.recipeSlug);
  if (!recipe) return null;

  const supabase = getSupabaseServiceRoleClient();
  const [ratingsRes, commentsRes] = await Promise.all([
    supabase
      .from("recipe_ratings")
      .select("rating,user_id")
      .eq("recipe_id", recipe.id),
    supabase
      .from("recipe_comments")
      .select("id,body,author_name,author_username,author_avatar_url,created_at")
      .eq("recipe_id", recipe.id)
      .eq("status", "visible")
      .order("created_at", { ascending: false })
      .limit(25),
  ]);

  const ratings = (ratingsRes.data || []) as RatingRow[];
  const sum = ratings.reduce((total, row) => total + Number(row.rating || 0), 0);
  const average = ratings.length > 0 ? sum / ratings.length : 0;
  const userRatingRow = params.userId
    ? ratings.find((row) => row.user_id === params.userId)
    : undefined;

  return {
    averageRating: average > 0 ? Number((average * 2).toFixed(1)) : 0,
    ratingCount: ratings.length,
    userRating: userRatingRow ? toUiRating(userRatingRow.rating) : 0,
    comments: ((commentsRes.data || []) as CommentRow[]).map(mapComment),
  };
}

export async function saveLibraryRecipeRating(params: {
  recipeSlug: string;
  userId: string;
  rating: number;
}): Promise<LibraryRecipeFeedback | null> {
  const recipe = await resolveApprovedRecipe(params.recipeSlug);
  if (!recipe) return null;

  const supabase = getSupabaseServiceRoleClient();
  const storedRating = Math.max(0.5, Math.min(5, params.rating / 2));
  const existing = await supabase
    .from("recipe_ratings")
    .select("id")
    .eq("recipe_id", recipe.id)
    .eq("user_id", params.userId)
    .maybeSingle();

  if (existing.data?.id) {
    await supabase
      .from("recipe_ratings")
      .update({ rating: storedRating })
      .eq("id", existing.data.id);
  } else {
    await supabase.from("recipe_ratings").insert({
      recipe_id: recipe.id,
      user_id: params.userId,
      user_fingerprint: `user:${params.userId}`,
      rating: storedRating,
    });
  }

  if (recipe.author_user_id && recipe.author_user_id !== params.userId) {
    await createUserNotification({
      userId: recipe.author_user_id,
      type: "rating",
      title: "Sua receita recebeu uma avaliação",
      body: `${recipe.title} recebeu uma nova nota.`,
      href: `/receita/${recipe.slug}?origin=library`,
      metadata: { recipeSlug: recipe.slug, rating: params.rating },
    }).catch(() => undefined);
  }

  return getLibraryRecipeFeedback({ recipeSlug: params.recipeSlug, userId: params.userId });
}

export async function getUserCommentSnapshot(userId: string): Promise<{
  authorName: string;
  authorUsername?: string;
  authorAvatarUrl?: string;
}> {
  const supabase = getSupabaseServiceRoleClient();
  const { data } = await supabase
    .from("profiles")
    .select("first_name,last_name,username,avatar_url")
    .eq("id", userId)
    .maybeSingle();

  const firstName = typeof data?.first_name === "string" ? data.first_name.trim() : "";
  const lastName = typeof data?.last_name === "string" ? data.last_name.trim() : "";
  const username = typeof data?.username === "string" ? data.username.trim().replace(/^@+/, "") : "";
  return {
    authorName: [firstName, lastName].filter(Boolean).join(" ") || "Usuário TemAi",
    authorUsername: username || undefined,
    authorAvatarUrl: typeof data?.avatar_url === "string" ? data.avatar_url : undefined,
  };
}

export async function insertLibraryRecipeComment(params: {
  recipeSlug: string;
  userId: string;
  body: string;
  moderationResult: Record<string, unknown>;
}): Promise<LibraryRecipeFeedback | null> {
  const recipe = await resolveApprovedRecipe(params.recipeSlug);
  if (!recipe) return null;

  const supabase = getSupabaseServiceRoleClient();
  const snapshot = await getUserCommentSnapshot(params.userId);

  await supabase.from("recipe_comments").insert({
    recipe_id: recipe.id,
    user_id: params.userId,
    body: params.body,
    author_name: snapshot.authorName,
    author_username: snapshot.authorUsername || null,
    author_avatar_url: snapshot.authorAvatarUrl || null,
    status: "visible",
    moderation_result: params.moderationResult,
  });

  if (recipe.author_user_id && recipe.author_user_id !== params.userId) {
    await createUserNotification({
      userId: recipe.author_user_id,
      type: "comment",
      title: "Novo comentário na sua receita",
      body: `${snapshot.authorName} comentou em ${recipe.title}.`,
      href: `/receita/${recipe.slug}?origin=library`,
      metadata: { recipeSlug: recipe.slug },
    }).catch(() => undefined);
  }

  return getLibraryRecipeFeedback({ recipeSlug: params.recipeSlug, userId: params.userId });
}

export async function reportLibraryRecipe(params: {
  recipeSlug: string;
  userId: string;
  reason: string;
  detail?: string;
  metadata?: Record<string, unknown>;
}): Promise<{ hiddenForReview: boolean } | null> {
  const recipe = await resolveApprovedRecipe(params.recipeSlug);
  if (!recipe) return null;

  const supabase = getSupabaseServiceRoleClient();
  const { error } = await supabase.from("recipe_reports").insert({
    recipe_id: recipe.id,
    user_id: params.userId,
    reason: params.reason,
    detail: params.detail || null,
    metadata: params.metadata || {},
  });

  if (error) {
    const message = error.message.toLowerCase();
    if (error.code === "23505" || message.includes("duplicate key")) {
      throw new Error("Você já denunciou esta receita.");
    }
    throw error;
  }

  const severeReasons = ["inappropriate", "dangerous"];
  const shouldCountAsSevere = severeReasons.includes(params.reason);
  let hiddenForReview = false;

  if (shouldCountAsSevere) {
    const { count } = await supabase
      .from("recipe_reports")
      .select("id", { count: "exact", head: true })
      .eq("recipe_id", recipe.id)
      .eq("status", "open")
      .in("reason", severeReasons);

    if ((count || 0) >= 2) {
      hiddenForReview = true;
      await supabase
        .from("recipes_br")
        .update({
          is_published: false,
          moderation_status: "review",
          moderation_reason: "Receita removida temporariamente após denúncias de usuários.",
          moderated_at: new Date().toISOString(),
        })
        .eq("id", recipe.id);
    }
  }

  if (recipe.author_user_id) {
    await createUserNotification({
      userId: recipe.author_user_id,
      type: "recipe_review",
      title: hiddenForReview ? "Receita em revisão" : "Sua receita recebeu uma denúncia",
      body: hiddenForReview
        ? `${recipe.title} saiu da Biblioteca temporariamente para revisão.`
        : `${recipe.title} recebeu uma denúncia e será analisada se houver reincidência.`,
      href: hiddenForReview ? undefined : `/receita/${recipe.slug}?origin=library`,
      metadata: { recipeSlug: recipe.slug, reason: params.reason },
    }).catch(() => undefined);
  }

  return { hiddenForReview };
}
