import { sanitizeHref, sanitizeSrc } from './sanitize.js';
import {
	type HeadingLevel,
	type ImageAlign,
	type RenderableMark,
	type RenderableNode
} from './types.js';

/**
 * Attribute derivation, shared by every render target.
 *
 * Nothing here returns markup. The React and HTML-string mappings disagree
 * about what an element is, but they must not disagree about what a `heading`
 * node's level is or whether an `href` is safe — so that part lives once.
 */

const ALIGNMENTS = new Set<string>(['left', 'center', 'right']);

/**
 * The block id, stored as `attrs.id` and rendered as `data-id` to match the
 * editor's own output. A host that saved documents before `UniqueID` was
 * configured has blocks without one, so it is always optional.
 */
export const blockId = (node: RenderableNode): string | undefined => {
	const id = node.attrs?.id;
	return typeof id === 'string' && id ? id : undefined;
};

/**
 * Heading levels are 1–3 by schema. A level outside that range means the
 * document came from somewhere this package does not control, and clamping
 * beats rendering an `<h0>` the browser will not recognise.
 */
export const headingLevel = (node: RenderableNode): HeadingLevel => {
	const level = node.attrs?.level;
	if (level === 2) return 2;
	if (level === 3) return 3;
	if (typeof level === 'number' && level > 3) return 3;
	return 1;
};

/** `start` is only meaningful when it is a whole number other than 1. */
export const listStart = (node: RenderableNode): number | undefined => {
	const start = node.attrs?.start;
	if (typeof start !== 'number' || !Number.isInteger(start)) return undefined;
	return start === 1 ? undefined : start;
};

export const isChecked = (node: RenderableNode): boolean =>
	node.attrs?.checked === true;

export const calloutTone = (node: RenderableNode): string => {
	const tone = node.attrs?.tone;
	return typeof tone === 'string' && tone ? tone : 'info';
};

export const calloutEmoji = (node: RenderableNode): string | undefined => {
	const emoji = node.attrs?.emoji;
	return typeof emoji === 'string' && emoji ? emoji : undefined;
};

export const codeLanguage = (node: RenderableNode): string | undefined => {
	const language = node.attrs?.language;
	return typeof language === 'string' && language ? language : undefined;
};

export interface ImageAttributes {
	src: string;
	alt: string;
	width: number | undefined;
	align: ImageAlign | undefined;
}

/**
 * Returns `null` when the source does not survive sanitisation, which is the
 * signal to render nothing at all rather than an `<img>` with no `src`.
 *
 * An absent `alt` becomes `""`, not a missing attribute: a missing `alt` makes
 * a screen reader read the filename, while an empty one marks the image
 * decorative, and an image whose author never wrote alt text is decorative by
 * default as far as anyone downstream can tell.
 */
export const imageAttributes = (
	node: RenderableNode
): ImageAttributes | null => {
	const rawSrc = node.attrs?.src;
	if (typeof rawSrc !== 'string') return null;

	const src = sanitizeSrc(rawSrc);
	if (!src) return null;

	const alt = node.attrs?.alt;
	const width = node.attrs?.width;
	const align = node.attrs?.align;

	return {
		src,
		alt: typeof alt === 'string' ? alt : '',
		width:
			typeof width === 'number' && Number.isFinite(width)
				? width
				: undefined,
		align:
			typeof align === 'string' && ALIGNMENTS.has(align)
				? (align as ImageAlign)
				: undefined
	};
};

export interface LinkAttributes {
	href: string;
	target: string | undefined;
	rel: string | undefined;
}

/**
 * Returns `null` for an href that does not survive sanitisation — the caller
 * then renders the link's text without the anchor, so the words survive even
 * though the destination does not.
 *
 * `target` and `rel` fall back to the editor's defaults when the mark does not
 * carry them, so a document rendered here matches one rendered by the editor.
 * A stored `null` is not the same as a missing value: it means the author
 * removed the attribute, and it is honoured rather than defaulted away.
 */
