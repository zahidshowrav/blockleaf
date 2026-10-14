# CLAUDE.md

Guidance for Claude Code working in this repository.

## What this is

`blockleaf` — a Notion-style block editor on Tiptap v3, published to npm as
`@blockleaf/editor` (and later `@blockleaf/renderer`). pnpm + Turborepo. The full
build plan, milestones and rationale live in `docs/PROJECT_PLAN.md`; read the
relevant section before starting work rather than re-deriving decisions.

## Commands

```bash
pnpm install
pnpm dev                 # sandbox + editor in watch mode
pnpm build
pnpm typecheck
pnpm lint
pnpm test
pnpm format              # prettier --write across the repo
pnpm format:check        # what CI runs
pnpm check:packaging     # publint + are-the-types-wrong
pnpm size                # size-limit, hard budget

pnpm --filter @blockleaf/editor test
```

## Conventions

Coding conventions — workspace layout, the `core` / `react` / `ui` boundary, code
style, naming, import order, schema rules, testing and git conventions — are defined
in `.claude/rules/conventions.md`. Follow them for all code in `packages/*` and
`apps/*`.

## Non-negotiables

- **The document schema is the product.** It lives in other people's databases.
  Never change the stored shape without bumping `SCHEMA_VERSION`, writing the
  migration in the same PR, and updating `apps/docs/content/docs/schema.mdx`. The snapshot test exists
  to make an accidental change fail loudly.
- **`src/core` must not import React**, and **`src/react` must not import `src/ui`**.
  Enforced by lint, not convention — extracting `@blockleaf/core` later must stay a `mv`.
- **No CSS framework.** One stylesheet, `--bl-*` custom properties. No Tailwind, no
  `prose`, no build step. This is a stated differentiator, not a preference.
- **Never use `any`.**
- **ESM only.** No CJS build.
- **Every PR touching a published package needs a changeset**, or CI fails.
- **Docs ship in the same PR as the feature.**
- **Link `href` sanitisation belongs in the schema**, never only in the UI.

## Toolchain constraints — do not "upgrade" these without checking

- **TypeScript is pinned to 6.0.3 on purpose.** `latest` on npm is 7.x (the Go
  port), but typescript-eslint has no TS 7 support on any dist-tag — its peer range
  is `>=4.8.4 <6.1.0`. Bumping TypeScript to 7 silently breaks type-aware linting.
  Re-check typescript-eslint's peer range before moving.
- **tsdown needs `unrun` installed** to load `tsdown.config.ts`. It is an optional
  peer, so pnpm will not add it for you; the build fails with
  `Failed to import module "unrun"` if it goes missing.
- **`attw` runs with `--profile esm-only --exclude-entrypoints styles.css`.** The
  package is ESM-only by design, so the node10 and CJS-resolves-to-ESM results are
  expected, and attw cannot resolve a CSS entrypoint. Without those flags it exits 1
  and CI fails on correct output.
- **`size-limit` entries must declare `import`.** Without it the measurement
  tree-shakes to ~28 B and the budget passes forever. Each entry measures a real
  consumer import.
- **Node is pinned to 22.22.1** (`.nvmrc`, `engines.node`, and CI's
  `node-version-file`). `lint-staged` 17.x requires `>=22.22.1`; dropping below it
  breaks the pre-commit hook.
- **Import linting uses `eslint-plugin-import-x`, not `eslint-plugin-import`.** The
  latter caps its ESLint peer at `^9` and this repo is on ESLint 10.
- **`eslint-plugin-only-warn` must never be added.** It downgrades every rule to a
  warning, so `eslint .` always exits 0 and the lint-enforced non-negotiables above
  stop being enforced while CI still shows green.
- Verify a version against the registry before writing it into a manifest; several
  guessed versions in the initial scaffold were wrong.

## Git hooks

`husky` installs three hooks on `pnpm install` (via the `prepare` script):

- `pre-commit` — blocks commits on `main`, then runs `lint-staged` (typecheck, eslint, prettier).
- `commit-msg` — rejects attribution trailers, tool mentions, and messages over 3 lines.
- `pre-push` — blocks pushes to `main`.

Never bypass them with `--no-verify`.
