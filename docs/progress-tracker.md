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

Blocks run in the order listed: `SC` → `EC` → `CH` → `MC` → `RD` → `HD` → `FC` →
`PA` → `TB` → `OP` → `UX` → `EX` → `V1`, the same ids `PROJECT_PLAN.md` §9 uses.

**Position:** `MC` and `RD` are closed apart from `RD-06`. In `HD`, `HD-01` to
`HD-08`, `HD-12` and `HD-14` are done; `HD-09`, `HD-10`, `HD-11` and `HD-13`
are left. In `FC`, `FC-01` to `FC-04` are done. Both packages are live on npm and the docs
site is deployed at `blockleaf.dev`.

**Next:** `FC-05`, then `HD-09`. None of the `FC` tasks change the
stored shape — the `FC-03` placeholder lives only in the open editor and is
swapped back on save — so none of them wait on the migration runner. `HD-09`
is what `HD-10`, `SG-04` and every schema change in `PA` and `TB` wait on.

**Last verified:** 2026-10-21: 360 editor unit tests, 149 renderer, 46
Playwright across two projects — 37 on desktop Chrome, 9 on an emulated Pixel 7. Bundle at 147.46 kB of 160 kB, schema entry at 207 B of 2 kB, code block
subpath at 80.44 kB of 85 kB. Lint, typecheck and build cover eight workspaces
now that `examples/*` is one of them.

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
navigation, and a failed upload is retryable. **Met** — `e2e/uploads.spec.ts`
drops real files in a browser and asserts each of the four.

Syntax highlighting ships from `@blockleaf/editor/code-block` rather than the
default build: it costs 16.53 kB and there were 15.37 kB left. See F14.

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

The renderer is built on its own walker rather than `@tiptap/static-renderer`,
which nests marks in the opposite order to the editor and would have broken the
stylesheet both packages share. See F15.

User-facing documentation now lives in `apps/docs/content/docs/*.mdx` and is
published at `blockleaf.dev`; `docs/` keeps only the project's own records. The
site runs Fumadocs, which requires Tailwind — see F16 for why that does not
breach the no-CSS-framework rule.

RD-04 ships the site, the live demo and the pages that already existed. It is
deployed on Vercel and serving `blockleaf.dev`.

`RD-05` is done. The README describes the shipped state and now leads with the
demo GIF: a heading, a paragraph, a bullet list chosen from the slash menu, and
bold applied from the bubble menu. `scripts/record-demo.ts` records it —
Playwright drives the sandbox and `gifenc` encodes the frames — so
`pnpm demo:gif` regenerates the GIF when the chrome changes, rather than
someone re-recording it by hand. No ffmpeg and no system binary, so it runs
wherever the test suite does.

A third pass rebuilt the landing page on the brand prototype — a centred hero,
the editor panel with the real editor beside its stored JSON, the
why-Blockleaf cards and the npm packages section — and adopted the leaf mark
across the navbar, the favicon, the apple touch icon and the social card. The
mark ships as two cuts swapped in CSS rather than by reading the resolved
theme, which would flash the wrong one before hydration.

A later pass added the navbar (a Documentation dropdown, plus Examples and
Blog as placeholder pages), moved the live demo into three full-width tabs —
the editor, the renderer's output and the stored JSON — and switched the
install commands to `package-install`, which Fumadocs expands into npm, pnpm,
yarn and bun.

A second pass rebuilt the information architecture around four sidebar
sections — Introduction, Documentation, Integration and Resources — and
pinned the sidebar to the left edge of the window, which the Fumadocs grid
centres by default. It wrote what §6 was missing: `what-is-blockleaf`, the
comparison table, a fuller `getting-started`, the style guide with its
theming, Tailwind and shadcn/ui pages, and the two extension pages. Four live
examples replaced the `/examples` placeholder, the Fumadocs blog replaced the
`/blog` one and carries four posts, and `/changelog` and `/contributors` are
read from the GitHub API at build time. Social cards, canonicals, JSON-LD, a
sitemap and `robots.txt` are generated, and `llms.txt` and the Markdown
representations now cover the blog as well as the docs.

