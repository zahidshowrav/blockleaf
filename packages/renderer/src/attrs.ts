import {
	embedProviderOf,
	sanitizeHref,
	sanitizeMediaSrc,
	sanitizeSrc
} from './sanitize.js';
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

/** A style token: lower case, a letter first, at most 32 characters. */
const STYLE_TOKEN_PATTERN = /^[a-z][a-z0-9-]{0,31}$/;

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

/** A stored alignment, or none. */
const mediaAlign = (align: unknown): ImageAlign | undefined =>
	typeof align === 'string' && ALIGNMENTS.has(align)
		? (align as ImageAlign)
		: undefined;

/**
 * A stored width: pixels, or `'full'` for the width of the
 * page. Anything else is no width at all.
 */
const mediaWidth = (value: unknown): number | 'full' | undefined => {
	if (value === 'full') return 'full';
	return typeof value === 'number' && Number.isFinite(value) && value > 0
		? Math.round(value)
		: undefined;
};

/**
 * The HTML attributes for a width, as the editor writes them: `width` for
 * pixels, `data-width="full"` for full width.
 */
export const widthAttributes = (
	width: number | 'full' | undefined
): { width?: number; 'data-width'?: 'full' } =>
	width === 'full'
		? { 'data-width': 'full' }
		: width === undefined
			? {}
			: { width };

export interface ImageAttributes {
	src: string;
	alt: string;
	width: number | 'full' | undefined;
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
		width: mediaWidth(width),
		align: mediaAlign(align)
	};
};

const mediaSrc = (node: RenderableNode): string | null => {
	const src = node.attrs?.src;
	return typeof src === 'string' ? sanitizeMediaSrc(src) : null;
};

const optionalString = (value: unknown): string | undefined =>
	typeof value === 'string' && value ? value : undefined;

export interface VideoAttributes {
	src: string;
	poster: string | undefined;
	width: number | 'full' | undefined;
	align: ImageAlign | undefined;
}

/**
 * A video's attributes, or `null` when its source does not
 * survive sanitisation and nothing should render. The poster is held to the
 * image rule and dropped if it fails it.
 */
export const videoAttributes = (
	node: RenderableNode
): VideoAttributes | null => {
	const src = mediaSrc(node);
	if (!src) return null;
	const poster = optionalString(node.attrs?.poster);
	const width = node.attrs?.width;
	const align = node.attrs?.align;
	return {
		src,
		poster: poster ? (sanitizeSrc(poster) ?? undefined) : undefined,
		width: mediaWidth(width),
		align: mediaAlign(align)
	};
};

export interface AudioAttributes {
	src: string;
	title: string | undefined;
}

/** An audio clip's attributes, or `null` for an unsafe source. */
export const audioAttributes = (
	node: RenderableNode
): AudioAttributes | null => {
	const src = mediaSrc(node);
	return src ? { src, title: optionalString(node.attrs?.title) } : null;
};

export interface AttachmentAttributes {
	src: string;
	name: string;
	size: number | undefined;
	mime: string | undefined;
}

