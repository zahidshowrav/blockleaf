import {
	codeFence,
	escapeHtmlText,
	escapeMarkdown,
	hangingIndent,
	linkDestination,
	prefixLines
} from './escape.js';
import { type LineBreak } from './inline.js';
import {
	attachmentAttributes,
	audioAttributes,
	calloutEmoji,
	codeLanguage,
	colspan,
	embedAttributes,
	headerRowCount,
	headingLevel,
	imageAttributes,
	isChecked,
	linkPreviewAttributes,
	listStart,
	mathAttributes,
	mentionAttributes,
	rowspan,
	tableRows,
	videoAttributes
} from '../attrs.js';
import { defaultRendererLabels, type RendererLabels } from '../labels.js';
import { type RenderableNode } from '../types.js';
import { type NodeContext } from '../walk.js';

export interface MarkdownNodeContext extends NodeContext<string> {
	/**
	 * The node's inline content as Markdown, with its marks. `breaks` is what
	 * a line break becomes: a backslash and a new line by default, a space,
	 * or `<br>`.
	 */
	inline: (node: RenderableNode, breaks?: LineBreak) => string;
}

/**
 * A node for the Markdown target. A block returns its Markdown with no
 * blank line before or after it; the blocks around it are joined with one.
 * Returning `''` leaves the block out.
 */
export type MarkdownNodeRenderer = (context: MarkdownNodeContext) => string;

/** Joins blocks with one blank line, leaving out the empty ones. */
export const joinBlocks = (parts: string[]): string =>
	parts.filter(Boolean).join('\n\n');

/**
 * A block's words, for the one place Markdown is not read: inside an HTML
 * element. Not `toPlainText`, which would double this target's size.
 */
const plainText = (node: RenderableNode): string =>
	node.type === 'text'
		? (node.text ?? '')
		: node.type === 'mention'
			? mentionAttributes(node).text
			: node.type === 'mathInline'
				? mathAttributes(node).latex
				: // Pieces of one line run together; blocks get a space.
					(node.content ?? [])
						.map(plainText)
						.join(
							node.content?.some((child) => child.text) ? '' : ' '
						);

/** `[text](address)`. */
const link = (text: string, url: string): string =>
	`[${escapeMarkdown(text)}](${linkDestination(url)})`;

const LISTS = new Set(['bulletList', 'orderedList', 'taskList']);

/**
 * Two lists of the same kind, one after the other, would run together into
 * one. So every second one uses the other marker: `*` after `-`, `)` after
 * `.`.
 */
const alternates = (
	node: RenderableNode,
	parent: RenderableNode | undefined
) => {
	const siblings = parent?.content ?? [];
	const ordered = node.type === 'orderedList';
	let count = 0;
	for (let at = siblings.indexOf(node) - 1; at >= 0; at -= 1) {
		const sibling = siblings[at]!;
		if (!LISTS.has(sibling.type ?? '')) break;
		if ((sibling.type === 'orderedList') !== ordered) break;
		count += 1;
	}
	return count % 2 === 1;
};

/**
 * A list. It is tight, with no blank line between its items, unless an item
 * holds more than one block besides its own nested lists.
 */
const list: MarkdownNodeRenderer = ({ node, parent, renderNode }) => {
	const items = node.content ?? [];
	const other = alternates(node, parent);
	const loose = items.some(
		(item) =>
			(item.content ?? []).filter((child) => !LISTS.has(child.type ?? ''))
				.length > 1
	);
	return items
		.map((item) => {
			const rendered = renderNode(item, node);
			return other
				? rendered.replace(/^(\d+)\./, '$1)').replace(/^-( |$)/, '*$1')
				: rendered;
		})
		.join(loose ? '\n\n' : '\n');
};

/**
 * One list item: its marker, then its blocks, lined up under the first. A
 * list that alternates its marker rewrites the first one.
 */
const item: MarkdownNodeRenderer = ({ node, parent, renderNode }) => {
	const siblings = parent?.content ?? [];
	const index = Math.max(siblings.indexOf(node), 0);
	let marker: string;
	let width: number;

	if (parent?.type === 'orderedList') {
		marker = `${(listStart(parent) ?? 1) + index}. `;
		width = marker.length;
	} else {
		marker =
			node.type === 'taskItem'
				? `- [${isChecked(node) ? 'x' : ' '}] `
				: '- ';
		width = 2;
	}

	// A nested list may sit straight under the line before it; anything
	// else needs a blank line, as between blocks.
	const children = node.content ?? [];
	const body = children
		.map((child, at) => {
			const rendered = renderNode(child, node);
			if (at === 0 || !rendered) return rendered;
			return (LISTS.has(child.type ?? '') ? '\n' : '\n\n') + rendered;
		})
		.join('');

	return body ? marker + hangingIndent(body, width) : marker.trimEnd();
};

/**
 * One table cell on one line: its paragraphs joined by `<br>`, any other
 * block's lines too, and `|` escaped, since it would end the cell.
 */
const cell = (
	node: RenderableNode,
	{ inline, renderNode }: MarkdownNodeContext
): string =>
	(node.content ?? [])
		.map((block) =>
			block.type === 'paragraph' || block.type === 'heading'
				? inline(block, 'html')
				: renderNode(block, node).replace(/\n+/g, '<br>')
		)
		.filter(Boolean)
		.join('<br>')
		.replace(/\|/g, '\\|');

