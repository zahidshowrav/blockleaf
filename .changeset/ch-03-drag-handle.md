---
'@blockleaf/editor': patch
---

Add the drag handle and block menu (CH-03). Hand-rolled rather than using
`@tiptap/extension-drag-handle`, which imports yjs at module scope and costs
32.87 kB; this costs 1.83 kB and no new dependency.
