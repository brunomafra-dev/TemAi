<div align="center">

# TemAi

**Receitas com IA para transformar ingredientes disponíveis em sugestões práticas e receitas completas.**

![Next.js](https://img.shields.io/badge/Next.js-111827?style=for-the-badge&logo=nextdotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-111827?style=for-the-badge&logo=typescript&logoColor=60a5fa)
![Supabase](https://img.shields.io/badge/Supabase-111827?style=for-the-badge&logo=supabase&logoColor=34d399)
![IA Aplicada](https://img.shields.io/badge/IA_Aplicada-111827?style=for-the-badge&logo=openai&logoColor=facc15)

[Demo](https://temaiapp.vercel.app) · [Portfólio](https://www.brunomafra.website/pt)

</div>

---

## Descrição do problema

Decidir o que cozinhar com os ingredientes disponíveis costuma ser lento, repetitivo e cheio de fricção. A pessoa precisa lembrar receitas, adaptar quantidades, pensar em substituições e ainda transformar tudo em um passo a passo viável.

O problema fica maior no celular: o fluxo precisa ser rápido, direto e confiável, sem exigir que o usuário escreva um briefing perfeito para conseguir uma ideia útil.

## Solução proposta

O TemAi propõe um fluxo mobile-first em duas etapas:

1. O usuário informa ingredientes por texto ou contexto rápido.
2. A IA gera sugestões leves primeiro e só cria a receita completa quando uma opção é escolhida.

Essa separação reduz custo, melhora a sensação de velocidade e evita gerar receitas longas antes de existir intenção real do usuário.

## Stack utilizada

| Camada   | Tecnologias                                                  |
| -------- | ------------------------------------------------------------ |
| Frontend | Next.js App Router, React, TypeScript, Tailwind CSS          |
| Backend  | API Routes, validação de entrada, rotas server-side          |
| Dados    | Supabase, RPC, tabelas de receitas, perfis e métricas        |
| IA       | Fluxo de sugestões e receita completa em endpoints separados |
| Mobile   | Capacitor Android, PWA e experiência mobile-first            |

## Arquitetura resumida

```txt
src/
  app/
    (tabs)/
      page.tsx
      minhas-receitas/page.tsx
      biblioteca/page.tsx
      perfil/page.tsx
    receita/[id]/page.tsx
    api/
      ai/suggestions/route.ts
      ai/recipe/route.ts
      library/
      support/
  components/
    navigation/
    recipes/
    ui/
  features/
    recipes/
    security/
  lib/
    supabase-client.ts
    supabase-admin.ts
supabase/
  migrations/
  seed/
android/
```

## Screenshots

| Tela                 | O que demonstrar                                        |
| -------------------- | ------------------------------------------------------- |
| Home / Gerar receita | Entrada de ingredientes e sugestões iniciais da IA      |
| Receita completa     | Ingredientes, preparo, porções e interações da receita  |
| Biblioteca           | Busca, filtros e navegação por receitas públicas        |
| Perfil               | Preferências, receitas salvas, suporte e dados da conta |

> As capturas devem ser adicionadas em `docs/screenshots/` quando houver uma rodada visual final da demo pública.

## Funcionalidades

- Geração de sugestões com IA antes da receita completa.
- Receita completa sob demanda a partir de uma sugestão escolhida.
- Biblioteca de receitas com busca paginada no Supabase via RPC.
- Página pública de detalhe de receita.
- Perfil de usuário, receitas salvas e preferências.
- Suporte a lista de compras, badges e elementos de comunidade.
- Rotas públicas de termos, privacidade e exclusão de conta.
- Modos de proteção de IA para controle de custo e disponibilidade.
- Base preparada para assinatura Premium e distribuição mobile.

## Roadmap

- Adicionar screenshots reais da demo em `docs/screenshots/`.
- Finalizar fluxo de billing nativo com Apple/Google ou RevenueCat.
- Evoluir moderação, comentários e sinais de popularidade da biblioteca.
- Melhorar onboarding para novos usuários.
- Expandir entrada por foto/áudio respeitando limites de custo.

## Aprendizados

- IA em produto precisa de controle de custo, fallback e limites claros.
- Separar sugestão e receita completa melhora performance percebida e reduz desperdício.
- Produtos mobile-first exigem navegação simples e estados vazios bem resolvidos.
- Funcionalidades públicas precisam de cache, rate limit e leitura segura.
- Documentação jurídica e LGPD fazem parte da maturidade de produto.

## Como executar

```bash
npm install
npm run dev
```

Abra `http://localhost:3000`.

Crie `.env.local` com as variáveis necessárias:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
OPENAI_TRANSLATION_MODEL=gpt-4.1-mini
OPENAI_TIMEOUT_MS=45000
AI_PROTECTION_MODE=normal
PREMIUM_RECIPE_AI_DAILY_LIMIT=80
PREMIUM_RECIPE_AI_STRICT_DAILY_LIMIT=20
LIBRARY_SEARCH_ENGINE=rpc
PUBLIC_READ_RATE_LIMIT_MODE=memory
```

Scripts úteis:

```bash
npm run check
npm run build
npm run lint
npm run typecheck
npm run format:check
npm run security:scan-secrets
npm run cap:sync
```

## Qualidade e seguranÃ§a

O repositÃ³rio inclui checks locais e CI para manter a base estÃ¡vel:

- `npm run lint`: valida ESLint e regras do Next.js.
- `npm run typecheck`: executa TypeScript sem emitir arquivos.
- `npm run build`: valida o build de produÃ§Ã£o.
- `npm run check`: roda lint, typecheck e build em sequÃªncia.
- `npm run security:scan-secrets`: procura possÃ­veis segredos em arquivos versionados.

AutomatizaÃ§Ãµes configuradas:

- GitHub Actions CI em push/PR para `main`.
- CodeQL para anÃ¡lise de JavaScript/TypeScript.
- Dependabot para npm e GitHub Actions.

Notas tÃ©cnicas e oportunidades de arquitetura ficam em `docs/engineering-audit.md`.

## Link para Demo

https://temaiapp.vercel.app

## Link para Portfólio

https://www.brunomafra.website/pt
