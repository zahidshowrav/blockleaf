---
'@blockleaf/editor': patch
---

Fix the drag handle never appearing beside the block it belongs to.

The plugin computed the right offset and wrote it to the wrong element. It set
`top` and `left` on the wrapper `ReactRenderer` creates, which is
`position: static`, so both were inert — while the handle inside it was
`position: absolute` with no offsets of its own and therefore fell back to its
static position at the end of the content flow. Every block produced the same
place: the bottom of the editor.

A CSS `transform: translateX(calc(-100% - 4px))` then shifted it into the
gutter, except `--bl-content-padding` is `0` by default, so there is usually no
gutter and the handle landed outside the editor box — where any ancestor with
`overflow: auto` clipped it. In the documentation site's demo, 33 of its 45
pixels were cut off.

The stylesheet now makes the wrapper the positioned box, and the plugin places
it with the handle's own width accounted for and clamped to the editor's left
edge. With room it sits in the gutter; without room it overlaps the text rather
than vanishing.

`--bl-handle-gap` is gone, since the offset is no longer a CSS transform.
