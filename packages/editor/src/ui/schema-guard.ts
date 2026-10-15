import type { Editor } from '@tiptap/core';

/**
 * Availability checks that survive an extension not being loaded.
 *
 * `editor.can()` only carries the commands the configured extensions
 * registered, so asking `editor.can().toggleHighlight()` of an editor built
 * without `Highlight` throws rather than returning `false`. The chrome is
 * rendered against whatever schema it is handed — `preset="minimal"` has no
 * highlight and no tables, and a host may pass any `extensions` array at all
 * — so every default action asks whether the type exists before it asks
 * whether the command applies.
 */
const guard =
	(kind: 'marks' | 'nodes', type: string, can: (editor: Editor) => boolean) =>
	(editor: Editor) =>
		type in editor.schema[kind] && can(editor);

/** Available only when `mark` is in the schema. */
export const whenMarkExists = (
	mark: string,
	can: (editor: Editor) => boolean
) => guard('marks', mark, can);

/** Available only when `node` is in the schema. */
export const whenNodeExists = (
	node: string,
	can: (editor: Editor) => boolean
) => guard('nodes', node, can);
