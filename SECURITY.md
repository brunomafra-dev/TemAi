# Security Policy

## Supported Versions

Security fixes target the current `main` branch.

## Reporting a Vulnerability

Please report suspected vulnerabilities privately to the project maintainer.
Do not open public issues for secrets, authentication bypasses, data exposure, or abuse vectors.

Include:

- Affected route, component, or workflow.
- Reproduction steps.
- Expected and actual impact.
- Any relevant logs with secrets removed.

## Security Baseline

- Secrets must live in environment variables and never in tracked files.
- Server-only Supabase credentials must only be used in server routes or server utilities.
- User authorization must be checked in API routes and server-side operations, not only in the UI.
- Supabase schema changes must include RLS and policy review.
