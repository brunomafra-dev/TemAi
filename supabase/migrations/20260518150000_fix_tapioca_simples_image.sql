update public.recipes_br
set
  image_url = 'https://images.pexels.com/photos/5860731/pexels-photo-5860731.jpeg?auto=compress&cs=tinysrgb&w=1200',
  updated_at = now()
where slug = 'tapioca-simples'
  and source_name = 'TemAI Curadoria';