Two things from §6 are still unwritten: the recipes beyond those four
examples, and the migration guides from Novel and from plain Tiptap.
`fumadocs-page-history` would add
per-page contributors and change history, but it requires Node 24.14 and a
`satteri` peer dependency while this repository is pinned to 22.22.1, so
`/contributors` is repository-wide instead.

| Id    | Task                                                                   | Status      | Commit    | Completed  |
| ----- | ---------------------------------------------------------------------- | ----------- | --------- | ---------- |
| RD-01 | `@blockleaf/renderer` package                                          | Done        | `5da026d` | 2026-10-13 |
| RD-02 | Component overrides                                                    | Done        | `6d2770d` | 2026-10-13 |
| RD-03 | HTML-string and plain-text exports                                     | Done        | `a9c4af8` | 2026-10-13 |
| RD-04 | Fumadocs on Next.js in `apps/docs`, live demo                          | Done        | `ff4045a` | 2026-10-14 |
| RD-05 | README with a demo GIF                                                 | Done        | `dfe0b71` | 2026-10-19 |
| RD-06 | Dogfood in a real app (§10); target unnamed, F7                        | Not started | —         | —          |
| RD-07 | Table rendering — real `<table>`/`<thead>`, both React and HTML string | Done        | `b358752` | 2026-10-13 |

## HD — Hardening (1–2 weeks)

**Exit:** a 500-page document stays responsive; the editor is fully usable on a
phone.

`HD-01` widened the browser a11y suite from four surfaces to twelve — the
block menu, drag handle, table and its controls, row menu, callout, link
editor, upload placeholder and image joined the editor at rest, the slash
menu, the bubble menu and the grid picker. Two real findings came out of it
and are fixed: an uploaded image carried no `alt`, which makes a screen reader
announce the URL instead, and the block menu was a scroll container focusable
only in script, so its items below the fold could not be reached. Alt text now
comes from the upload adapter when it supplies one and from the file name
otherwise.

`HD-02` put every string the chrome renders into one typed label set on
`BlockleafEditor`, grouped by surface and merged a level at a time, so
overriding one group heading does not mean restating the others. `blockTypes`
names each block once — the slash menu's items and the block menu's "Turn
into" group both read it, so the two cannot drift apart. Each default registry
became a function of a label set, with the old `default*` arrays kept as those
functions called with English. A misspelled key is a compile error, which is
the whole reason the set is shaped rather than a flat key space.

`HD-04` found the editor's worst mobile defect by running the suite against
an emulated phone: the drag handle only ever appeared on `mousemove`, which a
touch device never fires, so every block action — turn into, move, duplicate,
delete — was unreachable. On a coarse pointer the handle now follows the caret
instead. A touch press on it also had to stop blurring the editor, which was
unmounting the handle under the finger before the click landed; mouse presses
are left alone, because preventing their default would stop `dragstart` too.
Targets grow to 44px under `@media (pointer: coarse)`.

A second Playwright project runs `e2e/touch.spec.ts` on a Pixel 7, because a
phone is not a narrow desktop. Still open there and belonging to `HD-08`: a
table wider than the screen, and the layout shift when the virtual keyboard
opens over a toolbar near the bottom of the viewport.

`HD-07` and `HD-08` closed both IOUs the earlier tasks wrote. Header cells now
carry `scope`, decided from the document's shape exactly as the renderer
decides it — the editor had been emitting a bare `<th>`, so a document
announced one way while it was edited and another once it was published. The
caret's cell is announced through a live region, counted with `TableMap` so a
merged cell reports the first column it really occupies. An empty header is
named rather than silent; axe still reports `empty-table-header` on it because
that rule checks visible text, so the scan excepts that one rule by name.

`HD-08` turned on a CSS detail worth keeping: `overflow-x` on the table
wrapper did nothing on its own. A grid or flex item defaults to
`min-width: auto`, so a 780px table pushed the _host's_ layout wider than the
screen and the wrapper inherited that width with nothing left to scroll. The
wrapper uses `contain: inline-size`, which keeps the table's width out of the
host's layout — the alternative was asking every consumer to set
`min-width: 0` on whatever box they put the editor in. The sandbox serves such
a document at `?wide`, because a stored `colwidth` cannot be typed.

