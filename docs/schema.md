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
2. **Validate before you store.** `isBlockleafDocument()` is a cheap structural guard today; a full Zod schema is exported from `@blockleaf/editor/validate` in `EC` (Zod is an optional peer, so it costs nothing unless you import it) so hosts can reject malformed client input server-side.
3. **Never hand-edit stored JSON across a version boundary.** Run it through `migrate()` instead (`EC`).
4. **Block ids are stable** (`EC`). Once a block has an id it keeps it for life — drag handles, anchor links, comments and collaborative cursors all key off it.

## Node set

Shipped in `SC` (via Tiptap's StarterKit): `doc`, `paragraph`, `text`, `hardBreak`, `heading`, `bulletList`, `orderedList`, `listItem`, `blockquote`, `codeBlock`, `horizontalRule`.

Planned for `EC`–`MC`:

| Node                                      | Attributes                    | Notes                                                                                                                                 |
| ----------------------------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `heading`                                 | `level: 1 \| 2 \| 3`          | Capped at three. Deeper levels are a document-structure smell and a renderer problem.                                                 |
| `bulletList` / `orderedList` / `listItem` | —                             | Nesting capped at 3 levels.                                                                                                           |
| `taskList` / `taskItem`                   | `checked: boolean`            | The single most-expected Notion feature.                                                                                              |
| `codeBlock`                               | `language: string \| null`    | Highlighting via `lowlight`; the language is stored, not inferred at render time.                                                     |
| `image`                                   | `id, src, alt, width, align`  | `id` is the upload adapter's handle, so a host can re-resolve or re-sign `src` later. Never store a signed URL as the only reference. |
| `callout`                                 | `emoji: string, tone: string` | Cheap to build, instantly reads as "Notion".                                                                                          |
| `details`                                 | `open: boolean`               | Toggle blocks.                                                                                                                        |
| `table`                                   | —                             | Contains `tableRow` and nothing else. Not nestable: a cell may not contain a table.                                                   |
| `tableRow`                                | —                             | Contains `tableHeader` or `tableCell`. A header row is a row of `tableHeader`, not a flag on the table.                               |
| `tableHeader` / `tableCell`               | `colspan, rowspan, colwidth`  | Cells hold block content, so a cell can contain paragraphs and lists. `colwidth` is `number[] \| null` — pixel widths; see below.     |

## Mark set

| Mark                                            | Attributes              | Notes                                                                                                                                                                                                                                               |
| ----------------------------------------------- | ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `bold`, `italic`, `strike`, `underline`, `code` | —                       |                                                                                                                                                                                                                                                     |
| `link`                                          | `href, target, rel`     | `href` is sanitised **at the schema level**, not in the UI: `https:`, `mailto:` and site-relative paths are allowed, everything else — `javascript:` above all — is dropped on parse. A sanitiser that only runs in the toolbar is not a sanitiser. |
| `highlight`                                     | `color: string \| null` |                                                                                                                                                                                                                                                     |

### `colwidth`, the one presentation attribute

`colwidth` stores pixel widths inside a document that otherwise stores meaning. It is here because ProseMirror's table implementation expects it, not because storing layout is a good idea, and it is the one attribute a renderer on a narrow screen has to override rather than obey. Treat it as a hint. It is not a precedent: no other node gains a layout attribute without the same argument being made in public.

A table is a grid of rich-text cells with an optional header row. Nested tables, cell backgrounds and spreadsheet behaviour are out — see `PROJECT_PLAN.md` §3.1.

## Explicitly out of v0.1

Columns, embeds, footnotes, mentions, comments, math. Each is a project of its own, and saying so here is what lets every "can you also…" have somewhere to be pointed.

Tables were on this list until 2026-10-10. They were moved into `EC` deliberately, with the reasoning written down in `PROJECT_PLAN.md` §3.1, because the schema cost of a table is lowest before the first release and rises permanently after it.

## Changing this document

### Before the first release, and only before it

`SCHEMA_VERSION` is `1` and version `1` has never been published — the registry has no `@blockleaf/editor` at all. Until it does, nothing is in anyone's database, so additive node work lands **inside version 1** rather than bumping to 2, and there is no migration to write because there is nothing to migrate.

This is the exemption the table nodes are using. It expires at `0.1.0`, which is the first build a stranger can install, and the numbered process below governs every change after that without exception. An additive change is cheap exactly once; the whole point of versioning the document is that nobody gets to decide it is cheap a second time.

1. Add the change behind the next `SCHEMA_VERSION`.
2. Write the migration from the previous version in the same PR.
3. Update the snapshot fixture; the diff in review **is** the contract change, so it should be read as one.
4. Changeset: a minor while we are on `0.x`, a major after `1.0`.

The snapshot test in `packages/editor/tests/schema.test.ts` exists to make an accidental change fail loudly. It is not there to make a deliberate change hard — it is there to make it visible.
