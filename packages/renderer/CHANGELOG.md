# @blockleaf/renderer

## 0.0.1

### Patch Changes

- 5da026d: Add `@blockleaf/renderer` (RD-01) — a new package that turns a stored document
  into React elements on a server, without the editor and without ProseMirror.
  
  ```tsx
  import { RenderDocument } from '@blockleaf/renderer/react';
  
  <RenderDocument doc={article.body} />;
  ```
  
  It has no runtime dependencies and React is an optional peer, so the
  sanitisers at the root entry work in a plain Node script. `RenderDocument`
  measures 1.35 kB.
  
  `BlockleafDocument` satisfies the `doc` prop structurally — there is no import
  from `@blockleaf/editor` and nothing to convert.
  
  Every element matches what the editor writes for the same node, so one
  stylesheet fits both; a parity suite renders the same document through both
  packages and fails if they diverge. Three differences are deliberate: the task
  checkbox is `disabled`, since nothing here can write a change back; an unknown
  node renders its children rather than throwing, because a document written by
  a newer editor must not take down the page; and `src` and `href` are
  sanitised again at render time, because stored JSON predates any guarantee the
  editor made about it.
- 6d2770d: Add per-node and per-mark component overrides (RD-02).
  
  ```tsx
  <RenderDocument
  	doc={article.body}
  	components={{ image: MyImage, codeBlock: MyCode }}
  />
  ```
  
  An override is a patch over the defaults, not a replacement mapping — naming
  `image` does not mean re-implementing paragraphs. A name the defaults do not
  know works too, which is how a host renders a node type of its own.
  
  The attribute helpers the default components use are exported alongside, so an
  override routing images through `next/image` can call `imageAttributes(node)`
  and get a sanitised `src` rather than re-deriving the rule.
  
  Overrides are merged per render rather than memoised, because the component
  has to work in a server component, where hooks do not exist. Hoisting the
  override map to module scope avoids the merge.
- a9c4af8: Add the HTML-string and plain-text exports (RD-03).
  
  ```ts
  import { renderToHTML } from '@blockleaf/renderer/html';
  import { extractHeadings, toPlainText } from '@blockleaf/renderer';
  
  const body = renderToHTML(doc); // emails, RSS, OG images
  const excerpt = toPlainText(doc).slice(0, 200);
  const toc = extractHeadings(doc);
  ```
  
  `renderToHTML` measures 1.5 kB and needs no React at all — the `./html` entry
  imports nothing. It takes the same `components` and `marks` overrides the
  React target does, and writes the same markup: the parity suite now holds
  three implementations to each other, the two targets and the editor itself.
  
  Escaping is this target's own job rather than React's, so text and attribute
  values are escaped separately, and a document whose stored `alt` is
  `" onerror="alert(1)` renders as an attribute rather than as a handler.
  
  `toPlainText` takes a `blockSeparator` and leaves image alt text out unless
  asked, since alt text reads as an interruption in an excerpt and as useful
  signal in a search index. `extractHeadings` returns level, text and block id
  in document order.
- b358752: Render tables as real table markup, in both targets (RD-07).
  
  prosemirror-tables has no concept of a table section, so the editor writes
  every row into `<tbody>`, header cells included. That is tolerable in a
  surface the user is looking at and not tolerable in output: `<thead>` is most
  of what an email client, an RSS reader or a screen reader has to go on.
  
  So a leading row made entirely of header cells becomes `<thead>`, and the rest
  `<tbody>`. A row with a mix of headers and cells is a header _column_, which
  prosemirror-tables also allows, and is left in `<tbody>` rather than claiming
  to label everything below it. Header cells carry `scope`: `col` in a header
  row, `row` for a header cell leading a body row.
  
  Stored column widths move into `<colgroup>`, where the editor also puts them.
  The `colwidth` attribute the editor additionally writes on each cell is
  dropped — it is not an HTML attribute, and the width is already in the
  `<col>`.
  
  This is the only node the renderer deliberately writes differently from the
  editor. Everything else is held to it by the parity suite.
