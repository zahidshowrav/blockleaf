import { type RenderableMark, type RenderableNode } from './types.js';

/**
 * The document walker, shared by every render target.
 *
 * It is written here rather than taken from `@tiptap/static-renderer` because
 * that package nests marks in the opposite order to the editor: it folds a
 * node's `marks` array so the first mark ends up innermost, while the editor's
 * own `getHTML` puts it outermost. `[bold, italic]` renders as
 * `<em><strong>` there and `<strong><em>` here. The two look identical until a
 * stylesheet says `a > code`, and both packages are meant to share one
 * stylesheet. See F15.
 *
 * Nothing in this file knows what it is rendering to. The React and
 * HTML-string targets supply the pieces.
 */

export interface NodeContext<TOut> {
	node: RenderableNode;
	parent: RenderableNode | undefined;
	/** The node's already-rendered content. */
	children: TOut;
	/**
	 * Renders one node by hand. A renderer needs this when it has to group
	 * children into wrappers the document does not contain — a table splitting
	 * its rows into `<thead>` and `<tbody>`.
	 */
	renderNode: (node: RenderableNode, parent: RenderableNode) => TOut;
	/** Joins rendered pieces the way this target joins them. */
	combine: (parts: TOut[]) => TOut;
}

export interface MarkContext<TOut> {
	mark: RenderableMark;
	node: RenderableNode;
	parent: RenderableNode | undefined;
	children: TOut;
}

export type NodeRender<TOut> = (context: NodeContext<TOut>) => TOut;
export type MarkRender<TOut> = (context: MarkContext<TOut>) => TOut;

export interface RenderTarget<TOut> {
	nodes: Record<string, NodeRender<TOut>>;
	marks: Record<string, MarkRender<TOut>>;
	/** Used for a node type this target does not know. Never throws. */
	unknownNode: NodeRender<TOut>;
	/** Used for a mark type this target does not know. Never throws. */
	unknownMark: MarkRender<TOut>;
	combine: (parts: TOut[]) => TOut;
	/**
	 * Lets a target attach something to every rendered node — React uses it
	 * for list keys, which the document has no concept of.
	 */
	identify?: (output: TOut, key: string) => TOut;
}

export const createRenderer = <TOut>(target: RenderTarget<TOut>) => {
	const renderNode = (
		node: RenderableNode,
		parent: RenderableNode | undefined,
		key: string
	): TOut => {
		const type = node.type ?? '';
		const render = target.nodes[type] ?? target.unknownNode;

		const children = target.combine(
			(node.content ?? []).map((child, index) =>
				renderNode(child, node, `${key}.${index}`)
			)
		);

		const rendered = render({
			node,
			parent,
			children,
			combine: target.combine,
			renderNode: (child, childParent) =>
				renderNode(
					child,
					childParent,
					`${key}.${childIndex(node, child)}`
				)
		});

		// Marks wrap outwards from the first: `[bold, italic]` is
		// `<strong><em>`, matching the editor.
		const marks = node.marks;
		const marked = marks?.length
			? marks.reduceRight<TOut>((children_, mark) => {
					const renderMark =
						target.marks[mark.type] ?? target.unknownMark;
					return renderMark({
						mark,
						node,
						parent,
						children: children_
					});
				}, rendered)
			: rendered;

		return target.identify ? target.identify(marked, key) : marked;
	};

	return (document_: RenderableNode): TOut =>
		renderNode(document_, undefined, '0');
};

/**
 * Keys have to stay stable when a renderer reorders its children, so a node
 * rendered by hand keeps the key its position in the document gives it.
 */
const childIndex = (parent: RenderableNode, child: RenderableNode): number => {
	const index = parent.content?.indexOf(child) ?? -1;
	return index === -1 ? 0 : index;
};
