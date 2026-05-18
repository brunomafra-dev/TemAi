update public.recipes_br as recipe
set
  image_url = images.image_url,
  updated_at = now()
from (
  values
    ('feijao-caseiro', 'https://images.unsplash.com/photo-1543158181-1274e5362710?auto=format&fit=crop&w=1200&q=80'),
    ('macarrao-alho-e-oleo', 'https://upload.wikimedia.org/wikipedia/commons/3/3e/Spaghetti_aglio_e_olio_KB.jpg'),
    ('macarrao-molho-branco', 'https://images.unsplash.com/photo-1768668053140-f589ed4bef31?auto=format&fit=crop&w=1200&q=80'),
    ('pure-de-batata', 'https://images.unsplash.com/photo-1707616954324-99c89a78a20d?auto=format&fit=crop&w=1200&q=80'),
    ('strogonoff-de-frango', 'https://upload.wikimedia.org/wikipedia/commons/b/b4/Chicken_stroganoff.jpg'),
    ('panqueca-simples', 'https://images.unsplash.com/photo-1771268494481-cc301a1b7505?auto=format&fit=crop&w=1200&q=80'),
    ('farofa-simples', 'https://upload.wikimedia.org/wikipedia/commons/6/6e/Farofa_de_cebola.jpg'),
    ('bolo-simples', 'https://upload.wikimedia.org/wikipedia/commons/8/8a/Bolo_de_fub%C3%A1.jpg'),
    ('cuscuz-simples', 'https://upload.wikimedia.org/wikipedia/commons/3/3f/Cuscuz_nordestino.jpg')
) as images(slug, image_url)
where recipe.slug = images.slug
  and recipe.source_name = 'TemAI Curadoria';

delete from public.recipes_br
where slug = 'brigadeiro'
  and source_name = 'TemAI Curadoria';
