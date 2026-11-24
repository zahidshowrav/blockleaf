import { Node, mergeAttributes } from '@tiptap/core';

import { CAPTIONABLE_GROUP, VIDEO_NODE } from '../constants.js';
import { defaultLabels, type ResolvedLabels } from '../labels.js';
import { sanitizeMediaSrc } from '../media-src.js';
import { sanitizeSrc, type ImageAlign } from './image.js';

export interface VideoAttributes {
	src: string;
	/** A still shown before it plays. Held to the image rule. */
	poster?: string | null;
	width?: number | null;
	align?: ImageAlign | null;
}

export interface VideoOptions {
	HTMLAttributes: Record<string, unknown>;
	labels: ResolvedLabels;
}

declare module '@tiptap/core' {
	interface Commands<ReturnType> {
		video: {
			/** Inserts a video at the selection. False for an unsafe `src`. */
			setVideo: (attrs: VideoAttributes) => ReturnType;
			/** Updates the selected video. */
			updateVideo: (attrs: Partial<VideoAttributes>) => ReturnType;
		};
	}
}

const parseWidth = (value: string | null): number | null => {
	if (value === null) return null;
	const parsed = Number.parseInt(value, 10);
	return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const parseAlign = (value: string | null): ImageAlign | null =>
	value === 'left' || value === 'center' || value === 'right' ? value : null;

/**
 * A video (`PA-12`, `F29`): an uploaded or linked file played by the
 * browser's own `<video controls>`. Stored like an image — a source, a
 * width, an alignment — plus an optional poster. Captionable.
 *
 * `preload="metadata"`, so a page of videos fetches their sizes and first
 * frames, not the whole files.
 */
export const Video = /* @__PURE__ */ Node.create<VideoOptions>({
	name: VIDEO_NODE,
	group: `block ${CAPTIONABLE_GROUP}`,
	atom: true,
	draggable: true,

	addOptions() {
		return {
			HTMLAttributes: {},
			labels: defaultLabels
		};
	},

	addAttributes() {
		return {
			src: {
				default: null,
				parseHTML: (element) => {
					const src = element.getAttribute('src');
					return src ? sanitizeMediaSrc(src) : null;
				},
				renderHTML: (attributes) => {
					const src =
						typeof attributes.src === 'string'
							? sanitizeMediaSrc(attributes.src)
							: null;
					return src ? { src } : {};
				}
			},
			poster: {
				default: null,
				parseHTML: (element) => {
					const poster = element.getAttribute('poster');
					return poster ? sanitizeSrc(poster) : null;
				},
				renderHTML: (attributes) => {
					const poster =
						typeof attributes.poster === 'string'
							? sanitizeSrc(attributes.poster)
							: null;
					return poster ? { poster } : {};
				}
			},
			width: {
				default: null,
				parseHTML: (element) =>
					parseWidth(element.getAttribute('width')),
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
				tag: 'video[src]',
				// An unsafe source drops the element rather than storing a
				// video with no source.
				getAttrs: (element) => {
					const src = element.getAttribute('src');
					return src !== null && sanitizeMediaSrc(src) !== null
						? null
						: false;
				}
			}
		];
	},

	renderHTML({ HTMLAttributes }) {
		return [
			'video',
			mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
				class: 'blockleaf-video',
				controls: '',
				preload: 'metadata',
				'aria-label': this.options.labels.media.video
			})
		];
	},

	renderText() {
		return '';
	},

	addCommands() {
		return {
			setVideo:
				(attrs) =>
				({ commands }) => {
					if (sanitizeMediaSrc(attrs.src) === null) return false;
					return commands.insertContent({ type: this.name, attrs });
				},
			updateVideo:
				(attrs) =>
				({ commands }) => {
					if (
						attrs.src !== undefined &&
						sanitizeMediaSrc(attrs.src) === null
					) {
						return false;
					}
					return commands.updateAttributes(this.name, attrs);
				}
		};
	}
});
