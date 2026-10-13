import {
	defaultHtmlMarks,
	unhandledHtmlMark,
	type HtmlMarkRenderer
} from './marks.js';
import {
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
	if (!options?.components && !options?.marks) return renderDefault(doc);

	return createRenderer<string>({
		...base,
		nodes: options.components
			? { ...defaultHtmlNodes, ...options.components }
			: defaultHtmlNodes,
		marks: options.marks
			? { ...defaultHtmlMarks, ...options.marks }
			: defaultHtmlMarks
	})(doc);
};
