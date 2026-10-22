import { resolveRendererLabels, type RendererLabels } from '../labels.js';
import {
	defaultHtmlMarks,
	unhandledHtmlMark,
	type HtmlMarkRenderer
} from './marks.js';
import {
	createHtmlNodes,
	defaultHtmlNodes,
	unhandledHtmlNode,
	type HtmlNodeRenderer
} from './nodes.js';
import { type RenderableDocument } from '../types.js';
import { createRenderer } from '../walk.js';

const base = {
	unknownNode: unhandledHtmlNode,
	unknownMark: unhandledHtmlMark,
	combine: (parts: string[]) => parts.join('')
};

const renderDefault = createRenderer<string>({
	...base,
	nodes: defaultHtmlNodes,
	marks: defaultHtmlMarks
});

export interface RenderToHTMLOptions {
	/** Replaces the renderer used for a node type, by name. */
	components?: Readonly<Record<string, HtmlNodeRenderer>>;
	/** The same, for marks. */
	marks?: Readonly<Record<string, HtmlMarkRenderer>>;
	/**
	 * Strings the output carries. Only the scrollable table's name so far;
	 * anything left out keeps its English default.
	 */
	labels?: Partial<RendererLabels>;
}

/**
 * Renders a stored document to an HTML string.
 *
 * For the places React cannot go: an email body, an RSS item, an OG image, a
 * cached fragment. The output is the same markup the React target produces and
 * the editor writes, so the same stylesheet fits it.
 */
export const renderToHTML = (
	doc: RenderableDocument,
	options?: RenderToHTMLOptions
): string => {
	if (!options?.components && !options?.marks && !options?.labels) {
		return renderDefault(doc);
	}

	const nodes = options.labels
		? createHtmlNodes(resolveRendererLabels(options.labels))
		: defaultHtmlNodes;

	return createRenderer<string>({
		...base,
		nodes: options.components ? { ...nodes, ...options.components } : nodes,
		marks: options.marks
			? { ...defaultHtmlMarks, ...options.marks }
			: defaultHtmlMarks
	})(doc);
};
