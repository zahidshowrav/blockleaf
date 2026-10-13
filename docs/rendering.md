# Server rendering

`@blockleaf/renderer` turns a stored document back into output. It is a
separate package from the editor and shares no code with it: no ProseMirror, no
Tiptap, no editor, and no runtime dependencies at all.

```bash
pnpm add @blockleaf/renderer
```

```tsx
// app/articles/[slug]/page.tsx — a server component
import { RenderDocument } from '@blockleaf/renderer/react';

export default async function Page({ params }) {
	const article = await db.article.findBySlug(params.slug);

	return (
		<article className="blockleaf-editor">
			<RenderDocument doc={article.body} />
		</article>
	);
}
```

Content is read a thousand times for every time it is written, so the reading
path is the one that should be cheap. `RenderDocument` measures **1.35 kB**
minified and brotlied, and emits no client JavaScript of its own.

## Why a separate package

Importing the editor to display a document means shipping ProseMirror, the
schema, every extension and the entire chrome to a page that will never accept
a keystroke. The renderer exists so that never happens — and so that it
_cannot_ happen by accident, since the editor is not in its dependency graph to
begin with.

## Passing a document

`doc` takes the JSON you stored. If it came out of `@blockleaf/editor`, it
already fits:

```tsx
import type { BlockleafDocument } from '@blockleaf/editor';

const doc: BlockleafDocument = JSON.parse(row.body);
<RenderDocument doc={doc} />;
```

There is no conversion step and no import from the editor. The `doc` prop is
typed structurally, as `RenderableDocument`, which `BlockleafDocument`
satisfies — a type import would be a dependency on the package this one exists
to avoid. A test in the renderer asserts the two shapes stay compatible and
fails if either drifts.

## Styling

The renderer writes the same elements and the same attributes as the editor,
down to `data-id` on every block and `data-type="callout"` on a callout. One
stylesheet fits both:

```tsx
import '@blockleaf/editor/styles.css';
```

A parity suite renders the same document through both packages and compares
the HTML. It is not a convention that they match; it is a test that fails.

Wrap the output in `.blockleaf-editor` to pick up the same typography the
editor uses. The class carries no editor behaviour — it is a styling hook.

## Where it differs from the editor, on purpose

**The task checkbox is disabled.** Rendered output is a record of what the
document says, and nothing on the page can write a change back. A checkbox
that invites a click and then silently discards it is worse than one that
plainly cannot be clicked.

**An unknown node renders its children.** Documents outlive the code that
reads them, so a server running an older renderer will eventually meet a node
type a newer editor wrote. Throwing there takes down the whole page for one
unrecognised block, so the text inside survives and the wrapper does not. The
same applies to an unknown mark, which renders as undecorated text.

**URLs are sanitised again.** See below.

## Safety

`src` and `href` are sanitised at render time, not trusted from the document.

| Attribute | Allowed                                                |
| --------- | ------------------------------------------------------ |
| `href`    | `https:`, `mailto:`, site-relative paths, hash anchors |
| `src`     | `https:`, relative paths, base64 raster data URLs      |

Everything else is refused — `javascript:` above all, plus `http:`, `blob:`,
protocol-relative `//`, and SVG data URLs.

The editor applies the same rules when a document is written. The renderer
applies them again because it reads documents the editor did not write: rows
that predate the rule, rows an importer produced, rows a host's own API
accepted. On the editor's side an unsafe URL is a broken link. Here it is
stored markup being written into a server-rendered page, which is the
definition of stored XSS.

An image whose source is refused renders nothing at all, rather than an `<img>`
with no `src` — a broken-image icon and a hole in the layout help nobody. A
link whose href is refused keeps its text and loses the anchor: the words were
written by a human and are worth preserving, the destination was not
necessarily.

## Entry points

| Import                      | Contains                             | Needs React |
| --------------------------- | ------------------------------------ | ----------- |
| `@blockleaf/renderer`       | `sanitizeHref`, `sanitizeSrc`, types | no          |
| `@blockleaf/renderer/react` | `RenderDocument`                     | yes         |

React is an **optional** peer dependency. A script that only needs the URL
rules — validating a row before it goes into the database, say — imports the
root entry and installs nothing else.

## Nodes

Every node in [the schema](./schema.md) renders:

| Node                         | Element                                               |
| ---------------------------- | ----------------------------------------------------- |
| `paragraph`                  | `<p>`                                                 |
| `heading`                    | `<h1>`–`<h3>`, clamped into range                     |
| `blockquote`                 | `<blockquote>`                                        |
| `codeBlock`                  | `<pre><code class="language-…">`                      |
| `horizontalRule`             | `<hr>`                                                |
| `bulletList` / `orderedList` | `<ul>` / `<ol start>`                                 |
| `listItem`                   | `<li>`                                                |
| `taskList` / `taskItem`      | `<ul data-type="taskList">` with a disabled checkbox  |
| `callout`                    | `<div data-type="callout" class="blockleaf-callout">` |
| `details`                    | `<details open>`                                      |
| `image`                      | `<img class="blockleaf-image">`                       |
| `text` / `hardBreak`         | text / `<br>`                                         |

Marks nest outwards from the first in the array, which is what the editor
does: `[bold, italic]` is `<strong><em>`, never `<em><strong>`. It matters to
any stylesheet with a descendant selector in it. See F15 in
[`open-flags.md`](./open-flags.md) for why that sentence needed writing down.

`codeBlock` renders a `language-…` class and no highlighting. Highlighting a
block on the server means shipping a highlighter; pick your own and point it
at that class, or render the block yourself.
