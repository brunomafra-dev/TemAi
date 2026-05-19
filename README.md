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

## Escala de lancamento

- A Biblioteca usa busca paginada no Supabase via RPC (`LIBRARY_SEARCH_ENGINE=rpc`) e fallback legado se a migration ainda nao estiver aplicada.
- Rotas publicas de leitura usam cache curto e rate limit em memoria por instancia (`PUBLIC_READ_RATE_LIMIT_MODE=memory`) para evitar uma escrita no Supabase em todo request.
- Popularidade usa a tabela `recipe_popularity_metrics`, atualizada quando views/ratings mudam e recalculavel pela funcao `refresh_recipe_popularity_metrics()`.
- IA tem modo de protecao por env:
  - `AI_PROTECTION_MODE=normal`: uso padrao.
  - `AI_PROTECTION_MODE=strict`: bloqueia audio/foto temporariamente e reduz o limite diario anti-abuso do Premium.
  - `AI_PROTECTION_MODE=readonly`: pausa geracao de IA e mantem a Biblioteca disponivel.
- Premium deve ser comunicado como "uso livre", com protecoes anti-abuso e emergencia de custo no servidor.

## Paginas

- `/` Home / Gerar receita
- `/minhas-receitas`
- `/biblioteca`
- `/perfil`
- `/receita/[id]` Detalhe da receita
- `/termos`
- `/privacidade`
- `/exclusao-de-conta`

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
OPENAI_API_KEY=
OPENAI_TRANSLATION_MODEL=gpt-4.1-mini
OPENAI_TIMEOUT_MS=45000
AI_PROTECTION_MODE=normal
PREMIUM_RECIPE_AI_DAILY_LIMIT=80
PREMIUM_RECIPE_AI_STRICT_DAILY_LIMIT=20
LIBRARY_SEARCH_ENGINE=rpc
PUBLIC_READ_RATE_LIMIT_MODE=memory
```

Com isso, a biblioteca passa a ler primeiro da tabela `recipes_br` (PT-BR).  
Se nao houver dados/config, o app cai para fallback automaticamente.

## Mobile e assinaturas

- Planos previstos: Premium mensal de R$ 24,90 e anual de R$ 199,90.
- Apple/Google devem cobrar assinatura dentro dos apps por billing nativo das lojas.
- RevenueCat e a recomendacao para acelerar recibos, restore, status premium e webhooks; o Supabase segue como fonte final do entitlement em `user_subscriptions`.

## Juridico e LGPD

- Termos, Politica de Privacidade e exclusao de conta ficam em rotas publicas.
- O cadastro registra data e versao aceita dos Termos e da Politica no perfil do usuario.
- O inventario operacional de dados, fornecedores, bases LGPD e checklist Apple/Google fica em `docs/legal-lgpd-data-map.md`.
- Antes de publicar nas lojas, atualizar os textos com razao social, CNPJ, cidade/UF e dados da empresa aberta para operar o TemAI.

## Seguranca de segredos

- Nunca commitar `.env.local`.
- Chaves sensiveis ficam somente no backend (`SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`).
- Variaveis `NEXT_PUBLIC_*` sao publicas por design e nao devem conter segredos.
- Rode antes de push:

```bash
npm run security:scan-secrets
```
