import { Fragment, type ReactElement, type ReactNode } from 'react';

import { resolveRendererLabels, type RendererLabels } from '../labels.js';
import { defaultMarks, unhandledMark } from './marks.js';
import { defaultNodes, tableRenderer, unhandledNode } from './nodes.js';
import { type MarkRenderer, type NodeRenderer } from './types.js';
import { type RenderableDocument } from '../types.js';
import { createRenderer } from '../walk.js';

const base = {
	unknownNode: unhandledNode,
	unknownMark: unhandledMark,
	combine: (parts: ReactNode[]) => parts,
	// The document has no concept of a list key, so one is derived from each
	// node's path and attached here rather than asked of every component.
	identify: (output: ReactNode, key: string) => (
		<Fragment key={key}>{output}</Fragment>
	)
};

const renderDefault = createRenderer<ReactNode>({
	...base,
	nodes: defaultNodes,
	marks: defaultMarks
});

export interface RenderDocumentProps {
	/**
	 * The stored document. `BlockleafDocument` from `@blockleaf/editor`
	 * satisfies this structurally — no import and no conversion needed.
	 */
	doc: RenderableDocument;
	/**
	 * Strings the output carries. Only the scrollable table's name so far;
	 * anything left out keeps its English default.
	 */
	labels?: Partial<RendererLabels>;
	/**
	 * Replaces the component used for a node type, by name. Anything not named
	 * keeps its default, so an override is a patch rather than a whole
	 * mapping.
	 */
	components?: Readonly<Record<string, NodeRenderer>>;
	/** The same, for marks. */
	marks?: Readonly<Record<string, MarkRenderer>>;
}

/**
 * Renders a stored document to React elements.
 *
 * Safe in a server component: it loads neither ProseMirror nor the editor, and
 * ships no client JavaScript of its own.
 */
export const RenderDocument = ({
	doc,
	components,
	marks,
	labels
}: RenderDocumentProps): ReactElement => {
	// Overrides are merged per render rather than memoised, because this
	// component has to work in a server component, where hooks do not exist.
	// Merging two objects is cheap next to walking a document; hoisting the
	// override map to module scope makes it cheaper still.
	const base_nodes = labels
		? {
				...defaultNodes,
				table: tableRenderer(resolveRendererLabels(labels))
			}
		: defaultNodes;

	const render =
		components || marks || labels
			? createRenderer<ReactNode>({
					...base,
					nodes: components
						? { ...base_nodes, ...components }
						: base_nodes,
					marks: marks ? { ...defaultMarks, ...marks } : defaultMarks
				})
			: renderDefault;

	return <>{render(doc)}</>;
};
