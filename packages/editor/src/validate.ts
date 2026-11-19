import { z } from 'zod';

import type {
	BlockleafDocument,
	BlockleafMark,
	BlockleafNode,
	BlockNode,
	BlockquoteNode,
	BoldMark,
	BulletListNode,
	CalloutNode,
	CodeBlockNode,
	CodeMark,
	DetailsNode,
	HardBreakNode,
	HeadingNode,
	HighlightMark,
	HorizontalRuleNode,
	ImageNode,
	InlineNode,
	ItalicMark,
	LinkMark,
	ListItemNode,
	OrderedListNode,
	ParagraphNode,
	StrikeMark,
	TableCellContentNode,
	TableCellNode,
	TableHeaderNode,
	TableNode,
	TableRowNode,
	TaskItemNode,
	TaskListNode,
	TextNode,
	UnderlineMark,
	UnrecognisedMark,
	UnrecognisedNode
} from './core/schema.js';

/* -------------------------------------------------------------------------- */
/* Unrecognised types (FC-04)                                                 */
/* -------------------------------------------------------------------------- */

/** Every node type this schema defines. A type outside it is unrecognised. */
const NODE_TYPES: ReadonlySet<string> = new Set([
	'paragraph',
	'heading',
	'blockquote',
	'codeBlock',
	'horizontalRule',
	'bulletList',
	'orderedList',
	'listItem',
	'taskList',
	'taskItem',
	'callout',
	'details',
	'image',
	'table',
	'tableRow',
	'tableHeader',
	'tableCell',
	'text',
	'hardBreak'
]);

const MARK_TYPES: ReadonlySet<string> = new Set([
	'bold',
	'italic',
	'strike',
	'underline',
	'code',
	'link',
	'highlight'
]);

/**
 * A type the schema does not define, with whatever else it carries, left
 * unread. A *known* type never matches here: a heading with `level: 4` is a
 * broken heading, not an unknown node, and is still refused.
 */
const unrecognised = (known: ReadonlySet<string>) =>
	z
		.object({
			type: z.string().refine((type) => !known.has(type), {
				message: 'A known type that does not match its schema'
			})
		})
		.passthrough();

export const unrecognisedNodeSchema: z.ZodType<UnrecognisedNode> =
	unrecognised(NODE_TYPES);

export const unrecognisedMarkSchema: z.ZodType<UnrecognisedMark> =
	unrecognised(MARK_TYPES);

/**
 * `schema`, or a node of a type the schema does not define.
 *
 * The cast keeps the output typed as the known union. `UnrecognisedNode`
 * cannot join `BlockNode` without breaking narrowing on `type` (see its doc
 * comment), so the types describe the known shapes and the contract in
 * `schema.mdx` says a walker needs a default branch.
 */
const orUnrecognisedNode = <T>(schema: z.ZodType<T>): z.ZodType<T> =>
	z.union([schema, unrecognisedNodeSchema]) as unknown as z.ZodType<T>;

const orUnrecognisedMark = <T>(schema: z.ZodType<T>): z.ZodType<T> =>
	z.union([schema, unrecognisedMarkSchema]) as unknown as z.ZodType<T>;

/* -------------------------------------------------------------------------- */
/* Marks                                                                      */
/* -------------------------------------------------------------------------- */

export const boldMarkSchema: z.ZodType<BoldMark> = z.object({
	type: z.literal('bold')
});

export const italicMarkSchema: z.ZodType<ItalicMark> = z.object({
	type: z.literal('italic')
});

export const strikeMarkSchema: z.ZodType<StrikeMark> = z.object({
	type: z.literal('strike')
});

export const underlineMarkSchema: z.ZodType<UnderlineMark> = z.object({
	type: z.literal('underline')
});

export const codeMarkSchema: z.ZodType<CodeMark> = z.object({
	type: z.literal('code')
});

export const linkMarkSchema: z.ZodType<LinkMark> = z.object({
	type: z.literal('link'),
	attrs: z.object({
		href: z.string(),
		target: z.string().nullable().optional(),
		rel: z.string().nullable().optional()
	})
});

export const highlightMarkSchema: z.ZodType<HighlightMark> = z.object({
	type: z.literal('highlight'),
	attrs: z
		.object({
			color: z.string().nullable().optional()
		})
		.optional()
});

export const blockleafMarkSchema: z.ZodType<BlockleafMark> = orUnrecognisedMark(
	z.union([
		boldMarkSchema,
		italicMarkSchema,
		strikeMarkSchema,
		underlineMarkSchema,
		codeMarkSchema,
		linkMarkSchema,
		highlightMarkSchema
	])
);

/* -------------------------------------------------------------------------- */
/* Inline Nodes                                                               */
/* -------------------------------------------------------------------------- */

export const textNodeSchema: z.ZodType<TextNode> = z.object({
	type: z.literal('text'),
	text: z.string(),
	marks: z.array(blockleafMarkSchema).optional()
});

export const hardBreakNodeSchema: z.ZodType<HardBreakNode> = z.object({
	type: z.literal('hardBreak'),
	marks: z.array(blockleafMarkSchema).optional()
});

