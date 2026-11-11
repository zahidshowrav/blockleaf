---
'@blockleaf/editor': minor
---

A document a newer editor wrote is locked too, and `incompatibleDocument` can throw (`FC-02`).

A `defaultValue` whose `attrs.schemaVersion` is higher than this editor's `SCHEMA_VERSION` now triggers the same policy as an unreadable one. It opens showing its content, read-only, with `onChange` and `onChangeImmediate` silent, because saving it from here would stamp it with an older version than it has. `onContentError` fires once as the editor is created, with an `IncompatibleDocumentError` whose `reason` is `'newer-version'`.

`incompatibleDocument` takes a third value, `'throw'`: the hook throws an `IncompatibleDocumentError` during render, for an error boundary to catch, and nothing is mounted. `IncompatibleDocumentError` is exported, with `reason`, `documentVersion` and `editorVersion`.
