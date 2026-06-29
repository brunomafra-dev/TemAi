# Engineering Audit

Last updated: 2026-06-29

## Scope

This audit covers repository engineering quality only. It does not change product behavior, layout, database schema, or user-facing flows.

## Current Architecture

- `src/app`: Next.js App Router pages and route handlers.
- `src/components`: shared UI, navigation, and recipe components.
- `src/features`: domain modules for recipes, profile, community, and security.
- `src/lib`: cross-cutting utilities, environment access, Supabase clients, validation, and observability.
- `supabase/migrations`: database schema, RLS policies, RPCs, and seed/repair history.
- `scripts`: maintenance and security helpers.
- `android`: Capacitor Android project.

## Strengths

- Clear domain grouping under `features`.
- App Router API routes isolate server-side OpenAI and Supabase access.
- Server-only environment helpers separate service-role credentials from browser clients.
- Supabase migrations include RLS and several hardening migrations.
- Input validation helpers and rate-limit paths already exist for sensitive API routes.
- Secret scanning script exists and is now included in documented checks.

## Key Risks

- Several client pages are too large and mix UI, state, persistence, and API orchestration.
- `src/app/receita/[id]/page.tsx`, `src/app/(tabs)/perfil/page.tsx`, `src/app/(tabs)/gerar-receita-ia/page.tsx`, and `src/app/(tabs)/page.tsx` are high-risk files for regressions.
- Some Supabase grants and public policies are historically broad and should be re-reviewed in a database-specific sprint.
- External recipe images are unreliable because some providers block hotlinking.
- `.env.local` exists locally and must remain ignored; never copy values into docs, issues, or logs.
- `npm audit` currently reports transitive vulnerabilities that need a dependency-maintenance sprint.

## Future Refactor Candidates

- Extract hooks from large route components:
  - home popular recipes, notifications, shopping count, profile photo upload
  - recipe detail loading/saving/rating/comments
  - profile modal sections and support flow
- Split large profile and recipe detail pages into smaller feature components.
- Introduce typed Supabase row/DTO mapping in one location per table/RPC.
- Add integration tests for API routes that enforce auth, rate limiting, and validation.
- Add a browser test for authenticated home, library cards, recipe detail, and saved recipes.
- Review import batching and external image handling as a dedicated ingestion reliability sprint.

## Supabase Review Notes

- RLS is enabled for the main user-owned tables and service-role telemetry tables.
- Public recipe read access is expected for the library.
- Historical rating policies were later hardened for authenticated writes.
- Badge refresh functions are granted to broad roles in migrations; verify whether public execution is still required.
- No storage bucket migration was found in the repository audit; if Storage is used later, add bucket/policy migrations.

## Performance Notes

- Most user-facing app screens are client components. That is acceptable for the current mobile app shell but increases hydration cost.
- Images use `next/image`, but external provider reliability varies.
- Large route components make memoization and render boundaries harder to reason about.
- Future work should consider moving stable data fetching into server components or route-level cached APIs where UX permits.

## Validation Baseline

Required checks:

```bash
npm run lint
npm run typecheck
npm run build
npm run security:scan-secrets
```
