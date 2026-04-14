# TemAi

App de receitas com IA, mobile-first, focado em simplicidade e velocidade.

## Stack

- Next.js (App Router)
- React
- Tailwind CSS
- Componentes no estilo shadcn/ui

## Fluxo principal de IA (2 etapas)

1. Gerar apenas 3 sugestoes leves com base nos ingredientes.
2. Gerar receita completa somente quando o usuario escolhe uma sugestao.

Isso esta implementado com duas rotas de API separadas:

- `POST /api/ai/suggestions`
- `POST /api/ai/recipe`

## Paginas

- `/` Home / Gerar receita
- `/minhas-receitas`
- `/biblioteca`
- `/perfil`
- `/receita/[id]` Detalhe da receita

## Estrutura inicial

```txt
src/
  app/
    (tabs)/
      page.tsx
      minhas-receitas/page.tsx
      biblioteca/page.tsx
      perfil/page.tsx
    receita/[id]/page.tsx
    api/ai/suggestions/route.ts
    api/ai/recipe/route.ts
  components/
    navigation/
    recipes/
    ui/
  features/recipes/
    ai-generator.ts
    library-recipes.ts
    local-storage.ts
    api-client.ts
    types.ts
```

## Rodar local

```bash
npm install
npm run dev
```

Abra `http://localhost:3000`.

## Biblioteca BR no Supabase (Passo 3)

1. Execute as migrations:

```bash
supabase migration up
```

2. Rode seed inicial de receitas BR:

```bash
supabase db query < supabase/seed/recipes_br_seed.sql
```

3. Configure `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
THEMEALDB_API_KEY=1
OPENAI_API_KEY=
OPENAI_TRANSLATION_MODEL=gpt-4.1-mini
```

Com isso, a biblioteca passa a ler primeiro da tabela `recipes_br` (PT-BR).  
Se nao houver dados/config, o app cai para fallback automaticamente.

## Seguranca de segredos

- Nunca commitar `.env.local`.
- Chaves sensiveis ficam somente no backend (`SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`).
- Variaveis `NEXT_PUBLIC_*` sao publicas por design e nao devem conter segredos.
- Rode antes de push:

```bash
npm run security:scan-secrets
```
