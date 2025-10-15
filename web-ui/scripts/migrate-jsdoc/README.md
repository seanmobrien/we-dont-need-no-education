Migrate JSDoc codemod
=====================

This small script moves leading JSDoc block comments from implementation `.ts`/`.tsx` files into sibling `.d.ts` declaration files when possible.

Usage
-----

Dry run (recommended):

```sh
node scripts/migrate-jsdoc/index.js --dirs=lib/ai,lib/api --dry-run
```

Apply changes:

```sh
node scripts/migrate-jsdoc/index.js --dirs=lib/ai,lib/api --apply --create-dts
```

Options
-------
- `--dirs` (required) – comma-separated list of directories to scan
- `--dry-run` – default; show proposed changes only
- `--apply` – write changes
- `--create-dts` – create `.d.ts` files if missing (used with --apply)
- `--conservative` (default) – only remove JSDoc if sibling `.d.ts` exists

Notes
-----
- The script is conservative by default. Run small batches and review diffs before applying globally.
- The tool uses the TypeScript compiler API to locate exported top-level statements and their leading comment ranges.
