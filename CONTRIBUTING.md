# Contributing

Thanks for looking. The project is pre-alpha, so the most useful contributions right now are bug reports with a reproduction and opinions on the document schema — the one decision that gets expensive to change.

## Setup

```bash
pnpm install
pnpm dev
```

Node 22.22.1+ (see `.nvmrc`) and pnpm 11. `lint-staged` requires that Node
floor; below it the pre-commit hook will not run.

`pnpm install` also installs the git hooks (husky):

- `pre-commit` — blocks commits on `main`, then runs typecheck, eslint and prettier over staged files.
- `commit-msg` — Conventional Commits, 3 lines maximum, no attribution trailers or tool mentions.
- `pre-push` — blocks pushes to `main`.

Don't bypass them with `--no-verify`.

## Before you open a PR

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm build
```

CI runs those plus `pnpm format:check`, `pnpm check:packaging` and `pnpm size`.

## Changesets

Every PR that changes a published package needs one, or CI fails:

```bash
pnpm changeset
```

Pick the smallest bump that is honest. While we are on `0.x`, a breaking change is a **minor**.

## Things worth knowing

- **`src/core` must not import React.** It is the future `@blockleaf/core`; lint enforces it.
- **`src/react` must not import `src/ui`.** The chrome is replaceable; the bindings are not.
- **Never change the document shape without bumping `SCHEMA_VERSION` and writing a migration.** A snapshot test will stop you by accident; the rule is there so you don't do it on purpose either.
- **Docs ship in the same PR as the feature.** Documentation written "later" is never written.
- **Watch the bundle.** `size-limit` has a hard budget and CI enforces it.

## Tests

- Unit (Vitest + jsdom) for schema, converters, commands and migrations.
- Browser (Playwright) for anything touching selection, caret behaviour or input rules — jsdom cannot see those bugs, and that is where ProseMirror bugs live.
