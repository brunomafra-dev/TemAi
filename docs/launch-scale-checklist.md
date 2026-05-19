# TemAI Launch Scale Checklist

## Before Merge

- Run `npm run lint`.
- Run `npm run build`.
- Run `npm run security:scan-secrets`.
- If migrations changed, run `supabase db push`.
- Confirm `supabase migration list` shows local and remote aligned.

## Production Smoke Test

- `/api/library/search?q=arroz&page=1&pageSize=12` returns paginated recipes.
- `/api/library/search?q=coração&page=1&pageSize=12` keeps search relevant.
- `/api/library/popular?limit=8` returns without live aggregation errors.
- `/api/library/meal/<slug>` returns a recipe with cache headers.
- Free user can generate only the allowed monthly AI requests.
- Premium user can use text, audio, and photo in `AI_PROTECTION_MODE=normal`.
- `AI_PROTECTION_MODE=strict` blocks audio/photo with a friendly message.
- `AI_PROTECTION_MODE=readonly` pauses AI while Biblioteca remains usable.

## Daily Launch Watch

- AI calls per day.
- Estimated AI cost per day.
- AI error rate and timeout count.
- Library search latency.
- Popular API latency.
- Supabase CPU and connection pressure.
- Vercel function errors by route.
- New signups, active users, free-to-premium conversion.

## Upgrade Triggers

- Search latency above 800 ms p95 for 30 minutes.
- AI generation error rate above 5% for 15 minutes.
- Daily AI cost above the planned budget.
- Supabase CPU or connections sustained above safe project limits.
- Premium support reports about slow recipe generation.

## Emergency Switches

- Set `AI_PROTECTION_MODE=strict` to preserve text AI and reduce heavy inputs.
- Set `AI_PROTECTION_MODE=readonly` to pause generation while keeping Biblioteca live.
- Set `LIBRARY_SEARCH_ENGINE=legacy` only if the search RPC has a production issue.
- Set `PUBLIC_READ_RATE_LIMIT_MODE=supabase` only if memory read limiting is not enough during abuse.