/**
 * `undefined` means the attribute was never stored, so the default applies.
 * `null` or an empty string means it was stored as absent, so it stays absent.
 */
const stored = (value: unknown, fallback: string): string | undefined => {
	if (value === undefined) return fallback;
	return typeof value === 'string' && value ? value : undefined;
};

export const linkAttributes = (mark: RenderableMark): LinkAttributes | null => {
	const rawHref = mark.attrs?.href;
	if (typeof rawHref !== 'string') return null;

	const href = sanitizeHref(rawHref);
	if (!href) return null;

	return {
		href,
		target: stored(mark.attrs?.target, '_blank'),
		rel: stored(mark.attrs?.rel, 'noopener noreferrer nofollow')
	};
};

export const highlightColor = (mark: RenderableMark): string | undefined => {
	const color = mark.attrs?.color;
	return typeof color === 'string' && color ? color : undefined;
};

/* -------------------------------------------------------------------------- */
/* Tables                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * The width prosemirror-tables gives a column that has none. The editor writes
 * it into its own `<colgroup>`, so the renderer matches it.
 */
const CELL_MIN_WIDTH = 25;

const HEADER_CELL = 'tableHeader';

const spanOf = (node: RenderableNode, name: 'colspan' | 'rowspan'): number => {
	const value = node.attrs?.[name];
	return typeof value === 'number' && Number.isInteger(value) && value > 1
		? value
		: 1;
};

export const colspan = (node: RenderableNode): number =>
	spanOf(node, 'colspan');
export const rowspan = (node: RenderableNode): number =>
	spanOf(node, 'rowspan');

export const tableRows = (table: RenderableNode): RenderableNode[] =>
	(table.content ?? []).filter((row) => row.type === 'tableRow');

/**
 * How many rows from the top are made entirely of header cells.
 *
 * A row with a mix is not a header row — that is a header *column*, which
 * prosemirror-tables also allows, and putting it in `<thead>` would claim the
 * whole first row labels the ones below it.
 */
export const headerRowCount = (rows: RenderableNode[]): number => {
	let count = 0;

	for (const row of rows) {
		const cells = row.content ?? [];
		if (!cells.length) break;
		if (!cells.every((cell) => cell.type === HEADER_CELL)) break;
		count += 1;
	}

	return count;
};

export const isHeaderCell = (node: RenderableNode): boolean =>
	node.type === HEADER_CELL;

export interface TableColumn {
	/** A stored pixel width, or `undefined` for a column that has none. */
	width: number | undefined;
}

/**
 * The column widths, read off the first row.
 *
 * `colwidth` is an array per cell because a cell spanning three columns
 * carries all three widths. It is presentation stored in a document that
 * otherwise stores meaning — see PROJECT_PLAN §3.1 — but prosemirror-tables
 * writes it, so the renderer honours it rather than dropping the author's
 * column sizing on the way out.
 */
export const tableColumns = (table: RenderableNode): TableColumn[] => {
	const first = tableRows(table)[0];
	if (!first) return [];

	const columns: TableColumn[] = [];

	for (const cell of first.content ?? []) {
		const widths = cell.attrs?.colwidth;
		const span = colspan(cell);

		for (let index = 0; index < span; index += 1) {
			const width = Array.isArray(widths) ? widths[index] : undefined;
			columns.push({
				width:
					typeof width === 'number' && Number.isFinite(width)
						? width
						: undefined
			});
		}
	}

	return columns;
};

/**
 * The table's minimum width: every column at its stored width, or at the
 * default. Matches what the editor writes.
 */
export const tableMinWidth = (columns: TableColumn[]): number | undefined => {
	if (!columns.length) return undefined;

	return columns.reduce(
		(total, column) => total + (column.width ?? CELL_MIN_WIDTH),
		0
	);
};

/** The `<col>` style for one column. */
export const columnStyle = (column: TableColumn): string =>
	column.width !== undefined
		? `width: ${column.width}px`
		: `min-width: ${CELL_MIN_WIDTH}px`;
