import { describe, expect, it } from 'vitest';

import { createEmptyDocument, type BlockleafDocument } from '@blockleaf/editor';

import { type RenderableDocument } from '../src/types.js';

/**
 * `RenderableDocument` is structural so that a host can pass a
 * `BlockleafDocument` straight in without this package depending on the
 * editor. That only holds while the two shapes stay compatible, and nothing
 * but this file would notice if they stopped.
 */
describe('BlockleafDocument fits RenderableDocument', () => {
	it('accepts an empty document with no cast', () => {
		const doc: RenderableDocument = createEmptyDocument();
		expect(doc.type).toBe('doc');
	});

	it('accepts a document carrying every kind of node', () => {
		const stored: BlockleafDocument = {
			type: 'doc',
			attrs: { schemaVersion: 1 },
			content: [
				{
					type: 'paragraph',
					attrs: { id: 'p' },
					content: [
						{
							type: 'text',
							text: 'x',
							marks: [
								{ type: 'bold' },
								{
									type: 'link',
									attrs: { href: 'https://example.com' }
								}
							]
						},
						{ type: 'hardBreak' }
					]
				},
				{
					type: 'heading',
					attrs: { level: 2 },
					content: [{ type: 'text', text: 'H' }]
				},
				{
					type: 'image',
					attrs: { id: 'i', src: 'https://example.com/a.png' }
				},
				{
					type: 'table',
					content: [
						{
							type: 'tableRow',
							content: [
								{
									type: 'tableHeader',
									content: [{ type: 'paragraph' }]
								}
							]
						}
					]
				}
			]
		};

		const doc: RenderableDocument = stored;
		expect(doc.content).toHaveLength(4);
	});
});
