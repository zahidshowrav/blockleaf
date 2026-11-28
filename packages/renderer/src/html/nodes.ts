import { defaultRendererLabels, type RendererLabels } from '../labels.js';
import { attributes, element, escapeText, voidElement } from './escape.js';
import {
	blockId,
	calloutEmoji,
	calloutTone,
	codeLanguage,
	columnWidth,
	colspan,
	columnStyle,
	headerRowCount,
	headingLevel,
	attachmentAttributes,
	audioAttributes,
	embedAttributes,
	linkPreviewAttributes,
	imageAttributes,
	isChecked,
	isHeaderCell,
	listStart,
	mathAttributes,
	mentionAttributes,
	rowspan,
	tableColumns,
	tableMinWidth,
	tableRows,
	textAlign,
	blockBackground,
	videoAttributes,
	widthAttributes
} from '../attrs.js';
import { headingAnchor, tableOfContents } from '../toc.js';
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
 * string in its output, and the editor has had translatable chrome. A
 * renderer hard-coding English would be the odd one out.
 */
export const createHtmlNodes = (
	labels: RendererLabels = defaultRendererLabels
): Record<string, HtmlNodeRenderer> => ({
	doc: ({ children }) => children,

	paragraph: ({ node, children }) =>
		element(
			'p',
			{ 'data-id': blockId(node), ...blockStyle(node) },
			children
		),

	heading: ({ node, root, children }) =>
		element(
			`h${headingLevel(node)}`,
			{
				id: headingAnchor(root, blockId(node)),
				'data-id': blockId(node),
				...blockStyle(node)
			},
			children
		),

	blockquote: ({ node, children }) =>
		element(
			'blockquote',
			{ 'data-id': blockId(node), ...blockStyle(node) },
			children
		),

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
		element(
			'ul',
			{ 'data-id': blockId(node), ...blockStyle(node) },
			children
		),

	orderedList: ({ node, children }) =>
		element(
			'ol',
			{
				'data-id': blockId(node),
				start: listStart(node),
				...blockStyle(node)
			},
			children
		),

	listItem: ({ node, children }) =>
		element('li', { 'data-id': blockId(node) }, children),

	taskList: ({ node, children }) =>
		element(
			'ul',
			{
				'data-id': blockId(node),
				'data-type': 'taskList',
				...blockStyle(node)
			},
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

	// Columns (PA-17, F34): a row, and each column's share as its
	// `flex-grow`, as the editor writes them.
	columns: ({ node, children }) =>
		element(
			'div',
			{
				'data-id': blockId(node),
				'data-type': 'columns',
				class: 'blockleaf-columns'
			},
			children
		),

	column: ({ node, children }) => {
		const width = columnWidth(node);
		return element(
			'div',
			{
				'data-id': blockId(node),
				'data-width': width,
				style: width === undefined ? undefined : `flex-grow: ${width}`,
				'data-type': 'column',
				class: 'blockleaf-column'
			},
			children
		);
	},

	// A table of contents (PA-08, F27). The editor's `getHTML` writes the
	// `nav` alone; the list is filled in here, from the document's headings.
	tableOfContents: ({ node, root }) => {
		const items = tableOfContents(root);
		const list = items.length
			? element(
					'ul',
					{},
					items
						.map((item) =>
							element(
								'li',
								{ 'data-depth': String(item.depth) },
								item.id
									? element(
											'a',
											{ href: `#${item.id}` },
											escapeText(item.text)
										)
									: escapeText(item.text)
							)
						)
						.join('')
				)
			: '';
		return element(
			'nav',
			{
				'data-id': blockId(node),
				'data-type': 'tableOfContents',
				class: 'blockleaf-toc',
				'aria-label': labels.tableOfContents
			},
			list
		);
	},

	// A toggle (F23): the first block is its title, inside `<summary>`.
	details: ({ node, renderNode, combine }) => {
		const [title, ...body] = node.content ?? [];
		const summary = title
			? `<summary>${renderNode(title, node)}</summary>`
			: '';
		return `<details${attributes({ 'data-id': blockId(node), ...blockStyle(node) })}${
			node.attrs?.open === true ? ' open' : ''
		}>${summary}${combine(body.map((child) => renderNode(child, node)))}</details>`;
	},

	image: ({ node }) => {
		const attrs = imageAttributes(node);
		if (!attrs) return '';

		return voidElement('img', {
			'data-id': blockId(node),
			src: attrs.src,
			alt: attrs.alt,
			...widthAttributes(attrs.width),
			'data-align': attrs.align,
			class: 'blockleaf-image'
		});
	},

	// Video, audio and a file (`PA-12` to `PA-14`), as the editor writes
	// them. An unsafe source renders nothing, as an image's does.
	video: ({ node }) => {
		const attrs = videoAttributes(node);
		if (!attrs) return '';
		return element(
			'video',
			{
				'data-id': blockId(node),
				src: attrs.src,
				poster: attrs.poster,
				...widthAttributes(attrs.width),
				'data-align': attrs.align,
				class: 'blockleaf-video',
				controls: '',
				preload: 'metadata',
				'aria-label': labels.video
			},
			''
		);
	},

	embed: ({ node }) => {
		const attrs = embedAttributes(node);
		if (!attrs) return '';
		return element(
			'iframe',
			{
				'data-id': blockId(node),
				src: attrs.src,
				...widthAttributes(attrs.width),
				'data-align': attrs.align,
				class: 'blockleaf-embed',
				'data-provider': attrs.provider,
				title: labels.embed(attrs.provider),
				loading: 'lazy',
				allow: 'encrypted-media; fullscreen; picture-in-picture',
				allowfullscreen: '',
				referrerpolicy: 'strict-origin-when-cross-origin',
				sandbox:
					'allow-scripts allow-same-origin allow-popups allow-presentation'
			},
			''
		);
	},

	audio: ({ node }) => {
		const attrs = audioAttributes(node);
		if (!attrs) return '';
		return element(
			'audio',
			{
				'data-id': blockId(node),
				src: attrs.src,
				title: attrs.title,
				class: 'blockleaf-audio',
				controls: '',
				preload: 'metadata',
				'aria-label': attrs.title ?? labels.audio
			},
			''
		);
	},

	attachment: ({ node }) => {
		const attrs = attachmentAttributes(node);
		if (!attrs) return '';
		const size =
			attrs.size === undefined ? '' : labels.fileSize(attrs.size);
		return element(
			'a',
			{
				'data-id': blockId(node),
				'data-type': 'attachment',
				class: 'blockleaf-attachment',
				href: attrs.src,
				download: attrs.name,
				'data-size': attrs.size,
				'data-mime': attrs.mime,
				'aria-label': labels.file(attrs.name, size)
			},
			element(
				'span',
				{ class: 'blockleaf-attachment__name' },
				escapeText(attrs.name)
			) +
				element(
					'span',
					{ class: 'blockleaf-attachment__size' },
					escapeText(size)
				)
		);
	},

	// A link as a card. A part with nothing stored shows the host name and
	// says so, as the editor writes it.
	linkPreview: ({ node }) => {
		const attrs = linkPreviewAttributes(node);
		if (!attrs) return '';
		const part = (name: string, value: string | undefined) =>
			element(
				'span',
				{
					class: `blockleaf-link-preview__${name}`,
					'data-fallback': value ? undefined : ''
				},
				escapeText(value ?? attrs.host)
			);
		return element(
			'a',
			{
				'data-id': blockId(node),
				'data-type': 'linkPreview',
				class: 'blockleaf-link-preview',
				href: attrs.url
			},
			part('title', attrs.title) +
				(attrs.description
					? element(
							'span',
							{ class: 'blockleaf-link-preview__description' },
							escapeText(attrs.description)
						)
					: '') +
				part('site', attrs.siteName) +
				(attrs.image
					? voidElement('img', {
							class: 'blockleaf-link-preview__image',
							src: attrs.image,
							alt: '',
							loading: 'lazy'
						})
					: '')
		);
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

	// A captioned table or image (F20, PA-20): the block, then its caption,
	// as the editor writes them.
	figure: ({ node, children }) =>
		element(
			'figure',
			{ 'data-id': blockId(node), class: 'blockleaf-figure' },
			children
		),

	caption: ({ node, children }) =>
		element(
			'figcaption',
			{ class: 'blockleaf-caption', ...blockStyle(node) },
			children
		),

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

	hardBreak: () => voidElement('br', {}),

	mention: ({ node }) => {
		const { text, attributes } = mentionAttributes(node);
		return element('span', attributes, escapeText(text));
	},

	mathInline: ({ node }) => mathSource(node),

	mathBlock: ({ node }) => mathSource(node)
});

/** A formula as its source. `@blockleaf/math` has the renderer that draws it. */
const mathSource = (node: RenderableNode): string => {
	const { latex, block, attributes } = mathAttributes(node);
	return element(block ? 'div' : 'span', attributes, escapeText(latex));
};

/**
 * The attributes a block carries for its alignment and its background colour,
 * in the order the editor writes them.
 */
const blockStyle = (node: RenderableNode) => {
	const align = textAlign(node);
	const background = blockBackground(node);
	const style = [
		align && `text-align: ${align}`,
		background && `background-color: var(--bl-highlight-${background})`
	]
		.filter(Boolean)
		.join('; ');
	return { 'data-background': background, style: style || undefined };
};

/** Whether a row is made entirely of header cells, so its cells head columns. */
const allHeaders = (row: RenderableNode | undefined): boolean =>
	Boolean(row?.content?.length) &&
	(row?.content ?? []).every((cell) => isHeaderCell(cell));

export const defaultHtmlNodes = /* @__PURE__ */ createHtmlNodes();

/** An unknown node keeps its children and loses its wrapper. */
/** A node type this package does not know renders nothing. See the React target. */
export const unhandledHtmlNode: HtmlNodeRenderer = () => '';
