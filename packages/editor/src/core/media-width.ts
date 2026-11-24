/**
 * The width an image or a video is shown at: a number of
 * pixels, the named value `'full'`, or nothing for the file's own size.
 *
 * Full width is a name and not a pixel count, because a number measured on
 * the author's screen is wrong on everyone else's. A pixel width is drawn
 * no wider than the page, and the height always follows the picture's own
 * shape: a resize changes the width only, so nothing is stretched.
 */
export type MediaWidth = number | 'full';

export const FULL_WIDTH = 'full';

/** Reads a stored width, or `null` for anything that is not one. */
export const readMediaWidth = (value: unknown): MediaWidth | null => {
	if (value === FULL_WIDTH) return FULL_WIDTH;
	return typeof value === 'number' && Number.isFinite(value) && value > 0
		? Math.round(value)
		: null;
};

/** The width from an element: `data-width="full"`, or its `width`. */
export const parseMediaWidth = (element: HTMLElement): MediaWidth | null => {
	if (element.getAttribute('data-width') === FULL_WIDTH) return FULL_WIDTH;
	const raw = element.getAttribute('width');
	if (raw === null) return null;
	return readMediaWidth(Number.parseInt(raw, 10));
};

/** The HTML attributes for a width: `width` for pixels, `data-width` for full. */
export const renderMediaWidth = (value: unknown): Record<string, string> => {
	const width = readMediaWidth(value);
	if (width === FULL_WIDTH) return { 'data-width': FULL_WIDTH };
	return width === null ? {} : { width: String(width) };
};
