# Project plan — a Notion-style rich text editor on Tiptap

A headless-first, block-based editor published as npm packages, with a documentation site and a live playground. Built on Tiptap v3 (ProseMirror), owned end to end so it can be dropped into any React project.

> **Naming — decided 2026-10-09.** `blockleaf`, packages `@blockleaf/editor` and `@blockleaf/renderer`, CSS prefix `--bl-`, root class `.blockleaf-editor`, docs at `blockleaf.dev`. Verified free on 2026-10-08: the npm names, the GitHub org and the `.dev` domain. **Still to claim:** the `@blockleaf` npm scope (org scope availability cannot be checked anonymously — confirm it at signup), the GitHub org, and the domain. `blockleaf.com` is already registered by an unrelated party.

---

## 1. What this is, and what it is not

**It is:** a React component that edits a document and gives you back JSON, plus a renderer that turns that JSON back into HTML or React on a server. Notion-style editing — slash menu, drag handles, block-level everything — with no opinion about where content is stored or how the host app is styled.

**It is not:** a CMS, a storage layer, a collaboration server, or an AI product. Those attach through adapters.

### Why another one

Be honest about the wedge, in the README and in your own head. The field already has [Novel](https://github.com/steven-tey/novel), [BlockNote](https://www.blocknotejs.org/) and [Plate](https://platejs.org/). A plan that doesn't name a differentiator produces a project that gets 40 stars and dies. Pick two or three of these and hold the line:

| Wedge                                     | What it means in practice                                                                                                                                                                         |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **No CSS framework coupling**             | Ships a plain stylesheet driven by CSS variables. No Tailwind, no `prose` classes, no build-time config. Novel's Tailwind v3 assumption is a real migration cost for consumers — don't repeat it. |
| **A documented, versioned JSON contract** | The stored document shape is the product's real API. Versioned, schema-tested, with migrations shipped. Most editors treat output as an implementation detail and break consumers quietly.        |
| **Server rendering in the box**           | A first-class renderer package, not "use dangerouslySetInnerHTML". Content is usually read a thousand times for every time it's written.                                                          |
| **Headless core, replaceable chrome**     | Every menu is a component you can swap. Default UI exists so `pnpm add` works on day one, but nothing is welded shut.                                                                             |

Write this as a comparison table in the docs on day one. It is the first thing an evaluator looks for.

---

## 2. Repository layout

pnpm workspaces + Turborepo.

```
blockleaf/
├─ apps/
│  ├─ docs/                 # documentation site + live playground (Fumadocs on Next.js)
│  └─ sandbox/              # Vite SPA for fast extension work (not published, not deployed)
├─ packages/
│  ├─ editor/               # @blockleaf/editor   — the editor: schema, extensions, React component, default UI
│  ├─ renderer/             # @blockleaf/renderer — JSON → React/HTML, server-safe, no ProseMirror runtime
│  ├─ markdown/             # @blockleaf/markdown — JSON ↔ markdown (phase 5; keep out of v0.1)
│  ├─ tsconfig/             # shared tsconfig presets (private)
│  └─ eslint-config/        # shared lint config (private)
├─ examples/
│  ├─ next-app-router/      # the reference consumer; also the e2e target
│  └─ vite-spa/             # proves it works without Next
├─ .changeset/
├─ .github/workflows/       # ci.yml, release.yml
├─ turbo.json
└─ pnpm-workspace.yaml
```

### Package count: start with two

Every published package is a permanent promise: its own version, changelog, migration notes and issue surface. Publish **`@blockleaf/editor`** and **`@blockleaf/renderer`** for v0.1 and nothing else.

Split later, only when a reason arrives:

- a non-React target (Vue, Svelte, plain DOM) → extract `@blockleaf/core`
- collaboration → `@blockleaf/collab`, so Yjs stays out of the base bundle
- AI commands → `@blockleaf/ai`

Inside `@blockleaf/editor`, keep the eventual split as **folders** from day one (`src/core/`, `src/react/`, `src/ui/`) with no imports pointing the wrong way. Enforce it with an import-boundary lint rule. Extracting a package later is then a `mv` instead of a refactor.

### Entry points

```jsonc
// packages/editor/package.json
{
  "type": "module",
  "sideEffects": ["*.css"],
  "exports": {
    ".": { "types": "./dist/index.d.ts", "import": "./dist/index.js" },
    "./extensions": { "types": "./dist/extensions.d.ts", "import": "./dist/extensions.js" },
    "./styles.css": "./dist/styles.css",
  },
}
```

ESM only. CJS for an editor in 2026 is a cost with no users behind it — but say so in the README so nobody files it as a bug.

---

## 3. The document schema is the product

Decide this before writing a single component. Everything else can be refactored; this cannot, because it lives in other people's databases.

### Rules

1. **Version the document.** Every doc carries `{ "type": "doc", "attrs": { "schemaVersion": 1 }, "content": [...] }`. Without this, the first breaking change is unshippable.
2. **Every block carries a stable `id`.** Needed for drag handles, anchor links, comments, collaborative cursors and block-level diffing. Retrofitting ids into existing content is miserable. Use Tiptap's UniqueID extension (open-sourced in 3.0 — confirm the package name when you install) or your own plugin.
3. **Ship migrations with the schema.** `migrate(doc)` walks any older `schemaVersion` to current. Write it when you bump to 2, not when someone complains.
4. **Snapshot-test the schema.** A test that serialises the full node/mark set to JSON and compares against a committed fixture. Any accidental change fails CI loudly.
5. **Validate at the boundary.** Export a Zod (or Valibot) schema for the document so consumers can validate server-side before storing. This is a genuine differentiator — most editors leave hosts to trust whatever the client posts.

### Node and mark set for v0.1

| Nodes                                   | Notes                                                                                 |
| --------------------------------------- | ------------------------------------------------------------------------------------- |
| `doc`, `paragraph`, `text`, `hardBreak` |                                                                                       |
| `heading`                               | Levels 1–3 only. Deeper levels are a document-structure smell and a renderer problem. |
| `bulletList`, `orderedList`, `listItem` | Nesting allowed, capped at 3 levels.                                                  |
| `taskList`, `taskItem`                  | Checkboxes; the single most-expected Notion feature.                                  |
| `blockquote`                            |                                                                                       |
| `codeBlock`                             | With `lowlight` for highlighting; store `language`.                                   |
| `horizontalRule`                        |                                                                                       |
| `image`                                 | `{ id, src, alt, width, align }` — see the upload adapter below.                      |
| `callout`                               | Custom node: `{ emoji, tone }`. Cheap to build, instantly reads as "Notion".          |
| `details` / `toggle`                    | Open-sourced in Tiptap 3.0.                                                           |

| Marks                                           | Notes                                                                                                                        |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `bold`, `italic`, `strike`, `underline`, `code` |                                                                                                                              |
| `link`                                          | Sanitise `href`: allow `https:`, `mailto:` and site-relative paths; reject `javascript:` at the schema level, not in the UI. |
| `highlight`                                     | Optional colour attribute.                                                                                                   |

**Explicitly out of v0.1:** tables, columns, embeds, footnotes, mentions, comments, math. Each is a project of its own. Say so in the roadmap so people stop asking.

---

## 4. Editor architecture

### Composition over configuration

```tsx
import { Editor, presets } from '@blockleaf/editor';
import '@blockleaf/editor/styles.css';

<Editor
  defaultValue={doc}
  extensions={presets.standard} // or presets.minimal, or your own array
  onChange={(doc) => save(doc)} // debounced internally, documented
  upload={uploadAdapter}
  slashItems={(defaults) => [...defaults, myItem]}
  labels={bn} // every string overridable
  readOnly={false}
/>;
```

Three presets — `minimal` (paragraph, marks, links), `standard` (the table above), `full` (standard + everything optional) — and an escape hatch to pass a raw Tiptap extension array. Presets are what make the first five minutes feel good; the escape hatch is what keeps serious users.

### Decisions worth making once, deliberately

| Decision                   | Call                                                                                                   | Why                                                                                                                                                                                                                                  |
| -------------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Controlled vs uncontrolled | **Uncontrolled.** `defaultValue` + `onChange`.                                                         | A controlled ProseMirror fights the editor's own transactions and destroys the undo stack. Offer `editorRef.setContent()` for programmatic updates. Document this loudly — it is the most common complaint against editor libraries. |
| `onChange` payload         | Debounced JSON (default 300 ms), plus `onChangeImmediate` for autosave indicators.                     | Serialising on every keystroke janks large documents.                                                                                                                                                                                |
| SSR                        | `immediatelyRender: false` under Next App Router, re-exported as the default.                          | Tiptap hydration mismatches are the #1 Next.js issue in every editor's tracker. Handle it for people.                                                                                                                                |
| Styling                    | CSS variables on `.blockleaf-editor`, one stylesheet, no framework.                                    | Lets a Tailwind app, a CSS-modules app and a styled-components app all consume it unchanged.                                                                                                                                         |
| Dark mode                  | Driven by `[data-theme="dark"]` **and** `prefers-color-scheme`, both overridable.                      |                                                                                                                                                                                                                                      |
| Bundle                     | `@tiptap/*` as dependencies, `react` as a peer. Track size with `size-limit` in CI with a hard budget. | A Notion-style editor that lands at 400 kB gzipped gets rejected on sight. Set the budget at the start and watch it.                                                                                                                 |

### The chrome

- **Slash menu** — Tiptap's Suggestion plugin, driven by a command registry: `{ id, title, aliases, group, icon, keywords, run(editor) }`. Consumers add, remove and reorder. Full keyboard operation, scroll-into-view on arrow keys, escape to dismiss.
- **Bubble menu** — selection toolbar; mark toggles plus a link editor. Table-cell selection positioning was fixed in v3, so use the v3 component rather than hand-rolling.
- **Drag handle** — `@tiptap/extension-drag-handle-react`, open-sourced in 3.0. Hover to reveal, drag to reorder, click for a block menu (duplicate, delete, turn into…).
- **Placeholder** — "Type `/` for commands" on the empty first line only.
- **Markdown input rules** — `#`, `##`, `-`, `1.`, `>`, ` ``` `, `---`, plus `**bold**`-style marks. This is most of what makes an editor feel fast.
- **Paste handling** — HTML paste normalised into the schema; a plain-text paste that looks like markdown is parsed; images in the clipboard go through the upload adapter.

### The upload adapter

Never bake in a storage provider. One interface, implemented by the host:

```ts
type UploadAdapter = {
  upload(
    file: File,
    signal: AbortSignal,
  ): Promise<{ id: string; src: string; width?: number; height?: number }>;
  remove?(id: string): Promise<void>;
};
```

The editor handles the rest: drop, paste, file picker, progress, retry, abort on unmount, and a placeholder node while in flight. Ship two reference adapters in the docs (one presigned-S3, one generic `POST /upload`) — not as code in the package.

### Accessibility, from the start not after

Keyboard-complete slash and bubble menus, visible focus rings, ARIA roles on every menu, screen-reader announcements for block type changes, `prefers-reduced-motion` respected, 4.5:1 contrast in both themes. Add `axe` assertions to the e2e suite so regressions fail CI. Accessibility retrofits cost five times what building it in does, and "is it accessible?" is the first question any serious adopter asks.

---

## 5. The renderer package

`@blockleaf/renderer` turns stored JSON into output **without loading ProseMirror or the editor**. Built on `@tiptap/static-renderer` (v3, React 17–19 peers), which renders JSON to React elements or an HTML string with no DOM.

```tsx
// server component
import { RenderDocument } from '@blockleaf/renderer/react';
<RenderDocument doc={article.body} components={{ image: MyImage, codeBlock: MyCode }} />;
```

- Per-node component overrides, so a host can route images through `next/image` and code blocks through its own highlighter.
- An HTML-string export for emails, RSS and OG generation.
- Plain-text and heading extractors for search indexing, reading time and tables of contents.
- Zero client JS by default.

Keep this package's dependency list ruthlessly small. It is what makes the whole thing usable in a server-rendered site, and it is the part competitors tend to skip.

---

## 6. Documentation site

[Fumadocs](https://fumadocs.dev) on Next.js, deployed to Vercel, in `apps/docs`. MDX content, live React playgrounds embedded in the page, search included.

Pages, in the order people need them:

1. **Live demo, above the fold on the landing page.** Editable, immediately. This converts more than any paragraph you will write.
2. Installation + a 10-line quickstart that actually runs.
3. The JSON contract — every node and mark, with example documents.
4. Extensions reference, one page each.
5. Theming: the full CSS variable table, light/dark, a worked custom theme.
6. Upload adapter, with two reference implementations.
7. Server rendering with `@blockleaf/renderer`.
8. Recipes: Next App Router, read-only view, forms + validation, autosave, markdown import/export.
9. **Migrating from Novel** and **Migrating from a plain Tiptap setup.** Direct acquisition channels.
10. Comparison table (vs Novel, BlockNote, Plate) — honest, including where you lose.
11. Contributing + architecture overview for contributors.

Write docs in the same PR as the feature. Documentation written "later" is never written.

---

## 7. Quality bar

| Layer     | Tool                                          | Covers                                                                       |
| --------- | --------------------------------------------- | ---------------------------------------------------------------------------- |
| Unit      | Vitest + jsdom                                | Schema, converters, commands, migrations, sanitisation                       |
| Browser   | Playwright against `examples/next-app-router` | Typing, caret behaviour, input rules, slash menu, drag and drop, paste, undo |
| Visual    | Playwright screenshots                        | The chrome in light and dark, at mobile and desktop widths                   |
| Types     | `expect-type`                                 | The public API surface doesn't drift                                         |
| Packaging | `publint` + `attw` (are-the-types-wrong)      | ESM/types resolution — the single most common OSS packaging failure          |
| Size      | `size-limit`, hard budget                     | Bundle creep                                                                 |
| a11y      | `@axe-core/playwright`                        | Menus, focus, contrast                                                       |

ProseMirror bugs hide in selection and input-rule edge cases that jsdom cannot see. Real browser tests are not optional here — budget for them from M1, not M5.

---

## 8. Release engineering

- **Changesets** for versioning and changelogs. Every PR that changes a package ships a changeset; CI fails without one.
- **`0.x` until the schema is stable.** Say plainly in the README: "the document schema may change before 1.0; migrations will be provided." Then honour it.
- **1.0 means a promise:** no breaking schema change without a major and a migration. Don't reach it before a real app has run on it for a few months.
- **npm provenance** via GitHub Actions OIDC (`npm publish --provenance`). Cheap, and a strong trust signal.
- **Canary releases** from `main` on every merge (`0.x.y-canary.n`), so consumers can test fixes without waiting.
- CI on every PR: typecheck → lint → unit → build → packaging checks → e2e → size. Release workflow on `main` only.
- Pin Node and pnpm in `package.json#packageManager` and `.nvmrc`.
- Renovate for dependency updates, with Tiptap packages grouped into a single PR — they must move together.

---

## 9. Milestones

Each one ends in something demonstrable. Don't start the next until the exit test passes.

### M0 — Scaffold (½ week)

Repo, pnpm + Turborepo, shared tsconfig/eslint, Vitest, Playwright, Changesets, CI, `@blockleaf/editor` publishing a trivial component to npm under `0.0.1`.
**Exit:** `pnpm add @blockleaf/editor` works in a throwaway app and renders a box you can type in.

### M1 — Editing core (1½ weeks)

Schema and node/mark set, document versioning, stable block ids, markdown input rules, keyboard shortcuts, paste normalisation, link sanitisation, schema snapshot tests.
**Exit:** every node and mark can be created by keyboard alone, and the JSON round-trips through a snapshot test.

### M2 — The chrome (2 weeks)

Slash menu with a command registry, bubble menu with a link editor, drag handle and block menu, placeholder, trailing node. Keyboard-complete and axe-clean.
**Exit:** a stranger sits down, types `/`, and builds a document without touching the mouse or reading a doc.

### M3 — Media and code (1 week)

Upload adapter, drop/paste/picker, progress and abort, image block with alt and alignment, code block with `lowlight` and a language picker.
**Exit:** dragging a 5 MB image in works, shows progress, survives a mid-upload navigation, and a failed upload is retryable.

### M4 — Renderer + docs → **public 0.1.0** (1½ weeks)

`@blockleaf/renderer`, component overrides, HTML-string and plain-text exports, docs site with the live demo, README with a demo GIF, LICENSE, CONTRIBUTING, issue templates.
**Exit:** someone who has never seen the repo installs it from the docs alone and renders stored JSON on a server.

### M5 — Hardening (1–2 weeks)

Full a11y pass, i18n via `labels`, theming docs, mobile and touch behaviour, large-document performance (10k+ blocks, virtualisation if needed), `examples/vite-spa`.
**Exit:** a 500-page document stays responsive; the editor is fully usable on a phone.

### M6 — Optional packages (ongoing)

`@blockleaf/collab` (Yjs + provider adapter), `@blockleaf/ai` (streaming adapter, no bundled provider), `@blockleaf/markdown`, comments/mentions.
**Exit:** each is additive — removing it changes nothing in the base bundle.

### M7 — 1.0

Schema frozen with a written stability policy, migration path documented, two or more real apps in production on it.

**Realistic total to a credible 0.1.0: 6–7 focused weeks.** Halve the scope before you halve the quality — a small editor that is excellent beats a broad one that is flaky, and the broad ones already exist.

---

## 10. Dogfood it

The first real consumer should be your own project, during M4 — not after 1.0. Nothing exposes a bad API like using it under a deadline.

Note the one real integration decision when that time comes: an existing app may already store a different JSON shape. Either adopt this editor's document as the stored shape (a migration, done once) or keep a converter at the boundary (no migration, but limits the editor to what the old shape can express). Decide per app; don't let the editor's design be bent by one consumer's legacy format.

---

## 11. Risks, named

| Risk                                   | Mitigation                                                                                                                                                   |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Tiptap v3 churn                        | Pin exact Tiptap versions; a scheduled CI job builds against `@latest` so breakage is found before a user finds it.                                          |
| Schema change after release            | Versioned documents and shipped migrations from day one. This is the single most expensive mistake available.                                                |
| Scope creep (tables, collab, comments) | Written out of v0.1 in the public roadmap. Every "can you also…" gets pointed at it.                                                                         |
| Maintenance load                       | Set expectations in the README (response times, supported versions). Label `good first issue` generously. Burnout, not competition, kills most OSS projects. |
| Nobody uses it                         | The wedge in §1 plus the migration guides in §6. Launch with a working demo, a GIF, and a real app already running on it.                                    |
| Bundle bloat                           | `size-limit` budget enforced in CI from M0, when the budget is easy to meet.                                                                                 |

---

## 12. First week, concretely

1. Choose the name; check npm and GitHub; register the scope.
2. `pnpm dlx create-turbo@latest`, strip it to the layout in §2.
3. Shared tsconfig/eslint packages; import-boundary rule between `core`, `react` and `ui` folders.
4. CI: typecheck, lint, test, build, `publint`, `attw`, `size-limit`.
5. Changesets + the release workflow, with provenance.
6. Publish `0.0.1` — an empty component — on day two. Publishing is a muscle; exercise it before there is anything to lose.
7. Write §3 (the schema) as a markdown doc in the repo, and only then start writing extensions.
8. MIT LICENSE, CODE_OF_CONDUCT, CONTRIBUTING, issue templates, Discussions on.

Then M1.
