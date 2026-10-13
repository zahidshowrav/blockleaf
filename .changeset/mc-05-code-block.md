---
'@blockleaf/editor': patch
---

Add the syntax-highlighted code block with a language picker (MC-05), as the
new opt-in subpath `@blockleaf/editor/code-block`.

```ts
import { createExtensions } from '@blockleaf/editor/extensions';
import { withCodeBlock } from '@blockleaf/editor/code-block';

const extensions = withCodeBlock(createExtensions('standard'));
```

It is a subpath rather than part of the default build because `lowlight` and
its grammars cost 16.53 kB and the default bundle had 15.37 kB left — shipping
it by default put the editor at 161.16 kB, over the ceiling. Importing nothing
costs nothing, and the main entry is unchanged at 144.63 kB. See F14.

Seven grammars ship by default — bash, css, javascript, json, python,
typescript and xml — and hosts register more through `additionalLanguages`.
`StarterKit`'s plain code block is untouched for anyone who does not import
the subpath, and the stored shape is identical either way.

A code block whose language this host has not registered now renders
unhighlighted instead of throwing during editor construction, and keeps its
`language` attribute rather than having it stripped on the next save.
