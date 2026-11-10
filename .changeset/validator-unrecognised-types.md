---
'@blockleaf/editor': minor
---

The validator accepts node and mark types it does not define (`FC-04`).

`validateDocument`, `safeValidateDocument` and `blockleafDocumentSchema` from `@blockleaf/editor/validate` used to refuse a whole document over one node of an unknown type. A node or mark with a string `type` the schema does not define now passes anywhere a node or mark may go, unread, and comes back exactly as it was. Every known type is still checked in full, and a node with no string `type` is still refused.

`UnrecognisedNode` and `UnrecognisedMark` are exported as types, and `unrecognisedNodeSchema` and `unrecognisedMarkSchema` from `./validate`. They are not members of `BlockNode`, `InlineNode` or `BlockleafMark`, so `type` still narrows; a walker needs a `default` branch. The contract is written down in the schema page.
