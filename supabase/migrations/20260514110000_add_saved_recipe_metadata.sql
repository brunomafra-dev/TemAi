alter table public.saved_recipes
  add column if not exists title text,
  add column if not exists description text,
  add column if not exists image_url text,
  add column if not exists source_label text,
  add column if not exists recipe_snapshot jsonb,
  add column if not exists ingredients_snapshot text[],
  add column if not exists generation_id text,
  add column if not exists source_suggestion_id text,
  add column if not exists cooking_equipment text[];

create index if not exists saved_recipes_user_saved_at_idx
on public.saved_recipes(user_id, saved_at desc);
