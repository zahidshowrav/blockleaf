# The chrome

The default menus, toolbars and handles that `@blockleaf/editor` ships with.

Every piece of it is replaceable. The chrome lives in `src/ui`, imports only
`src/core` and `src/react`, and nothing in the bindings imports back — so you
can drop all of it and keep a working editor, or keep the plumbing and render
your own surface.

**The chrome never owns logic.** Each button calls a command that already
exists in `src/core` and already has tests. If a menu needs behaviour the
command API cannot express, the command is what is missing — see "How a feature
that spans blocks is split" in [`progress-tracker.md`](./progress-tracker.md).

```tsx
import { BlockleafEditor } from '@blockleaf/editor';
import '@blockleaf/editor/styles.css';

<BlockleafEditor />;
```

Styling is one stylesheet and `--bl-*` custom properties. No framework, no
build step. Override a variable anywhere above the editor and the chrome
follows.

---

## Slash menu

Type `/` on an empty block. Filters as you type across titles, aliases,
keywords and descriptions; `↑`/`↓` move, `Enter` runs, `Escape` dismisses.

| Prop            | Default | What it does                                       |
| --------------- | ------- | -------------------------------------------------- |
| `slashMenu`     | `true`  | Turns the menu off entirely.                       |
| `slashItems`    | —       | An array of commands, or `(defaults) => commands`. |
| `slashRegistry` | —       | A `CommandRegistry` instance, for full control.    |

The twelve defaults are Text, Heading 1–3, Bullet list, Numbered list, To-do
list, Quote, Code, Callout, Divider and Table.

```tsx
<BlockleafEditor
	slashItems={(defaults) => [
		...defaults.filter((command) => command.id !== 'callout'),
		{
			id: 'signature',
			title: 'Signature',
			group: 'Advanced',
			keywords: ['sign', 'sign-off'],
			run: (editor) => editor.chain().focus().insertContent('—').run()
		}
	]}
/>
```

`CommandRegistry` gives you `add` (with `before`, `after` or `index`), `remove`,
`reorder`, `filter`, `get`, `getAll` and `clone`.

### Commands that need an argument

A command can carry a `picker` — a component rendered in place of the list
when the item is chosen, for when the command needs an argument before it can
run. **Table** uses one: an 8 × 8 grid, driven by pointer or arrow key, with
`Enter` to insert and `Escape` to go back to the list.

```ts
type SlashPickerProps = {
	editor: Editor;
	/** The `/query` text to replace when the command finally runs. */
	range: Range;
	/** Dismiss the picker and return to the list. */
	onCancel: () => void;
};
```

A picker replaces `run`, but `run` still has to exist. It is the path a host
gets when it renders its own menu, and the path `Mod`+`Alt`+`T` already takes
— the chrome may not be the only way to reach a command.

---

## Bubble menu

Select text and a toolbar appears above it. It offers the six mark toggles and
a link editor, reflects what is already applied through `aria-pressed`, and
hides any toggle that cannot apply to the current selection.

It does not appear inside a code block, where none of these marks can apply —
a toolbar offering them there would be lying.

| Prop               | Default | What it does                                     |
| ------------------ | ------- | ------------------------------------------------ |
| `bubbleMenu`       | `true`  | Turns the toolbar off entirely.                  |
| `bubbleActions`    | —       | An array of actions, or `(defaults) => actions`. |
| `linkEditor`       | `true`  | Whether the toolbar offers the link editor.      |
| `bubbleShouldShow` | —       | Overrides when the toolbar appears.              |

### Keyboard

| Key            | Does                                         |
| -------------- | -------------------------------------------- |
| `←` / `→`      | Move between buttons, wrapping at both ends. |
| `Home` / `End` | First / last button.                         |
| `Escape`       | Return focus to the document.                |
| `Mod`+`K`      | Open the link editor for the selection.      |

