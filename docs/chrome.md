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
`.blockleaf-bubble-menu__button`, `.blockleaf-slash-menu__item` — so a
stylesheet of your own can target them without `!important`.
