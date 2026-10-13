---
'@blockleaf/renderer': patch
---

Add per-node and per-mark component overrides (RD-02).

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
