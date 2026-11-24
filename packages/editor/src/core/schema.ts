import { BLOCK_NODE_TYPES } from './constants.js';

/**
 * The stored document shape. This is the product's real API — it lives in other
 * people's databases, so it is versioned from the first release and every bump
 * ships a migration. See apps/docs/content/docs/schema.mdx.
 */
export const SCHEMA_VERSION = 2;

/* -------------------------------------------------------------------------- */
/* Marks                                                                      */
/* -------------------------------------------------------------------------- */

export interface BoldMark {
	type: 'bold';
}

export interface ItalicMark {
	type: 'italic';
}

export interface StrikeMark {
	type: 'strike';
}

export interface UnderlineMark {
	type: 'underline';
}

export interface CodeMark {
	type: 'code';
}

export interface LinkMark {
	type: 'link';
	attrs: {
		href: string;
		target?: string | null;
		rel?: string | null;
	};
}

export interface HighlightMark {
	type: 'highlight';
	attrs?: {
		color?: string | null;
	};
}

/** Version 2. Excludes `superscript`: one run is never both. */
export interface SubscriptMark {
	type: 'subscript';
}

/** Version 2. Excludes `subscript`. */
export interface SuperscriptMark {
	type: 'superscript';
}

/**
 * Version 2. `color` is a token — one of the built-in nine
 * or one a host defines in CSS — never a CSS colour.
 */
export interface TextColorMark {
	type: 'textColor';
	attrs: {
		color: string;
	};
}

/** Version 2. `family` is a token — `serif`, or one a host defines. */
export interface FontFamilyMark {
	type: 'fontFamily';
	attrs: {
		family: string;
	};
}

/** Version 2. `size` is a token — `sm`, `lg`, `xl`, or one a host defines. */
export interface FontSizeMark {
	type: 'fontSize';
	attrs: {
		size: string;
	};
}

export type BlockleafMark =
	| BoldMark
	| ItalicMark
	| StrikeMark
	| UnderlineMark
	| CodeMark
	| LinkMark
	| HighlightMark
	| SubscriptMark
	| SuperscriptMark
	| TextColorMark
	| FontFamilyMark
	| FontSizeMark;

/* -------------------------------------------------------------------------- */
/* Inline Nodes                                                               */
/* -------------------------------------------------------------------------- */

export interface TextNode {
	type: 'text';
	text: string;
	marks?: BlockleafMark[];
}

export interface HardBreakNode {
	type: 'hardBreak';
	marks?: BlockleafMark[];
}

/**
 * A reference to something the host knows about — a person, a page (version
 * 2). `id` is the host's key, `label` the name when it was mentioned,
 * `kind` what sort of thing it is when a host has more than one.
 */
export interface MentionNode {
	type: 'mention';
	attrs: {
		id: string;
		label: string;
		kind?: string | null;
	};
	marks?: BlockleafMark[];
}

export type InlineNode = TextNode | HardBreakNode | MentionNode;

/* -------------------------------------------------------------------------- */
/* Block Nodes                                                                */
/* -------------------------------------------------------------------------- */

/** Version 2. `null` is the language's own direction. */
export type TextAlign = 'left' | 'center' | 'right' | 'justify';

export interface ParagraphNode {
	type: 'paragraph';
	attrs?: {
		id?: string;
		textAlign?: TextAlign | null;
	};
	content?: InlineNode[];
}

export interface HeadingNode {
	type: 'heading';
	attrs: {
		level: 1 | 2 | 3;
		id?: string;
		textAlign?: TextAlign | null;
	};
	content?: InlineNode[];
}

export interface BlockquoteNode {
	type: 'blockquote';
	attrs?: {
		id?: string;
	};
	content?: BlockNode[];
}

export interface CodeBlockNode {
	type: 'codeBlock';
	attrs?: {
		language?: string | null;
		id?: string;
	};
	content?: TextNode[];
}

export interface HorizontalRuleNode {
	type: 'horizontalRule';
	attrs?: {
		id?: string;
	};
}

/**
 * A table of contents (version 2). It stores nothing but its id: the
 * entries are the document's headings, listed whenever it is drawn.
 */
