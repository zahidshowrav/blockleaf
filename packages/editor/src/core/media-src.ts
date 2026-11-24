/**
 * Sanitises a video or audio source at the schema level (`PA-12`, `PA-13`,
 * `F29`). The image rule without its data URLs.
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
