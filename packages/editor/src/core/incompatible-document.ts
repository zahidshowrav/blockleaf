import { SCHEMA_VERSION } from './schema.js';

/**
 * Why the editor would not open a document as it stands.
 *
 * - `'unreadable'`: the document failed the schema check, so the editor
 *   holds Tiptap's empty fallback rather than the document.
 * - `'newer-version'`: the document reads, but its `attrs.schemaVersion` is
 *   ahead of this editor's `SCHEMA_VERSION`. A newer editor wrote it, and
 *   saving it from here would stamp it with an older version than it has.
 */
export type IncompatibleDocumentReason = 'unreadable' | 'newer-version';

/**
 * What the editor reports, or throws, for a document it will not open as it
 * stands. See `incompatibleDocument` on `useBlockleafEditor`.
 */
export class IncompatibleDocumentError extends Error {
	readonly reason: IncompatibleDocumentReason;
	/** The document's `attrs.schemaVersion`, when it had a number there. */
	readonly documentVersion: number | undefined;
	/** This editor's `SCHEMA_VERSION`. */
	readonly editorVersion: number;

	constructor(
		reason: IncompatibleDocumentReason,
		documentVersion?: number,
		options?: { cause?: unknown }
	) {
		super(
			reason === 'newer-version'
				? `[blockleaf]: document schemaVersion ${documentVersion} is newer than this editor's ${SCHEMA_VERSION}`
				: '[blockleaf]: document cannot be read by this editor',
			options
		);
		this.name = 'IncompatibleDocumentError';
		this.reason = reason;
		this.documentVersion = documentVersion;
		this.editorVersion = SCHEMA_VERSION;
	}
}

/**
 * The document's `attrs.schemaVersion` when it is ahead of this editor's,
 * otherwise `undefined`. A missing or non-numeric version is not "newer":
 * the content check is what catches a document that is not Blockleaf's.
 */
export const newerSchemaVersion = (doc: unknown): number | undefined => {
	if (typeof doc !== 'object' || doc === null) return undefined;
	const attrs = (doc as { attrs?: unknown }).attrs;
	if (typeof attrs !== 'object' || attrs === null) return undefined;
	const version = (attrs as { schemaVersion?: unknown }).schemaVersion;
	return typeof version === 'number' && version > SCHEMA_VERSION
		? version
		: undefined;
};
