import { defaultRendererLabels, type RendererLabels } from '../labels.js';
import { attributes, element, escapeText, voidElement } from './escape.js';
import {
	blockId,
	calloutEmoji,
	calloutTone,
	codeLanguage,
	colspan,
	columnStyle,
	headerRowCount,
	headingLevel,
	imageAttributes,
	isChecked,
	isHeaderCell,
	listStart,
	rowspan,
	tableColumns,
	tableMinWidth,
	tableRows
} from '../attrs.js';
import { type RenderableNode } from '../types.js';
import { type NodeRender } from '../walk.js';

/**
 * The default node renderers for the HTML-string target.
 *
 * Every element matches the React target, which in turn matches the editor. A
 * three-way parity suite holds all of them to each other.
 */

export type HtmlNodeRenderer = NodeRender<string>;

/**
 * The default node map, built against a label set.
 *
 * A factory rather than a constant because one node — the table — puts a
 * string in its output, and the editor has had translatable chrome since
 * HD-02. A renderer hard-coding English would be the odd one out.
 */
export const createHtmlNodes = (
	labels: RendererLabels = defaultRendererLabels
): Record<string, HtmlNodeRenderer> => ({
	doc: ({ children }) => children,

	paragraph: ({ node, children }) =>
		element('p', { 'data-id': blockId(node) }, children),

	heading: ({ node, children }) =>
		element(
			`h${headingLevel(node)}`,
			{ 'data-id': blockId(node) },
			children
		),

	blockquote: ({ node, children }) =>
		element('blockquote', { 'data-id': blockId(node) }, children),

	codeBlock: ({ node, children }) => {
		const language = codeLanguage(node);
		return element(
			'pre',
			{ 'data-id': blockId(node) },
			element(
				'code',
				{ class: language ? `language-${language}` : undefined },
				children
			)
		);
	},

	horizontalRule: ({ node }) =>
		voidElement('hr', { 'data-id': blockId(node) }),

	bulletList: ({ node, children }) =>
		element('ul', { 'data-id': blockId(node) }, children),

	orderedList: ({ node, children }) =>
		element(
			'ol',
			{ 'data-id': blockId(node), start: listStart(node) },
			children
		),

	listItem: ({ node, children }) =>
		element('li', { 'data-id': blockId(node) }, children),

	taskList: ({ node, children }) =>
		element(
			'ul',
			{ 'data-id': blockId(node), 'data-type': 'taskList' },
			children
		),

	// The checkbox is disabled for the same reason as in the React target:
	// nothing here can write a change back.
	taskItem: ({ node, children }) =>
		element(
			'li',
			{
				'data-id': blockId(node),
				'data-checked': isChecked(node) ? 'true' : 'false',
				'data-type': 'taskItem'
			},
			element(
				'label',
				{},
				voidElement('input', {
					type: 'checkbox',
					...(isChecked(node) ? { checked: 'checked' } : {}),
					disabled: 'disabled'
				}) + element('span', {}, '')
			) + element('div', {}, children)
		),

	callout: ({ node, children }) =>
		element(
			'div',
			{
				'data-id': blockId(node),
				'data-emoji': calloutEmoji(node),
				'data-tone': calloutTone(node),
				'data-type': 'callout',
				class: 'blockleaf-callout'
			},
			children
		),

	details: ({ node, children }) =>
		`<details${attributes({ 'data-id': blockId(node) })}${
			node.attrs?.open === true ? ' open' : ''
		}>${children}</details>`,

	image: ({ node }) => {
		const attrs = imageAttributes(node);
		if (!attrs) return '';

		return voidElement('img', {
			'data-id': blockId(node),
			src: attrs.src,
			alt: attrs.alt,
			width: attrs.width,
			'data-align': attrs.align,
			class: 'blockleaf-image'
		});
	},

	// A real table with a real `<thead>`, the renderer's one deliberate
	// departure from the editor's markup. See the React target for why.
	table: ({ node, renderNode, combine }) => {
		const rows = tableRows(node);
		const columns = tableColumns(node);
		const headerCount = headerRowCount(rows);
		const minWidth = tableMinWidth(columns);

		const renderRows = (slice: RenderableNode[]) =>
			combine(slice.map((row) => renderNode(row, node)));

		const colgroup = columns.length
			? element(
					'colgroup',
					{},
					columns
						.map((column) =>
							voidElement('col', { style: columnStyle(column) })
						)
						.join('')
				)
			: '';

		const head = headerCount
			? element('thead', {}, renderRows(rows.slice(0, headerCount)))
			: '';

		const body =
			rows.length > headerCount
				? element('tbody', {}, renderRows(rows.slice(headerCount)))
				: '';

		// The box the table scrolls inside, matching the React target and
		// the editor. `contain: inline-size` in the stylesheet is what stops
		// a stored `colwidth` wider than the screen pushing the page
		// sideways; focusable, because a scroll container nobody can focus
		// is one nobody without a pointer can scroll.
		return element(
			'div',
			{
				class: 'blockleaf-table-scroll',
				role: 'region',
				'aria-label': labels.tableScrollRegion,
				tabindex: '0'
			},
			element(
				'table',
				{
					'data-id': blockId(node),
					style: minWidth ? `min-width: ${minWidth}px` : undefined
				},
				colgroup + head + body
			)
		);
	},

	tableRow: ({ children }) => element('tr', {}, children),

	tableHeader: ({ node, parent, children }) =>
		element(
			'th',
			{
				colspan: colspan(node) > 1 ? colspan(node) : undefined,
				rowspan: rowspan(node) > 1 ? rowspan(node) : undefined,
				scope: allHeaders(parent) ? 'col' : 'row'
			},
			children
		),

	tableCell: ({ node, children }) =>
		element(
			'td',
			{
				colspan: colspan(node) > 1 ? colspan(node) : undefined,
				rowspan: rowspan(node) > 1 ? rowspan(node) : undefined
			},
			children
		),

	text: ({ node }) => escapeText(node.text ?? ''),

	hardBreak: () => voidElement('br', {})
});

/** Whether a row is made entirely of header cells, so its cells head columns. */
const allHeaders = (row: RenderableNode | undefined): boolean =>
	Boolean(row?.content?.length) &&
	(row?.content ?? []).every((cell) => isHeaderCell(cell));

export const defaultHtmlNodes = /* @__PURE__ */ createHtmlNodes();

/** An unknown node keeps its children and loses its wrapper. */
export const unhandledHtmlNode: HtmlNodeRenderer = ({ children }) => children;