export interface TableOfContentsNode {
	type: 'tableOfContents';
	attrs?: {
		id?: string;
	};
}

export interface BulletListNode {
	type: 'bulletList';
	attrs?: {
		id?: string;
	};
	content?: ListItemNode[];
}

export interface OrderedListNode {
	type: 'orderedList';
	attrs?: {
		start?: number;
		id?: string;
	};
	content?: ListItemNode[];
}

export interface ListItemNode {
	type: 'listItem';
	attrs?: {
		id?: string;
	};
	content?: (
		ParagraphNode | BulletListNode | OrderedListNode | TaskListNode
	)[];
}

export interface TaskListNode {
	type: 'taskList';
	attrs?: {
		id?: string;
	};
	content?: TaskItemNode[];
}

export interface TaskItemNode {
	type: 'taskItem';
	attrs: {
		checked: boolean;
		id?: string;
	};
	content?: (
		ParagraphNode | BulletListNode | OrderedListNode | TaskListNode
	)[];
}

export interface CalloutNode {
	type: 'callout';
	attrs?: {
		emoji?: string;
		tone?: string;
		id?: string;
	};
	content?: BlockNode[];
}

export interface DetailsNode {
	type: 'details';
	attrs?: {
		open?: boolean;
		id?: string;
	};
	content?: BlockNode[];
}

export interface ImageNode {
	type: 'image';
	attrs: {
		id: string;
		src: string;
		alt?: string | null;
		/** Pixels, or `'full'` since version 2. */
		width?: number | 'full' | null;
		align?: 'left' | 'center' | 'right' | null;
	};
}

/**
 * A video (version 2). `src` is `https:` or a relative path, never
 * a `data:` URL; `poster` follows the image rule.
 */
export interface VideoNode {
	type: 'video';
	attrs: {
		id: string;
		src: string;
		poster?: string | null;
		/** Pixels, or `'full'` since version 2. */
		width?: number | 'full' | null;
		align?: 'left' | 'center' | 'right' | null;
	};
}

/** An audio clip (version 2). `title` is the player's name. */
export interface AudioNode {
	type: 'audio';
	attrs: {
		id: string;
		src: string;
		title?: string | null;
	};
}

/**
 * A file to download (version 2): its address, its name, and the
 * size in bytes and MIME type the upload had, when known.
 */
export interface AttachmentNode {
	type: 'attachment';
	attrs: {
		id: string;
		src: string;
		name: string;
		size?: number | null;
		mime?: string | null;
	};
}

export interface TableNode {
	type: 'table';
	attrs?: {
		id?: string;
	};
	content?: TableRowNode[];
}

/**
 * The blocks a `figure` may caption: a table, and since
 * version 2 an image and the media blocks.
 */
export type CaptionedNode =
	TableNode | ImageNode | VideoNode | AudioNode | AttachmentNode;

/**
 * A block with a caption: the block, then its `caption`. The caption
 * sits beside the block rather than inside it, so the block is stored exactly
 * as it would be without one.
 */
export interface FigureNode {
	type: 'figure';
	attrs?: {
		id?: string;
	};
	content?: [CaptionedNode, CaptionNode];
}

/**
 * A figure's caption. Rich text, so a credit can carry its link. Version 2
 * gives it `textAlign`; absent, it follows its block's alignment.
 */
export interface CaptionNode {
	type: 'caption';
	attrs?: {
		textAlign?: TextAlign | null;
	};
	content?: InlineNode[];
}

export interface TableRowNode {
	type: 'tableRow';
	content?: (TableHeaderNode | TableCellNode)[];
}

/**
 * Content allowed inside table cells and headers. Tables cannot be nested.
 */
export type TableCellContentNode =
	| ParagraphNode
	| HeadingNode
	| BlockquoteNode
	| CodeBlockNode
	| HorizontalRuleNode
	| BulletListNode
	| OrderedListNode
	| TaskListNode
	| CalloutNode
	| DetailsNode
	| ImageNode
	| VideoNode
	| AudioNode
	| AttachmentNode
	| TableOfContentsNode;

