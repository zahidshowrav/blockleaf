import { describe, expect, it } from 'vitest';

import { createEmptyDocument, withBlockIds } from '../src/core/schema.js';
import type { BlockleafDocument } from '../src/core/schema.js';

const ids = (doc: BlockleafDocument): unknown[] => {
	const found: unknown[] = [];
	const walk = (node: {
		attrs?: Record<string, unknown>;
		content?: unknown[];
	}) => {
		if (node.attrs && 'id' in node.attrs) found.push(node.attrs.id);
		for (const child of (node.content ?? []) as (typeof node)[])
			walk(child);
	};
	walk(doc);
	return found;
};

describe('stamping block ids before the editor sees them (HD-05)', () => {
	// `UniqueID` does this inside ProseMirror, one transaction step per node,
	// each applied to the document the one before it produced. On a
	// 10,000-block import that was 137 seconds; one pass over JSON is 2.
	it('gives every block an id', () => {
		const doc = withBlockIds({
			...createEmptyDocument(),
			content: [
				{ type: 'paragraph' },
				{ type: 'heading', attrs: { level: 1 } }
			]
		} as BlockleafDocument);

		expect(ids(doc)).toHaveLength(2);
		for (const id of ids(doc)) expect(typeof id).toBe('string');
	});

	it('reaches blocks nested inside other blocks', () => {
		const doc = withBlockIds({
			...createEmptyDocument(),
			content: [
				{
					type: 'bulletList',
					content: [
						{
							type: 'listItem',
							content: [{ type: 'paragraph' }]
						}
					]
				}
			]
		} as BlockleafDocument);

		// The list, its item and the paragraph inside it.
		expect(ids(doc)).toHaveLength(3);
	});

	it('leaves ids that are already there alone', () => {
		const doc = withBlockIds({
			...createEmptyDocument(),
			content: [{ type: 'paragraph', attrs: { id: 'keep-me' } }]
		} as BlockleafDocument);

		expect(ids(doc)).toEqual(['keep-me']);
	});

	// The common case is a document this editor saved earlier, and it should
	// cost nothing — not even a copy.
	it('returns the same object when there is nothing to add', () => {
		const original = {
			...createEmptyDocument(),
			content: [{ type: 'paragraph', attrs: { id: 'a' } }]
		} as BlockleafDocument;

		expect(withBlockIds(original)).toBe(original);
	});

	it('does not invent ids for things that are not blocks', () => {
		const doc = withBlockIds({
			...createEmptyDocument(),
			content: [
				{
					type: 'paragraph',
					attrs: { id: 'p' },
					content: [{ type: 'text', text: 'hello' }]
				}
			]
		} as BlockleafDocument);

		expect(ids(doc)).toEqual(['p']);
	});

	it('does not mutate what it was given', () => {
		const original = {
			...createEmptyDocument(),
			content: [{ type: 'paragraph' }]
		} as BlockleafDocument;

		withBlockIds(original);

		expect(ids(original)).toEqual([]);
	});
});
