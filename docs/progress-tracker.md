# Progress tracker

Where the build actually stands, phase by phase. `PROJECT_PLAN.md` §9 owns the
_scope_ of each block and the reasoning behind it; this file owns the _state_ of
it. When the two disagree, the plan is right and this file is stale.

Open decisions that block work are tracked separately in
[`open-flags.md`](./open-flags.md).

**Status values:** `Done` · `In progress` · `Not started` · `Blocked` · `Moved`

Every task carries a stable id — `SC-01`, `EC-04` — so it can be named in a
commit, an issue or a flag without quoting its wording. Ids are never reused: a
dropped task leaves its number behind rather than renumbering the block.

A commit id is the commit that finished the task, not the one that started it.
Tasks completed outside a commit — repository settings, registry actions — show
`—` in that column and still carry a date.

Blocks run in the order listed: `SC` → `EC` → `CH` → `MC` → `RD` → `HD` → `OP` →
`V1`, the same ids `PROJECT_PLAN.md` §9 uses.

**Position:** `CH` is closed — all eight tasks done. `MC` is next.
`@blockleaf/editor@0.0.3` is live on npm; the `CH` work is unreleased.

**Last verified:** 2026-10-13. All gates green on `feat/chrome`: 209 unit tests,
15 Playwright specs, bundle at 141.82 kB of 160 kB, schema entry at 136 B of 2 kB.

---

## How a feature that spans blocks is split

Tables are the first feature that does not fit in one block, so the rule it
forced is written here rather than rediscovered by the next one.

**The dependency runs one way, always: `CH` calls `EC`, `EC` never calls `CH`.**
A block of chrome is a button that calls a command that already exists and
already has tests. If a menu needs logic that the command API cannot express,
the logic is missing from `EC` — it does not get written into the menu.

Which means each block's exit test stands on its own:

| Block | Owns                                 | Proven by                                                                             |
| ----- | ------------------------------------ | ------------------------------------------------------------------------------------- |
| `EC`  | Capability — schema, commands, keys  | Headless tests against `editor.commands.*` and simulated keys. No chrome is rendered. |
| `CH`  | Affordance — menus, handles, pickers | Component tests plus axe. The command is a stub's worth of work; the surface is not.  |
| `RD`  | Output — React and HTML string       | Stored JSON in, markup out, with no ProseMirror loaded.                               |
| `HD`  | Behaviour under stress — a11y, touch | A real browser, a narrow viewport, a screen reader.                                   |

The test that would have been ambiguous is `EC`'s "created by keyboard alone".
It means a keyboard **shortcut or input rule**, not a slash menu — the slash
menu is mouse-free, but it is chrome, and `EC` finishes before any chrome
exists. So `EC-13` ships a keyboard path to a table that does not depend on
`CH-06` existing, and `CH-06` is then a menu entry calling it. Neither block
waits on the other, and the table is usable at the end of both.

---

## SC — Scaffold (½ week)

**Exit:** `pnpm add @blockleaf/editor` works in a throwaway app and renders a box
you can type in.

| Id    | Task                                                                  | Status | Commit    | Completed  |
| ----- | --------------------------------------------------------------------- | ------ | --------- | ---------- |
| SC-01 | pnpm workspace + Turborepo, stripped to the §2 layout                 | Done   | `b96a94f` | 2026-10-09 |
| SC-02 | Shared `@blockleaf/tsconfig` and `@blockleaf/eslint-config`           | Done   | `b96a94f` | 2026-10-09 |
| SC-03 | `core` → `react` → `ui` import boundary enforced in lint              | Done   | `b96a94f` | 2026-10-09 |
| SC-04 | Vitest + jsdom; schema, extensions and editor tests                   | Done   | `b96a94f` | 2026-10-09 |
| SC-05 | Changesets, release workflow, npm provenance via `id-token: write`    | Done   | `b96a94f` | 2026-10-09 |
| SC-06 | CI gates: typecheck, lint, format, test, build, publint + attw, size  | Done   | `b96a94f` | 2026-10-09 |
| SC-07 | Changeset-required gate on pull requests                              | Done   | `b96a94f` | 2026-10-09 |
| SC-08 | `size-limit` budgets declaring `import` (130 kB editor, 2 kB schema)  | Done   | `b96a94f` | 2026-10-09 |
| SC-09 | MIT LICENSE, CODE_OF_CONDUCT, CONTRIBUTING                            | Done   | `b96a94f` | 2026-10-09 |
| SC-10 | `docs/schema.md` written before any extension work (§12.7)            | Done   | `b96a94f` | 2026-10-09 |
| SC-11 | Toolchain pins recorded with their rationale                          | Done   | `30c432a` | 2026-10-09 |
| SC-12 | GitHub remote connected, `main` pushed and tracking                   | Done   | —         | 2026-10-09 |
| SC-13 | Playwright — moved to EC-20 on 2026-10-10; see F3                     | Moved  | —         | —          |
| SC-14 | npm scope registered and published (`0.0.2` on npm); SC exit proven   | Done   | `98fff4e` | 2026-10-11 |
| SC-15 | Issue templates done; Discussions enabled in repository settings (F4) | Done   | —         | 2026-10-11 |

