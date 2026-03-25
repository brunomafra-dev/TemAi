alter table public.recipes_br
  drop constraint if exists recipes_br_category_check;

alter table public.recipes_br
  add constraint recipes_br_category_check
  check (category in ('principais', 'veggie', 'massas', 'kids', 'sobremesas', 'bebidas', 'lanches'));
