 TemAi

App mobile-first de receitas com IA que transforma ingredientes disponíveis em sugestões rápidas e receitas completas sob demanda.

[Demo ativa](https://temaiapp.vercel.app)

## Por que esse projeto existe

Muita gente abre a geladeira, vê alguns ingredientes soltos e não sabe o que preparar. O TemAi nasceu para resolver esse momento simples, mas muito comum: decidir rápido o que cozinhar com o que já existe em casa.

O foco do projeto é entregar uma experiência leve, prática e pensada para celular, usando IA apenas onde ela melhora o fluxo do usuário.

## Solução

O app usa um fluxo de IA em duas etapas:

1. O usuário informa ingredientes, contexto ou preferências.
2. A IA gera sugestões curtas primeiro.
3. A receita completa só é criada quando o usuário escolhe uma sugestão.

Essa decisão reduz custo, melhora velocidade e evita gerar receitas completas que talvez nunca sejam usadas.

## Funcionalidades

- Geração de sugestões de receitas por ingredientes.
- Geração de receita completa sob demanda.
- Biblioteca pública de receitas brasileiras.
- Busca e listagem paginada com Supabase.
- Perfil de usuário, receitas salvas e badges.
- Páginas públicas de termos, privacidade e exclusão de conta.
- Estrutura preparada para recursos premium e publicação mobile.
- Rate limit, validação de entrada e proteção contra abuso de IA.
- APK em `public/downloads/temai.apk` para distribuição Android fora das lojas.

## Stack

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- Supabase
- API Routes
- Capacitor Android

## Arquitetura

```txt
src/
  app/
    (tabs)/
      gerar-receita-ia/
      biblioteca/
      minhas-receitas/
      perfil/
    api/
      ai/suggestions/
      ai/recipe/
      library/
      profile/
  features/
    recipes/
    profile/
    security/
    community/
  components/
    navigation/
    recipes/
    ui/
supabase/
  migrations/
  seed/
docs/
  legal-lgpd-data-map.md
  launch-scale-checklist.md
```

## Decisões técnicas

- As rotas `POST /api/ai/suggestions` e `POST /api/ai/recipe` separam sugestão leve de geração completa.
- A biblioteca usa Supabase com busca paginada e fallback quando migrations ainda não estão aplicadas.
- A popularidade de receitas usa métricas próprias para views, avaliações e ranking.
- A camada de segurança centraliza validação de entrada, rate limit, autenticação e uso de IA.
- O projeto mantém documentação de LGPD, checklist de escala e cuidados com publicação mobile.

## Rodando localmente

```bash
npm install
npm run dev
```

Abra `http://localhost:3000`.

Crie um arquivo `.env.local` com base nas variáveis usadas pelo projeto:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
AI_PROTECTION_MODE=normal
LIBRARY_SEARCH_ENGINE=rpc
PUBLIC_READ_RATE_LIMIT_MODE=memory
```

## Supabase

Para usar a biblioteca BR e os recursos de perfil, execute as migrations e o seed:

```bash
supabase migration up
supabase db query < supabase/seed/recipes_br_seed.sql
```

Se o Supabase ou as variáveis não estiverem configurados, algumas áreas podem cair para fallback local ou ficar indisponíveis.

## Limite de infraestrutura

O projeto depende do plano gratuito do Supabase. Como o plano free limita a quantidade de projetos ativos, a demo pode alternar disponibilidade com outros projetos do portfólio.

## Aprendizados

- Separar IA em etapas deixa o produto mais rápido e barato.
- Um app simples ainda precisa de decisões reais de arquitetura: dados, autenticação, segurança, LGPD e custo.
- Documentação e demo são parte da entrega, não só detalhe visual.
- Construir para mobile muda prioridades de navegação, texto e fluxo.

## Próximos passos

- Melhorar README com prints reais do app.
- Evoluir a experiência premium.
- Ampliar observabilidade de custos de IA.
- Refinar biblioteca pública e ranking de receitas.
- Preparar publicação mobile com checklist Apple/Google.

## Segurança

- Nunca commitar `.env.local`.
- Chaves sensíveis devem ficar somente no backend.
- Variáveis `NEXT_PUBLIC_*` são públicas por design.
- Antes de pushar alterações sensíveis, rode:

```bash
npm run security:scan-secrets
```
