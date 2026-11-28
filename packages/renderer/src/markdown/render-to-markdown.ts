import { renderInline } from './inline.js';
import {
	defaultMarkdownMarks,
	unhandledMarkdownMark,
	type MarkdownMarkRenderer
} from './marks.js';
import {
	createMarkdownNodes,
	defaultMarkdownNodes,
	joinBlocks,
	unhandledMarkdownNode,
	type MarkdownNodeContext,
	type MarkdownNodeRenderer
} from './nodes.js';
import { resolveRendererLabels, type RendererLabels } from '../labels.js';
import { type RenderableDocument, type RenderableNode } from '../types.js';

export interface RenderToMarkdownOptions {
	/** Replaces the renderer used for a node type, by name. */
	components?: Readonly<Record<string, MarkdownNodeRenderer>>;
	/** The same, for marks. */
	marks?: Readonly<Record<string, MarkdownMarkRenderer>>;
	/**
	 * Strings the output carries: the link text for a video, an audio clip
	 * with no title, and an embed. Anything left out keeps its English
	 * default.
	 */
	labels?: Partial<RendererLabels>;
	/**
	 * Renders a node of a type neither the defaults nor `components` name.
	 * By default such a node renders nothing.
	 */
	unknown?: MarkdownNodeRenderer;
}

/*
 * Its own walk rather than the shared one in `walk.ts`, which renders every
 * node's children before the node itself. Here most blocks never use
 * them: a paragraph writes its text through `inline`, which has to see all
 * of it at once to place the marks.
 */
const createMarkdownRenderer = (
	nodes: Record<string, MarkdownNodeRenderer>,
	marks: Record<string, MarkdownMarkRenderer>,
	unknown: MarkdownNodeRenderer
) => {
	const renderNode = (
		node: RenderableNode,
		parent: RenderableNode | undefined,
		root: RenderableNode
	): string => {
		const render = nodes[node.type ?? ''] ?? unknown;
		const context: MarkdownNodeContext = {
			node,
			parent,
			root,
			get children() {
				return joinBlocks(
					(node.content ?? []).map((child) =>
						renderNode(child, node, root)
					)
				);
			},
			renderNode: (child, childParent) =>
				renderNode(child, childParent, root),
			combine: joinBlocks,
			inline: (block, breaks) =>
				renderInline(
					block,
					{
						leaf: (child, childParent) =>
							renderNode(child, childParent, root),
						marks,
						unknownMark: unhandledMarkdownMark
					},
					breaks
				)
		};
		return render(context);
	};

	return (doc: RenderableDocument): string => {
		const output = renderNode(doc, undefined, doc);
		return output ? `${output}\n` : '';
	};
};

const renderDefault = createMarkdownRenderer(
	defaultMarkdownNodes,
	defaultMarkdownMarks,
	unhandledMarkdownNode
);

/**
 * Renders a stored document to Markdown, the GitHub kind: tables, task
 * lists and `~~strike~~` included.
 *
 * Markdown says less than a document can. Text colour, underline, alignment
 * and the like are dropped, keeping the text; a video, a file or an embed
 * becomes a link to it. The output ends with one new line, or is empty for
 * an empty document.
 */
export const renderToMarkdown = (
	doc: RenderableDocument,
	options?: RenderToMarkdownOptions
): string => {
	if (
		!options?.components &&
		!options?.marks &&
		!options?.labels &&
		!options?.unknown
	) {
		return renderDefault(doc);
	}

	const nodes = options.labels
		? createMarkdownNodes(resolveRendererLabels(options.labels))
		: defaultMarkdownNodes;

	return createMarkdownRenderer(
		options.components ? { ...nodes, ...options.components } : nodes,
		options.marks
			? { ...defaultMarkdownMarks, ...options.marks }
			: defaultMarkdownMarks,
		options.unknown ?? unhandledMarkdownNode
	)(doc);
};
