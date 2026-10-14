import { Editor } from '@tiptap/core';
import { describe, expect, it } from 'vitest';

import { createExtensions } from '../src/core/extensions.js';
import {
	SCHEMA_VERSION,
	createEmptyDocument,
	isBlockleafDocument,
	withSchemaVersion
} from '../src/core/schema.js';

describe('document schema', () => {
	it('stamps the current version on an empty document', () => {
		expect(createEmptyDocument()).toEqual({
			type: 'doc',
			attrs: { schemaVersion: SCHEMA_VERSION },
			content: [{ type: 'paragraph' }]
		});
	});

	it('recognises its own documents and rejects foreign ones', () => {
		expect(isBlockleafDocument(createEmptyDocument())).toBe(true);
		expect(isBlockleafDocument({ type: 'doc', content: [] })).toBe(false);
		expect(isBlockleafDocument(null)).toBe(false);
		expect(isBlockleafDocument('doc')).toBe(false);
	});

	it('stamps a version onto raw Tiptap output without losing content', () => {
		const raw = { type: 'doc', content: [{ type: 'paragraph' }] };
		const stamped = withSchemaVersion(raw);

		expect(stamped.attrs.schemaVersion).toBe(SCHEMA_VERSION);
		expect(stamped.content).toEqual(raw.content);
	});

	/**
	 * Guards the one decision that cannot be refactored: the version is part of
	 * the contract, so bumping it must be deliberate and must come with a
	 * migration. See apps/docs/content/docs/schema.mdx.
	 */
	it('has not changed version by accident', () => {
		expect(SCHEMA_VERSION).toBe(1);
	});

	it('validates and types a rich document with discriminated union nodes and marks', () => {
		const complexDoc = {
			type: 'doc' as const,
			attrs: { schemaVersion: SCHEMA_VERSION },
			content: [
				{
					type: 'heading' as const,
					attrs: { level: 1 as const },
					content: [
						{
							type: 'text' as const,
							text: 'Title with ',
							marks: [{ type: 'bold' as const }]
						},
						{
							type: 'text' as const,
							text: 'link',
							marks: [
								{
									type: 'link' as const,
									attrs: { href: 'https://example.com' }
								}
							]
						}
					]
				},
				{
					type: 'callout' as const,
					attrs: { emoji: '💡', tone: 'info' },
					content: [
						{
							type: 'paragraph' as const,
							content: [
								{
									type: 'text' as const,
									text: 'Callout content'
								}
							]
						}
					]
				},
				{
					type: 'taskList' as const,
					content: [
						{
							type: 'taskItem' as const,
							attrs: { checked: true },
							content: [
								{
									type: 'paragraph' as const,
									content: [
										{
											type: 'text' as const,
											text: 'Done item'
										}
									]
								}
							]
						}
					]
				},
				{
					type: 'table' as const,
					content: [
						{
							type: 'tableRow' as const,
							content: [
								{
									type: 'tableHeader' as const,
									attrs: {
										colspan: 1,
										rowspan: 1,
										colwidth: [120]
									},
									content: [
										{
											type: 'paragraph' as const,
											content: [
												{
													type: 'text' as const,
													text: 'Header'
												}
											]
										}
									]
								}
							]
						}
					]
				}
			]
		};

		expect(isBlockleafDocument(complexDoc)).toBe(true);
		expect(complexDoc.content).toHaveLength(4);
	});

	it('matches committed schema snapshot fixture (EC-10)', () => {
		const canonicalDocument = {
			type: 'doc' as const,
			attrs: { schemaVersion: SCHEMA_VERSION },
			content: [
				{
					type: 'heading' as const,
					attrs: { level: 1 as const, id: 'heading-1' },
					content: [
						{
							type: 'text' as const,
							text: 'Document Title',
							marks: [{ type: 'bold' as const }]
						}
					]
				},
				{
					type: 'heading' as const,
					attrs: { level: 2 as const, id: 'heading-2' },
					content: [
						{ type: 'text' as const, text: 'Section Heading' }
					]
				},
				{
					type: 'heading' as const,
					attrs: { level: 3 as const, id: 'heading-3' },
					content: [
						{ type: 'text' as const, text: 'Subsection Heading' }
					]
				},
				{
					type: 'paragraph' as const,
					attrs: { id: 'para-1' },
					content: [
						{ type: 'text' as const, text: 'Plain text, ' },
						{
							type: 'text' as const,
							text: 'bold',
							marks: [{ type: 'bold' as const }]
						},
						{ type: 'text' as const, text: ', ' },
						{
							type: 'text' as const,
							text: 'italic',
							marks: [{ type: 'italic' as const }]
						},
						{ type: 'text' as const, text: ', ' },
						{
							type: 'text' as const,
							text: 'strike',
							marks: [{ type: 'strike' as const }]
						},
						{ type: 'text' as const, text: ', ' },
						{
							type: 'text' as const,
							text: 'underline',
							marks: [{ type: 'underline' as const }]
						},
						{ type: 'text' as const, text: ', ' },
						{
							type: 'text' as const,
							text: 'code',
							marks: [{ type: 'code' as const }]
						},
						{ type: 'text' as const, text: ', ' },
						{
							type: 'text' as const,
							text: 'highlight',
							marks: [
								{
									type: 'highlight' as const,
									attrs: { color: '#ffff00' }
								}
							]
						},
						{ type: 'text' as const, text: ', and ' },
						{
							type: 'text' as const,
							text: 'sanitised link',
							marks: [
								{
									type: 'link' as const,
									attrs: {
										href: 'https://blockleaf.dev',
										target: '_blank',
										rel: 'noopener noreferrer'
									}
								}
							]
						},
						{ type: 'hardBreak' as const }
					]
				},
				{
					type: 'blockquote' as const,
					attrs: { id: 'quote-1' },
					content: [
						{
							type: 'paragraph' as const,
							content: [
								{
									type: 'text' as const,
									text: 'Blockquote content'
								}
							]
						}
					]
				},
				{
					type: 'codeBlock' as const,
					attrs: { language: 'typescript', id: 'code-1' },
					content: [
						{
							type: 'text' as const,
							text: 'const answer: number = 42;'
						}
					]
				},
				{
					type: 'horizontalRule' as const,
					attrs: { id: 'hr-1' }
				},
				{
					type: 'bulletList' as const,
					attrs: { id: 'bl-1' },
					content: [
						{
							type: 'listItem' as const,
							attrs: { id: 'li-1' },
							content: [
								{
									type: 'paragraph' as const,
									content: [
										{
											type: 'text' as const,
											text: 'Bullet item 1'
										}
									]
								}
							]
						}
					]
				},
				{
					type: 'orderedList' as const,
					attrs: { start: 1, id: 'ol-1' },
					content: [
						{
							type: 'listItem' as const,
							attrs: { id: 'li-2' },
							content: [
								{
									type: 'paragraph' as const,
									content: [
										{
											type: 'text' as const,
											text: 'Ordered item 1'
										}
									]
								}
							]
						}
					]
				},
				{
					type: 'taskList' as const,
					attrs: { id: 'tl-1' },
					content: [
						{
							type: 'taskItem' as const,
							attrs: { checked: true, id: 'ti-1' },
							content: [
								{
									type: 'paragraph' as const,
									content: [
										{
											type: 'text' as const,
											text: 'Completed task'
										}
									]
								}
							]
						},
						{
							type: 'taskItem' as const,
							attrs: { checked: false, id: 'ti-2' },
							content: [
								{
									type: 'paragraph' as const,
									content: [
										{
											type: 'text' as const,
											text: 'Pending task'
										}
									]
								}
							]
						}
					]
				},
				{
					type: 'callout' as const,
					attrs: { emoji: '💡', tone: 'info', id: 'co-1' },
					content: [
						{
							type: 'paragraph' as const,
							content: [
								{
									type: 'text' as const,
									text: 'Callout block content'
								}
							]
						}
					]
				},
				{
					type: 'details' as const,
					attrs: { open: true, id: 'det-1' },
					content: [
						{
							type: 'paragraph' as const,
							content: [
								{
									type: 'text' as const,
									text: 'Collapsible toggle content'
								}
							]
						}
					]
				},
				{
					type: 'image' as const,
					attrs: {
						id: 'img-upload-id',
						src: 'https://example.com/asset.png',
						alt: 'Description',
						width: 800,
						align: 'center' as const
					}
				},
				{
					type: 'table' as const,
					attrs: { id: 'tbl-1' },
					content: [
						{
							type: 'tableRow' as const,
							content: [
								{
									type: 'tableHeader' as const,
									attrs: {
										colspan: 1,
										rowspan: 1,
										colwidth: [150]
									},
									content: [
										{
											type: 'paragraph' as const,
											content: [
												{
													type: 'text' as const,
													text: 'Header Col'
												}
											]
										}
									]
								}
							]
						},
						{
							type: 'tableRow' as const,
							content: [
								{
									type: 'tableCell' as const,
									attrs: {
										colspan: 1,
										rowspan: 1,
										colwidth: [150]
									},
									content: [
										{
											type: 'paragraph' as const,
											content: [
												{
													type: 'text' as const,
													text: 'Cell Col'
												}
											]
										}
									]
								}
							]
						}
					]
				}
			]
		};

		expect(isBlockleafDocument(canonicalDocument)).toBe(true);
		expect(canonicalDocument).toMatchSnapshot();
	});

	it('round-trips a table document through Editor standard preset (EC-18)', () => {
		const editor = new Editor({
			extensions: createExtensions('standard'),
			content: '<p></p>'
		});

		const tableDoc = {
			type: 'doc',
			attrs: { schemaVersion: SCHEMA_VERSION },
			content: [
				{
					type: 'heading',
					attrs: { level: 2, id: 'heading-table' },
					content: [{ type: 'text', text: 'Table Section' }]
				},
				{
					type: 'table',
					attrs: { id: 'tbl-doc-1' },
					content: [
						{
							type: 'tableRow',
							content: [
								{
									type: 'tableHeader',
									attrs: {
										colspan: 1,
										rowspan: 1,
										colwidth: null
									},
									content: [
										{
											type: 'paragraph',
											attrs: { id: 'hdr-p1' },
											content: [
												{
													type: 'text',
													text: 'Header 1'
												}
											]
										}
									]
								},
								{
									type: 'tableHeader',
									attrs: {
										colspan: 1,
										rowspan: 1,
										colwidth: null
									},
									content: [
										{
											type: 'paragraph',
											attrs: { id: 'hdr-p2' },
											content: [
												{
													type: 'text',
													text: 'Header 2'
												}
											]
										}
									]
								}
							]
						},
						{
							type: 'tableRow',
							content: [
								{
									type: 'tableCell',
									attrs: {
										colspan: 1,
										rowspan: 1,
										colwidth: null
									},
									content: [
										{
											type: 'paragraph',
											attrs: { id: 'cell-p1' },
											content: [
												{ type: 'text', text: 'Cell 1' }
											]
										}
									]
								},
								{
									type: 'tableCell',
									attrs: {
										colspan: 1,
										rowspan: 1,
										colwidth: null
									},
									content: [
										{
											type: 'paragraph',
											attrs: { id: 'cell-p2' },
											content: [
												{ type: 'text', text: 'Cell 2' }
											]
										}
									]
								}
							]
						}
					]
				},
				{
					type: 'paragraph',
					attrs: { id: 'trailing-p' }
				}
			]
		};

		editor.commands.setContent(tableDoc);
		const roundTrippedJSON = editor.getJSON();

		expect(roundTrippedJSON.type).toBe('doc');
		const tableNode = roundTrippedJSON.content?.find(
			(n) => n.type === 'table'
		);
		expect(tableNode).toBeDefined();
		expect(tableNode?.content).toHaveLength(2);

		// Verify round-trip back into editor
		editor.commands.setContent(roundTrippedJSON);
		const secondRoundTripJSON = editor.getJSON();
		expect(secondRoundTripJSON).toEqual(roundTrippedJSON);

		// Verify snapshot
		expect(roundTrippedJSON).toMatchSnapshot();

		editor.destroy();
	});
});
