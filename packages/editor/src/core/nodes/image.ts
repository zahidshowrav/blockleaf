import { Node, mergeAttributes } from '@tiptap/core';

/**
 * Raster data URLs, which a clipboard paste can legitimately produce.
 *
 * `image/svg+xml` is deliberately absent. An SVG is a document, not a
 * bitmap — it can carry scripts and external references, and allowing one in
 * as a data URL means storing attacker-authored markup in the host's
 * database. Scripts do not execute inside an `<img>`, but the document is the
 * product here and it gets rendered in places this package does not control.
 */
const RASTER_DATA_URL = /^data:image\/(png|jpeg|jpg|gif|webp|avif);base64,/i;

/**
 * Sanitises image sources at the schema level.
 *
 * Allowed:
 * - `https:`
 * - site-relative and relative paths (`/uploads/a.png`, `img/a.png`)
 * - base64 data URLs for raster formats
 *
 * Everything else is rejected, including `http:` — which matches
 * `sanitizeHref`, and which browsers block as mixed content on any https page
 * anyway — and `blob:`, which is a pointer into one browser session's memory
 * and is dead the moment the document is reloaded anywhere else.
 */
export const sanitizeSrc = (src: string): string | null => {
	const trimmed = src.trim();
	if (!trimmed) return null;

	// Protocol-relative URLs inherit the page's scheme and bypass the check.
	if (trimmed.startsWith('//')) return null;

	if (RASTER_DATA_URL.test(trimmed)) return trimmed;

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

export type ImageAlign = 'left' | 'center' | 'right';

export interface ImageAttributes {
	src: string;
	alt?: string | null;
	width?: number | null;
	align?: ImageAlign | null;
}

export interface ImageOptions {
	HTMLAttributes: Record<string, unknown>;
}

declare module '@tiptap/core' {
	interface Commands<ReturnType> {
		image: {
			/** Inserts an image at the current selection. */
			setImage: (attrs: ImageAttributes) => ReturnType;
			/** Updates the selected image. */
			updateImage: (attrs: Partial<ImageAttributes>) => ReturnType;
			/** Sets alignment on the selected image; `null` clears it. */
			setImageAlign: (align: ImageAlign | null) => ReturnType;
		};
	}
}

const parseDimension = (value: string | null): number | null => {
	if (value === null) return null;
	const parsed = Number.parseInt(value, 10);
	return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const parseAlign = (value: string | null): ImageAlign | null =>
	value === 'left' || value === 'center' || value === 'right' ? value : null;

export const Image = Node.create<ImageOptions>({
	name: 'image',
	group: 'block',
	atom: true,
	draggable: true,

	addOptions() {
		return {
			HTMLAttributes: {}
		};
	},

	addAttributes() {
		return {
			src: {
				default: null,
				parseHTML: (element) => {
					const src = element.getAttribute('src');
					return src ? sanitizeSrc(src) : null;
				},
				renderHTML: (attributes) => {
					const src =
						typeof attributes.src === 'string'
							? sanitizeSrc(attributes.src)
							: null;
					return src ? { src } : {};
				}
			},
			alt: {
				default: null,
				parseHTML: (element) => element.getAttribute('alt'),
				renderHTML: (attributes) =>
					// An empty alt is meaningful: it marks the image decorative,
					// and screen readers skip it. Only a missing alt is omitted.
					typeof attributes.alt === 'string'
						? { alt: attributes.alt }
						: {}
			},
			width: {
				default: null,
				parseHTML: (element) =>
					parseDimension(element.getAttribute('width')),
				renderHTML: (attributes) =>
					typeof attributes.width === 'number'
						? { width: String(attributes.width) }
						: {}
			},
			align: {
				default: null,
				parseHTML: (element) =>
					parseAlign(element.getAttribute('data-align')),
				renderHTML: (attributes) =>
					typeof attributes.align === 'string'
						? { 'data-align': attributes.align }
						: {}
			}
		};
	},

	parseHTML() {
		return [
			{
				tag: 'img[src]',
				// Returning false drops the element instead of admitting a node
				// with a null src. A pasted `<img src="javascript:...">` should
				// vanish, not become a broken image block in the saved document.
				getAttrs: (element) => {
					const src = element.getAttribute('src');
					return src !== null && sanitizeSrc(src) !== null
						? null
						: false;
				}
			}
		];
	},

	renderHTML({ HTMLAttributes }) {
		return [
			'img',
			mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
				class: 'blockleaf-image'
			})
		];
	},

	addCommands() {
		return {
			setImage:
				(attrs) =>
				({ commands }) => {
					// The gate is here as well as in the attribute, because a
					// command can be called by host code that never goes near
					// the HTML parser.
					if (sanitizeSrc(attrs.src) === null) return false;
					return commands.insertContent({
						type: this.name,
						attrs
					});
				},

			updateImage:
				(attrs) =>
				({ commands }) => {
					if (
						attrs.src !== undefined &&
						sanitizeSrc(attrs.src) === null
					) {
						return false;
					}
					return commands.updateAttributes(this.name, attrs);
				},

			setImageAlign:
				(align) =>
				({ commands }) => {
					return commands.updateAttributes(this.name, { align });
				}
		};
	}
});
