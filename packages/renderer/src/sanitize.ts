/**
 * The href and src rules, copied from `@blockleaf/editor`'s schema.
 *
 * This is duplication on purpose. Sanitising in the editor protects what gets
 * *written*; a renderer reads documents that were written by other versions,
 * by a host's own API, or by an importer, and writes them into HTML where an
 * unsafe URL becomes an XSS hole rather than a broken link. A renderer that
 * trusts its input is a renderer with a vulnerability.
 *
 * `tests/sanitize.test.ts` runs both packages' implementations over one shared
 * table of vectors, so the two cannot drift apart quietly.
 */

/**
 * Raster data URLs, which a clipboard paste can legitimately produce.
 * `image/svg+xml` is deliberately absent — an SVG is a document that can carry
 * scripts and external references, not a bitmap.
 */
const RASTER_DATA_URL = /^data:image\/(png|jpeg|jpg|gif|webp|avif);base64,/i;

/** Rejects anything carrying a URI scheme before the first slash. */
const HAS_SCHEME = /^[a-zA-Z][a-zA-Z0-9+.-]*:/;

/**
 * Allows `https:`, `mailto:`, site-relative paths and hash anchors. Everything
 * else — `javascript:` above all — returns `null`.
 */
export const sanitizeHref = (href: string): string | null => {
	const trimmed = href.trim();
	if (!trimmed) return null;

	// Protocol-relative URLs inherit the page's scheme and bypass the check.
	if (trimmed.startsWith('//')) return null;

	if (trimmed.startsWith('/') || trimmed.startsWith('#')) return trimmed;

	try {
		const parsed = new URL(trimmed);
		if (parsed.protocol === 'https:' || parsed.protocol === 'mailto:') {
			return trimmed;
		}
		return null;
	} catch {
		// Relative path without a leading slash, e.g. "docs/getting-started".
		if (HAS_SCHEME.test(trimmed)) return null;
		return trimmed;
	}
};

/**
 * Allows `https:`, relative paths and base64 raster data URLs. Rejects
 * everything else, including `http:` and `blob:`.
 */
export const sanitizeSrc = (src: string): string | null => {
	const trimmed = src.trim();
	if (!trimmed) return null;

	if (trimmed.startsWith('//')) return null;

	if (RASTER_DATA_URL.test(trimmed)) return trimmed;

	if (trimmed.startsWith('/')) return trimmed;

	try {
		const parsed = new URL(trimmed);
		return parsed.protocol === 'https:' ? trimmed : null;
	} catch {
		if (HAS_SCHEME.test(trimmed)) return null;
		return trimmed;
	}
};

/**
 * Allows `https:` and relative paths, for video, audio and file sources.
 * The `src` rule without data URLs: a video or a file never
 * arrives as one, and a `data:` link is how HTML is served from your own
 * origin.
 */
export const sanitizeMediaSrc = (src: string): string | null => {
	const trimmed = src.trim();
	if (!trimmed || trimmed.startsWith('//')) return null;
	if (trimmed.startsWith('/')) return trimmed;
	try {
		return new URL(trimmed).protocol === 'https:' ? trimmed : null;
	} catch {
		return HAS_SCHEME.test(trimmed) ? null : trimmed;
	}
};

/**
 * The embed providers and the only player addresses their frames may load,
 * copied from `@blockleaf/editor`'s schema. A frame runs another site's page
 * inside yours, so a stored `src` that is not on this list renders nothing.
 */
const EMBEDS: [string, RegExp][] = [
	[
		'youtube',
		/^https:\/\/www\.youtube-nocookie\.com\/embed\/[\w-]{11}(\?start=\d+)?$/
	],
	['vimeo', /^https:\/\/player\.vimeo\.com\/video\/\d+(\?h=[\da-f]+)?$/],
	['loom', /^https:\/\/www\.loom\.com\/embed\/[\da-f]{32}$/],
	[
		'spotify',
		/^https:\/\/open\.spotify\.com\/embed\/(track|album|playlist|episode|show)\/[A-Za-z\d]{22}$/
	],
	['codepen', /^https:\/\/codepen\.io\/[\w-]+\/embed\/[A-Za-z\d]+$/]
];

/** The provider a player address belongs to, or `null` when it is not on the list. */
export const embedProviderOf = (src: string): string | null =>
	EMBEDS.find(([, pattern]) => pattern.test(src))?.[0] ?? null;
