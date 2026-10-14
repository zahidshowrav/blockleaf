/**
 * The stored document shape. This is the product's real API — it lives in other
 * people's databases, so it is versioned from the first release and every bump
 * ships a migration. See apps/docs/content/docs/schema.mdx.
 */
export const SCHEMA_VERSION = 1;

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

export type BlockleafMark =
	| BoldMark
	| ItalicMark
	| StrikeMark
	| UnderlineMark
	| CodeMark
	| LinkMark
	| HighlightMark;

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

export type InlineNode = TextNode | HardBreakNode;

/* -------------------------------------------------------------------------- */
/* Block Nodes                                                                */
/* -------------------------------------------------------------------------- */

export interface ParagraphNode {
	type: 'paragraph';
	attrs?: {
		id?: string;
	};
	content?: InlineNode[];
}

export interface HeadingNode {
	type: 'heading';
	attrs: {
		level: 1 | 2 | 3;
		id?: string;
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
		width?: number | null;
		align?: 'left' | 'center' | 'right' | null;
	};
}

export interface TableNode {
	type: 'table';
	attrs?: {
		id?: string;
	};
	content?: TableRowNode[];
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
	| ImageNode;

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
	| TableNode
	| TableRowNode
	| TableHeaderNode
	| TableCellNode;

/**
 * Discriminated union over the complete Blockleaf node set defined in apps/docs/content/docs/schema.mdx.
 */
export type BlockleafNode = BlockNode | InlineNode;

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