`HD-05` was the first task here that had to measure before it could decide
anything, so it built `pnpm perf` first. The measurement found one thing, and
it was bad: a document that had never been through this editor — an import, a
migration, anything without block ids — took **137 seconds** to open at ten
thousand blocks. `UniqueID` assigns the missing ids inside ProseMirror, one
`setNodeMarkup` step per block on a single transaction, each step applied to
the document the one before it produced. Quadratic. Stamping them in one pass
over plain JSON before the document reaches ProseMirror took it to 2.3
seconds, and `withBlockIds` is exported so a bulk migration can do it at rest.

`onChange` was also serialising the whole document on every keystroke and
debouncing only the delivery, which is precisely what the debounce exists to
avoid; it now serialises inside the timer.

Two things the measurement ruled **out**, worth recording so nobody pays for
them twice. `UniqueID`'s per-transaction `oldState.doc.eq(newState.doc)` is a
deep comparison of the whole document and looked like the obvious remaining
cost — removing the extension entirely changed nothing measurable. The
workbench's JSON pane, which re-stringifies the document on every change, was
not it either. What is left is ProseMirror's own cost, about four milliseconds
per thousand blocks and linear, so virtualisation is not bought yet: it is
`HD-11`, and it wants evidence from someone working past ten thousand blocks
rather than caution.

`HD-06` put `examples/vite-spa` in the tree — a runnable app rather than
another snippet, because the thing worth showing only appears when the pieces
are together. It writes a document, stores it as JSON, reads it back with
`@blockleaf/renderer`, and builds its table of contents from `extractHeadings`
off that same JSON. Switch it to Read and there is no ProseMirror on the page
at all, which is the whole argument for storing a document rather than HTML.
`examples/*` joined the pnpm workspace, so the repository's own lint,
typecheck and build now cover it and a breaking change to either package
fails here first.

The table `<caption>` that `HD-07` also named is **not** done, and the reason
is worth recording. It would be stored content, the pre-`0.1.0` additive
exemption expired when `0.1.0` was published on 2026-10-18, and there is no
migration runner to hang a migration on: `withSchemaVersion` stamps the
current version onto a document without transforming it, so after a bump it
would relabel a version 1 document as version 2 and change nothing. That
machinery is `HD-09` and the caption is `HD-10`, in that order. Worth doing
soon rather than late: `@blockleaf/editor` had 1198 downloads across five
days last month, every one of them a publish day with nothing in between —
registry mirrors, not consumers. The schema is as cheap to change now as it
will ever be.

Three more gaps came out of reviewing that work rather than doing it, and are
written down here because the only other copy was a merged pull request body.

`HD-12` is **done**. `HD-08` taught the editor to contain a table wider than
the screen; `@blockleaf/renderer` emitted a bare `<table>`, so a published
page blew out its host's layout exactly as the editor used to — on the read
path, the one §1 argues is used a thousand times for every time a document is
written. Both targets now wrap a table identically in
`.blockleaf-table-scroll`, focusable and named, and the class is styled
unscoped on purpose: rendered output lands in whatever markup the host wrote,
and a table that only behaves when somebody remembered `.blockleaf-editor__content`
is a table that does not behave. Proven in a browser rather than asserted — a
900px published table inside a 428px box on a 500px viewport scrolls, stays in
the viewport, and leaves the page alone.

The renderer gained a `labels` option in the process. It had no user-facing
strings before this one, and hard-coding English while the editor has had a
full label set since `HD-02` would have made it the odd one out.

`HD-13`: `withBlockIds` fixed loading, not pasting. `UniqueID`'s
`transformPasted` strips ids from pasted content and `appendTransaction`
re-assigns them with the same `setNodeMarkup` loop, scoped to the pasted
range. Fifty blocks is nothing; ten thousand is the 137-second path again.
Fixing it here means fighting another extension for the same hook, so it may
belong upstream.

Settled while recording these, so nobody re-opens it: `contain: inline-size`
has been in Safari since 16.0, Chrome since 105 and Firefox since 101. The
containment `HD-08` leans on is three years old and needs no fallback.

