# The Blockleaf document

This is the contract. Everything else in the project can be refactored; this cannot, because it lives in other people's databases.

Status: **version 1, unstable.** The shape below will change before `1.0`. Every change bumps `schemaVersion` and ships a migration.

## Envelope

Every document is a single `doc` node carrying its schema version:

```json
{
  "type": "doc",
  "attrs": { "schemaVersion": 1 },
  "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "Hello" }] }]
}
```

`schemaVersion` is not decoration. Without it, the first breaking change is unshippable — you cannot tell a v1 document from a v2 one, so you cannot migrate it. Store the whole envelope, not just `content`.

## Rules

1. **Store the envelope verbatim.** Don't unwrap `content` and don't re-key anything. If you need a different shape in your database, keep a converter at the boundary and store the original alongside it.
2. **Validate before you store.** `isBlockleafDocument()` is a cheap structural guard today; a full Zod schema export lands in M1 so hosts can reject malformed client input server-side.
3. **Never hand-edit stored JSON across a version boundary.** Run it through `migrate()` instead (M1).
4. **Block ids are stable** (M1). Once a block has an id it keeps it for life — drag handles, anchor links, comments and collaborative cursors all key off it.

## Node set

Shipped in M0 (via Tiptap's StarterKit): `doc`, `paragraph`, `text`, `hardBreak`, `heading`, `bulletList`, `orderedList`, `listItem`, `blockquote`, `codeBlock`, `horizontalRule`.

Planned for M1–M3:

| Node                                      | Attributes                    | Notes                                                                                                                                 |
| ----------------------------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `heading`                                 | `level: 1 \| 2 \| 3`          | Capped at three. Deeper levels are a document-structure smell and a renderer problem.                                                 |
| `bulletList` / `orderedList` / `listItem` | —                             | Nesting capped at 3 levels.                                                                                                           |
| `taskList` / `taskItem`                   | `checked: boolean`            | The single most-expected Notion feature.                                                                                              |
| `codeBlock`                               | `language: string \| null`    | Highlighting via `lowlight`; the language is stored, not inferred at render time.                                                     |
| `image`                                   | `id, src, alt, width, align`  | `id` is the upload adapter's handle, so a host can re-resolve or re-sign `src` later. Never store a signed URL as the only reference. |
| `callout`                                 | `emoji: string, tone: string` | Cheap to build, instantly reads as "Notion".                                                                                          |
| `details`                                 | `open: boolean`               | Toggle blocks.                                                                                                                        |

## Mark set

| Mark                                            | Attributes              | Notes                                                                                                                                                                                                                                               |
| ----------------------------------------------- | ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `bold`, `italic`, `strike`, `underline`, `code` | —                       |                                                                                                                                                                                                                                                     |
| `link`                                          | `href, target, rel`     | `href` is sanitised **at the schema level**, not in the UI: `https:`, `mailto:` and site-relative paths are allowed, everything else — `javascript:` above all — is dropped on parse. A sanitiser that only runs in the toolbar is not a sanitiser. |
| `highlight`                                     | `color: string \| null` |                                                                                                                                                                                                                                                     |

## Explicitly out of v0.1

Tables, columns, embeds, footnotes, mentions, comments, math. Each is a project of its own, and saying so here is what lets every "can you also…" have somewhere to be pointed.

## Changing this document

1. Add the change behind the next `SCHEMA_VERSION`.
2. Write the migration from the previous version in the same PR.
3. Update the snapshot fixture; the diff in review **is** the contract change, so it should be read as one.
4. Changeset: a minor while we are on `0.x`, a major after `1.0`.

The snapshot test in `packages/editor/tests/schema.test.ts` exists to make an accidental change fail loudly. It is not there to make a deliberate change hard — it is there to make it visible.
