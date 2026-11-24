import { Node, mergeAttributes } from '@tiptap/core';

import { AUDIO_NODE, CAPTIONABLE_GROUP } from '../constants.js';
import { defaultLabels, type ResolvedLabels } from '../labels.js';
import { sanitizeMediaSrc } from '../media-src.js';

export interface AudioAttributes {
	src: string;
	/** What the clip is, read as the player's name. A file name at worst. */
	title?: string | null;
}

export interface AudioOptions {
	HTMLAttributes: Record<string, unknown>;
	labels: ResolvedLabels;
}

declare module '@tiptap/core' {
	interface Commands<ReturnType> {
		audio: {
			/** Inserts an audio clip at the selection. False for an unsafe `src`. */
			setAudio: (attrs: AudioAttributes) => ReturnType;
			/** Updates the selected audio clip. */
			updateAudio: (attrs: Partial<AudioAttributes>) => ReturnType;
		};
	}
}

/**
 * An audio clip (`PA-13`, `F29`), played by the browser's own
 * `<audio controls>`. It stores a source and a title; the title is the
 * player's accessible name, since a row of identical players is otherwise
 * announced as "audio" over and over. Captionable.
 */
export const Audio = /* @__PURE__ */ Node.create<AudioOptions>({
	name: AUDIO_NODE,
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
			title: {
				default: null,
				parseHTML: (element) => element.getAttribute('title'),
				renderHTML: (attributes) =>
					typeof attributes.title === 'string' && attributes.title
						? { title: attributes.title }
						: {}
			}
		};
	},

	parseHTML() {
		return [
			{
				tag: 'audio[src]',
				getAttrs: (element) => {
					const src = element.getAttribute('src');
					return src !== null && sanitizeMediaSrc(src) !== null
						? null
						: false;
				}
			}
		];
	},

	renderHTML({ node, HTMLAttributes }) {
		const title: unknown = node.attrs.title;
		return [
			'audio',
			mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
				class: 'blockleaf-audio',
				controls: '',
				preload: 'metadata',
				'aria-label':
					typeof title === 'string' && title
						? title
						: this.options.labels.media.audio
			})
		];
	},

	renderText() {
		return '';
	},

	addCommands() {
		return {
			setAudio:
				(attrs) =>
				({ commands }) => {
					if (sanitizeMediaSrc(attrs.src) === null) return false;
					return commands.insertContent({ type: this.name, attrs });
				},
			updateAudio:
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