`open-flags.md` stays empty, correctly. None of these three is a decision
that blocks work — they are known defects with known fixes, which is what
this table is for.

| Id    | Task                                                                                      | Status      | Commit    | Completed  |
| ----- | ----------------------------------------------------------------------------------------- | ----------- | --------- | ---------- |
| HD-01 | Full accessibility pass                                                                   | Done        | `61d82a8` | 2026-10-20 |
| HD-02 | i18n via `labels`                                                                         | Done        | `52aa00f` | 2026-10-20 |
| HD-03 | Theming docs for the `--bl-*` custom properties                                           | Done        | `f7108af` | 2026-10-14 |
| HD-04 | Mobile and touch behaviour                                                                | Done        | `fe25a20` | 2026-10-20 |
| HD-05 | Large-document performance — 10k+ blocks measured, nothing quadratic                      | Done        | `dda1a78` | 2026-10-21 |
| HD-06 | `examples/vite-spa`                                                                       | Done        | `4734b38` | 2026-10-21 |
| HD-07 | Table a11y — header `scope`, announced cell position (caption → HD-10)                    | Done        | `316b929` | 2026-10-21 |
| HD-08 | Table on a narrow screen — overflow, touch, `colwidth` override                           | Done        | `316b929` | 2026-10-21 |
| HD-09 | A migration runner, so a `SCHEMA_VERSION` bump is survivable                              | Not started | —         | —          |
| HD-10 | Table `<caption>` — stored, so it needs `HD-09` and a bump; shares its shape with `PA-20` | Not started | —         | —          |
| HD-11 | Virtualisation — only if someone past 10k blocks reports needing it                       | Not started | —         | —          |
| HD-12 | A wide table in `@blockleaf/renderer`, which wrapped one in nothing                       | Done        | `a52d2dc` | 2026-10-22 |
| HD-13 | Pasting a long document, which still takes the quadratic path                             | Not started | —         | —          |
| HD-14 | Autofocus threw on Android, iOS and Safari, and `create` never fired — Tiptap 8546        | Done        | `729dae6` | 2026-11-08 |

## FC — Forward compatibility (½–1 week)

**Exit:** an editor built without the table extensions opens a document full
of tables, shows them as placeholders, saves, and the tables come back out
byte for byte.

Measured against the pinned ProseMirror on 2026-10-28 and re-checked through
the editor on 2026-11-07, because the surfaces do not fail the same way and
the differences decide the work. `nodeFromJSON` **throws** — `RangeError:
Unknown node type` for a node, `There is no mark type … in this schema` for a
mark — but Tiptap catches it: with `enableContentCheck` off, the editor logs
a console warning and opens an **empty document**, the valid blocks gone with
the unknown one. The paste path parses HTML instead and **silently drops**
what it does not recognise. The validator rejects the whole document, because
`blockNodeSchema` is a strict `z.union`. `@blockleaf/renderer` keeps an
unknown node's children and loses its wrapper, so a childless node renders as
nothing at all.

The empty document is the worst of these. A refused document leaves the
stored copy alone; an empty editor that still saves writes nothing over
something on the first keystroke, and nothing told the host.

Already-published versions cannot be fixed from here. The walk has to exist
in the version doing the reading, which is why this block runs before `PA`
rather than beside it.

| Id    | Task                                                                              | Status      | Commit    | Completed  |
| ----- | --------------------------------------------------------------------------------- | ----------- | --------- | ---------- |
| FC-01 | `onContentError` surfaced; a document the editor cannot read opens read-only      | Done        | `a8f517c` | 2026-11-08 |
| FC-02 | A newer `attrs.schemaVersion` joins the `incompatibleDocument` trigger; `'throw'` | Done        | `4344313` | 2026-11-11 |
| FC-03 | Unknown nodes and marks round-trip through a placeholder, byte for byte           | Done        | `cc7933e` | 2026-11-11 |
| FC-04 | Validator accepts unrecognised types; `schema.mdx` records the contract           | Done        | `f46ac4a` | 2026-11-11 |
| FC-05 | Renderer takes an `unknown` component override                                    | Not started | —         | —          |

