import { defaultRendererLabels, type RendererLabels } from '../labels.js';
import { type NodeRenderer } from './types.js';
import {
	blockId,
	calloutEmoji,
	calloutTone,
	codeLanguage,
	colspan,
	headerRowCount,
	headingLevel,
	attachmentAttributes,
	audioAttributes,
	imageAttributes,
	isChecked,
	isHeaderCell,
	listStart,
	mentionAttributes,
	rowspan,
	tableColumns,
	tableMinWidth,
	tableRows,
	textAlign,
	videoAttributes,
	widthAttributes
} from '../attrs.js';
import { headingAnchor, tableOfContents } from '../toc.js';
import { type RenderableNode } from '../types.js';

/**
 * The default node components.
 *
 * Every element here matches what the editor writes for the same node, so a
 * page rendered on the server and the same document open in the editor share
 * one stylesheet. Where they deliberately differ, the component says why.
 */

const Doc: NodeRenderer = ({ children }) => <>{children}</>;

/** A paragraph's, heading's or caption's alignment, as the editor writes it. */
const alignStyle = (node: RenderableNode) => {
	const align = textAlign(node);
	return align ? { textAlign: align } : undefined;
};

const Paragraph: NodeRenderer = ({ node, children }) => (
	<p
		data-id={blockId(node)}
		style={alignStyle(node)}
	>
		{children}
	</p>
);

const Heading: NodeRenderer = ({ node, root, children }) => {
	const Tag = `h${headingLevel(node)}` as 'h1' | 'h2' | 'h3';
	return (
		<Tag
			id={headingAnchor(root, blockId(node))}
			data-id={blockId(node)}
			style={alignStyle(node)}
		>
			{children}
		</Tag>
	);
};

const Blockquote: NodeRenderer = ({ node, children }) => (
	<blockquote data-id={blockId(node)}>{children}</blockquote>
);

const CodeBlock: NodeRenderer = ({ node, children }) => {
	const language = codeLanguage(node);
	return (
		<pre data-id={blockId(node)}>
			<code className={language ? `language-${language}` : undefined}>
				{children}
			</code>
		</pre>
	);
};

const HorizontalRule: NodeRenderer = ({ node }) => (
	<hr data-id={blockId(node)} />
);

const BulletList: NodeRenderer = ({ node, children }) => (
	<ul data-id={blockId(node)}>{children}</ul>
);

const OrderedList: NodeRenderer = ({ node, children }) => (
	<ol
		data-id={blockId(node)}
		start={listStart(node)}
	>
		{children}
	</ol>
);

const ListItem: NodeRenderer = ({ node, children }) => (
	<li data-id={blockId(node)}>{children}</li>
);

const TaskList: NodeRenderer = ({ node, children }) => (
	<ul
		data-id={blockId(node)}
		data-type="taskList"
	>
		{children}
	</ul>
);

/**
 * The checkbox is `disabled`, which the editor's is not.
 *
 * Rendered output is a record of what the document says, and nothing here can
 * write a change back. A checkbox that invites a click and then silently
 * discards it is worse than one that plainly cannot be clicked.
 */
const TaskItem: NodeRenderer = ({ node, children }) => (
	<li
		data-id={blockId(node)}
		data-checked={isChecked(node) ? 'true' : 'false'}
		data-type="taskItem"
	>
		<label>
			<input
				type="checkbox"
				checked={isChecked(node)}
				disabled
			/>
			<span />
		</label>
		<div>{children}</div>
	</li>
);

const Callout: NodeRenderer = ({ node, children }) => (
	<div
		data-id={blockId(node)}
		data-emoji={calloutEmoji(node)}
		data-tone={calloutTone(node)}
		data-type="callout"
		className="blockleaf-callout"
	>
		{children}
	</div>
);

/**
 * A toggle (`F23`): the first block is its title, inside `<summary>`, and the
 * blocks after it are the body the browser opens and closes.
 */
const Details: NodeRenderer = ({ node, renderNode, combine }) => {
	const [title, ...body] = node.content ?? [];
	return (
		<details
			data-id={blockId(node)}
			open={node.attrs?.open === true}
		>
			{title ? <summary>{renderNode(title, node)}</summary> : null}
			{combine(body.map((child) => renderNode(child, node)))}
		</details>
	);
};

