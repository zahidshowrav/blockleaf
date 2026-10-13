import { type RenderableDocument, type RenderableNode } from '../src/types.js';

/** Wraps blocks in a document, so a test can name one node and get a document. */
export const docOf = (...content: RenderableNode[]): RenderableDocument => ({
	type: 'doc',
	attrs: { schemaVersion: 1 },
	content
});

export const text = (value: string, marks?: RenderableNode['marks']) => ({
	type: 'text',
	text: value,
	...(marks ? { marks } : {})
});

export const paragraph = (value: string, id?: string): RenderableNode => ({
	type: 'paragraph',
	...(id ? { attrs: { id } } : {}),
	content: [text(value)]
});
