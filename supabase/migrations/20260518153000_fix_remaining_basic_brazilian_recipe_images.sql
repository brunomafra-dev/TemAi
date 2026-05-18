update public.recipes_br as recipe
set
  image_url = images.image_url,
  updated_at = now()
from (
  values
    ('molho-de-tomate-caseiro', 'https://images.pexels.com/photos/5379435/pexels-photo-5379435.jpeg?auto=compress&cs=tinysrgb&w=1200'),
    ('carne-moida-refogada', 'https://images.pexels.com/photos/34429593/pexels-photo-34429593.jpeg?auto=compress&cs=tinysrgb&w=1200'),
    ('escondidinho-simples', 'https://upload.wikimedia.org/wikipedia/commons/1/19/Shepherds-pie---2023-11-02.jpg'),
    ('fricasse-de-frango', 'https://images.pexels.com/photos/31233887/pexels-photo-31233887.jpeg?auto=compress&cs=tinysrgb&w=1200')
) as images(slug, image_url)
where recipe.slug = images.slug
  and recipe.source_name = 'TemAI Curadoria';
