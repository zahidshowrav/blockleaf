import { SCHEMA_VERSION, type BlockleafDocument } from '@blockleaf/editor';

/**
 * A short document for the examples — long enough to edit, short enough to
 * read. Every block carries an `id` because a stored document does: without
 * them `UniqueID` adds them on load and the first `onChange` fires before
 * the reader has touched anything.
 */
export const sampleDocument: BlockleafDocument = {
	type: 'doc',
	attrs: { schemaVersion: SCHEMA_VERSION },
	content: [
		{
			type: 'heading',
			attrs: { level: 2, id: 'ex-title' },
			content: [{ type: 'text', text: 'Release notes' }]
		},
		{
			type: 'paragraph',
			attrs: { id: 'ex-intro' },
			content: [
				{ type: 'text', text: 'Edit this. Everything below is ' },
				{ type: 'text', marks: [{ type: 'bold' }], text: 'live' },
				{ type: 'text', text: ' — it reads the same document.' }
			]
		},
		{
			type: 'bulletList',
			attrs: { id: 'ex-list' },
			content: [
				{
					type: 'listItem',
					attrs: { id: 'ex-list-1' },
					content: [
						{
							type: 'paragraph',
							attrs: { id: 'ex-list-1-p' },
							content: [
								{
									type: 'text',
									text: 'Drag a block by its handle.'
								}
							]
						}
					]
				},
				{
					type: 'listItem',
					attrs: { id: 'ex-list-2' },
					content: [
						{
							type: 'paragraph',
							attrs: { id: 'ex-list-2-p' },
							content: [
								{
									type: 'text',
									text: 'Press / on an empty line.'
								}
							]
						}
					]
				}
			]
		}
	]
};
