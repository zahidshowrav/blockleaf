/**
 * Embeds, as an opt-in subpath.
 *
 * A YouTube, Vimeo or Loom video, a Spotify track, album, playlist, episode
 * or show, or a CodePen pen, shown in a frame. Only those providers: the
 * schema holds the list, and a document can point a frame nowhere else.
 *
 * Paste a supported link on an empty line, or choose Embed in the slash
 * menu and paste it there. An embed is captionable, resizes like a video,
 * and gets the media toolbar.
 *
 * The block is in the stored schema from version 2. An editor without this
 * subpath keeps a stored one as a placeholder and saves it back unchanged.
 *
 * ```ts
 * import { presets } from '@blockleaf/editor/extensions';
 * import { withEmbeds } from '@blockleaf/editor/embeds';
 *
 * const extensions = withEmbeds(presets.standard());
 * ```
 */
import { type Extensions } from '@tiptap/core';

import {
	CAPTION_MENU_EXTENSION_NAME,
	EMBED_NODE,
	MEDIA_MENU_EXTENSION_NAME,
	MEDIA_RESIZE_EXTENSION_NAME
} from './core/constants.js';
import { MediaResize } from './core/media-resize.js';
import { Embed } from './core/nodes/embed.js';
import {
	createCaptionMenu,
	type CaptionMenuOptions
} from './ui/caption/index.js';
import { createMediaMenu, type MediaMenuOptions } from './ui/media/index.js';

export {
	EMBED_NODE,
	MEDIA_MENU_EXTENSION_NAME,
	MEDIA_RESIZE_EXTENSION_NAME
} from './core/constants.js';
export {
	EMBED_PROVIDERS,
	embedProviderOf,
	sanitizeEmbedSrc,
	toEmbedSrc,
	type EmbedProvider
} from './core/embed-providers.js';
export {
	Embed,
	type EmbedAttributes,
	type EmbedOptions
} from './core/nodes/embed.js';

export type EmbedsOptions = {
	/**
	 * Pasting a supported link alone on an empty line embeds it. `false`
	 * leaves it a link; the slash menu still embeds.
	 */
	pasteToEmbed?: boolean;
	/** Resize handles and full width; `false` leaves them out. */
	resize?: false;
	/** The toolbar for a selected embed, or `false`. */
	mediaMenu?: Partial<MediaMenuOptions> | false;
	/** The caption toolbar's options, or `false` to leave it out. */
	captionMenu?: Partial<CaptionMenuOptions> | false;
};

const NAMES: ReadonlySet<string> = new Set([
	EMBED_NODE,
	MEDIA_MENU_EXTENSION_NAME,
	MEDIA_RESIZE_EXTENSION_NAME,
	CAPTION_MENU_EXTENSION_NAME
]);

/**
 * The embed block and its chrome: the media toolbar, the caption toolbar
 * and resizing, the same ones `@blockleaf/editor/media` adds.
 */
export const createEmbeds = (options: EmbedsOptions = {}): Extensions => [
	options.pasteToEmbed === false
		? Embed.configure({ pasteToEmbed: false })
		: Embed,
	...(options.resize === false ? [] : [MediaResize]),
	...(options.mediaMenu === false
		? []
		: [createMediaMenu(options.mediaMenu)]),
	...(options.captionMenu === false
		? []
		: [createCaptionMenu(options.captionMenu)])
];

/**
 * Adds the embed block and its chrome to an extension list, replacing any
 * already there. With `withMedia` as well, the toolbars and resizing are
 * shared: each is in the list once.
 */
export const withEmbeds = (
	extensions: Extensions,
	options: EmbedsOptions = {}
): Extensions => [
	...extensions.filter((extension) => !NAMES.has(extension.name)),
	...createEmbeds(options)
];
