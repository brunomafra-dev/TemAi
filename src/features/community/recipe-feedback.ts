import "server-only";
import { createUserNotification } from "@/features/community/notifications";
import { getSupabaseServiceRoleClient } from "@/lib/supabase-admin";

export type LibraryRecipeFeedback = {
  averageRating: number;
  ratingCount: number;
  userRating: number;
  comments: RecipeCommentView[];
};

export type LibraryRecipePopularity = {
  ratingAverage: number;
  ratingCount: number;
  viewCount: number;
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

type CommentWithRecipeRow = CommentRow & {
  recipe_id: string;
  user_id: string;
  recipes_br?: LibraryRecipeRow | LibraryRecipeRow[] | null;
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

export async function getLibraryRecipePopularity(recipeIds: string[]): Promise<Map<string, LibraryRecipePopularity>> {
  const supabase = getSupabaseServiceRoleClient();
  const uniqueIds = Array.from(new Set(recipeIds.filter(Boolean)));
  const result = new Map<string, LibraryRecipePopularity>();
  uniqueIds.forEach((id) => result.set(id, { ratingAverage: 0, ratingCount: 0, viewCount: 0 }));
  if (!uniqueIds.length) return result;

  const [ratingsRes, viewsRes] = await Promise.all([
    supabase.from("recipe_ratings").select("recipe_id,rating").in("recipe_id", uniqueIds),
    supabase.from("recipe_view_events").select("recipe_id").in("recipe_id", uniqueIds),
  ]);

  const ratingMap = new Map<string, { sum: number; count: number }>();
  (ratingsRes.data || []).forEach((row) => {
    const entry = row as { recipe_id?: string; rating?: number | string };
    if (!entry.recipe_id) return;
    const current = ratingMap.get(entry.recipe_id) || { sum: 0, count: 0 };
    current.sum += Number(entry.rating || 0);
    current.count += 1;
    ratingMap.set(entry.recipe_id, current);
  });

  const viewMap = new Map<string, number>();
  (viewsRes.data || []).forEach((row) => {
    const entry = row as { recipe_id?: string };
    if (!entry.recipe_id) return;
    viewMap.set(entry.recipe_id, (viewMap.get(entry.recipe_id) || 0) + 1);
  });

  uniqueIds.forEach((id) => {
    const ratings = ratingMap.get(id);
    result.set(id, {
      ratingAverage: ratings && ratings.count > 0 ? Number((ratings.sum * 2 / ratings.count).toFixed(1)) : 0,
      ratingCount: ratings?.count || 0,
      viewCount: viewMap.get(id) || 0,
    });
  });

  return result;
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

export async function recordLibraryRecipeView(params: {
  recipeSlug: string;
  userId?: string;
  visitorKey: string;
}): Promise<boolean> {
  const recipe = await resolveApprovedRecipe(params.recipeSlug);
  if (!recipe) return false;

  const supabase = getSupabaseServiceRoleClient();
  const { error } = await supabase.from("recipe_view_events").insert({
    recipe_id: recipe.id,
    user_id: params.userId || null,
    visitor_key: params.visitorKey,
  });
  if (error && error.code !== "23505") throw error;

  return true;
}

export async function reportLibraryRecipeComment(params: {
  recipeSlug: string;
  commentId: string;
  userId: string;
  reason: string;
  detail?: string;
}): Promise<{ hiddenForReview: boolean } | null> {
  const supabase = getSupabaseServiceRoleClient();
  const { data } = await supabase
    .from("recipe_comments")
    .select("id,body,author_name,author_username,author_avatar_url,created_at,recipe_id,user_id,recipes_br!inner(id,slug,title,author_user_id,source_name,is_published,moderation_status)")
    .eq("id", params.commentId)
    .eq("status", "visible")
    .eq("recipes_br.slug", params.recipeSlug)
    .eq("recipes_br.is_published", true)
    .eq("recipes_br.moderation_status", "approved")
    .maybeSingle();

  if (!data) return null;
  const comment = data as CommentWithRecipeRow;
  const recipeJoin = Array.isArray(comment.recipes_br) ? comment.recipes_br[0] : comment.recipes_br;
  if (!recipeJoin) return null;

  if (comment.user_id === params.userId) {
    throw new Error("Você não pode denunciar seu próprio comentário.");
  }

  const { error } = await supabase.from("recipe_comment_reports").insert({
    comment_id: comment.id,
    recipe_id: comment.recipe_id,
    user_id: params.userId,
    reason: params.reason,
    detail: params.detail || null,
  });

  if (error) {
    const message = error.message.toLowerCase();
    if (error.code === "23505" || message.includes("duplicate key")) {
      throw new Error("Você já denunciou este comentário.");
    }
    throw error;
  }

  const severeReasons = ["inappropriate", "harassment", "dangerous"];
  let hiddenForReview = false;

  if (severeReasons.includes(params.reason)) {
    const { count } = await supabase
      .from("recipe_comment_reports")
      .select("id", { count: "exact", head: true })
      .eq("comment_id", comment.id)
      .eq("status", "open")
      .in("reason", severeReasons);

    if ((count || 0) >= 2) {
      hiddenForReview = true;
      await supabase
        .from("recipe_comments")
        .update({
          status: "review",
          moderation_result: {
            reportReason: "Comentário ocultado após denúncias únicas de usuários.",
            hiddenAt: new Date().toISOString(),
          },
        })
        .eq("id", comment.id);
    }
  }

  const authorUserId = recipeJoin.author_user_id;
  if (authorUserId) {
    await createUserNotification({
      userId: authorUserId,
      type: "comment_report",
      title: hiddenForReview ? "Comentário em revisão" : "Comentário denunciado",
      body: hiddenForReview
        ? `Um comentário em ${recipeJoin.title} saiu temporariamente da receita.`
        : `Um comentário em ${recipeJoin.title} recebeu uma denúncia.`,
      href: `/receita/${recipeJoin.slug}?origin=library`,
      metadata: { recipeSlug: recipeJoin.slug, commentId: comment.id, reason: params.reason },
    }).catch(() => undefined);
  }

  return { hiddenForReview };
}
