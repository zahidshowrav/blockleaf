# Progress tracker

Where the build actually stands, phase by phase. `PROJECT_PLAN.md` §9 owns the
_scope_ of each milestone and the reasoning behind it; this file owns the
_state_ of it. When the two disagree, the plan is right and this file is stale.

Open decisions that block work are tracked separately in
[`open-flags.md`](./open-flags.md).

**Status values:** `Done` · `In progress` · `Not started` · `Blocked`

A commit id is the commit that finished the task, not the one that started it.
Tasks completed outside a commit — repository settings, registry actions — show
`—` in that column and still carry a date.

**Position:** M0, not yet closed. The scaffold is complete and CI is green, but
the exit test cannot run until `0.0.1` is on npm — see flags F1 and F2.

**Last verified:** 2026-10-10, against commit `30c432a`.

---

## M0 — Scaffold (½ week)

**Exit:** `pnpm add @blockleaf/editor` works in a throwaway app and renders a box
you can type in.

| Task                                                                 | Status      | Commit    | Completed  |
| -------------------------------------------------------------------- | ----------- | --------- | ---------- |
| pnpm workspace + Turborepo, stripped to the §2 layout                | Done        | `b96a94f` | 2026-10-09 |
| Shared `@blockleaf/tsconfig` and `@blockleaf/eslint-config`          | Done        | `b96a94f` | 2026-10-09 |
| `core` → `react` → `ui` import boundary enforced in lint             | Done        | `b96a94f` | 2026-10-09 |
| Vitest + jsdom; schema, extensions and editor tests                  | Done        | `b96a94f` | 2026-10-09 |
| Changesets, release workflow, npm provenance via `id-token: write`   | Done        | `b96a94f` | 2026-10-09 |
| CI gates: typecheck, lint, format, test, build, publint + attw, size | Done        | `b96a94f` | 2026-10-09 |
| Changeset-required gate on pull requests                             | Done        | `b96a94f` | 2026-10-09 |
| `size-limit` budgets declaring `import` (130 kB editor, 2 kB schema) | Done        | `b96a94f` | 2026-10-09 |
| MIT LICENSE, CODE_OF_CONDUCT, CONTRIBUTING                           | Done        | `b96a94f` | 2026-10-09 |
| `docs/schema.md` written before any extension work (§12.7)           | Done        | `b96a94f` | 2026-10-09 |
| Toolchain pins recorded with their rationale                         | Done        | `30c432a` | 2026-10-09 |
| GitHub remote connected, `main` pushed and tracking                  | Done        | —         | 2026-10-09 |
| Playwright installed — §9 puts it in M0; see F3                      | Not started | —         | —          |
| npm scope registered and `0.0.1` published — registry 404; see F1    | Blocked     | —         | —          |
| Issue templates and Discussions enabled (§12.8); see F4              | Not started | —         | —          |

## M1 — Editing core (1½ weeks)

**Exit:** every node and mark can be created by keyboard alone, and the JSON
round-trips through a snapshot test.

| Task                                                                   | Status      | Commit    | Completed |
| ---------------------------------------------------------------------- | ----------- | --------- | --------- |
| Schema module — `SCHEMA_VERSION`, `createEmptyDocument`, struct. guard | In progress | `b96a94f` | —         |
| `BlockleafNode` as a discriminated union over the real node set; F5    | Not started | —         | —         |
| Full node and mark set per `docs/schema.md`                            | Not started | —         | —         |
| Extension presets — `minimal` / `standard` beyond capped StarterKit    | In progress | `b96a94f` | —         |
| Stable block ids                                                       | Not started | —         | —         |
| Markdown input rules                                                   | Not started | —         | —         |
| Keyboard shortcuts for every node and mark                             | Not started | —         | —         |
| Paste normalisation                                                    | Not started | —         | —         |
| Link `href` sanitisation — in the schema, never only in the UI         | Not started | —         | —         |
| Schema snapshot test that fails loudly on an accidental shape change   | Not started | —         | —         |

## M2 — The chrome (2 weeks)

