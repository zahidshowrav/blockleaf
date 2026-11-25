import { Node, mergeAttributes } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';

import { CAPTIONABLE_GROUP, EMBED_NODE } from '../constants.js';
import {
	embedProviderOf,
	sanitizeEmbedSrc,
	toEmbedSrc
} from '../embed-providers.js';
import { defaultLabels, type ResolvedLabels } from '../labels.js';
import {
	parseMediaWidth,
	renderMediaWidth,
	type MediaWidth
} from '../media-width.js';
import { type ImageAlign } from './image.js';

export interface EmbedAttributes {
	/**
	 * The page to embed — a YouTube watch page, a Vimeo video, a Loom
	 * share, a Spotify track, a CodePen pen — or its player address. It is
	 * stored as the player address.
	 */
	src: string;
	/** Pixels, or `'full'` for the width of the page. */
	width?: MediaWidth | null;
	align?: ImageAlign | null;
}

export interface EmbedOptions {
	HTMLAttributes: Record<string, unknown>;
	labels: ResolvedLabels;
	/**
	 * Pasting a supported address alone on an empty line embeds it.
	 * `false` leaves it a link.
	 */
	pasteToEmbed: boolean;
}

declare module '@tiptap/core' {
	interface Commands<ReturnType> {
		embed: {
			/**
			 * Embeds a page at the selection. False for an address no
			 * provider on the list serves.
			 */
			setEmbed: (attrs: EmbedAttributes) => ReturnType;
			/** Updates the selected embed. */
			updateEmbed: (attrs: Partial<EmbedAttributes>) => ReturnType;
		};
	}
}

const parseAlign = (value: string | null): ImageAlign | null =>
	value === 'left' || value === 'center' || value === 'right' ? value : null;

/** One address and nothing else, as pasted from an address bar. */
const SINGLE_URL = /^https?:\/\/\S+$/;

/**
 * An embedded page from a fixed list of providers: YouTube, Vimeo, Loom,
 * Spotify and CodePen. Stored as the provider's player address, which the
 * schema checks against that list, so a document can never point a frame
 * at any other site. Captionable, and resized like a video.
 *
 * YouTube plays from `youtube-nocookie.com`, which sets no cookies until
 * someone presses play.
 */
export const Embed = /* @__PURE__ */ Node.create<EmbedOptions>({
	name: EMBED_NODE,
	group: `block ${CAPTIONABLE_GROUP}`,
	atom: true,
	draggable: true,

	addOptions() {
		return {
			HTMLAttributes: {},
			labels: defaultLabels,
			pasteToEmbed: true
		};
	},

	addAttributes() {
		return {
			src: {
				default: null,
				// An embed code pasted from a provider carries its own player
				// address, which may be an older form of it.
				parseHTML: (element) => {
					const src = element.getAttribute('src');
					return src ? toEmbedSrc(src) : null;
				},
				renderHTML: (attributes) => {
					const src =
						typeof attributes.src === 'string'
							? sanitizeEmbedSrc(attributes.src)
							: null;
					return src ? { src } : {};
				}
			},
			width: {
				default: null,
				parseHTML: parseMediaWidth,
				renderHTML: (attributes) => renderMediaWidth(attributes.width)
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
				tag: 'iframe[src]',
				// Any other frame is dropped rather than stored without a source.
				getAttrs: (element) => {
					const src = element.getAttribute('src');
					return src !== null && toEmbedSrc(src) !== null
						? null
						: false;
				}
			}
		];
	},

	renderHTML({ node, HTMLAttributes }) {
		const provider =
			typeof node.attrs.src === 'string'
				? embedProviderOf(node.attrs.src)
				: null;
		return [
			'iframe',
			mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
				class: 'blockleaf-embed',
				...(provider
					? {
							'data-provider': provider,
							title: this.options.labels.embeds.frame[provider]
						}
					: {}),
				loading: 'lazy',
				allow: 'encrypted-media; fullscreen; picture-in-picture',
				allowfullscreen: '',
				referrerpolicy: 'strict-origin-when-cross-origin',
				sandbox:
					'allow-scripts allow-same-origin allow-popups allow-presentation'
			})
		];
	},

	renderText() {
		return '';
	},

	addCommands() {
		return {
			setEmbed:
				({ src, ...attrs }) =>
				({ commands }) => {
					const player = toEmbedSrc(src);
					if (player === null) return false;
					return commands.insertContent({
						type: this.name,
						attrs: { ...attrs, src: player }
					});
				},
			updateEmbed:
				({ src, ...attrs }) =>
				({ commands }) => {
					if (src === undefined) {
						return commands.updateAttributes(this.name, attrs);
					}
					const player = toEmbedSrc(src);
					if (player === null) return false;
					return commands.updateAttributes(this.name, {
						...attrs,
						src: player
					});
				}
		};
	},

	addProseMirrorPlugins() {
		const { editor, options } = this;
		return [
			new Plugin({
				key: new PluginKey('blockleafEmbed'),
				props: {
					handleDOMEvents: {
						// While editing, an unselected frame lets clicks through
						// (see the stylesheet), so the press lands on the editor,
						// which would place a caret beside the block. Select the
						// block whose frame is under the pointer instead.
						mousedown: (view, event) => {
							if (!view.editable || event.button !== 0)
								return false;
							const frames =
								view.dom.querySelectorAll<HTMLElement>(
									'iframe.blockleaf-embed:not(.ProseMirror-selectednode)'
								);
							for (const frame of frames) {
								const box = frame.getBoundingClientRect();
								if (
									event.clientX < box.left ||
									event.clientX > box.right ||
									event.clientY < box.top ||
									event.clientY > box.bottom
								) {
									continue;
								}
								event.preventDefault();
								editor
									.chain()
									.focus()
									.setNodeSelection(view.posAtDOM(frame, 0))
									.run();
								return true;
							}
							return false;
						}
					},
					handlePaste: (view, event) => {
						if (!options.pasteToEmbed) return false;
						const text =
							event.clipboardData?.getData('text/plain').trim() ??
							'';
						if (!SINGLE_URL.test(text)) return false;
						const { selection } = view.state;
						const parent = selection.$from.parent;
						// Only a line of its own: an address pasted into a
						// sentence stays a link.
						if (
							!selection.empty ||
							parent.type.name !== 'paragraph' ||
							parent.content.size > 0
						) {
							return false;
						}
						return editor.commands.setEmbed({ src: text });
					}
				}
			})
		];
	}
});
