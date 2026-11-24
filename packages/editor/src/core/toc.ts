import { getTextBetween, getTextSerializersFromSchema } from '@tiptap/core';
import { type Node as ProseMirrorNode } from '@tiptap/pm/model';

import { MENTION_NODE, MENTION_PREFIX } from './constants.js';
import { type BlockleafDocument, type HeadingNode } from './schema.js';

/** One heading, as a table of contents lists it (`PA-08`). */
export interface TableOfContentsEntry {
	/** The heading's block id, which a link points at. `null` on a heading without one. */
	id: string | null;
	/** The heading's level, 1 to 3. */
	level: 1 | 2 | 3;
	/**
	 * How far in to indent it: 1 for the highest level the document uses.
	 * A document whose headings start at level 2 does not open indented.
	 */
	depth: number;
	/** The heading's plain text. */
	text: string;
}

const HEADING = 'heading';

const levelOf = (value: unknown): 1 | 2 | 3 =>
	value === 1 || value === 2 || value === 3 ? value : 1;

const idOf = (value: unknown): string | null =>
	typeof value === 'string' && value !== '' ? value : null;

/** Sets each entry's `depth` from the highest level present. */
const withDepth = (
	headings: Omit<TableOfContentsEntry, 'depth'>[]
): TableOfContentsEntry[] => {
	const top = Math.min(...headings.map((heading) => heading.level));
	return headings.map((heading) => ({
		...heading,
		depth: heading.level - top + 1
	}));
};

/** The plain text of stored inline content. A mention reads as `@label`. */
const jsonText = (content: HeadingNode['content']): string =>
	(content ?? [])
		.map((node) => {
			if (node.type === 'text') return node.text;
			if (node.type === MENTION_NODE) {
				return `${MENTION_PREFIX}${node.attrs.label}`;
			}
			return ' ';
		})
		.join('')
		.replace(/\s+/g, ' ')
		.trim();

type JsonNode = { type?: string; attrs?: unknown; content?: unknown };

const childrenOf = (node: JsonNode): JsonNode[] =>
	Array.isArray(node.content) ? (node.content as JsonNode[]) : [];

/**
 * The headings of a stored document, in order, for a table of contents or a
 * sidebar outline (`PA-08`). Headings with no text are left out.
 *
 * Works on the JSON alone, so a server can call it with no editor.
 *
 * ```ts
 * getTableOfContents(document);
 * // [{ id: 'a1', level: 1, depth: 1, text: 'Introduction' }, …]
 * ```
 */
export const getTableOfContents = (
	document_: BlockleafDocument
): TableOfContentsEntry[] => {
	const headings: Omit<TableOfContentsEntry, 'depth'>[] = [];
	const visit = (node: JsonNode) => {
		if (node.type === HEADING) {
			const heading = node as HeadingNode;
			const text = jsonText(heading.content);
			if (text) {
				headings.push({
					id: idOf(heading.attrs?.id),
					level: levelOf(heading.attrs?.level),
					text
				});
			}
			return;
		}
		childrenOf(node).forEach(visit);
	};
	visit(document_ as JsonNode);
	return headings.length ? withDepth(headings) : [];
};

/**
 * The same list, read from an open editor's document. The editor's table of
 * contents block and `useTableOfContents` both use it.
 */
export const tableOfContentsOf = (
	doc: ProseMirrorNode
): TableOfContentsEntry[] => {
	const textSerializers = getTextSerializersFromSchema(doc.type.schema);
	const headings: Omit<TableOfContentsEntry, 'depth'>[] = [];
	doc.descendants((node) => {
		if (node.type.name !== HEADING) return true;
		const text = getTextBetween(
			node,
			{ from: 0, to: node.content.size },
			{ textSerializers }
		)
			.replace(/\s+/g, ' ')
			.trim();
		if (text) {
			headings.push({
				id: idOf(node.attrs.id),
				level: levelOf(node.attrs.level),
				text
			});
		}
		return false;
	});
	return headings.length ? withDepth(headings) : [];
};

/** Whether two lists would draw the same, so a redraw can be skipped. */
export const sameTableOfContents = (
	a: readonly TableOfContentsEntry[],
	b: readonly TableOfContentsEntry[]
): boolean =>
	a.length === b.length &&
	a.every(
		(entry, index) =>
			entry.id === b[index]?.id &&
			entry.level === b[index].level &&
			entry.depth === b[index].depth &&
			entry.text === b[index].text
	);
