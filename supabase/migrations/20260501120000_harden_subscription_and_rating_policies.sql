drop policy if exists "user_subscriptions own write" on public.user_subscriptions;

drop policy if exists "user_subscriptions service role write" on public.user_subscriptions;
create policy "user_subscriptions service role write"
on public.user_subscriptions for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

drop policy if exists "public can write recipe_ratings" on public.recipe_ratings;
drop policy if exists "public can update recipe_ratings" on public.recipe_ratings;

drop policy if exists "authenticated can write recipe_ratings" on public.recipe_ratings;
create policy "authenticated can write recipe_ratings"
on public.recipe_ratings for insert
to authenticated
with check (true);

drop policy if exists "authenticated can update recipe_ratings" on public.recipe_ratings;
create policy "authenticated can update recipe_ratings"
on public.recipe_ratings for update
to authenticated
using (true)
with check (true);