const Image: NodeRenderer = ({ node }) => {
	const attrs = imageAttributes(node);
	// A source that did not survive sanitisation renders nothing at all. An
	// `<img>` with no `src` is a broken-image icon and a layout hole.
	if (!attrs) return null;

	return (
		<img
			data-id={blockId(node)}
			src={attrs.src}
			alt={attrs.alt}
			{...widthAttributes(attrs.width)}
			data-align={attrs.align}
			className="blockleaf-image"
		/>
	);
};

const Text: NodeRenderer = ({ node }) => <>{node.text ?? ''}</>;

const HardBreak: NodeRenderer = () => <br />;

const Mention: NodeRenderer = ({ node }) => {
	const { text, attributes } = mentionAttributes(node);
	const { class: className, ...data } = attributes;
	return (
		<span
			className={className}
			{...data}
		>
			{text}
		</span>
	);
};

/**
 * A real table, with a real `<thead>`.
 *
 * The editor writes every row into `<tbody>`, header cells included —
 * prosemirror-tables has no concept of a table section. That is tolerable in a
 * contenteditable surface the user is looking at, and not tolerable in output:
 * an email client, an RSS reader and a screen reader all read `<thead>` and
 * little else. This is the one node the renderer deliberately writes
 * differently, and the parity suite excludes it on purpose.
 *
 * The stray `colwidth` attribute the editor emits on each cell goes too. It is
 * not an HTML attribute; the widths belong in `<colgroup>`, which is where
 * both put them.
 */
export const tableRenderer =
	(labels: RendererLabels = defaultRendererLabels): NodeRenderer =>
	({ node, renderNode, combine }) => {
		const rows = tableRows(node);
		const columns = tableColumns(node);
		const headerCount = headerRowCount(rows);
		const minWidth = tableMinWidth(columns);

		const renderRows = (slice: RenderableNode[]) =>
			combine(slice.map((row) => renderNode(row, node)));

		return (
			// The box the table scrolls inside. `contain: inline-size` is what
			// stops a stored `colwidth` wider than the screen pushing the page
			// sideways: a grid or flex item defaults to `min-width: auto`, so
			// without it the table's width becomes the host layout's problem.
			// Focusable, because a scroll container nobody can focus is one
			// nobody without a pointer can scroll.
			<div
				className="blockleaf-table-scroll"
				role="region"
				aria-label={labels.tableScrollRegion}
				tabIndex={0}
			>
				<table
					data-id={blockId(node)}
					style={minWidth ? { minWidth: `${minWidth}px` } : undefined}
				>
					{columns.length > 0 && (
						<colgroup>
							{columns.map((column, index) => (
								<col
									key={index}
									style={{
										...(column.width !== undefined
											? { width: `${column.width}px` }
											: { minWidth: '25px' })
									}}
								/>
							))}
						</colgroup>
					)}
					{headerCount > 0 && (
						<thead>{renderRows(rows.slice(0, headerCount))}</thead>
					)}
					{rows.length > headerCount && (
						<tbody>{renderRows(rows.slice(headerCount))}</tbody>
					)}
				</table>
			</div>
		);
	};

/** A captioned table or image (F20, PA-20): the block, then its caption. */
const Figure: NodeRenderer = ({ node, children }) => (
	<figure
		data-id={blockId(node)}
		className="blockleaf-figure"
	>
		{children}
	</figure>
);

const Caption: NodeRenderer = ({ node, children }) => (
	<figcaption
		className="blockleaf-caption"
		style={alignStyle(node)}
	>
		{children}
	</figcaption>
);

const TableRow: NodeRenderer = ({ children }) => <tr>{children}</tr>;

/**
 * `scope` is set because a `<thead>` without it is a half-finished table: the
 * element says a header row exists and nothing says what it heads. A header
 * cell in a body row is heading that row, not the column.
 */
const TableHeader: NodeRenderer = ({ node, parent, children }) => (
	<th
		colSpan={colspan(node) > 1 ? colspan(node) : undefined}
		rowSpan={rowspan(node) > 1 ? rowspan(node) : undefined}
		scope={allHeaders(parent) ? 'col' : 'row'}
	>
		{children}
	</th>
);

const TableCell: NodeRenderer = ({ node, children }) => (
	<td
		colSpan={colspan(node) > 1 ? colspan(node) : undefined}
		rowSpan={rowspan(node) > 1 ? rowspan(node) : undefined}
	>
		{children}
	</td>
);

