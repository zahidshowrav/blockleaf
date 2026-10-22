import { Fragment } from 'react';

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

/**
 * The default node components.
 *
 * Every element here matches what the editor writes for the same node, so a
 * page rendered on the server and the same document open in the editor share
 * one stylesheet. Where they deliberately differ, the component says why.
 */

const Doc: NodeRenderer = ({ children }) => <>{children}</>;

const Paragraph: NodeRenderer = ({ node, children }) => (
	<p data-id={blockId(node)}>{children}</p>
);

const Heading: NodeRenderer = ({ node, children }) => {
	const Tag = `h${headingLevel(node)}` as 'h1' | 'h2' | 'h3';
	return <Tag data-id={blockId(node)}>{children}</Tag>;
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
 * `details` is in the schema and the validator but has no editor extension
 * yet, so only a host building documents by hand produces one. It renders
 * because the schema admits it — a node the document is allowed to contain
 * must not depend on which version of the editor happens to be installed.
 */
const Details: NodeRenderer = ({ node, children }) => (
	<details
		data-id={blockId(node)}
		open={node.attrs?.open === true}
	>
		{children}
	</details>
);

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
			width={attrs.width}
			data-align={attrs.align}
			className="blockleaf-image"
		/>
	);
};

const Text: NodeRenderer = ({ node }) => <>{node.text ?? ''}</>;

const HardBreak: NodeRenderer = () => <br />;

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
export const unhandledNode: NodeRenderer = ({ children }) => (
	<Fragment>{children}</Fragment>
);

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
	tableRow: TableRow,
	tableHeader: TableHeader,
	tableCell: TableCell,
	text: Text,
	hardBreak: HardBreak
};
