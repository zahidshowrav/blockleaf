import { SCHEMA_VERSION, type BlockleafDocument } from './schema.js';

/**
 * A document as it was stored at some earlier `schemaVersion`. Older shapes
 * have no TypeScript type of their own — a migration reads JSON that today's
 * `BlockleafDocument` does not describe — so this is the loose envelope.
 */
export interface StoredDocument {
	type: 'doc';
	attrs: { schemaVersion: number; [key: string]: unknown };
	content?: unknown[];
	[key: string]: unknown;
}

/**
 * Turns a document stored at version `n` into version `n + 1`. It receives a
 * copy it may change in place, and does not need to set `schemaVersion`: the
 * runner stamps `n + 1` after it returns.
 */
export type DocumentMigration = (doc: StoredDocument) => StoredDocument;

/**
 * Every migration, keyed by the version it migrates **from**. Bumping
 * `SCHEMA_VERSION` from `n` to `n + 1` means adding the key `n` here in the
 * same PR — `tests/migrate.test.ts` fails until it exists.
 */
export const migrations: Readonly<Record<number, DocumentMigration>> = {
	// Version 2 adds node types (`mention`, `PA-02`, and the rest of the
	// `PA-02` to `PA-11` batch) and changes none, so every version 1
	// document is already a valid version 2 one. The bump is what tells an
	// older editor that a document may hold them.
	1: (doc) => doc
};

const isStoredDocument = (value: unknown): value is StoredDocument => {
	if (typeof value !== 'object' || value === null) return false;
	const doc = value as { type?: unknown; attrs?: unknown };
	if (doc.type !== 'doc') return false;
	if (typeof doc.attrs !== 'object' || doc.attrs === null) return false;
	const version = (doc.attrs as { schemaVersion?: unknown }).schemaVersion;
	return Number.isInteger(version) && (version as number) >= 1;
};

/**
 * The runner behind `migrate`, with the table and target passed in so tests
 * can exercise it before any real migration exists. Not exported publicly.
 */
export const runMigrations = (
	doc: unknown,
	table: Readonly<Record<number, DocumentMigration>>,
	target: number
): unknown => {
	if (!isStoredDocument(doc)) return doc;
	const from = doc.attrs.schemaVersion;
	if (from >= target) return doc;

	// One deep copy, so every migration may change its input in place and the
	// caller's document — often still held by React or a cache — is untouched.
	let current = structuredClone(doc);
	for (let version = from; version < target; version += 1) {
		const step = table[version];
		if (!step) {
			throw new Error(
				`[blockleaf]: no migration from schemaVersion ${version} to ${version + 1}`
			);
		}
		const next = step(current);
		current = {
			...next,
			attrs: { ...next.attrs, schemaVersion: version + 1 }
		};
	}
	return current;
};

/**
 * Brings a stored document up to this editor's `SCHEMA_VERSION`, one version
 * at a time. Safe to call on anything:
 *
 * - a document already at the current version comes back as the same object;
 * - one **newer** than this editor comes back untouched — there is no way
 *   down, and the editor opens it read-only (see `incompatibleDocument`);
 * - a value without a whole-number `attrs.schemaVersion` of 1 or more is not
 *   a Blockleaf document and comes back untouched.
 *
 * The input is never changed. Run it on the server before `validate`, or
 * before handing a stored document to `@blockleaf/renderer`; the editor runs
 * it on `defaultValue` by itself.
 */
export function migrate(doc: BlockleafDocument): BlockleafDocument;
export function migrate(doc: unknown): unknown;
export function migrate(doc: unknown): unknown {
	return runMigrations(doc, migrations, SCHEMA_VERSION);
}
