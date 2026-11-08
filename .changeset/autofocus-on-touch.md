---
'@blockleaf/editor': patch
---

Autofocus no longer throws on Android, iOS and desktop Safari.

Tiptap's `focus` command focuses the DOM synchronously on those platforms, its own focus plugin dispatches a transaction in response, and the command's transaction then throws `RangeError: Applying a mismatched transaction`. The throw happens inside Tiptap's mount timer ahead of the `create` event, so the editor never emitted it and the paragraph added after a trailing table never appeared. The editor now does its own autofocus after `create`, focusing the DOM before running the command.