`FC-01` depends on nothing — not on `HD-09`, not on the rest of the block. It
turns Tiptap's content check on, and when `defaultValue` fails it the editor
opens read-only whatever `editable` says, with `onChange` and
`onChangeImmediate` silent, so the empty fallback can never be saved over the
stored document. `onContentError` reports why. `incompatibleDocument` is the
override — `'readonly'` by default, `'discard'` to edit the empty document
and accept the loss — and it is live, so a host can flip it after a
confirmation. The lock is the package's job rather than the host's because
the safe move is the same for every host and needs nothing a host knows; the
override is where host knowledge comes in. See `F17`.

Two consequences of the check being on, both documented: `setContent` with
unreadable content throws rather than reporting, and a known block whose
children break the schema's content rules now fails too. Every document the
editor writes is valid, because ProseMirror enforces those rules on every
edit; the editor's unit and browser suites were run with the check on and
nothing locked.

The block ships as **one release** when `FC-05` lands. Changesets accumulate
on `main` until then and collapse into a single minor bump, so the release
carries the whole story — refusal, placeholder, validator and renderer
together — rather than a locked empty editor on its own.

## PA — Parity blocks and marks (3–4 weeks)

**Exit:** each addition is importable on its own, the base bundle is
unchanged without it, and the schema moved in planned batches with a
migration per batch.

Nothing here lands in the main entry. The core is at 147.46 kB of a 160 kB
budget, so every item below is a subpath or its own package, each with its
own `size-limit` entry declaring `import`. Five of the marks share
`./text-style` and two share `./toc`, because a subpath per feature is
release overhead with nothing to show for it.

The additive schema changes land in **planned batches** — `PA-02` to `PA-11`
in one bump, `PA-12` to `PA-17` in another. Six bumps for six node types is
churn every host pays to follow, and the migration for a purely additive
change is the same work whether it runs once or six times.

`PA-01` needs no bump at all: `details` is already in `schema.ts`, in
`validate.ts` and in both renderer targets, and has no editor extension
behind it. `PA-18` and `PA-19` do not touch the stored shape either.

| Id    | Task                                                              | Ships as                       | Status      | Commit | Completed |
| ----- | ----------------------------------------------------------------- | ------------------------------ | ----------- | ------ | --------- |
| PA-01 | `details` — the toggle block the schema already carries           | core                           | Not started | —      | —         |
| PA-02 | Mentions                                                          | `./mentions`                   | Not started | —      | —         |
| PA-03 | Emoji                                                             | `./emoji`                      | Not started | —      | —         |
| PA-04 | Math, block and inline                                            | `@blockleaf/math`              | Not started | —      | —         |
| PA-05 | Text colour                                                       | `./text-style`                 | Not started | —      | —         |
| PA-06 | Text alignment                                                    | `./text-style`                 | Not started | —      | —         |
| PA-07 | Subscript and superscript                                         | `./text-style`                 | Not started | —      | —         |
| PA-08 | Table of contents                                                 | `./toc`                        | Not started | —      | —         |
| PA-09 | Character and word count                                          | `./toc`                        | Not started | —      | —         |
| PA-10 | Font family, stored as a token                                    | `./text-style`                 | Not started | —      | —         |
| PA-11 | Font size, stored as a token                                      | `./text-style`                 | Not started | —      | —         |
| PA-12 | Video, with `PA-20`'s caption built in                            | `./media`                      | Not started | —      | —         |
| PA-13 | Audio, with `PA-20`'s caption built in                            | `./media`                      | Not started | —      | —         |
| PA-14 | File attachment, with `PA-20`'s caption built in                  | `./media`                      | Not started | —      | —         |
| PA-15 | Embeds — provider allowlist in the schema; caption included       | `./embeds`                     | Not started | —      | —         |
| PA-16 | Link preview card, caption included                               | `./embeds`                     | Not started | —      | —         |
| PA-17 | Columns                                                           | `./layout`                     | Not started | —      | —         |
| PA-18 | Markdown export — a fourth target on the renderer's walker        | `@blockleaf/renderer/markdown` | Not started | —      | —         |
| PA-19 | Print stylesheet, so the browser can save a readable PDF          | `blockleaf.css`                | Not started | —      | —         |
| PA-20 | `figure`/`figcaption` on `image` — caption and its own alignment  | core                           | Not started | —      | —         |
| PA-21 | Caption chrome shared by every media and embed block              | `./media`, `./embeds`          | Not started | —      | —         |
| PA-22 | Background colour, a second bubble-menu action beside text colour | `./text-style`                 | Not started | —      | —         |
| PA-23 | Block background colour                                           | core                           | Not started | —      | —         |
| PA-24 | Resize handles and one-click full width, image and video          | `./media`                      | Not started | —      | —         |

