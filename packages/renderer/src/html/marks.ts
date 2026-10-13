import { element } from './escape.js';
import { highlightColor, linkAttributes } from '../attrs.js';
import { type MarkRender } from '../walk.js';

export type HtmlMarkRenderer = MarkRender<string>;

const defaults: Record<string, HtmlMarkRenderer> = {
	bold: ({ children }) => element('strong', {}, children),
	italic: ({ children }) => element('em', {}, children),
	strike: ({ children }) => element('s', {}, children),
	underline: ({ children }) => element('u', {}, children),
	code: ({ children }) => element('code', {}, children),

	highlight: ({ mark, children }) => {
		const color = highlightColor(mark);
		return element(
			'mark',
			{
				'data-color': color,
				style: color
					? `background-color: ${color}; color: inherit`
					: undefined
			},
			children
		);
	},

	// An href that does not survive sanitisation drops the anchor and keeps
	// the text.
	link: ({ mark, children }) => {
		const attrs = linkAttributes(mark);
		if (!attrs) return children;

		return element(
			'a',
			{ href: attrs.href, target: attrs.target, rel: attrs.rel },
			children
		);
	}
};

export const defaultHtmlMarks = defaults;

/** An unknown mark renders its text without decoration. */
export const unhandledHtmlMark: HtmlMarkRenderer = ({ children }) => children;