/** A file's attributes, or `null` for an unsafe source. */
export const attachmentAttributes = (
	node: RenderableNode
): AttachmentAttributes | null => {
	const src = mediaSrc(node);
	if (!src) return null;
	const size = node.attrs?.size;
	return {
		src,
		name: optionalString(node.attrs?.name) ?? '',
		size:
			typeof size === 'number' && Number.isInteger(size) && size >= 0
				? size
				: undefined,
		mime: optionalString(node.attrs?.mime)
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

/** A highlight colour written before tokens: hex, `rgb()` or `hsl()`. */
const LEGACY_HIGHLIGHT = /^(#[0-9a-f]{3,8}|(rgb|hsl)a?\(\s*[\d.%\s,/]+\))$/i;

/**
 * A highlight's stored `color`, when it is one the renderers will draw: a
 * token or a colour written before tokens. Anything else — a value
 * with a `;` in it above all — is treated as no colour.
 */
export const highlightColor = (mark: RenderableMark): string | undefined => {
	const color = mark.attrs?.color;
	if (typeof color !== 'string') return undefined;
	const value = color.trim();
	return STYLE_TOKEN_PATTERN.test(value) || LEGACY_HIGHLIGHT.test(value)
		? value
		: undefined;
};

/**
 * The CSS background a highlight's colour resolves to, as the
 * editor writes it: a token through `--bl-highlight-<token>`, falling back to
 * the token itself so a colour name stored before tokens still shows; an
 * older hex or `rgb()` value as it is.
 */
export const highlightBackground = (color: string): string =>
	STYLE_TOKEN_PATTERN.test(color)
		? `var(--bl-highlight-${color}, ${color})`
		: color;

/**
 * A token mark's token, or nothing when it is not one. The token goes
 * inside a `style`, so anything that could close the `var()` is refused
 * rather than escaped.
 */
const markToken = (
	mark: RenderableMark,
	attribute: string
): string | undefined => {
	const value = mark.attrs?.[attribute];
	return typeof value === 'string' && STYLE_TOKEN_PATTERN.test(value)
		? value
		: undefined;
};

/** A `textColor` mark's token. */
export const textColorToken = (mark: RenderableMark): string | undefined =>
	markToken(mark, 'color');

/** A `fontFamily` mark's token. */
export const fontFamilyToken = (mark: RenderableMark): string | undefined =>
	markToken(mark, 'family');

/** A `fontSize` mark's token. */
export const fontSizeToken = (mark: RenderableMark): string | undefined =>
	markToken(mark, 'size');

/** The size a token resolves to: its custom property, else the surrounding size. */
export const fontSizeValue = (token: string): string =>
	`var(--bl-font-size-${token}, 1em)`;

/** The family a token resolves to: its custom property, else the surrounding font. */
export const fontFamilyValue = (token: string): string =>
	`var(--bl-font-${token}, inherit)`;

/** The colour a token resolves to: its custom property, else the text colour. */
export const textColorValue = (token: string): string =>
	`var(--bl-text-${token}, currentColor)`;

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
 * otherwise stores meaning, but prosemirror-tables
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

/** What a mention shows before its label. Matches the editor's `MENTION_PREFIX`. */
const MENTION_PREFIX = '@';

const stringAttr = (node: RenderableNode, name: string): string => {
	const value = node.attrs?.[name];
	return typeof value === 'string' ? value : '';
};

/**
 * A mention's attributes and the text it shows, as the editor
 * writes them. `data-mention-id` rather than `data-id`, which is a block's.
 */
export const mentionAttributes = (
	node: RenderableNode
): {
	text: string;
	attributes: Record<string, string | undefined>;
} => {
	const label = stringAttr(node, 'label');
	const kind = stringAttr(node, 'kind');
	return {
		text: `${MENTION_PREFIX}${label}`,
		attributes: {
			class: 'blockleaf-mention',
			'data-type': 'mention',
			'data-mention-id': stringAttr(node, 'id'),
			'data-label': label,
			'data-kind': kind || undefined
		}
	};
};

export type TextAlign = 'left' | 'center' | 'right' | 'justify';

const TEXT_ALIGNMENTS: ReadonlySet<string> = new Set<TextAlign>([
	'left',
	'center',
	'right',
	'justify'
]);

/**
 * A paragraph's or heading's alignment, one of four tokens or
 * nothing. Anything else in a stored document is ignored rather than
 * written into a `style` attribute.
 */
export const textAlign = (node: RenderableNode): TextAlign | undefined => {
	const value = node.attrs?.textAlign;
	return typeof value === 'string' && TEXT_ALIGNMENTS.has(value)
		? (value as TextAlign)
		: undefined;
};

export interface EmbedAttributes {
	src: string;
	provider: string;
	width: number | 'full' | undefined;
	align: ImageAlign | undefined;
}

/**
 * An embed's attributes, or `null` when its source is not a player address
 * on the provider list and nothing should render.
 */
export const embedAttributes = (
	node: RenderableNode
): EmbedAttributes | null => {
	const src = node.attrs?.src;
	const provider = typeof src === 'string' ? embedProviderOf(src) : null;
	if (!provider) return null;
	const align = node.attrs?.align;
	return {
		src: src as string,
		provider,
		width: mediaWidth(node.attrs?.width),
		align: mediaAlign(align)
	};
};

export interface LinkPreviewAttributes {
	url: string;
	/** The host name, shown where the card has no title or site name. */
	host: string;
	title: string | undefined;
	description: string | undefined;
	image: string | undefined;
	siteName: string | undefined;
}

/**
 * A link card's attributes, or `null` when its address is not an `https:`
 * link and nothing should render. The picture is held to the image rule and
 * dropped if it fails it.
 */
export const linkPreviewAttributes = (
	node: RenderableNode
): LinkPreviewAttributes | null => {
	const raw = node.attrs?.url;
	const url =
		typeof raw === 'string' && /^https:\/\//i.test(raw.trim())
			? sanitizeHref(raw.trim())
			: null;
	if (!url) return null;
	const image = optionalString(node.attrs?.image);
	return {
		url,
		host: new URL(url).hostname.replace(/^www\./, ''),
		title: optionalString(node.attrs?.title),
		description: optionalString(node.attrs?.description),
		image: image ? (sanitizeSrc(image) ?? undefined) : undefined,
		siteName: optionalString(node.attrs?.siteName)
	};
};

/** A block's background colour token, or none. */
export const blockBackground = (node: RenderableNode): string | undefined => {
	const value = node.attrs?.backgroundColor;
	return typeof value === 'string' && STYLE_TOKEN_PATTERN.test(value)
		? value
		: undefined;
};

/**
 * A formula's LaTeX source and the attributes of its element, as the editor
 * writes them: a `<span>` inside a line, a `<div>` with its block id as a
 * block. The source is the element's text until something draws it.
 */
export const mathAttributes = (
	node: RenderableNode
): {
	latex: string;
	block: boolean;
	attributes: Record<string, string | undefined>;
} => {
	const block = node.type === 'mathBlock';
	return {
		latex: stringAttr(node, 'latex'),
		block,
		attributes: {
			'data-id': block ? blockId(node) : undefined,
			class: 'blockleaf-math',
			'data-type': block ? 'mathBlock' : 'mathInline'
		}
	};
};

/**
 * A column's stored width: its share of the row, in per cent, written as
 * its `flex-grow`. `undefined` is an equal share.
 */
export const columnWidth = (node: RenderableNode): number | undefined => {
	const width = node.attrs?.width;
	return typeof width === 'number' && width > 0 && width <= 100
		? width
		: undefined;
};
