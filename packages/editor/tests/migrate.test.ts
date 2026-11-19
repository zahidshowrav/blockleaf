import { describe, expect, it, vi } from 'vitest';

import {
	migrate,
	runMigrations,
	type DocumentMigration,
	type StoredDocument
} from '../src/core/migrate.js';
import { SCHEMA_VERSION, createEmptyDocument } from '../src/core/schema.js';

/** A pretend history, so the runner can be exercised before any real bump:
 *  v1 → v2 renames `callout` to `aside`, v2 → v3 adds a `caption` to tables. */
const renameCallout: DocumentMigration = (doc) => ({
	...doc,
	content: doc.content?.map((node) =>
		(node as { type?: string }).type === 'callout'
			? { ...(node as object), type: 'aside' }
			: node
	)
});

const addCaption: DocumentMigration = (doc) => {
	for (const node of doc.content ?? []) {
		const block = node as {
			type?: string;
			attrs?: Record<string, unknown>;
		};
		if (block.type === 'table')
			block.attrs = { ...block.attrs, caption: '' };
	}
	return doc;
};

const history = { 1: renameCallout, 2: addCaption };

const v1 = (): StoredDocument => ({
	type: 'doc',
	attrs: { schemaVersion: 1 },
	content: [
		{ type: 'callout', content: [{ type: 'paragraph' }] },
		{ type: 'table', content: [] }
	]
});

describe('runMigrations (HD-09)', () => {
	it('walks every step from the stored version to the target', () => {
		expect(runMigrations(v1(), history, 3)).toEqual({
			type: 'doc',
			attrs: { schemaVersion: 3 },
			content: [
				{ type: 'aside', content: [{ type: 'paragraph' }] },
				{ type: 'table', attrs: { caption: '' }, content: [] }
			]
		});
	});

	it('starts from the stored version, not from 1', () => {
		const first = vi.fn(renameCallout);
		const v2 = { ...v1(), attrs: { schemaVersion: 2 } };
		const result = runMigrations(v2, { 1: first, 2: addCaption }, 3);
		expect(first).not.toHaveBeenCalled();
		expect(result).toMatchObject({ attrs: { schemaVersion: 3 } });
	});

	it('stamps each version itself, so a migration need not', () => {
		const seen: number[] = [];
		const record: DocumentMigration = (doc) => {
			seen.push(doc.attrs.schemaVersion);
			return doc;
		};
		runMigrations(v1(), { 1: record, 2: record }, 3);
		expect(seen).toEqual([1, 2]);
	});

	it('never changes the document it was given', () => {
		const stored = v1();
		const before = structuredClone(stored);
		runMigrations(stored, history, 3);
		expect(stored).toEqual(before);
	});

	it('keeps attrs a migration does not know about', () => {
		const stored = { ...v1(), attrs: { schemaVersion: 1, host: 'kept' } };
		expect(runMigrations(stored, history, 3)).toMatchObject({
			attrs: { schemaVersion: 3, host: 'kept' }
		});
	});

	it('returns a current document as the same object', () => {
		const current = { ...v1(), attrs: { schemaVersion: 3 } };
		expect(runMigrations(current, history, 3)).toBe(current);
	});

	it('leaves a newer document alone — there is no way down', () => {
		const newer = { ...v1(), attrs: { schemaVersion: 4 } };
		expect(runMigrations(newer, history, 3)).toBe(newer);
	});

	it.each([
		['null', null],
		['a string', 'doc'],
		['no attrs', { type: 'doc', content: [] }],
		['no version', { type: 'doc', attrs: {} }],
		['a string version', { type: 'doc', attrs: { schemaVersion: '1' } }],
		['version 0', { type: 'doc', attrs: { schemaVersion: 0 } }],
		[
			'a fractional version',
			{ type: 'doc', attrs: { schemaVersion: 1.5 } }
		],
		['not a doc', { type: 'paragraph', attrs: { schemaVersion: 1 } }]
	])('leaves %s untouched', (_, value) => {
		expect(runMigrations(value, history, 3)).toBe(value);
	});

	it('throws, naming the step, when a migration is missing', () => {
		expect(() => runMigrations(v1(), { 1: renameCallout }, 3)).toThrow(
			'no migration from schemaVersion 2 to 3'
		);
	});
});

describe('migrate', () => {
	it('returns a document at the current version as the same object', () => {
		const doc = createEmptyDocument();
		expect(migrate(doc)).toBe(doc);
	});

	it('leaves a document newer than this editor alone', () => {
		const newer = {
			type: 'doc',
			attrs: { schemaVersion: SCHEMA_VERSION + 1 },
			content: []
		};
		expect(migrate(newer)).toBe(newer);
	});
});
