# Contributing

Thanks for helping improve TemAI.

## Local Setup

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env.local` and fill the required values.
3. Run `npm run dev` and open `http://localhost:3000`.

## Quality Checks

Before opening a pull request, run:

```bash
npm run check
npm run security:scan-secrets
```

Use `npm run format` for formatting-only changes and `npm run format:check` in CI-style checks.

## Change Scope

- Keep user experience, layout, and business rules unchanged unless the task explicitly asks for a product change.
- Prefer small, focused changes.
- Do not commit secrets, `.env.local`, build output, APK artifacts, or generated cache directories.
- For database changes, add Supabase migrations and document the operational impact.

## Pull Requests

Include:

- What changed.
- Why it changed.
- Validation commands run.
- Screenshots only when UI changed.
