# Blockleaf in a Vite SPA

The smallest app that tells the whole story: write a document, store it as
JSON, and read it back without the editor.

```bash
pnpm install
pnpm --filter example-vite-spa dev
```

## What it shows

- **Editing** with `BlockleafEditor`.
- **Storing** the document as JSON — here in `localStorage`, but the shape is
  the same one you would put in a database. Read back through
  `isBlockleafDocument`, because what comes out of storage is a shape you hope
  is right rather than one you know is.
- **Publishing** with `@blockleaf/renderer`, which has no ProseMirror in it at
  all. That is the point of storing a document rather than HTML: the thing
  that renders it a thousand times does not have to carry the thing that wrote
  it once.
- **A table of contents** built with `extractHeadings` straight off the stored
  JSON — no editor, no DOM, no parsing HTML back apart. A sidebar, a search
  index and a summary are all this shape.
- **Theming** through `--bl-*` custom properties, in `src/styles.css`. Nothing
  of the editor's stylesheet is overridden and there is no CSS framework.

## Copying it

The two `@blockleaf/*` dependencies are `workspace:*` so this repository's CI
builds the example against the packages as they are now. In your own project
install them from npm instead:

```bash
pnpm add @blockleaf/editor @blockleaf/renderer
```

Everything else carries over unchanged.
