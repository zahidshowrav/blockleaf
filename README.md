# Blockleaf

A Notion-style block editor for React, built on [Tiptap](https://tiptap.dev) v3. Headless-first, with default chrome you can swap out, no CSS framework, and a versioned JSON document you can actually depend on.

> **Status: pre-alpha (`0.0.x`).** The editor renders and types; the chrome, the full node set and the renderer package are not built yet. The document schema **will** change before `1.0`, and migrations will ship with every bump. Don't put it in production yet.

## Why another editor

[Novel](https://github.com/steven-tey/novel), [BlockNote](https://www.blocknotejs.org/) and [Plate](https://platejs.org/) all exist and are good. Blockleaf holds four lines they don't all hold at once:

|                                           |                                                                                                                                                                                                          |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **No CSS framework coupling**             | One plain stylesheet driven by `--bl-*` custom properties. No Tailwind, no `prose`, no build-time config — so a Tailwind v4 app, a CSS-modules app and a styled-components app all consume it unchanged. |
| **A documented, versioned JSON contract** | The stored document is the real API. It carries `schemaVersion`, it is snapshot-tested, and breaking it means a major plus a shipped migration. See [`docs/schema.md`](./docs/schema.md).                |
| **Server rendering in the box**           | `@blockleaf/renderer` turns stored JSON into React or an HTML string with no ProseMirror runtime. Content is read a thousand times for every time it is written.                                         |
| **Headless core, replaceable chrome**     | Every menu is a component you can replace. Defaults exist so `pnpm add` works on day one; nothing is welded shut.                                                                                        |

Where it loses today: no collaboration, no comments, no mentions. Those are [out of v0.1 on purpose](#roadmap).

## Install

```bash
pnpm add @blockleaf/editor
```

```tsx
import { BlockleafEditor, createEmptyDocument } from '@blockleaf/editor';
import '@blockleaf/editor/styles.css';

export const Composer = () => (
  <BlockleafEditor defaultValue={createEmptyDocument()} onChange={(doc) => save(doc)} />
);
```

React 18 or 19, ESM only. CJS is not supported — if that blocks you, open an issue and say what for.

## The editor is uncontrolled

`defaultValue` seeds the document; changing it later does nothing. A controlled ProseMirror fights its own transactions and wrecks the undo stack, so Blockleaf does not offer one. To change content programmatically, reach for the editor instance:

```tsx
const editor = useBlockleafEditor({ defaultValue: doc });
editor?.commands.setContent(nextDoc);
```

`onChange` is debounced (300 ms, configurable via `debounceMs`). For an "unsaved changes" dot, use `onChangeImmediate`, which fires on every transaction.

## Theming

Override any custom property on `.blockleaf-editor` or any ancestor:

```css
.blockleaf-editor {
  --bl-color-accent: #5e17eb;
  --bl-font-body: 'Inter', sans-serif;
  --bl-line-height: 1.8;
}
```

Dark mode follows `prefers-color-scheme` and can be forced with `data-theme="dark"` or `data-theme="light"` on the editor element.

## Repository

pnpm + Turborepo.

| Path                                          | What                                                                     |
| --------------------------------------------- | ------------------------------------------------------------------------ |
| `packages/editor`                             | `@blockleaf/editor` — schema, extensions, React bindings, default chrome |
| `packages/tsconfig`, `packages/eslint-config` | shared presets (private)                                                 |
| `apps/sandbox`                                | Vite SPA for fast extension work; not published                          |

Inside `packages/editor`, `src/core` → `src/react` → `src/ui` is a one-way import boundary enforced by lint, so pulling `@blockleaf/core` out later stays a `mv` rather than a refactor.

```bash
pnpm install
pnpm dev          # sandbox + editor in watch mode
pnpm test
pnpm build
pnpm check:packaging   # publint + are-the-types-wrong
```

## Roadmap

- **EC** — full node and mark set including tables, stable block ids, markdown input rules, paste normalisation, link sanitisation
- **CH** — slash menu, bubble menu, drag handle and block menu, keyboard-complete and axe-clean
- **MC** — upload adapter, images, code blocks with highlighting
- **RD** — `@blockleaf/renderer` + docs site → public `0.1.0`
- **HD** — accessibility pass, i18n, mobile, large-document performance
- **Later** — collaboration, AI commands, markdown import/export, comments

Collaboration, comments and mentions are deliberately out of `0.1`. Each is a project of its own.

## Licence

MIT © Zahid Showrav