`PA-10` and `PA-11` store a token — `fontSize: "lg"` resolving through
`--bl-font-size-lg` — not a CSS value. A `14px` written into a document is
presentation stored in content: wrong on a phone, wrong under a host's theme,
wrong in the renderer, and a free-text style attribute is the same injection
shape the schema's `href` rule exists to close. See `F18`.

`PA-15` carries the same rule: an `<iframe>` pointed at an arbitrary URL is
the risk `href` sanitising already guards against, so the provider allowlist
belongs in the schema.

`PA-17` is last in the block because it is the only item that fights existing
chrome — the drag handle and block menu both assume one vertical stack.

`PA-20` is the structural one. `image` is `atom: true` today — a leaf the
caret cannot enter — and a caption that can hold a link or an emphasis stops
it being one. That changes selection, the drag handle, the block menu and the
`HD-01` axe surfaces, which is why it is its own task and not a line in
`PA-12`. It also changes what the renderer emits, from a bare `<img>` to a
`<figure>`, so any host styling that targets the old output moves with it.
See `F20`.

A caption is **not** alt text and does not replace it. Alt text describes the
image for someone who cannot see it; a caption adds context for everyone, and
a screen reader reads both. Where they say the same thing it is announced
twice, so the docs page for `PA-20` has to say what each is for rather than
leaving hosts to guess.

`PA-20`, `PA-21` and `HD-10` are one design, not three. A table caption and a
figure caption that store differently would put two caption mechanisms in one
schema, permanently. Whichever ships first sets the shape.

`PA-22` is mostly chrome: `highlight` already carries an optional `color`, so
a text background exists in the stored shape and has no menu. `PA-23` is the
schema-heavy one — a background on _every_ block is a new attribute
everywhere, and it overlaps the callout, which is already a block whose
purpose is being a coloured box.

Colours store a **token**, not a value, for the same reasons as `PA-10` and
`PA-11` and with one more: a hex that reads well on white is often unreadable
on dark. The precedent is already here — `callout` stores `tone`, not a
colour. See `F18`.

`PA-24` resizes **width only, with the aspect ratio locked**, plus a
full-width toggle, unless `F21` decides otherwise. Dragging a top or bottom
edge means either distorting the picture or cropping it; the first is almost
never wanted and the second is a different feature with its own stored shape.
Full width is a named value rather than a pixel count, because a number
measured on the author's screen is wrong on everyone else's.

## TB — Tables (2–3 weeks)

**Exit:** a column can be resized, a row or column moved, a cell aligned and
coloured, and a whole row formatted in one go, from a mouse, from the
keyboard and from a touch screen alike; a table that stores none of it looks
as it did before the block, apart from its default width.

The table has had its own rules since `EC`: `CH` calls `EC`, and every
feature has a keyboard path that owes nothing to the chrome. This block
extends the table under those same rules, first to the set of features a
Notion-style editor's table is expected to have, then to what a spreadsheet
user reaches for in a document: alignment, one format across a whole row,
equal widths back in one click.

It sits after `PA` rather than after `FC` on purpose. `PA-06` gives a cell
its horizontal alignment, because it is a paragraph attribute and a cell
holds paragraphs, and `TB-05` applies it across a selection. `PA-23` sets the
token precedent a cell background follows. And `HD-09` has landed by then, so
the block's stored additions are one planned bump rather than three rushed
ones.

