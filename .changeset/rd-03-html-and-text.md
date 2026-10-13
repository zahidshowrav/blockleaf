---
'@blockleaf/renderer': patch
---

Add the HTML-string and plain-text exports (RD-03).

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