export interface TableHeaderNode {
	type: 'tableHeader';
	attrs?: {
		colspan?: number;
		rowspan?: number;
		colwidth?: number[] | null;
	};
	content?: TableCellContentNode[];
}

export interface TableCellNode {
	type: 'tableCell';
	attrs?: {
		colspan?: number;
		rowspan?: number;
		colwidth?: number[] | null;
	};
	content?: TableCellContentNode[];
}

export type BlockNode =
	| ParagraphNode
	| HeadingNode
	| BlockquoteNode
	| CodeBlockNode
	| HorizontalRuleNode
	| BulletListNode
	| OrderedListNode
	| ListItemNode
	| TaskListNode
	| TaskItemNode
	| CalloutNode
	| DetailsNode
	| ImageNode
	| VideoNode
	| AudioNode
	| AttachmentNode
	| TableNode
	| FigureNode
	| CaptionNode
	| TableRowNode
	| TableHeaderNode
	| TableCellNode
	| TableOfContentsNode;

/**
 * Discriminated union over the complete Blockleaf node set defined in apps/docs/content/docs/schema.mdx.
 */
export type BlockleafNode = BlockNode | InlineNode;

/**
 * A node of a type this schema does not define: from a newer version, a
 * subpath, or a host's own extension. The validator accepts one anywhere a
 * node may go and does not look inside it; the editor keeps it through a
 * placeholder. Deliberately **not** a member of `BlockNode` or `InlineNode` —
 * a `type: string` member would stop `node.type === 'heading'` narrowing —
 * so code that walks a document needs a default branch for it.
 */
export interface UnrecognisedNode {
	type: string;
	[key: string]: unknown;
}

/** A mark of a type this schema does not define. See `UnrecognisedNode`. */
export interface UnrecognisedMark {
	type: string;
	[key: string]: unknown;
}

export interface BlockleafDocument {
	type: 'doc';
	attrs: { schemaVersion: number };
	content?: BlockNode[];
}

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
	content?: unknown[];
}): BlockleafDocument => ({
	...(doc as object),
	type: 'doc',
	attrs: { ...doc.attrs, schemaVersion: SCHEMA_VERSION },
	content: doc.content as BlockNode[] | undefined
});

type JsonNode = {
	type?: string;
	attrs?: Record<string, unknown>;
	content?: JsonNode[];
};

const ID_BEARING: ReadonlySet<string> = new Set(BLOCK_NODE_TYPES);

const nextBlockId = (): string =>
	globalThis.crypto?.randomUUID?.() ??
	// Only where `crypto` is missing or the page is not a secure context.
	// Weaker than a v4 uuid, and still unique enough to key a block by.
	`bl-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

const addIds = (node: JsonNode): { node: JsonNode; changed: boolean } => {
	const children = node.content?.map(addIds);
	const childChanged = children?.some((child) => child.changed) ?? false;

	const needsId =
		typeof node.type === 'string' &&
		ID_BEARING.has(node.type) &&
		typeof node.attrs?.id !== 'string';

	if (!needsId && !childChanged) return { node, changed: false };

	return {
		node: {
			...node,
			...(needsId ? { attrs: { ...node.attrs, id: nextBlockId() } } : {}),
			...(children
				? { content: children.map((child) => child.node) }
				: {})
		},
		changed: true
	};
};

/**
 * Gives every block an id before the document reaches ProseMirror.
 *
 * `UniqueID` already does this, but it does it inside the editor: one
 * `setNodeMarkup` step per node on a single transaction, and every step is
 * applied to the document the step before it produced. That is quadratic.
 * Measured on a 5,000-block document, it is the difference between opening in
 * 1.3 seconds and opening in 34.
 *
 * One pass over plain JSON is linear, and it leaves the extension nothing to
 * do on load — so it keeps the cheap job it is actually good at, which is the
 * one new block at a time.
 *
 * A document that already has its ids is returned unchanged, not copied: the
 * common case is one this editor saved earlier, and it should cost nothing.
 */
export const withBlockIds = (doc: BlockleafDocument): BlockleafDocument => {
	const result = addIds(doc as JsonNode);
	return result.changed ? (result.node as BlockleafDocument) : doc;
};