## EC — Editing core (1½ weeks)

**Exit:** every node and mark can be created by keyboard alone, tables included,
and the JSON round-trips through a snapshot test. Proven headlessly against the
command API, with no chrome rendered.

| Id    | Task                                                                    | Status | Commit    | Completed  |
| ----- | ----------------------------------------------------------------------- | ------ | --------- | ---------- |
| EC-01 | Schema module — `SCHEMA_VERSION`, `createEmptyDocument`, struct. guard  | Done   | `b96a94f` | 2026-10-09 |
| EC-02 | `BlockleafNode` as a discriminated union over the real node set; F5     | Done   | `8e6a8c8` | 2026-10-11 |
| EC-03 | Full node and mark set per `docs/schema.md`                             | Done   | `32d55f2` | 2026-10-12 |
| EC-04 | Extension presets — `minimal` / `standard` beyond capped StarterKit     | Done   | `32d55f2` | 2026-10-12 |
| EC-05 | Stable block ids                                                        | Done   | `c15f81e` | 2026-10-12 |
| EC-06 | Markdown input rules                                                    | Done   | `00b273e` | 2026-10-12 |
| EC-07 | Keyboard shortcuts for every node and mark                              | Done   | `1243e38` | 2026-10-12 |
| EC-08 | Paste normalisation                                                     | Done   | `f42a550` | 2026-10-12 |
| EC-09 | Link `href` sanitisation — in the schema, never only in the UI          | Done   | `32d55f2` | 2026-10-12 |
| EC-10 | Schema snapshot test that fails loudly on an accidental shape change    | Done   | `c8bb06d` | 2026-10-12 |
| EC-11 | Table node set in the schema and `docs/schema.md`; no nesting           | Done   | `e19816e` | 2026-10-12 |
| EC-12 | `@tiptap/extension-table` — `TableKit`, +11.74 kB measured (F9)         | Done   | `e0d61c8` | 2026-10-12 |
| EC-13 | `insertTable` command **and** a keyboard path that needs no menu        | Done   | `8e6559d` | 2026-10-12 |
| EC-14 | Structure commands — add/delete row and column, toggle header, delete   | Done   | `880c0a9` | 2026-10-12 |
| EC-15 | Cell merge and split                                                    | Done   | `d350b3b` | 2026-10-12 |
| EC-16 | Tab, Shift-Tab and arrow navigation; resolve the list-indent key clash  | Done   | `550813e` | 2026-10-12 |
| EC-17 | Table paste from HTML, Google Docs and Word, normalised to the node set | Done   | `f05eaf2` | 2026-10-12 |
| EC-18 | Table document in the schema snapshot and the round-trip test           | Done   | `011304d` | 2026-10-12 |
| EC-19 | `@blockleaf/editor/validate` subpath — Zod schema, Zod as optional peer | Done   | `d9d74ec` | 2026-10-12 |
| EC-20 | Playwright harness and a smoke spec, ahead of table selection work      | Done   | `efbd920` | 2026-10-12 |

## CH — The chrome (2 weeks)

**Exit:** a stranger sits down, types `/`, and builds a document — a table in it
— without touching the mouse or reading a doc.

`src/ui/` is an empty placeholder today, existing only so the import boundary is
enforced from the first commit.

| Id    | Task                                                                     | Status | Commit    | Completed  |
| ----- | ------------------------------------------------------------------------ | ------ | --------- | ---------- |
| CH-01 | Slash menu backed by a command registry                                  | Done   | `d4ee34a` | 2026-10-12 |
| CH-02 | Bubble menu with a link editor — `extension-bubble-menu`, +6.16 kB (F11) | Done   | `e44eabb` | 2026-10-13 |
| CH-03 | Drag handle and block menu — hand-rolled, +1.83 kB (F12)                 | Done   | `7f1cbc8` | 2026-10-13 |
| CH-04 | Placeholder and trailing node — hand-rolled, +0.40 kB (F13)              | Done   | `5f8e57e` | 2026-10-13 |
| CH-05 | Keyboard-complete and axe-clean                                          | Done   | `5efe7d3` | 2026-10-13 |
| CH-06 | Slash menu "Table" item with a grid-size picker, calling EC-13           | Done   | `67a6702` | 2026-10-13 |
| CH-07 | In-table controls — row and column handles, calling EC-14 and EC-15      | Done   | `b40815c` | 2026-10-13 |
| CH-08 | Bubble menu, inside a table only, for cell-level actions                 | Done   | `d1f6727` | 2026-10-13 |

