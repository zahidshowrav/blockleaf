# @blockleaf/renderer

## 0.5.0

### Minor Changes

- bcea22e: Renders `highlight` colour tokens from schema version 2, through the new `highlightBackground`. `highlightColor` now ignores a value that is neither a token nor a plain colour.
- 520c078: Renders a block's `backgroundColor` from schema version 2, as the editor does.
- 0ad1a1d: Renders the `embed` block from schema version 2, only for a player address on the provider list. New `embedProviderOf` and `labels.embed`.
- b810f8e: Renders the `fontFamily` mark from schema version 2.
- 8ac43bd: Renders the `fontSize` mark from schema version 2.
- 0f5095c: Renders a captioned image from schema version 2 as `<figure>` with a `<figcaption>`.
- f413487: Renders the `linkPreview` card from schema version 2, only for an `https:` address.
- 7cc92cd: Add `@blockleaf/renderer/markdown`: `renderToMarkdown(doc)` writes a stored document as GitHub-style Markdown, with the same `components`, `marks`, `labels` and `unknown` options as `renderToHTML`.
- 8479f86: Renders `mathInline` and `mathBlock` from schema version 2 as their LaTeX source, and `toPlainText` includes it. `mathAttributes` is exported. `@blockleaf/math` draws the formulas instead.
- 5a05f62: Renders the `video`, `audio` and `attachment` blocks from schema version 2. Sources go through the new `sanitizeMediaSrc`, and an unsafe one renders nothing.
- a173335: Renders `width: "full"` on an image or video, from schema version 2.
- 10a117b: Renders the `mention` node from schema version 2. `toPlainText` reads a mention as `@label`.
- 897531e: Renders the `subscript` and `superscript` marks from schema version 2.
- 9dd7ece: Renders the `tableOfContents` block from schema version 2, and gives headings an `id` in a document that has one. New `tableOfContents(doc)`, and every node renderer now receives `root`.
- acbe2a0: Renders `textAlign` on paragraphs and headings from schema version 2.
- 9cc3941: Renders the `textColor` mark from schema version 2.

### Patch Changes

- c112d81: Doc comments in the type files no longer mention internal tracking ids.

## 0.4.0

### Minor Changes

- c6149b6: A `details` node now renders its first block inside `<summary>`, as its title, matching the editor's toggle block. A hand-built document that already uses `details` will show its first block as the title.

## 0.3.0

### Minor Changes

- 80bd590: Renders a captioned table as `<figure>` with a `<figcaption>`. An older renderer shows nothing for a `figure`, so upgrade the renderer before the editor.

## 0.2.0

### Minor Changes

- 70dcf8a: An unknown node now renders nothing, instead of its children. Pass `unknown` to `RenderDocument` or `renderToHTML` to choose; `({ children }) => children` restores the old behaviour.

## 0.1.0

### Minor Changes

- 1c8c989: A table now renders inside a scrollable box, so a wide table no longer breaks the page layout. New `labels` option, and new `createHtmlNodes` and `tableRenderer` exports.

## 0.0.1

### Patch Changes

- 5da026d: New package: `@blockleaf/renderer` renders a stored document to React without the editor or ProseMirror. `RenderDocument` comes from `@blockleaf/renderer/react`.
- 6d2770d: Per-node and per-mark component overrides through `components`. The attribute helpers, such as `imageAttributes(node)`, are exported.
- a9c4af8: `renderToHTML` from `@blockleaf/renderer/html`, plus `toPlainText` and `extractHeadings`. The HTML entry needs no React.
- b358752: Tables render as real table markup, with `<thead>`, `scope` on header cells and column widths in `<colgroup>`.