/**
 * A table, as a GitHub table. A merged cell's text goes in its first
 * place and the places it covers are left empty, since Markdown cannot merge
 * cells. A table with no header row gets an empty one, which Markdown
 * requires.
 */
const table: MarkdownNodeRenderer = (context) => {
	const rows = tableRows(context.node);
	const grid: string[][] = rows.map(() => []);

	rows.forEach((row, rowAt) => {
		let column = 0;
		for (const each of row.content ?? []) {
			while (grid[rowAt]![column] !== undefined) column += 1;
			const text = cell(each, context);
			for (let down = 0; down < rowspan(each); down += 1) {
				const target = grid[rowAt + down];
				if (!target) break;
				for (let across = 0; across < colspan(each); across += 1) {
					target[column + across] =
						down === 0 && across === 0 ? text : '';
				}
			}
			column += colspan(each);
		}
	});

	const width = Math.max(1, ...grid.map((row) => row.length));
	const line = (row: string[]) =>
		`| ${Array.from({ length: width }, (_, at) => row[at] ?? '').join(' | ')} |`;

	const header = headerRowCount(rows) > 0 ? grid.shift()! : [];
	return [
		line(header),
		`| ${Array.from({ length: width }, () => '---').join(' | ')} |`,
		...grid.map(line)
	].join('\n');
};

/**
 * The default node map. What Markdown cannot say is written as the nearest
 * thing it can: a callout as a quote, a video or a file as a link to it, a
 * toggle as the `<details>` element most Markdown readers accept.
 */
export const createMarkdownNodes = (
	labels: RendererLabels = defaultRendererLabels
): Record<string, MarkdownNodeRenderer> => ({
	doc: ({ children }) => children,

	paragraph: ({ node, inline }) => inline(node),

	heading: ({ node, inline }) => {
		const text = inline(node, 'space');
		return text ? `${'#'.repeat(headingLevel(node))} ${text}` : '';
	},

	blockquote: ({ children }) => prefixLines(children, '> '),

	callout: ({ node, children }) => {
		const emoji = calloutEmoji(node);
		const first = node.content?.[0]?.type === 'paragraph';
		const body = emoji
			? first
				? `${emoji} ${children}`
				: `${emoji}\n\n${children}`
			: children;
		return prefixLines(body, '> ');
	},

	codeBlock: ({ node }) => {
		const code = (node.content ?? [])
			.map((each) => each.text ?? '')
			.join('');
		const fence = codeFence(code);
		return `${fence}${codeLanguage(node) ?? ''}\n${code}${code ? '\n' : ''}${fence}`;
	},

	horizontalRule: () => '---',

	bulletList: list,
	orderedList: list,
	taskList: list,
	listItem: item,
	taskItem: item,

	// The first block is the title (see the HTML target).
	details: ({ node, renderNode, combine }) => {
		const [title, ...body] = node.content ?? [];
		const summary = title
			? `<summary>${escapeHtmlText(plainText(title).replace(/\s+/g, ' ').trim())}</summary>`
			: '';
		// The title stays with the opening tag; a blank line after it lets
		// Markdown read the body as Markdown again.
		const inside = combine(body.map((child) => renderNode(child, node)));
		return [
			`<details${node.attrs?.open === true ? ' open' : ''}>\n${summary}`,
			inside,
			'</details>'
		]
			.filter(Boolean)
			.join('\n\n');
	},

	// Markdown readers build their own contents from the headings.
	tableOfContents: () => '',

	image: ({ node }) => {
		const attrs = imageAttributes(node);
		return attrs
			? `![${escapeMarkdown(attrs.alt)}](${linkDestination(attrs.src)})`
			: '';
	},

	video: ({ node }) => {
		const attrs = videoAttributes(node);
		return attrs ? link(labels.video, attrs.src) : '';
	},

	audio: ({ node }) => {
		const attrs = audioAttributes(node);
		return attrs ? link(attrs.title ?? labels.audio, attrs.src) : '';
	},

	attachment: ({ node }) => {
		const attrs = attachmentAttributes(node);
		return attrs ? link(attrs.name || attrs.src, attrs.src) : '';
	},

	embed: ({ node }) => {
		const attrs = embedAttributes(node);
		return attrs ? link(labels.embed(attrs.provider), attrs.src) : '';
	},

	linkPreview: ({ node }) => {
		const attrs = linkPreviewAttributes(node);
		return attrs ? link(attrs.title ?? attrs.url, attrs.url) : '';
	},

	table,

	// A captioned table or image: the block, then its caption below it.
	figure: ({ children }) => children,
	caption: ({ node, inline }) => inline(node),

	text: ({ node }) => escapeMarkdown(node.text ?? ''),

	mention: ({ node }) => escapeMarkdown(mentionAttributes(node).text),

	// `$…$` and `$$…$$`, which GitHub and most maths-aware readers draw.
	mathInline: ({ node }) => {
		const latex = mathAttributes(node).latex.replace(/\s+/g, ' ').trim();
		return latex ? `$${latex}$` : '';
	},

	mathBlock: ({ node }) => {
		const { latex } = mathAttributes(node);
		return latex.trim() ? `$$\n${latex}\n$$` : '';
	}
});

export const defaultMarkdownNodes = /* @__PURE__ */ createMarkdownNodes();

/** A node type this package does not know renders nothing, as in the other targets. */
export const unhandledMarkdownNode: MarkdownNodeRenderer = () => '';
