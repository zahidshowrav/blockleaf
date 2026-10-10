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
});
