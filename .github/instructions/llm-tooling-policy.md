# LLM Tooling Policy (Canonical)

This is the canonical cross-model policy for code assistants in this repository.

## Scope
- Repository root: `~/repos/we-dont-need-no-education`
- Frontend monorepo: `~/repos/we-dont-need-no-education/web-ui`

## Core Rule: Use Project-Local Tooling
- Do not assume globally installed CLIs are available.
- Run tools via project scripts and workspace commands.
- Prefer `yarn <script>` / `yarn workspace <name> <script>` over direct binary calls.

## Linting (Required Convention)
- Preferred:
  - From repo root: `yarn lint`
  - From `web-ui`: `yarn lint`
  - For one workspace: `yarn workspace <workspace-name> lint`
- Avoid direct `eslint ...` unless invoked through Yarn, for example:
  - `yarn eslint .`

## Validation Expectations
- Before reporting lint-related changes, validate with the same Yarn lint command used by CI for that scope.
- Keep lint and test commands reproducible between local and CI environments.

## CI Consistency
- Keep dependency installs lockfile-driven and deterministic.
- Prefer immutable installs in CI where applicable.

## Where To Load Deeper Guidance
- Repo-level routing: `.github/instructions/copilot-instructions.md`
- Web UI specifics: `web-ui/.github/instructions/copilot-instructions.md`
- TypeScript/React standards: `web-ui/.github/instructions/typescript-react.instructions.md`
- Java/backend standards: `.github/instructions/java.md`

## DRY Principle
- Keep shared policies in this file.
- Adapter files (`AGENTS.md`, `copilot-instructions.md`, etc.) should stay short and link here.