export const inlineNodeSchema: z.ZodType<InlineNode> = orUnrecognisedNode(
	z.union([textNodeSchema, hardBreakNodeSchema])
);

/* -------------------------------------------------------------------------- */
/* Block Nodes                                                                */
/* -------------------------------------------------------------------------- */

export const paragraphNodeSchema: z.ZodType<ParagraphNode> = z.object({
	type: z.literal('paragraph'),
	attrs: z
		.object({
			id: z.string().optional()
		})
		.optional(),
	content: z.array(inlineNodeSchema).optional()
});

export const headingNodeSchema: z.ZodType<HeadingNode> = z.object({
	type: z.literal('heading'),
	attrs: z.object({
		level: z.union([z.literal(1), z.literal(2), z.literal(3)]),
		id: z.string().optional()
	}),
	content: z.array(inlineNodeSchema).optional()
});

export const horizontalRuleNodeSchema: z.ZodType<HorizontalRuleNode> = z.object(
	{
		type: z.literal('horizontalRule'),
		attrs: z
			.object({
				id: z.string().optional()
			})
			.optional()
	}
);

export const codeBlockNodeSchema: z.ZodType<CodeBlockNode> = z.object({
	type: z.literal('codeBlock'),
	attrs: z
		.object({
			language: z.string().nullable().optional(),
			id: z.string().optional()
		})
		.optional(),
	content: z.array(textNodeSchema).optional()
});

export const imageNodeSchema: z.ZodType<ImageNode> = z.object({
	type: z.literal('image'),
	attrs: z.object({
		id: z.string(),
		src: z.string(),
		alt: z.string().nullable().optional(),
		width: z.number().nullable().optional(),
		align: z.enum(['left', 'center', 'right']).nullable().optional()
	})
});

export const listItemNodeSchema: z.ZodType<ListItemNode> = z.object({
	type: z.literal('listItem'),
	attrs: z
		.object({
			id: z.string().optional()
		})
		.optional(),
	content: z
		.array(
			z.lazy(
				(): z.ZodType<
					| ParagraphNode
					| BulletListNode
					| OrderedListNode
					| TaskListNode
				> =>
					orUnrecognisedNode(
						z.union([
							paragraphNodeSchema,
							bulletListNodeSchema,
							orderedListNodeSchema,
							taskListNodeSchema
						])
					)
			)
		)
		.optional()
});

export const bulletListNodeSchema: z.ZodType<BulletListNode> = z.object({
	type: z.literal('bulletList'),
	attrs: z
		.object({
			id: z.string().optional()
		})
		.optional(),
	content: z
		.array(
			z.lazy((): z.ZodType<ListItemNode> =>
				orUnrecognisedNode(listItemNodeSchema)
			)
		)
		.optional()
});

export const orderedListNodeSchema: z.ZodType<OrderedListNode> = z.object({
	type: z.literal('orderedList'),
	attrs: z
		.object({
			start: z.number().optional(),
			id: z.string().optional()
		})
		.optional(),
	content: z
		.array(
			z.lazy((): z.ZodType<ListItemNode> =>
				orUnrecognisedNode(listItemNodeSchema)
			)
		)
		.optional()
});

export const taskItemNodeSchema: z.ZodType<TaskItemNode> = z.object({
	type: z.literal('taskItem'),
	attrs: z.object({
		checked: z.boolean(),
		id: z.string().optional()
	}),
	content: z
		.array(
			z.lazy(
				(): z.ZodType<
					| ParagraphNode
					| BulletListNode
					| OrderedListNode
					| TaskListNode
				> =>
					orUnrecognisedNode(
						z.union([
							paragraphNodeSchema,
							bulletListNodeSchema,
							orderedListNodeSchema,
							taskListNodeSchema
						])
					)
			)
		)
		.optional()
});

export const taskListNodeSchema: z.ZodType<TaskListNode> = z.object({
	type: z.literal('taskList'),
	attrs: z
		.object({
			id: z.string().optional()
		})
		.optional(),
	content: z
		.array(
			z.lazy((): z.ZodType<TaskItemNode> =>
				orUnrecognisedNode(taskItemNodeSchema)
			)
		)
		.optional()
});

export const blockquoteNodeSchema: z.ZodType<BlockquoteNode> = z.object({
	type: z.literal('blockquote'),
	attrs: z
		.object({
			id: z.string().optional()
		})
		.optional(),
	content: z
		.array(z.lazy((): z.ZodType<BlockNode> => blockNodeSchema))
		.optional()
});

export const calloutNodeSchema: z.ZodType<CalloutNode> = z.object({
	type: z.literal('callout'),
	attrs: z
		.object({
			emoji: z.string().optional(),
			tone: z.string().optional(),
			id: z.string().optional()
		})
		.optional(),
	content: z
		.array(z.lazy((): z.ZodType<BlockNode> => blockNodeSchema))
		.optional()
});