**Exit:** a stranger sits down, types `/`, and builds a document without
touching the mouse or reading a doc.

`src/ui/` is an empty placeholder today, existing only so the import boundary is
enforced from the first commit.

| Task                                    | Status      | Commit | Completed |
| --------------------------------------- | ----------- | ------ | --------- |
| Slash menu backed by a command registry | Not started | —      | —         |
| Bubble menu with a link editor          | Not started | —      | —         |
| Drag handle and block menu              | Not started | —      | —         |
| Placeholder and trailing node           | Not started | —      | —         |
| Keyboard-complete and axe-clean         | Not started | —      | —         |

## M3 — Media and code (1 week)

**Exit:** dragging a 5 MB image in works, shows progress, survives a mid-upload
navigation, and a failed upload is retryable.

| Task                                             | Status      | Commit | Completed |
| ------------------------------------------------ | ----------- | ------ | --------- |
| Upload adapter interface (§4)                    | Not started | —      | —         |
| Drop, paste and picker entry points              | Not started | —      | —         |
| Progress and abort                               | Not started | —      | —         |
| Image block with alt text and alignment          | Not started | —      | —         |
| Code block with `lowlight` and a language picker | Not started | —      | —         |

## M4 — Renderer + docs → public 0.1.0 (1½ weeks)

**Exit:** someone who has never seen the repo installs it from the docs alone
and renders stored JSON on a server.

| Task                                            | Status      | Commit | Completed |
| ----------------------------------------------- | ----------- | ------ | --------- |
| `@blockleaf/renderer` package                   | Not started | —      | —         |
| Component overrides                             | Not started | —      | —         |
| HTML-string and plain-text exports              | Not started | —      | —         |
| Docs site with a live demo; see F6              | Not started | —      | —         |
| README with a demo GIF                          | Not started | —      | —         |
| Dogfood in a real app (§10); target unnamed, F7 | Not started | —      | —         |

## M5 — Hardening (1–2 weeks)

**Exit:** a 500-page document stays responsive; the editor is fully usable on a
phone.

| Task                                                           | Status      | Commit | Completed |
| -------------------------------------------------------------- | ----------- | ------ | --------- |
| Full accessibility pass                                        | Not started | —      | —         |
| i18n via `labels`                                              | Not started | —      | —         |
| Theming docs for the `--bl-*` custom properties                | Not started | —      | —         |
| Mobile and touch behaviour                                     | Not started | —      | —         |
| Large-document performance — 10k+ blocks, virtualise if needed | Not started | —      | —         |
| `examples/vite-spa`                                            | Not started | —      | —         |

## M6 — Optional packages (ongoing)

**Exit:** each is additive — removing it changes nothing in the base bundle.

| Task                                                     | Status      | Commit | Completed |
| -------------------------------------------------------- | ----------- | ------ | --------- |
| `@blockleaf/collab` — Yjs plus a provider adapter        | Not started | —      | —         |
| `@blockleaf/ai` — streaming adapter, no bundled provider | Not started | —      | —         |
| `@blockleaf/markdown`                                    | Not started | —      | —         |
| Comments and mentions                                    | Not started | —      | —         |

## M7 — 1.0

| Task                                          | Status      | Commit | Completed |
| --------------------------------------------- | ----------- | ------ | --------- |
| Schema frozen with a written stability policy | Not started | —      | —         |
| Migration path documented                     | Not started | —      | —         |
| Two or more real apps in production on it     | Not started | —      | —         |

---

## Standing guards

Not milestone work — these hold across every phase.

| Guard                                                            | Status      | Commit    | Completed  |
| ---------------------------------------------------------------- | ----------- | --------- | ---------- |
| `size-limit` budget enforced in CI, while it is easy to meet     | Done        | `b96a94f` | 2026-10-09 |
| Tiptap pinned to exact `3.31.4`                                  | Done        | `b96a94f` | 2026-10-09 |
| Scheduled CI job building against Tiptap `@latest` (§11); see F8 | Not started | —         | —          |
| A migration shipped in the same PR as any `SCHEMA_VERSION` bump  | Not started | —         | —          |