/** Whether a row is made entirely of header cells, so its cells head columns. */
const allHeaders = (row: RenderableNode | undefined): boolean =>
	Boolean(row?.content?.length) &&
	(row?.content ?? []).every((cell) => isHeaderCell(cell));

/**
 * An unknown node renders its children and nothing else.
 *
 * Documents outlive the code that reads them: a server on an older renderer
 * will meet a node type a newer editor wrote. Throwing there takes down the
 * page for everything else on it, so the text survives and the wrapper does
 * not.
 */
/**
 * A node type this package does not know renders nothing. FC-05.
 *
 * Its children are not a safe stand-in: a wrapper's meaning is often the
 * point — columns, a toggle, an embed — and its text out of context can
 * read as something it is not. Readers see no error banner either; the host
 * that wants one passes `unknown`.
 */
export const unhandledNode: NodeRenderer = () => null;

/**
 * A table of contents (`PA-08`, `F27`). The editor's `getHTML` writes the
 * `nav` alone; the list is filled in here, from the document's headings.
 */
export const tableOfContentsRenderer =
	(labels: RendererLabels = defaultRendererLabels): NodeRenderer =>
	({ node, root }) => {
		const items = tableOfContents(root);
		return (
			<nav
				data-id={blockId(node)}
				data-type="tableOfContents"
				className="blockleaf-toc"
				aria-label={labels.tableOfContents}
			>
				{items.length > 0 && (
					<ul>
						{items.map((item, index) => (
							<li
								key={item.id ?? index}
								data-depth={item.depth}
							>
								{item.id ? (
									<a href={`#${item.id}`}>{item.text}</a>
								) : (
									item.text
								)}
							</li>
						))}
					</ul>
				)}
			</nav>
		);
	};

/**
 * Video, audio and a file (`PA-12` to `PA-14`), as the editor writes them.
 * A factory, because each puts a translatable name in its output.
 */
export const mediaRenderers = (
	labels: RendererLabels = defaultRendererLabels
): Record<'video' | 'audio' | 'attachment', NodeRenderer> => ({
	video: ({ node }) => {
		const attrs = videoAttributes(node);
		if (!attrs) return null;
		return (
			<video
				data-id={blockId(node)}
				src={attrs.src}
				poster={attrs.poster}
				{...widthAttributes(attrs.width)}
				data-align={attrs.align}
				className="blockleaf-video"
				controls
				preload="metadata"
				aria-label={labels.video}
			/>
		);
	},
	audio: ({ node }) => {
		const attrs = audioAttributes(node);
		if (!attrs) return null;
		return (
			<audio
				data-id={blockId(node)}
				src={attrs.src}
				title={attrs.title}
				className="blockleaf-audio"
				controls
				preload="metadata"
				aria-label={attrs.title ?? labels.audio}
			/>
		);
	},
	attachment: ({ node }) => {
		const attrs = attachmentAttributes(node);
		if (!attrs) return null;
		const size =
			attrs.size === undefined ? '' : labels.fileSize(attrs.size);
		return (
			<a
				data-id={blockId(node)}
				data-type="attachment"
				className="blockleaf-attachment"
				href={attrs.src}
				download={attrs.name}
				data-size={attrs.size}
				data-mime={attrs.mime}
				aria-label={labels.file(attrs.name, size)}
			>
				<span className="blockleaf-attachment__name">{attrs.name}</span>
				<span className="blockleaf-attachment__size">{size}</span>
			</a>
		);
	}
});

export const defaultNodes: Record<string, NodeRenderer> = {
	doc: Doc,
	paragraph: Paragraph,
	heading: Heading,
	blockquote: Blockquote,
	codeBlock: CodeBlock,
	horizontalRule: HorizontalRule,
	bulletList: BulletList,
	orderedList: OrderedList,
	listItem: ListItem,
	taskList: TaskList,
	taskItem: TaskItem,
	callout: Callout,
	details: Details,
	image: Image,
	table: tableRenderer(),
	tableOfContents: tableOfContentsRenderer(),
	...mediaRenderers(),
	figure: Figure,
	caption: Caption,
	tableRow: TableRow,
	tableHeader: TableHeader,
	tableCell: TableCell,
	text: Text,
	hardBreak: HardBreak,
	mention: Mention
};