The toolbar is a single tab stop — a roving `tabindex`, as the ARIA toolbar
pattern specifies — so `Tab` moves past it rather than through every button.

### Actions

A `BubbleAction` is the smallest thing the toolbar can render:

```ts
type BubbleAction = {
	id: string;
	title: string;
	shortcut?: string;
	icon?: ReactNode | ComponentType<IconProps> | (() => ReactNode);
	isActive: (editor: Editor) => boolean;
	isAvailable?: (editor: Editor) => boolean;
	run: (editor: Editor) => void;
};
```

`isActive` drives `aria-pressed`. `isAvailable` returning `false` removes the
button for that selection rather than disabling it — a disabled control that is
never enabled is noise for a screen reader.

```tsx
<BlockleafEditor
	bubbleActions={(defaults) => defaults.filter((a) => a.id !== 'highlight')}
/>
```

### The link editor

`Mod`+`K`, or the link button, opens a single field. `Enter` applies, `Escape`
closes, an empty field removes the link. When the cursor is already inside a
link the field is pre-filled and buttons to open and remove it appear.

**The field is a convenience, not a gate.** It calls the same `sanitizeHref`
the schema calls, only so it can say _why_ an href will not stick. A
`javascript:` URL typed here is rejected twice: once with a message, and once
by the schema, which would have rejected it regardless of what the UI did. See
[`schema.md`](./schema.md).

Allowed: `https:`, `mailto:`, site-relative paths and hash anchors. Everything
else is refused.

### Replacing it

The parts are exported, so you can keep the positioning and ship your own
surface:

```tsx
import {
	BubbleMenu,
	LinkEditor,
	createBubbleMenuExtension,
	defaultBubbleActions
} from '@blockleaf/editor';
```

`createBubbleMenuExtension({ actions, link, shouldShow, pluginKey, appendTo })`
returns the Tiptap extension on its own, for when you are assembling
`extensions` by hand rather than using `<BlockleafEditor />`.

---

## Drag handle and block menu

Hover a block and a handle appears in the gutter beside it. Drag it to move the
block; click it for the block menu. A `+` button inserts an empty paragraph
below.

| Prop           | Default | What it does                                     |
| -------------- | ------- | ------------------------------------------------ |
| `dragHandle`   | `true`  | Turns the handle and its menu off entirely.      |
| `blockActions` | —       | An array of actions, or `(defaults) => actions`. |
| `insertButton` | `true`  | Whether the `+` button is shown.                 |

The handle **starts** the drag; it does not implement one. It sets a
`NodeSelection` on the block and hands ProseMirror `view.dragging`, so dropping
goes through the same code path as any other ProseMirror drag — including
inside tables, and including undo.

### The block menu

Two groups. **Turn into** converts the block — Text, Heading 1–3, Bullet list,
Numbered list, To-do list, Quote, Code — and marks the current type with
`aria-current`. **Actions** holds Move up, Move down, Duplicate and Delete.

Move up on the first block, and move down on the last, are _removed_ rather
than disabled, on the same reasoning as the bubble menu: a control that is
never enabled is noise for a screen reader.

| Key            | Does                      |
| -------------- | ------------------------- |
| `↑` / `↓`      | Move through the entries. |
| `Home` / `End` | First / last entry.       |
| `Enter`        | Run the focused entry.    |
| `Escape`       | Close, running nothing.   |

### Actions

```ts
type BlockAction = {
	id: string;
	title: string;
	group: 'Turn into' | 'Actions' | (string & {});
	icon?: ReactNode | ComponentType<IconProps> | (() => ReactNode);
	isActive?: (editor: Editor, pos: number) => boolean;
	isAvailable?: (editor: Editor, pos: number) => boolean;
	danger?: boolean;
	run: (editor: Editor, pos: number) => void;
};
```

`pos` is the position _before_ the top-level block the handle points at.

