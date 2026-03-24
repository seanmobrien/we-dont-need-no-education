# CLAUDE.md — Repository Root

This is the monorepo root for the Title IX Victim Advocacy Platform. Load the appropriate workspace guidance based on where you are working.

## Workspace Structure

- `web-ui/` — TypeScript/React frontend (Next.js app + shared lib-* packages). See `web-ui/CLAUDE.md`.
- `chat/` — Java backend. See `.github/instructions/java.md`.
- `db/` — Database SQL and schema files.
- `docs/` — Repository documentation, including `docs/MONOREPO_GUIDE.md` for monorepo structure.
- `scripts/` — Workspace utility scripts.

## Quick Orientation

For any work inside `web-ui/`, load `web-ui/CLAUDE.md` first — it describes the platform architecture, lib package inventory, shared testing conventions, and code conventions that apply across all frontend packages.

For app-specific work (`web-ui/packages/app/`), additionally load `web-ui/packages/app/CLAUDE.md` for dev commands, environment configuration, and build details.
