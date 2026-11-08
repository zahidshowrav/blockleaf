---
'@blockleaf/editor': minor
---

An editor that refuses a document it cannot read (`FC-01`).

Stored content the editor cannot read — a block from a preset or subpath this instance did not load, a node from a host extension that is not installed here, or JSON a migration got wrong — used to open as an empty document behind a console warning, and the next save wrote that empty document over the stored one. The editor now opens read-only instead, whatever `editable` says, and `onChange` and `onChangeImmediate` stay silent, so the empty document can never reach a save path. `onContentError` reports why, so the host can show a message.

`incompatibleDocument` is the override: `'readonly'`, the default, or `'discard'`, which opens the empty document editable and accepts the loss. It is live, so a "start over" button can flip it.

Behind this sits Tiptap's content check, now on by default. `insertContent` of unreadable content reports and returns `false`; `setContent` throws rather than reporting, so wrap that call. `enableContentCheck={false}` restores Tiptap's own behaviour. Keeping an unknown block intact rather than refusing it is the next step.
