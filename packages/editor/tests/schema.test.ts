import { describe, expect, it } from 'vitest';

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
	 * migration. See docs/schema.md.
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
});
