import { blockId, headingLevel, mentionAttributes } from './attrs.js';
import { type DocumentHeading } from './text.js';
import { type RenderableNode } from './types.js';

/**
 * A table of contents, worked out from the document it sits in.
 * The stored block holds nothing but its id; both render targets
 * call this to fill it in.
 */

export const TABLE_OF_CONTENTS = 'tableOfContents';

/** One line of a table of contents. */
export interface TableOfContentsItem extends DocumentHeading {
	/** How far in to indent it: 1 for the highest level the document uses. */
	depth: number;
}

const contains = (node: RenderableNode, type: string): boolean =>
	node.type === type ||
	(node.content ?? []).some((child) => contains(child, type));

/**
 * A heading's text. Not `toPlainText`: a heading holds inline content only,
 * and that walker would add half a kilobyte to every render target.
 */
const inlineText = (node: RenderableNode): string =>
	(node.content ?? [])
		.map((child) => {
			if (child.type === 'text') return child.text ?? '';
			if (child.type === 'mention') return mentionAttributes(child).text;
			return child.type === 'hardBreak' ? ' ' : inlineText(child);
		})
		.join('');

const headingsOf = (node: RenderableNode): DocumentHeading[] =>
	node.type === 'heading'
		? [
				{
					level: headingLevel(node),
					text: inlineText(node).replace(/\s+/g, ' ').trim(),
					id: blockId(node)
				}
			]
		: (node.content ?? []).flatMap(headingsOf);

interface Outline {
	items: TableOfContentsItem[];
	hasTableOfContents: boolean;
}

// Each heading asks whether its document has a table of contents, so the
// walk is done once per document, not once per heading.
const outlines = new WeakMap<RenderableNode, Outline>();

const outlineOf = (root: RenderableNode): Outline => {
	const cached = outlines.get(root);
	if (cached) return cached;
	const headings = headingsOf(root).filter((heading) => heading.text);
	const top = Math.min(...headings.map((heading) => heading.level));
	const outline: Outline = {
		items: headings.map((heading) => ({
			...heading,
			depth: heading.level - top + 1
		})),
		hasTableOfContents: contains(root, TABLE_OF_CONTENTS)
	};
	outlines.set(root, outline);
	return outline;
};

/**
 * The headings a table of contents lists: in order, without the empty ones,
 * each with how far in to indent it.
 *
 * ```ts
 * tableOfContents(doc);
 * // [{ id: 'a1', level: 1, depth: 1, text: 'Introduction' }, …]
 * ```
 */
export const tableOfContents = (root: RenderableNode): TableOfContentsItem[] =>
	outlineOf(root).items;

/**
 * The `id` a heading is written with: its block id, but only in a document
 * with a table of contents. Everywhere else a heading keeps the editor's
 * `data-id` alone, as it always has.
 */
export const headingAnchor = (
	root: RenderableNode,
	id: string | undefined
): string | undefined =>
	id && outlineOf(root).hasTableOfContents ? id : undefined;
