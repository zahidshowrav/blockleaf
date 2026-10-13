import { type MarkRenderer } from './types.js';
import { highlightColor, linkAttributes } from '../attrs.js';

/**
 * The default mark components. Same rule as the nodes: match what the editor
 * writes, and say so where they deliberately do not.
 */

const Bold: MarkRenderer = ({ children }) => <strong>{children}</strong>;

const Italic: MarkRenderer = ({ children }) => <em>{children}</em>;

const Strike: MarkRenderer = ({ children }) => <s>{children}</s>;

const Underline: MarkRenderer = ({ children }) => <u>{children}</u>;

const Code: MarkRenderer = ({ children }) => <code>{children}</code>;

const Highlight: MarkRenderer = ({ mark, children }) => {
	const color = highlightColor(mark);
	return (
		<mark
			data-color={color}
			style={
				color ? { backgroundColor: color, color: 'inherit' } : undefined
			}
		>
			{children}
		</mark>
	);
};

/**
 * An href that does not survive sanitisation drops the anchor and keeps the
 * text. The words were written by a human and are worth preserving; the
 * destination was not necessarily, and is not.
 */
const Link: MarkRenderer = ({ mark, children }) => {
	const attrs = linkAttributes(mark);
	if (!attrs) return <>{children}</>;

	return (
		<a
			href={attrs.href}
			target={attrs.target}
			rel={attrs.rel}
		>
			{children}
		</a>
	);
};

/** An unknown mark renders its text without decoration rather than throwing. */
export const unhandledMark: MarkRenderer = ({ children }) => <>{children}</>;

export const defaultMarks: Record<string, MarkRenderer> = {
	bold: Bold,
	italic: Italic,
	strike: Strike,
	underline: Underline,
	code: Code,
	highlight: Highlight,
	link: Link
};
