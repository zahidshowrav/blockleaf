---
'@blockleaf/editor': patch
---

Stop the chrome throwing when an extension it offers is not loaded.

`isAvailable` asked `editor.can().toggleHighlight()`, but `editor.can()` only
carries the commands the configured extensions registered. With
`preset="minimal"` — no highlight, no tables — selecting text threw
`editor.can(...).toggleHighlight is not a function` while the toolbar was
rendering, and the cell menu threw the same way on `mergeCells`, so the whole
editor failed to mount. The same held for any host passing its own
`extensions` array without one of those types.

Every default action now checks its mark or node is in the schema before
asking whether the command applies, through a shared `whenMarkExists` /
`whenNodeExists` guard. A type the editor does not have reads as unavailable
and the button is hidden, which is what `isAvailable` was for.
