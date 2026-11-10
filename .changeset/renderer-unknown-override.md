---
'@blockleaf/renderer': minor
---

An unknown node renders nothing, and `unknown` decides otherwise (`FC-05`).

A node of a type the renderer does not know used to render its children with the wrapper dropped. It now renders nothing, in `RenderDocument` and `renderToHTML` alike: a wrapper's meaning is often the point, and its text out of context can read as something it is not. An unknown mark still renders as undecorated text.

`RenderDocument` takes an `unknown` prop, and `renderToHTML` an `unknown` option, rendering every node whose type neither the defaults nor `components` name. It receives the same props as any override, so `({ children }) => children` restores the old behaviour. A name in `components` wins over `unknown`.
