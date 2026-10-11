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
	UnderlineMark
} from './core/schema.js';

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

export const blockleafMarkSchema: z.ZodType<BlockleafMark> = z.union([
	boldMarkSchema,
	italicMarkSchema,
	strikeMarkSchema,
	underlineMarkSchema,
	codeMarkSchema,
	linkMarkSchema,
	highlightMarkSchema
]);

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

export const inlineNodeSchema: z.ZodType<InlineNode> = z.union([
	textNodeSchema,
	hardBreakNodeSchema
]);

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
					z.union([
						paragraphNodeSchema,
						bulletListNodeSchema,
						orderedListNodeSchema,
						taskListNodeSchema
					])
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
		.array(z.lazy((): z.ZodType<ListItemNode> => listItemNodeSchema))
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
		.array(z.lazy((): z.ZodType<ListItemNode> => listItemNodeSchema))
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
					z.union([
						paragraphNodeSchema,
						bulletListNodeSchema,
						orderedListNodeSchema,
						taskListNodeSchema
					])
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
		.array(z.lazy((): z.ZodType<TaskItemNode> => taskItemNodeSchema))
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
		.array(z.union([tableHeaderNodeSchema, tableCellNodeSchema]))
		.optional()
});

export const tableNodeSchema: z.ZodType<TableNode> = z.object({
	type: z.literal('table'),
	attrs: z
		.object({
			id: z.string().optional()
		})
		.optional(),
	content: z.array(tableRowNodeSchema).optional()
});

/* -------------------------------------------------------------------------- */
/* BlockNode & BlockleafNode Unions                                           */
/* -------------------------------------------------------------------------- */

export const blockNodeSchema: z.ZodType<BlockNode> = z.lazy(
	(): z.ZodType<BlockNode> =>
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
);

export const blockleafNodeSchema: z.ZodType<BlockleafNode> = z.lazy(
	(): z.ZodType<BlockleafNode> =>
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