export const detailsNodeSchema: z.ZodType<DetailsNode> = z.object({
	type: z.literal('details'),
	attrs: z
		.object({
			open: z.boolean().optional(),
			id: z.string().optional()
		})
		.optional(),
	content: z
		.array(z.lazy((): z.ZodType<BlockNode> => blockNodeSchema))
		.optional()
});

/* -------------------------------------------------------------------------- */
/* Table Nodes (Tables cannot be nested)                                      */
/* -------------------------------------------------------------------------- */

export const tableCellContentNodeSchema: z.ZodType<TableCellContentNode> =
	z.lazy((): z.ZodType<TableCellContentNode> =>
		orUnrecognisedNode(
			z.union([
				paragraphNodeSchema,
				headingNodeSchema,
				blockquoteNodeSchema,
				codeBlockNodeSchema,
				horizontalRuleNodeSchema,
				bulletListNodeSchema,
				orderedListNodeSchema,
				taskListNodeSchema,
				calloutNodeSchema,
				detailsNodeSchema,
				imageNodeSchema
			])
		)
	);

export const tableHeaderNodeSchema: z.ZodType<TableHeaderNode> = z.object({
	type: z.literal('tableHeader'),
	attrs: z
		.object({
			colspan: z.number().optional(),
			rowspan: z.number().optional(),
			colwidth: z.array(z.number()).nullable().optional()
		})
		.optional(),
	content: z.array(tableCellContentNodeSchema).optional()
});

export const tableCellNodeSchema: z.ZodType<TableCellNode> = z.object({
	type: z.literal('tableCell'),
	attrs: z
		.object({
			colspan: z.number().optional(),
			rowspan: z.number().optional(),
			colwidth: z.array(z.number()).nullable().optional()
		})
		.optional(),
	content: z.array(tableCellContentNodeSchema).optional()
});

export const tableRowNodeSchema: z.ZodType<TableRowNode> = z.object({
	type: z.literal('tableRow'),
	content: z
		.array(
			orUnrecognisedNode(
				z.union([tableHeaderNodeSchema, tableCellNodeSchema])
			)
		)
		.optional()
});

export const tableNodeSchema: z.ZodType<TableNode> = z.object({
	type: z.literal('table'),
	attrs: z
		.object({
			id: z.string().optional()
		})
		.optional(),
	content: z.array(orUnrecognisedNode(tableRowNodeSchema)).optional()
});

/* -------------------------------------------------------------------------- */
/* BlockNode & BlockleafNode Unions                                           */
/* -------------------------------------------------------------------------- */

export const blockNodeSchema: z.ZodType<BlockNode> = z.lazy(
	(): z.ZodType<BlockNode> =>
		orUnrecognisedNode(
			z.union([
				paragraphNodeSchema,
				headingNodeSchema,
				blockquoteNodeSchema,
				codeBlockNodeSchema,
				horizontalRuleNodeSchema,
				bulletListNodeSchema,
				orderedListNodeSchema,
				listItemNodeSchema,
				taskListNodeSchema,
				taskItemNodeSchema,
				calloutNodeSchema,
				detailsNodeSchema,
				imageNodeSchema,
				tableNodeSchema,
				tableRowNodeSchema,
				tableHeaderNodeSchema,
				tableCellNodeSchema
			])
		)
);

export const blockleafNodeSchema: z.ZodType<BlockleafNode> = z.lazy(
	(): z.ZodType<BlockleafNode> =>
		orUnrecognisedNode(
			z.union([
				paragraphNodeSchema,
				headingNodeSchema,
				blockquoteNodeSchema,
				codeBlockNodeSchema,
				horizontalRuleNodeSchema,
				bulletListNodeSchema,
				orderedListNodeSchema,
				listItemNodeSchema,
				taskListNodeSchema,
				taskItemNodeSchema,
				calloutNodeSchema,
				detailsNodeSchema,
				imageNodeSchema,
				tableNodeSchema,
				tableRowNodeSchema,
				tableHeaderNodeSchema,
				tableCellNodeSchema,
				textNodeSchema,
				hardBreakNodeSchema
			])
		)
);

/* -------------------------------------------------------------------------- */
/* Document Envelope Schema                                                   */
/* -------------------------------------------------------------------------- */

export const blockleafDocumentSchema: z.ZodType<BlockleafDocument> = z.object({
	type: z.literal('doc'),
	attrs: z.object({
		schemaVersion: z.number().int().positive()
	}),
	content: z.array(blockNodeSchema).optional()
});

/**
 * Validates a document against the full Blockleaf schema contract.
 * Throws a ZodError if validation fails.
 *
 * A node or mark of a type the schema does not define passes, unread, as
 * long as it has a string `type`: it is a newer version's or another
 * extension's, and refusing it would refuse the whole document. Every known
 * type is still checked in full.
 */
export const validateDocument = (doc: unknown): BlockleafDocument => {
	return blockleafDocumentSchema.parse(doc);
};

/**
 * Safely validates a document against the Blockleaf schema contract.
 * Returns { success: true, data } or { success: false, error }.
 */
export const safeValidateDocument = (
	doc: unknown
): z.SafeParseReturnType<unknown, BlockleafDocument> => {
	return blockleafDocumentSchema.safeParse(doc);
};
