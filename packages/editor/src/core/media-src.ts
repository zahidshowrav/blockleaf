/**
 * Sanitises a video, audio or file source at the schema level.
 * The image rule without its data URLs.
 *
 * Allowed:
 * - `https:`
 * - site-relative and relative paths (`/uploads/a.mp4`, `media/a.mp4`)
 *
 * Refused, beyond what the image rule refuses (`javascript:`, `http:`,
 * `blob:`, protocol-relative): **every** `data:` URL. An image pasted from
 * the clipboard can legitimately arrive as one; a video or a PDF never does,
 * and a document holding megabytes of base64 is a document every host pays
 * to store, load and send. A `data:` file is also how a link that downloads
 * HTML from your own origin is built.
 */
export const sanitizeMediaSrc = (src: string): string | null => {
	const trimmed = src.trim();
	if (!trimmed) return null;

	// Protocol-relative URLs inherit the page's scheme and bypass the check.
	if (trimmed.startsWith('//')) return null;

	if (trimmed.startsWith('/')) return trimmed;

	try {
		const parsed = new URL(trimmed);
		return parsed.protocol === 'https:' ? trimmed : null;
	} catch {
		// Relative path without a leading slash. Reject anything carrying a
		// URI scheme before the first slash.
		if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) return null;
		return trimmed;
	}
};

/**
 * A file size in bytes as people read it: `812 B`, `14 KB`, `3.2 MB`. One
 * decimal under ten, none above, in powers of 1,024 — what a file manager
 * shows for the same file.
 */
export const formatFileSize = (bytes: number): string => {
	if (!Number.isFinite(bytes) || bytes < 0) return '';
	const units = ['B', 'KB', 'MB', 'GB', 'TB'];
	let value = bytes;
	let unit = 0;
	while (value >= 1024 && unit < units.length - 1) {
		value /= 1024;
		unit += 1;
	}
	const rounded =
		unit === 0 || value >= 10
			? Math.round(value)
			: Math.round(value * 10) / 10;
	return `${rounded} ${units[unit] ?? 'B'}`;
};
