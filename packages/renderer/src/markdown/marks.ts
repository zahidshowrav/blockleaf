import { codeSpan, linkDestination } from './escape.js';
import { linkAttributes } from '../attrs.js';
import { type MarkRender } from '../walk.js';

/**
 * A mark for the Markdown target. `children` is the marked text, already
 * Markdown, with the spaces at either end moved outside the mark, since
 * `**bold **` is not bold in Markdown. A `code` mark is the exception: its
 * `children` is the raw text, unescaped.
 */
export type MarkdownMarkRenderer = MarkRender<string>;

/**
 * The marks Markdown can say. The rest — underline, colours, fonts, a
 * highlight, subscript and superscript — have no Markdown of their own, so
 * their text is kept without them.
 */
export const defaultMarkdownMarks: Record<string, MarkdownMarkRenderer> = {
	bold: ({ children }) => `**${children}**`,
	italic: ({ children }) => `*${children}*`,
	strike: ({ children }) => `~~${children}~~`,
	code: ({ children }) => codeSpan(children),

	// An href that does not survive sanitisation drops the link and keeps
	// the text, as the other targets do.
	link: ({ mark, children }) => {
		const attrs = linkAttributes(mark);
		return attrs
			? `[${children}](${linkDestination(attrs.href)})`
			: children;
	}
};

export const unhandledMarkdownMark: MarkdownMarkRenderer = ({ children }) =>
	children;