```tsx
<BlockleafEditor
	blockActions={(defaults) => [
		...defaults,
		{
			id: 'copy-id',
			title: 'Copy block id',
			group: 'Actions',
			run: (editor, pos) => {
				const node = editor.state.doc.nodeAt(pos);
				if (node) navigator.clipboard.writeText(node.attrs.id);
			}
		}
	]}
/>
```

**Why it is hand-rolled.** `@tiptap/extension-drag-handle` imports
`@tiptap/y-tiptap` and `@tiptap/extension-collaboration` at module scope, so a
document that will never be collaborative would still ship yjs — 32.87 kB,
which is over the whole bundle ceiling. See F12 in
[`open-flags.md`](./open-flags.md). The trade is that this handle moves one
block at a time; multi-block range dragging is not implemented.

---

## In-table controls

Put the cursor in a table and two handles appear: one above the current
column, one to the left of the current row. Each opens a menu of operations
for that axis.

| Prop            | Default | What it does                                     |
| --------------- | ------- | ------------------------------------------------ |
| `tableControls` | `true`  | Turns the handles off entirely.                  |
| `tableActions`  | —       | An array of actions, or `(defaults) => actions`. |

**Row menu:** insert above, insert below, toggle header row, merge cells,
split cell, delete row, delete table.
**Column menu:** insert left, insert right, toggle header column, merge cells,
split cell, delete column, delete table.

Every entry calls a command from EC-14 or EC-15, and asks that same command
whether it can run — `editor.can().mergeCells()` rather than re-deriving the
answer. Two implementations of "can you merge this" would eventually
disagree, and the command is the one that is already tested. An entry whose
command cannot run is removed from the menu rather than disabled.

Only the current row and column get a handle, not a strip of one per row and
column. A strip means measuring every cell on every selection change and
re-measuring on every resize, and it sits on the table's edges in a way that
fights text selection. The cursor already says which row and column the user
means.

```ts
type TableAction = {
	id: string;
	title: string;
	axis: 'row' | 'column' | 'both';
	icon?: ReactNode | ComponentType<IconProps> | (() => ReactNode);
	isAvailable?: (editor: Editor) => boolean;
	danger?: boolean;
	run: (editor: Editor) => void;
};
```

### The cell menu

Select across cells and a second bubble menu appears, offering merge, split,
toggle header cell, insert row or column, delete row, and delete table.

| Prop          | Default | What it does                                     |
| ------------- | ------- | ------------------------------------------------ |
| `cellMenu`    | `true`  | Turns the cell toolbar off entirely.             |
| `cellActions` | —       | An array of actions, or `(defaults) => actions`. |

It is the same surface as the text bubble menu — a second instance with its
own plugin key, its own actions and its own `shouldShow` — which is why
CH-02's bubble menu was built around the framework-agnostic plugin rather
than a fixed React component.

The two never appear together. A cell selection belongs to the cell menu, and
the text menu stands down for it; a caret inside a single cell is ordinary
text editing, which the row and column handles already cover.

---

## Placeholder

The empty block the cursor is in gets a label. Only that one — labelling every
empty block at once turns a new document into a wall of grey text, which reads
as content rather than as absence.

| Prop          | Default                   | What it does                                           |
| ------------- | ------------------------- | ------------------------------------------------------ |
| `placeholder` | `"Type '/' for commands"` | A string for every block, per-node labels, or `false`. |

```tsx
<BlockleafEditor placeholder="Start writing…" />

<BlockleafEditor
	placeholder={{
		paragraph: 'Write something',
		heading: (level) => `Heading ${level}`,
		fallback: ''
	}}
/>
```

It renders as a `data-placeholder` attribute on a decorated node, styled by
`.blockleaf-empty-node::before`, and disappears when the editor is read-only
or when text is selected.

## Trailing node

A document always ends somewhere you can click. Without this, a document
ending in a table, a code block or a divider is a document you cannot type at
the end of.

