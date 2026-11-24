# @blockleaf/renderer

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
