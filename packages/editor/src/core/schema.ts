/**
 * The stored document shape. This is the product's real API — it lives in other
 * people's databases, so it is versioned from the first release and every bump
 * ships a migration. See docs/schema.md.
 */
export const SCHEMA_VERSION = 1;

export type BlockleafMark = {
	type: string;
	attrs?: Record<string, unknown>;
};

/**
 * Deliberately our own type rather than a re-export of Tiptap's `JSONContent`,
 * which is `any`-typed throughout. M1 replaces this with a discriminated union
 * over the real node set; until then it stays structural but not loose.
 */
export type BlockleafNode = {
	type: string;
	attrs?: Record<string, unknown>;
	content?: BlockleafNode[];
	marks?: BlockleafMark[];
	text?: string;
};

export type BlockleafDocument = {
	type: 'doc';
	attrs: { schemaVersion: number };
	content?: BlockleafNode[];
};

export const createEmptyDocument = (): BlockleafDocument => ({
	type: 'doc',
	attrs: { schemaVersion: SCHEMA_VERSION },
	content: [{ type: 'paragraph' }]
});

/**
 * Structural guard only — it answers "did this come from Blockleaf?", not "is
 * every node valid?". Deep validation ships as an exported Zod schema in M1.
 */
export const isBlockleafDocument = (
	value: unknown
): value is BlockleafDocument => {
	if (typeof value !== 'object' || value === null) return false;
	const doc = value as Partial<BlockleafDocument>;
	return doc.type === 'doc' && typeof doc.attrs?.schemaVersion === 'number';
};

/** Stamps the current schema version onto a document Tiptap just produced. */
export const withSchemaVersion = (doc: {
	attrs?: Record<string, unknown>;
	content?: BlockleafNode[];
}): BlockleafDocument => ({
	...doc,
	type: 'doc',
	attrs: { ...doc.attrs, schemaVersion: SCHEMA_VERSION }
});
