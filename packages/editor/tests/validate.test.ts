import { describe, expect, it } from 'vitest';

import { SCHEMA_VERSION, createEmptyDocument } from '../src/core/schema.js';
import {
	blockleafDocumentSchema,
	safeValidateDocument,
	validateDocument
} from '../src/validate.js';

describe('@blockleaf/editor/validate (EC-19)', () => {
	it('validates a minimal empty document', () => {
		const doc = createEmptyDocument();
		const result = safeValidateDocument(doc);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.attrs.schemaVersion).toBe(SCHEMA_VERSION);
		}
	});

	it('validates a rich document with marks, lists, callouts, and tables', () => {
		const richDoc = {
			type: 'doc' as const,
			attrs: { schemaVersion: 1 },
			content: [
				{
					type: 'heading' as const,
					attrs: { level: 1 as const, id: 'h1' },
					content: [
						{
							type: 'text' as const,
							text: 'Title',
							marks: [{ type: 'bold' as const }]
						}
					]
				},
				{
					type: 'paragraph' as const,
					content: [
						{
							type: 'text' as const,
							text: 'Link',
							marks: [
								{
									type: 'link' as const,
									attrs: { href: 'https://blockleaf.dev' }
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
										{ type: 'text' as const, text: 'Done' }
									]
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
								{ type: 'text' as const, text: 'Callout text' }
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
									content: [
										{
											type: 'paragraph' as const,
											content: [
												{
													type: 'text' as const,
													text: 'Col 1'
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
										colwidth: [100]
									},
									content: [
										{
											type: 'paragraph' as const,
											content: [
												{
													type: 'text' as const,
													text: 'Val 1'
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

		const validated = validateDocument(richDoc);
		expect(validated.type).toBe('doc');
		expect(validated.content).toHaveLength(5);
	});

	it('rejects documents without doc envelope or schemaVersion', () => {
		const invalidEnvelope = {
			type: 'paragraph',
			content: [{ type: 'text', text: 'Missing doc wrapper' }]
		};

		const res1 = safeValidateDocument(invalidEnvelope);
		expect(res1.success).toBe(false);

		const missingVersion = {
			type: 'doc',
			content: [{ type: 'paragraph' }]
		};

		const res2 = safeValidateDocument(missingVersion);
		expect(res2.success).toBe(false);
	});

	it('rejects heading level deeper than 3', () => {
		const invalidHeading = {
			type: 'doc',
			attrs: { schemaVersion: 1 },
			content: [
				{
					type: 'heading',
					attrs: { level: 4 },
					content: [{ type: 'text', text: 'Level 4 is forbidden' }]
				}
			]
		};

		const res = safeValidateDocument(invalidHeading);
		expect(res.success).toBe(false);
	});

	it('rejects nested tables inside table cells', () => {
		const nestedTableDoc = {
			type: 'doc',
			attrs: { schemaVersion: 1 },
			content: [
				{
					type: 'table',
					content: [
						{
							type: 'tableRow',
							content: [
								{
									type: 'tableCell',
									content: [
										{
											type: 'table',
											content: []
										}
									]
								}
							]
						}
					]
				}
			]
		};

		const res = safeValidateDocument(nestedTableDoc);
		expect(res.success).toBe(false);
	});

	it('exports blockleafDocumentSchema Zod type directly', () => {
		expect(blockleafDocumentSchema).toBeDefined();
		expect(typeof blockleafDocumentSchema.parse).toBe('function');
	});
});

describe('unrecognised types (FC-04)', () => {
	const poll = {
		type: 'poll',
		attrs: { question: 'Lunch?' },
		// Not Blockleaf's to check: a newer version or another extension
		// decides what goes inside its own node.
		content: [{ type: 'heading', attrs: { level: 9 } }],
		extra: [1, 2, 3]
	};

	const documentWith = (content: unknown[]) => ({
		type: 'doc',
		attrs: { schemaVersion: SCHEMA_VERSION },
		content
	});

	it('accepts an unknown block, unread, and hands it back verbatim', () => {
		const result = safeValidateDocument(documentWith([poll]));

		expect(result.success).toBe(true);
		if (result.success) expect(result.data.content?.[0]).toEqual(poll);
	});

	it('accepts one anywhere a node may go', () => {
		const paragraph = (content: unknown[]) => ({
			type: 'paragraph',
			content
		});
		const doc = documentWith([
			{ type: 'callout', content: [poll] },
			{
				type: 'bulletList',
				content: [
					{ type: 'listItem', content: [paragraph([]), poll] },
					poll
				]
			},
			{
				type: 'table',
				content: [
					{
						type: 'tableRow',
						content: [{ type: 'tableCell', content: [poll] }, poll]
					},
					poll
				]
			},
			paragraph([
				{ type: 'text', text: 'Hi ' },
				{ type: 'mention', attrs: { id: 'u1' } }
			])
		]);

		expect(safeValidateDocument(doc).success).toBe(true);
	});

	it('accepts an unknown mark beside known ones', () => {
		const doc = documentWith([
			{
				type: 'paragraph',
				content: [
					{
						type: 'text',
						text: 'noted',
						marks: [
							{ type: 'bold' },
							{ type: 'comment', attrs: { thread: 'c1' } }
						]
					}
				]
			}
		]);

		const result = safeValidateDocument(doc);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(JSON.stringify(result.data)).toContain('"thread":"c1"');
		}
	});

	it('still refuses a known type that breaks its own schema', () => {
		// A broken heading is not an unknown node.
		expect(
			safeValidateDocument(
				documentWith([{ type: 'heading', attrs: { level: 4 } }])
			).success
		).toBe(false);
		expect(
			safeValidateDocument(
				documentWith([
					{
						type: 'paragraph',
						content: [
							{
								type: 'text',
								text: 'x',
								marks: [{ type: 'link' }]
							}
						]
					}
				])
			).success
		).toBe(false);
	});

	it('refuses a node without a string type', () => {
		expect(
			safeValidateDocument(documentWith([{ attrs: {} }])).success
		).toBe(false);
		expect(safeValidateDocument(documentWith([{ type: 42 }])).success).toBe(
			false
		);
	});
});
