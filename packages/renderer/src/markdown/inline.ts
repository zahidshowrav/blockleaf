import { escapeLineStart } from './escape.js';
import { type MarkdownMarkRenderer } from './marks.js';
import { type RenderableMark, type RenderableNode } from '../types.js';

/**
 * A block's inline content as Markdown.
 *
 * The editor stores marks on each piece of text, so `**a *b***` is two
 * pieces: `a` (bold) and `b` (bold, italic). Wrapping each piece on its own
 * would write `**a****b***`, which Markdown reads differently. So the pieces
 * that share a mark are grouped and the mark is written once around the
 * group, outermost first.
 */

/** What a line break inside a block becomes. */
export type LineBreak =
	/** A backslash at the end of the line, which Markdown reads as a break. */
	| 'markdown'
	/** A space, for a heading, which must stay on one line. */
	| 'space'
	/** `<br>`, for a table cell, which must stay on one line too. */
	| 'html';

const BREAKS: Record<LineBreak, string> = {
	markdown: '\\\n',
	space: ' ',
	html: '<br>'
};

interface Piece {
	node: RenderableNode;
	/** The node's marks, outermost first. */
	marks: RenderableMark[];
}

const sameMark = (a: RenderableMark | undefined, b: RenderableMark): boolean =>
	a !== undefined &&
	a.type === b.type &&
	JSON.stringify(a.attrs ?? {}) === JSON.stringify(b.attrs ?? {});

const hasMark = (node: RenderableNode | undefined, mark: RenderableMark) =>
	(node?.marks ?? []).some((each) => sameMark(each, mark));

/**
 * Orders each piece's marks so a mark that spans more pieces is outside one
 * that spans fewer. The mark that starts first is outermost; of two that
 * start together, the one that ends last. Code is always innermost, because
 * nothing can be marked inside a code span.
 */
const orderMarks = (content: RenderableNode[]): Piece[] =>
	content.map((node, at) => {
		const span = (mark: RenderableMark): [number, number] => {
			let start = at;
			let end = at;
			while (start > 0 && hasMark(content[start - 1], mark)) start -= 1;
			while (end < content.length - 1 && hasMark(content[end + 1], mark))
				end += 1;
			return [start, end];
		};
		const keyed = (node.marks ?? []).map((mark, index) => ({
			mark,
			index,
			span: span(mark)
		}));
		keyed.sort(
			(a, b) =>
				Number(a.mark.type === 'code') -
					Number(b.mark.type === 'code') ||
				a.span[0] - b.span[0] ||
				b.span[1] - a.span[1] ||
				a.index - b.index
		);
		return { node, marks: keyed.map((each) => each.mark) };
	});

export interface InlineRenderers {
	/** Renders one inline node that is not a line break: text, a mention, a formula. */
	leaf: (node: RenderableNode, parent: RenderableNode) => string;
	marks: Record<string, MarkdownMarkRenderer>;
	unknownMark: MarkdownMarkRenderer;
}

export const renderInline = (
	block: RenderableNode,
	renderers: InlineRenderers,
	breaks: LineBreak = 'markdown'
): string => {
	const pieces = orderMarks(block.content ?? []);
	// Whether the next text starts a line, where `#` or `1.` would be read
	// as Markdown.
	let lineStart = true;

	const leaf = (node: RenderableNode): string => {
		if (node.type === 'hardBreak') {
			lineStart = breaks === 'markdown';
			return BREAKS[breaks];
		}
		let output = renderers.leaf(node, block);
		if (lineStart && node.type === 'text') output = escapeLineStart(output);
		if (output) lineStart = false;
		return output;
	};

	const wrap = (mark: RenderableMark, group: Piece[], level: number) => {
		const render = renderers.marks[mark.type] ?? renderers.unknownMark;
		const context = { mark, node: group[0]!.node, parent: block };

		if (mark.type === 'code') {
			lineStart = false;
			const raw = group.map((piece) => piece.node.text ?? '').join('');
			return render({ ...context, children: raw });
		}

		// The mark's opening is written before this text, so it is not at
		// the start of a line, whatever came before.
		lineStart = false;
		const inner = serialize(group, level + 1);
		const [, lead = '', core = '', trail = ''] =
			/^(\s*)([^]*?)(\s*)$/.exec(inner) ?? [];
		if (!core) return inner;
		return lead + render({ ...context, children: core }) + trail;
	};

	const serialize = (group: Piece[], level: number): string => {
		let output = '';
		let at = 0;
		while (at < group.length) {
			const piece = group[at]!;
			const mark = piece.marks[level];
			if (!mark) {
				output += leaf(piece.node);
				at += 1;
				continue;
			}
			let end = at + 1;
			while (
				end < group.length &&
				sameMark(group[end]!.marks[level], mark)
			)
				end += 1;
			output += wrap(mark, group.slice(at, end), level);
			at = end;
		}
		return output;
	};

	// A break at the very end shows nothing, and Markdown would keep its
	// backslash as text.
	const trailing = new RegExp(
		`(?:${BREAKS[breaks].replace(/\\/g, '\\\\')})+$`
	);
	return serialize(pieces, 0).replace(trailing, '');
};
