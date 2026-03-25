# CONTEXTO RECUPERADO - TemAi

## 1) Estado atual do projeto

- Projeto ativo em `Next.js 16` (App Router), `React 19`, `TypeScript` e `Tailwind v4`.
- Estrutura principal funcionando com experiência mobile-first.
- Repositório limpo no momento (sem alterações locais pendentes).
- Histórico git curto e objetivo:
  - `ce10651` - init: estrutura inicial do TemAi
  - `3146531` - fix: problema no versionamento da vercel

## 2) Fluxo principal do produto

### Fluxo IA (2 etapas)

1. Usuário informa ingredientes (texto/áudio/foto, com captura local simulada na UI).
2. API retorna 3 sugestões curtas (`/api/ai/suggestions`).
3. Usuário escolhe uma sugestão.
4. API monta receita completa (`/api/ai/recipe`).
5. Tela de detalhe abre a receita final.

### Biblioteca

- Busca paginada por categoria e texto via Supabase (`/api/library/search`).
- Abertura de receita por slug (`/api/library/meal/[id]`).
- Fluxo de importação por URL (`/api/library/import-url`) com parsing de JSON-LD.

### Minhas receitas

- CRUD local (storage no browser) para receitas manuais.
- Receitas salvas pelo usuário coexistem com receitas de IA e biblioteca.

## 3) Rotas e telas já implementadas

### Navegação/Telas

- `/` -> Home (card de IA + categorias + populares)
- `/gerar-receita-ia` -> geração de sugestões
- `/biblioteca` -> listagem + filtros + paginação + avaliação local
- `/minhas-receitas` -> receitas do usuário
- `/perfil` -> perfil local
- `/receita/[id]` -> detalhe da receita

### APIs

- `POST /api/ai/suggestions`
- `POST /api/ai/recipe`
- `GET /api/library/search`
- `GET /api/library/meal/[id]`
- `POST /api/library/import-url`
- Extras existentes no projeto: `import-batch`, `popular`, `publish-manual`

## 4) Módulos importantes

- `src/features/recipes/ai-generator.ts`
  - Motor local de sugestões/receitas baseado em templates (`AI_TEMPLATES`).
  - Não depende de LLM externa neste estágio.

- `src/features/recipes/supabase-library.ts`
  - Busca, paginação e mapeamento de receitas do Supabase.
  - Upsert de receitas importadas.

- `src/features/recipes/import-from-url.ts`
  - Coleta JSON-LD de páginas de receita.
  - Inferência de categoria e extração de ingredientes/passos.

- `src/features/recipes/local-storage.ts`
  - Persistência local das receitas do usuário.

- `src/features/recipes/ratings-storage.ts`
  - Persistência local de avaliações do usuário.

## 5) Banco e dados

- Diretório `supabase/` contém migrations e seed BR.
- Tabela-base de curadoria usada no app: `recipes_br`.
- `.env.example` e `README.md` documentam variáveis necessárias.

## 6) Pontos de atenção técnicos (importantes)

1. Há forte indício de problema de encoding em textos PT-BR:
   - Ex.: caracteres como `Ã¡`, `Ã§`, `ðŸ...` aparecem em vários arquivos.
   - Impacta UX, busca textual e qualidade dos dados importados.

2. A camada "IA" atual é determinística por template.
   - Bom para MVP/controlabilidade.
   - Ainda não representa geração por modelo externo de linguagem.

3. Fallbacks entre Supabase/local existem, mas merecem teste de regressão.

## 7) Backlog priorizado para retomada

### Prioridade alta

1. Corrigir encoding UTF-8 em todo o projeto (UI + normalização + importação).
2. Validar fluxo completo em ambiente local (`npm run dev`) e smoke-test das rotas.
3. Garantir experiência final de salvar/abrir receita da IA em "Minhas receitas" sem fricção.

### Prioridade média

1. Fortalecer tratamento de erro nas APIs de biblioteca/importação.
2. Adicionar testes unitários para:
   - `parseIngredientsText`
   - `generateRecipeSuggestions`
   - parsing JSON-LD em `import-from-url`
3. Melhorar telemetria básica de falhas (logs úteis para debug).

### Prioridade baixa

1. Reforçar acessibilidade (labels, foco, navegação teclado).
2. Otimizar imagens e desempenho de listagens.
3. Refinar UX de áudio/foto (atualmente com upload local sem transcrição/visão real).

## 8) Decisões inferidas do produto (pela implementação)

- Foco em velocidade de entrega e UX mobile.
- Estratégia de "valor rápido": primeiro sugestão curta, depois detalhe completo.
- Biblioteca brasileira como diferencial (Supabase + importação por URL).

## 9) Próximo passo sugerido imediato

Executar uma sprint curta em 2 blocos:

1. "Higiene técnica" (encoding + smoke test).
2. "Valor de produto" (consolidar jornada gerar -> salvar -> reutilizar receita).

---

Documento criado para reconstruir contexto após perda de histórico de chat.
