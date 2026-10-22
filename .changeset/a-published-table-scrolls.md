---
'@blockleaf/renderer': minor
---

Put a published table in a box it can scroll in.

The editor learned to contain a table wider than the screen; this side emitted a bare `<table>`, so a published page blew out its host's layout exactly as the editor used to — on the path that gets read a thousand times for every time a document is written.

Both targets now wrap a table identically:

```html
<div
	class="blockleaf-table-scroll"
	role="region"
	aria-label="Table, scrollable"
	tabindex="0"
>
	<table data-id="t">
		…
	</table>
</div>
```

`overflow-x` alone does not hold: a grid or flex item defaults to `min-width: auto`, so a 900px table pushes the host's own layout wider than the screen and the box inside it inherits that width with nothing left to scroll. The stylesheet gives the class `contain: inline-size`, which keeps the table's width out of the host's layout — no `min-width: 0` required of anyone.

`RenderDocument` and `renderToHTML` take a new `labels` option, so the region's name can be translated. `createHtmlNodes` and `tableRenderer` are exported for anyone building a node map of their own; `defaultHtmlNodes` and `defaultNodes` are those called with English and are unchanged.