Unlike `PA`, this block lands beside the table that is already in the main
entry; a subpath for one feature of a block the core ships would be a strange
shape. Each row is measured before it lands, against the 160 kB budget, and
anything that does not fit ships as a subpath after all.

| Id    | Task                                                                                    | Status      | Commit | Completed |
| ----- | --------------------------------------------------------------------------------------- | ----------- | ------ | --------- |
| TB-01 | Column resize by drag, writing the `colwidth` the schema already stores (`F22`)         | Not started | —      | —         |
| TB-02 | Move a row or column, from the handles and from the keyboard                            | Not started | —      | —         |
| TB-03 | Add a column or a row from the table's right and bottom edges, one tap, no menu         | Not started | —      | —         |
| TB-04 | Cell background, stored as a tone token                                                 | Not started | —      | —         |
| TB-05 | Vertical and horizontal alignment, for a cell or across selected rows and columns       | Not started | —      | —         |
| TB-06 | Bubble menu on a cell selection — one format applied to every cell in a row or column   | Not started | —      | —         |
| TB-07 | Equal column widths restored in one command, after any column was resized               | Not started | —      | —         |
| TB-08 | Table width follows its columns, with a named full width; the renderer matches          | Not started | —      | —         |
| TB-09 | Renderer: a wide table scrolls by touch, trackpad and pointer drag, proven in a browser | Not started | —      | —         |

`TB-01` changes nothing in the stored shape. `colwidth` has been in the
schema since `EC-11`, `@blockleaf/renderer` has honoured it since `RD-07`,
and since `HD-08` and `HD-12` a table wider than its container scrolls inside
its wrapper in both; the editor simply passes `resizable: false` to the table
extension today. The resize code ships inside that extension whether or not
it is on, so the expected cost is close to nothing, measured rather than
assumed. What the row does have to add is a second and a third path: a column
width is set from the column menu and nudged from the keyboard, because a
drag handle is a mouse feature and nothing hovers on a phone (`HD-04`). The
width is exact on every screen, phone included, and the table scrolls when
its columns add up to more than the container. `F22` records the reversal of
the plan's v0.1 note that resizing would not be persisted.

`TB-03` is the edge affordance: a strip down the table's right side adds a
column, a strip along its bottom adds a row, and the corner where they meet
shows both. They appear while the pointer is over the table and, on a phone,
while the caret is in it. `TB-02` and `TB-03` are commands plus chrome with
no stored change, and so is `TB-06`: a drag across cells or a tap on a row
or column handle makes a cell selection, the bubble menu opens on it, and a
mark applied there lands in every cell of it. `TB-07` writes `colwidth` back
to `null` on every cell, so the table returns to equal columns.

`TB-08` changes a default. A table today is as wide as its container however
few columns it has. After this row a column has a default width, a token
resolving through a `--bl-*` property; a table is the sum of its columns;
each added column makes it wider; and once it is wider than the container it
scrolls. Full width is a named value stored on the table, the shape `F21`
chose for images rather than a pixel count measured on the author's screen,
and the toggle is offered only while the table is narrower than its
container, because a scrolling table is already as wide as it can be. The
renderer changes in the same release, so a document reads as it edits, and
the changeset says plainly that an existing table with no stored widths will
render narrower than it did.

`TB-09` mostly proves what `HD-08` and `HD-12` built: the wrapper is a native
`overflow-x: auto` region, so a finger or a trackpad scrolls it already. What
the row adds is dragging the table sideways with a mouse, and a browser test
on the emulated phone against the renderer's output rather than the editor's.

Three rows touch the schema, and they land in **one** bump with the migration
in the same PR under `SG-04`. `TB-04` adds `tone` on `tableCell` and
`tableHeader`, the token shape `callout` stores and `PA-23` extends to every
block. `TB-05` adds a vertical alignment token on the same two nodes, while
horizontal alignment is `PA-06`'s paragraph attribute applied to every
paragraph in the selected cells. `TB-08` adds the table's named width.

Rows for the requirements not yet decided are added once they are written
down; the ids from `TB-10` are reserved for them.

`UX-05` stays where it is. That is the design pass over the table's grips,
selection and menus, and this block gives it more to design.

