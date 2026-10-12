---
'@blockleaf/editor': patch
---

Add the placeholder and configure the trailing node (CH-04). The placeholder is
a hand-rolled decoration plugin — `@tiptap/extensions` declares no
`sideEffects`, which pushed the schema-only entry from 136 B to 60.77 kB.
StarterKit's `trailingNode` no longer appends an empty paragraph after a
heading, and a saved document that needs a trailing paragraph gets one on load
without reporting it as a user edit.