## MC — Media and code (1 week)

**Exit:** dragging a 5 MB image in works, shows progress, survives a mid-upload
navigation, and a failed upload is retryable.

| Id    | Task                                                            | Status | Commit    | Completed  |
| ----- | --------------------------------------------------------------- | ------ | --------- | ---------- |
| MC-01 | Upload adapter interface (§4)                                   | Done   | `b6f7882` | 2026-10-13 |
| MC-02 | Drop, paste and picker entry points — +1.24 kB                  | Done   | `05657cb` | 2026-10-13 |
| MC-03 | Progress and abort — cancel and retry, +0.49 kB                 | Done   | `5fa4e4c` | 2026-10-13 |
| MC-04 | Image block with alt text and alignment — hand-rolled, +1.02 kB | Done   | `a114e5d` | 2026-10-13 |
| MC-05 | Code block — `lowlight`, curated grammars, opt-in subpath (F14) | Done   | `c004dfe` | 2026-10-13 |

## RD — Renderer + docs → public 0.1.0 (1½ weeks)

**Exit:** someone who has never seen the repo installs it from the docs alone
and renders stored JSON on a server.

| Id    | Task                                                                   | Status      | Commit | Completed |
| ----- | ---------------------------------------------------------------------- | ----------- | ------ | --------- |
| RD-01 | `@blockleaf/renderer` package                                          | Not started | —      | —         |
| RD-02 | Component overrides                                                    | Not started | —      | —         |
| RD-03 | HTML-string and plain-text exports                                     | Not started | —      | —         |
| RD-04 | Fumadocs on Next.js in `apps/docs`, live demo                          | Not started | —      | —         |
| RD-05 | README with a demo GIF                                                 | Not started | —      | —         |
| RD-06 | Dogfood in a real app (§10); target unnamed, F7                        | Not started | —      | —         |
| RD-07 | Table rendering — real `<table>`/`<thead>`, both React and HTML string | Not started | —      | —         |

## HD — Hardening (1–2 weeks)

**Exit:** a 500-page document stays responsive; the editor is fully usable on a
phone.

| Id    | Task                                                            | Status      | Commit | Completed |
| ----- | --------------------------------------------------------------- | ----------- | ------ | --------- |
| HD-01 | Full accessibility pass                                         | Not started | —      | —         |
| HD-02 | i18n via `labels`                                               | Not started | —      | —         |
| HD-03 | Theming docs for the `--bl-*` custom properties                 | Not started | —      | —         |
| HD-04 | Mobile and touch behaviour                                      | Not started | —      | —         |
| HD-05 | Large-document performance — 10k+ blocks, virtualise if needed  | Not started | —      | —         |
| HD-06 | `examples/vite-spa`                                             | Not started | —      | —         |
| HD-07 | Table a11y — header `scope`, caption, announced cell position   | Not started | —      | —         |
| HD-08 | Table on a narrow screen — overflow, touch, `colwidth` override | Not started | —      | —         |

## OP — Optional packages (ongoing)

**Exit:** each is additive — removing it changes nothing in the base bundle.

| Id    | Task                                                     | Status      | Commit | Completed |
| ----- | -------------------------------------------------------- | ----------- | ------ | --------- |
| OP-01 | `@blockleaf/collab` — Yjs plus a provider adapter        | Not started | —      | —         |
| OP-02 | `@blockleaf/ai` — streaming adapter, no bundled provider | Not started | —      | —         |
| OP-03 | `@blockleaf/markdown`                                    | Not started | —      | —         |
| OP-04 | Comments and mentions                                    | Not started | —      | —         |

## V1 — 1.0

| Id    | Task                                          | Status      | Commit | Completed |
| ----- | --------------------------------------------- | ----------- | ------ | --------- |
| V1-01 | Schema frozen with a written stability policy | Not started | —      | —         |
| V1-02 | Migration path documented                     | Not started | —      | —         |
| V1-03 | Two or more real apps in production on it     | Not started | —      | —         |

---

## SG — Standing guards

Not block work — these hold across every phase.

| Id    | Guard                                                           | Status      | Commit    | Completed  |
| ----- | --------------------------------------------------------------- | ----------- | --------- | ---------- |
| SG-01 | `size-limit` enforced in CI — 160 kB editor, 2 kB schema (F10)  | Done        | `b96a94f` | 2026-10-09 |
| SG-02 | Tiptap pinned to exact `3.31.4`                                 | Done        | `b96a94f` | 2026-10-09 |
| SG-03 | Scheduled CI job building against Tiptap `@latest` (§11, F8)    | Done        | —         | 2026-10-10 |
| SG-04 | A migration shipped in the same PR as any `SCHEMA_VERSION` bump | Not started | —         | —          |