## OP — Optional packages (ongoing)

**Exit:** each is additive — removing it changes nothing in the base bundle.

| Id    | Task                                                                               | Status      | Commit | Completed |
| ----- | ---------------------------------------------------------------------------------- | ----------- | ------ | --------- |
| OP-01 | `@blockleaf/collab` — Yjs plus a provider adapter                                  | Not started | —      | —         |
| OP-02 | `@blockleaf/ai` — streaming adapter, no bundled provider                           | Not started | —      | —         |
| OP-03 | `@blockleaf/convert` — markdown import; export is `PA-18`                          | Not started | —      | —         |
| OP-04 | Comments — the mark plus a `ThreadStore` the host implements; mentions are `PA-02` | Not started | —      | —         |

## UX — Design and motion (2–3 weeks)

**Exit:** the refreshed surfaces are still axe-clean, every animation stops
under `prefers-reduced-motion`, nothing gained an `!important` or a hardcoded
colour, and a screenshot suite fails if any of it silently changes.

Runs after `OP` on purpose. Refining blocks that do not exist yet is work
thrown away, and a motion language is easier to set once across every surface
than to retrofit onto each of them.

Motion is CSS, not a library — see `F19`. An animation package costs tens of
kilobytes against a budget with twelve to spare, which is the same trade
§11 refuses everywhere else.

`UX-01` comes first and is not a formality. Every animation in this block
needs a path that does not run, and writing that rule once at the start is
cheaper than auditing twelve surfaces for it at the end.

| Id    | Task                                                                                        | Status      | Commit | Completed |
| ----- | ------------------------------------------------------------------------------------------- | ----------- | ------ | --------- |
| UX-01 | Motion tokens (`--bl-duration-*`, `--bl-ease-*`) and a global `prefers-reduced-motion` rule | Not started | —      | —         |
| UX-02 | Slash menu, bubble menu and block menu — open, close, selection                             | Not started | —      | —         |
| UX-03 | Drag handle, drop indicator, and the dragged block's own feedback                           | Not started | —      | —         |
| UX-04 | Callout, toggle, code block and task list designs                                           | Not started | —      | —         |
| UX-05 | Table — grips, cell selection, row and column menus                                         | Not started | —      | —         |
| UX-06 | Media — selection, resize, upload progress, failed upload                                   | Not started | —      | —         |
| UX-07 | Empty, loading and placeholder states, the `FC-03` unknown block included                   | Not started | —      | —         |
| UX-08 | Focus and selection treatment, consistent across every block                                | Not started | —      | —         |
| UX-09 | `@blockleaf/renderer` read view, and the `PA-19` print stylesheet with it                   | Not started | —      | —         |
| UX-10 | Dark mode and contrast pass over everything the block touched                               | Not started | —      | —         |
| UX-11 | Playwright screenshot tests, so a refresh cannot regress silently                           | Not started | —      | —         |
| UX-12 | Re-run the twelve-surface axe suite from `HD-01`                                            | Not started | —      | —         |

`UX-09` is the one most easily skipped and the hardest to justify skipping.
Content is read far more often than it is written, and the read view has had
no design attention at all.

## EX — Conversion and export (ongoing)

**Exit:** a document survives a round trip through each supported format
without losing a node the format can represent.

Planned, and coming after `UX`. The cheap half of conversion ships in
`PA-18` and `PA-19`, and what is left is the expensive half.

| Id    | Task                 | Ships as                     | Status      | Commit | Completed |
| ----- | -------------------- | ---------------------------- | ----------- | ------ | --------- |
| EX-01 | Word export          | `@blockleaf/convert`         | Not started | —      | —         |
| EX-02 | Word import          | `@blockleaf/convert`         | Not started | —      | —         |
| EX-03 | PDF at full fidelity | a docs recipe, not a package | Not started | —      | —         |
| EX-04 | Version history      | `@blockleaf/collab`          | Not started | —      | —         |

`EX-03` ships no code. A headless browser over `@blockleaf/renderer`'s HTML
output is a page in the docs; `PA-19` covers the common case with a print
stylesheet and no dependency at all.

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
