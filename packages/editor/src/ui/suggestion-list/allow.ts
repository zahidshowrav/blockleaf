import type { Range } from '@tiptap/core';
import type { EditorState } from '@tiptap/pm/state';

/**
 * Whether a suggestion may open at `range`: in text, and not in code — a
 * code block or under an inline code mark — where every character is
 * literal and `@` or `:` is only that.
 */
export const allowOutsideCode = (state: EditorState, range: Range): boolean => {
	const $from = state.doc.resolve(range.from);
	if (!$from.parent.inlineContent || $from.parent.type.spec.code)
		return false;
	let inCode = false;
	state.doc.nodesBetween(range.from, range.to, (node) => {
		if (node.marks.some((mark) => mark.type.spec.code)) inCode = true;
	});
	return !inCode;
};
