update public.recipes_br
set
  image_url = 'https://images.pexels.com/photos/30635687/pexels-photo-30635687.jpeg?auto=compress&cs=tinysrgb&w=1200',
  updated_at = now()
where slug = 'feijao-caseiro'
  and source_name = 'TemAI Curadoria';
