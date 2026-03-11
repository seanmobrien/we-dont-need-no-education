# Agent Instructions

This is the canonical policy entry point for this repository.

## Resolution Model
- Prefer nearest-ancestor `AGENTS.md` from the current working directory.
- Use this root file as the baseline policy.
- Layer scope-specific guidance from child folders when present.
- Stop traversal at the current Git repository root.

## Canonical Policy
- `.github/instructions/llm-tooling-policy.md`

## Scope Guidance
- Repository router: `.github/instructions/copilot-instructions.md`
- Web UI shim: `web-ui/AGENTS.md`
- Java/backend: `.github/instructions/java.md`
