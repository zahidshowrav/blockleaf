---
'@blockleaf/renderer': patch
---

Add `@blockleaf/renderer` (RD-01) — a new package that turns a stored document
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
