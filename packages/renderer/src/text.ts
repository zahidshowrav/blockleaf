import { blockId, headingLevel } from './attrs.js';
import {
	type HeadingLevel,
	type RenderableDocument,
	type RenderableNode
} from './types.js';

/**
 * Text extraction, for the jobs that want the words and not the markup:
 * search indexing, reading time, excerpts, a table of contents.
 *
 * Nothing here renders. They walk the same JSON the renderers do, without
 * building any output to throw away afterwards.
 */

/** Nodes that end a run of text. */
const BLOCKS = new Set([
	'paragraph',
	'heading',
	'blockquote',
	'codeBlock',
	'horizontalRule',
	'bulletList',
	'orderedList',
	'listItem',
	'taskList',
	'taskItem',
	'callout',
	'details',
	'image',
	'table',
	'tableRow',
	'tableHeader',
	'tableCell'
]);

export interface PlainTextOptions {
	/**
	 * Put between blocks. `'\n\n'` by default, which keeps paragraphs apart
	 * in an excerpt; `' '` suits a search index better.
	 */
	blockSeparator?: string;
	/**
	 * Include image alt text. Off by default — alt text describes a picture
	 * rather than continuing the prose, and it reads as an interruption in an
	 * excerpt. Worth turning on for a search index.
	 */
	includeImageAlt?: boolean;
}

/**
 * The document's text, with blocks separated.
 *
 * Code blocks are included: their content is text the author wrote, and a
 * search for a function name should find the page that documents it.
 */
export const toPlainText = (
	doc: RenderableDocument,
	options?: PlainTextOptions
): string => {
	const separator = options?.blockSeparator ?? '\n\n';
	const parts: string[] = [];

	const walk = (node: RenderableNode): void => {
		if (node.type === 'text') {
			parts.push(node.text ?? '');
			return;
		}

		if (node.type === 'hardBreak') {
			parts.push('\n');
			return;
		}

		if (node.type === 'image') {
			if (options?.includeImageAlt) {
				const alt = node.attrs?.alt;
				if (typeof alt === 'string' && alt) parts.push(alt);
			}
			return;
		}

		for (const child of node.content ?? []) walk(child);
	};

	const blocks = (node: RenderableNode): void => {
		// A block that directly contains text is one unit; a block that
		// contains other blocks is not, or every list would be one run.
		const nested = (node.content ?? []).some(
			(child) => child.type && BLOCKS.has(child.type)
		);

		if (!nested && node.type && BLOCKS.has(node.type)) {
			const before = parts.length;
			walk(node);
			if (parts.length > before) parts.push(separator);
			return;
		}

		for (const child of node.content ?? []) blocks(child);
	};

	blocks(doc);

	return parts.join('').trimEnd();
};

export interface DocumentHeading {
	level: HeadingLevel;
	text: string;
	/**
	 * The block id, which the renderers write as `data-id`. It is not an
	 * `id` attribute — see the table-of-contents recipe in
	 * `apps/docs/content/docs/rendering.mdx` for linking to one.
	 */
	id: string | undefined;
}

/** Every heading in document order, for a table of contents. */
export const extractHeadings = (doc: RenderableDocument): DocumentHeading[] => {
	const headings: DocumentHeading[] = [];

	const walk = (node: RenderableNode): void => {
		if (node.type === 'heading') {
			headings.push({
				level: headingLevel(node),
				// Wrapped in a document rather than read directly, so the
				// heading is reached as a block and its text is collected.
				text: toPlainText(
					{ type: 'doc', content: [node] },
					{ blockSeparator: '' }
				),
				id: blockId(node)
			});
			return;
		}

		for (const child of node.content ?? []) walk(child);
	};

	walk(doc);

	return headings;
};
