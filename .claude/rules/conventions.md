# Project Conventions

> Referenced from root `CLAUDE.md`. Applies to `packages/*` and `apps/*`.

## Workspace layout

- **`packages/editor`** (`@blockleaf/editor`) — the published package. Built with
  tsdown to `dist/`, ESM only.
- **`packages/eslint-config`** (`@blockleaf/eslint-config`) — shared flat configs,
  exported as `./base` and `./react-library`. Private.
- **`packages/tsconfig`** (`@blockleaf/tsconfig`) — shared `tsconfig` presets. Private.
- **`apps/sandbox`** — Vite playground for developing against the editor. Never published.

A future `@blockleaf/renderer` package lands here as its own workspace, not as a
subpath of the editor.

## The three source layers

`packages/editor/src` is split into three layers, and the boundaries between them
are lint-enforced — not conventions a reviewer has to catch:

| Layer       | May import                 | Purpose                                                                                                                    |
| ----------- | -------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `src/core`  | nothing framework-specific | Schema, extensions, commands, migrations, constants. This is the future `@blockleaf/core`; extracting it must stay a `mv`. |
| `src/react` | `src/core`                 | React bindings — hooks and the editor component.                                                                           |
| `src/ui`    | `src/core`, `src/react`    | The default chrome (menus, toolbars). Replaceable.                                                                         |

`src/core` must not import React, `react-dom` or `@tiptap/react`. `src/react` must
not import `src/ui` — the chrome is replaceable, the bindings are not. Both rules
live in `packages/eslint-config/react-library.js` as `no-restricted-imports`.

`src/styles/blockleaf.css` is the single stylesheet, shipped as `./styles.css`.

## Code style

- Never use `any`. Enforced as an error by `@typescript-eslint/no-explicit-any`.
- Named exports everywhere, except where a tool requires a default (config files,
  `eslint.config.js`).
- Prefer small hooks and components over monolithic ones.
- Keep all `useEffect` calls grouped together in a component for readability —
  avoid scattering them.
- Use `memo`, `useMemo`, `useCallback` when it meaningfully helps.
- Avoid hardcoded strings — use the constants in `src/core/constants.ts`.
- Remove dead/commented-out code; use `// TODO:` for anything intentionally deferred.
- Type-only imports use the inline form (`import { type Foo }`), enforced by
  `@typescript-eslint/consistent-type-imports`.
- No CSS framework, and no `!important`, **in `packages/*`**. One stylesheet,
  `--bl-*` custom properties. This is a product promise — installing the editor
  must not force Tailwind, a `prose` class or a build step on anyone — so it
  binds what is published. `apps/docs` runs Fumadocs, which requires Tailwind
  (PROJECT_PLAN §6, F16); nobody installs an app, so nothing is imposed there.

## Import order

Enforced by the `import-x/order` ESLint rule. Groups, separated by a blank line,
each sorted alphabetically:

1. External packages (including Node built-ins).
2. `@`-aliased imports (`@blockleaf/*`).
3. Relative imports (`../`, `./`).

## Naming conventions

| Type                    | Convention                 | Example                                |
| ----------------------- | -------------------------- | -------------------------------------- |
| Folders                 | lowercase, hyphenated      | `src/core`, `block-menu`               |
| Files                   | lowercase, hyphenated      | `use-blockleaf-editor.ts`, `schema.ts` |
| Components              | PascalCase                 | `BlockleafEditor`, `SlashMenu`         |
| Hooks                   | camelCase, `use` prefix    | `useBlockleafEditor`                   |
| Types & interfaces      | PascalCase                 | `BlockleafDocument`, `EditorProps`     |
| Enum name               | PascalCase, singular       | `BlockType`                            |
| Enum keys               | UPPER_SNAKE_CASE           | `PARAGRAPH`, `HEADING`                 |
| Constants / static data | camelCase                  | `defaultExtensions`, `schemaVersion`   |
| CSS custom properties   | `--bl-` prefix, hyphenated | `--bl-color-text`, `--bl-radius`       |

## Schema rules

The document schema is the product — it lives in other people's databases.

- Never change the stored shape without bumping `SCHEMA_VERSION`, writing the
  migration in the same PR, and updating `docs/schema.md`.
- The snapshot test exists to make an accidental change fail loudly. Do not update
  the snapshot to make a failure go away; write the migration.
- Link `href` sanitisation belongs in the schema, never only in the UI.
- Before `0.1.0`, purely additive changes are exempt — see `docs/schema.md`.

## Testing

- **Unit** (Vitest + jsdom) for schema, converters, commands and migrations.
- **Browser** (Playwright) for anything touching selection, caret behaviour or
  input rules — jsdom cannot see those bugs, and that is where ProseMirror bugs live.
- Run a single package with `pnpm --filter @blockleaf/editor test`.

## Git conventions

- Work on feature branches; never commit directly to `main` (enforced by the
  `pre-commit` and `pre-push` hooks via `scripts/prevent-git-branch.sh`).
- Commit messages follow Conventional Commits: `feat:`, `fix:`, `chore:`, `docs:`,
  `refactor:`, `style:`, `test:` — a short single-line summary.
- **A commit message is at most 2–3 lines**: the subject, plus one or two short lines.
- **No attribution trailers or tool mentions.** No `Co-Authored-By` trailer, no
  "Generated with …" line, no mention of Claude or Anthropic in a commit message or
  PR text. Enforced by the `commit-msg` hook (`scripts/check-commit-message.sh`);
  never bypass it with `--no-verify`.
- **Claude does not open pull requests.** The developer opens every PR.
- **Claude does not create, switch, delete or rename branches**, and does not push
  or rewrite pushed history, without the developer's explicit permission for that
  specific action.
- Every PR touching a published package needs a changeset, or CI fails. Use
  `pnpm changeset --empty` for changes that touch a package without altering its
  published behaviour (a reformat, a comment).

## Documentation

Docs ship in the same PR as the feature — documentation written "later" is never
written. The build plan and milestones live in `docs/PROJECT_PLAN.md`; read the
relevant section before starting work rather than re-deriving decisions.