This is **core behaviour, not chrome** — it changes the stored document, so it
lives in `createExtensions` and a headless consumer gets it too. No trailing
paragraph is added after a paragraph or a heading, because that paragraph
would be saved and the stored document is the product.

Opening a saved document that needs one is not an edit: the insert carries a
normalisation flag, stays out of the undo history, and does not reach
`onChange`. A document you only opened has not changed.

---

## Keyboard reference

Everything the chrome does is reachable without a pointer. This is the CH
block's exit condition, not a nice-to-have, and
`e2e/accessibility.spec.ts` builds a document — heading, list and table —
using only the keys below.

| Key                   | Does                                                   |
| --------------------- | ------------------------------------------------------ |
| `/`                   | Open the slash menu.                                   |
| `↑` `↓`               | Move through a menu.                                   |
| `←` `→`               | Move along the bubble menu, or around the grid picker. |
| `Home` `End`          | First / last entry.                                    |
| `Enter`               | Run the focused entry.                                 |
| `Escape`              | Dismiss. Returns focus to the document.                |
| `Backspace`           | In the grid picker, back to the list.                  |
| `Mod`+`K`             | Link editor for the selection.                         |
| `Shift`+`F10`         | Block menu for the current block.                      |
| `Mod`+`Alt`+`M`       | Block menu, for keyboards without `F10`.               |
| `Mod`+`Alt`+`R` / `C` | Row / column menu, inside a table.                     |
| `Mod`+`Alt`+`T`       | Insert a 3 × 3 table, no menu involved.                |
| `Tab` / `Shift`+`Tab` | Next / previous cell, inside a table.                  |

`Shift`+`F10` is the platform's context-menu key, and the one a screen reader
user reaches for first. The drag handle only appears on hover, so without it
the block menu would be mouse-only.

The table menus need their own keys because `Tab` inside a table is cell
navigation — there is no tab-stop route to the handles.

## Accessibility

Every surface is checked by axe, twice: in jsdom over each component
(`tests/accessibility.test.tsx`), and in a real browser over the rendered
page (`e2e/accessibility.spec.ts`), where colour contrast and focus
visibility can actually be measured. The unit suite includes a test that
feeds axe deliberately broken markup — a gate that cannot fail is not a gate.

Conventions the chrome holds to:

- **A control that can never be enabled is removed, not disabled.** A
  permanently disabled button is noise for a screen reader.
- **Each toolbar is one tab stop**, with a roving `tabindex`, as the ARIA
  toolbar pattern specifies.
- **`Escape` always returns focus to the document**, never to a handle that
  is about to disappear.
- The editing surface carries an accessible name — `label`, defaulting to
  `"Document"`. A `contenteditable` is an ARIA textbox, and an unnamed one is
  announced as nothing at all.

```tsx
<BlockleafEditor label="Release notes" />
```

Known and deferred to HD-01: the slash menu is a listbox driven by
`aria-activedescendant` on itself rather than on the editor that holds focus.
The full combobox pattern wants the relationship expressed on the textbox.

---

## Styling

Both menus read the editor's `--bl-*` variables and define their own scoped
fallbacks, so they follow a theme without being coupled to one. Dark mode is
automatic via `prefers-color-scheme`, and `[data-theme='dark']` or
`[data-theme='light']` on the menu forces it.

| Variable group | Examples                                                     |
| -------------- | ------------------------------------------------------------ |
| Slash menu     | `--bl-slash-bg`, `--bl-slash-selected`, `--bl-slash-shadow`  |
| Bubble menu    | `--bl-bubble-bg`, `--bl-bubble-active`, `--bl-bubble-danger` |

Class names are stable and BEM-flavoured — `.blockleaf-bubble-menu`,
`.blockleaf-bubble-menu__button`, `.blockleaf-slash-menu__item`,
`.blockleaf-block-handle__button`, `.blockleaf-block-menu__item` — so a
stylesheet of your own can target them without `!important`.
