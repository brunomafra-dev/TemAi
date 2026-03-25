insert into public.badges (slug, name, description, icon)
values
  ('estagiario', '🌱 Estagiario', '0 a 3 receitas postadas.', 'seedling'),
  ('cozinheiro_junior', '🍳 Cozinheiro Junior', '4 a 10 receitas postadas.', 'pan'),
  ('cozinheiro_pleno', '🥘 Cozinheiro Pleno', '11 a 30 receitas postadas.', 'pot'),
  ('cozinheiro_senior', '🔥 Cozinheiro Senior', '31 a 50 receitas postadas.', 'flame'),
  ('chef', '👨‍🍳 Chef', '51 a 100 receitas postadas.', 'chef-hat'),
  ('chef_executivo', '👑 Chef Executivo', '101+ receitas postadas.', 'crown'),
  ('plant_based_chef', '🥗 Plant Based Chef', '30+ receitas veggie postadas.', 'leaf'),
  ('confeiteiro', '🍰 Confeiteiro', '10 a 30 receitas sobremesa postadas.', 'cake'),
  ('chef_confeiteiro', '🧁 Chef Confeiteiro', '31+ receitas sobremesa postadas.', 'cupcake'),
  ('mestre_dos_lanches', '🍔 Mestre dos Lanches', '20+ receitas de lanches postadas.', 'burger'),
  ('mixologista', '🥤 Mixologista', '20+ receitas de bebidas postadas.', 'drink')
on conflict (slug) do update
set name = excluded.name,
    description = excluded.description,
    icon = excluded.icon;

-- badge antigo substituido por mixologista
update public.author_badges
set badge_slug = 'mixologista'
where badge_slug = 'rei_das_bebidas';

delete from public.badges where slug = 'rei_das_bebidas';

create or replace function public.refresh_author_badges(p_author_handle text)
returns void
language plpgsql
security definer
as $$
declare
  v_handle text := lower(trim(coalesce(p_author_handle, '')));
  v_total int := 0;
  v_veggie int := 0;
  v_sobremesas int := 0;
  v_lanches int := 0;
  v_bebidas int := 0;
begin
  if v_handle = '' then
    return;
  end if;

  select count(*) into v_total
  from public.recipes_br r
  where r.is_published = true
    and lower(r.source_name) = '@' || v_handle
    and r.source_url like 'temai://community/%';

  select count(*) into v_veggie
  from public.recipes_br r
  where r.is_published = true
    and lower(r.source_name) = '@' || v_handle
    and r.source_url like 'temai://community/%'
    and r.category = 'veggie';

  select count(*) into v_sobremesas
  from public.recipes_br r
  where r.is_published = true
    and lower(r.source_name) = '@' || v_handle
    and r.source_url like 'temai://community/%'
    and r.category = 'sobremesas';

  select count(*) into v_lanches
  from public.recipes_br r
  where r.is_published = true
    and lower(r.source_name) = '@' || v_handle
    and r.source_url like 'temai://community/%'
    and r.category = 'lanches';

  select count(*) into v_bebidas
  from public.recipes_br r
  where r.is_published = true
    and lower(r.source_name) = '@' || v_handle
    and r.source_url like 'temai://community/%'
    and r.category = 'bebidas';

  -- faixas por total
  if v_total between 0 and 3 then
    insert into public.author_badges(author_handle, badge_slug)
    values (v_handle, 'estagiario')
    on conflict (author_handle, badge_slug) do nothing;
  else
    delete from public.author_badges where author_handle = v_handle and badge_slug = 'estagiario';
  end if;

  if v_total >= 4 then
    insert into public.author_badges(author_handle, badge_slug)
    values (v_handle, 'cozinheiro_junior')
    on conflict (author_handle, badge_slug) do nothing;
  else
    delete from public.author_badges where author_handle = v_handle and badge_slug = 'cozinheiro_junior';
  end if;

  if v_total >= 11 then
    insert into public.author_badges(author_handle, badge_slug)
    values (v_handle, 'cozinheiro_pleno')
    on conflict (author_handle, badge_slug) do nothing;
  else
    delete from public.author_badges where author_handle = v_handle and badge_slug = 'cozinheiro_pleno';
  end if;

  if v_total >= 31 then
    insert into public.author_badges(author_handle, badge_slug)
    values (v_handle, 'cozinheiro_senior')
    on conflict (author_handle, badge_slug) do nothing;
  else
    delete from public.author_badges where author_handle = v_handle and badge_slug = 'cozinheiro_senior';
  end if;

  if v_total >= 51 then
    insert into public.author_badges(author_handle, badge_slug)
    values (v_handle, 'chef')
    on conflict (author_handle, badge_slug) do nothing;
  else
    delete from public.author_badges where author_handle = v_handle and badge_slug = 'chef';
  end if;

  if v_total >= 101 then
    insert into public.author_badges(author_handle, badge_slug)
    values (v_handle, 'chef_executivo')
    on conflict (author_handle, badge_slug) do nothing;
  else
    delete from public.author_badges where author_handle = v_handle and badge_slug = 'chef_executivo';
  end if;

  -- especiais por categoria
  if v_veggie >= 30 then
    insert into public.author_badges(author_handle, badge_slug)
    values (v_handle, 'plant_based_chef')
    on conflict (author_handle, badge_slug) do nothing;
  else
    delete from public.author_badges where author_handle = v_handle and badge_slug = 'plant_based_chef';
  end if;

  if v_sobremesas >= 10 then
    insert into public.author_badges(author_handle, badge_slug)
    values (v_handle, 'confeiteiro')
    on conflict (author_handle, badge_slug) do nothing;
  else
    delete from public.author_badges where author_handle = v_handle and badge_slug = 'confeiteiro';
  end if;

  if v_sobremesas >= 31 then
    insert into public.author_badges(author_handle, badge_slug)
    values (v_handle, 'chef_confeiteiro')
    on conflict (author_handle, badge_slug) do nothing;
  else
    delete from public.author_badges where author_handle = v_handle and badge_slug = 'chef_confeiteiro';
  end if;

  if v_lanches >= 20 then
    insert into public.author_badges(author_handle, badge_slug)
    values (v_handle, 'mestre_dos_lanches')
    on conflict (author_handle, badge_slug) do nothing;
  else
    delete from public.author_badges where author_handle = v_handle and badge_slug = 'mestre_dos_lanches';
  end if;

  if v_bebidas >= 20 then
    insert into public.author_badges(author_handle, badge_slug)
    values (v_handle, 'mixologista')
    on conflict (author_handle, badge_slug) do nothing;
  else
    delete from public.author_badges where author_handle = v_handle and badge_slug = 'mixologista';
  end if;
end;
$$;

grant execute on function public.refresh_author_badges(text) to anon, authenticated, service_role;
