/**
 * Media, as an opt-in subpath (`PA-12`, `PA-13`, `PA-21`).
 *
 * Two blocks — video and audio — each uploaded through
 * the host's adapter and each captionable, with a toolbar for a selected one.
 * And the caption toolbar: while the caret is in a caption, it offers the
 * caption's own alignment and a button to remove it. Captions themselves are
 * in the core — any image or table takes one.
 *
 * The blocks are in the stored schema from version 2. An editor without this
 * subpath keeps a stored one as a placeholder and saves it back unchanged.
 *
 * ```ts
 * import { presets } from '@blockleaf/editor/extensions';
 * import { withMedia } from '@blockleaf/editor/media';
 *
 * const extensions = withMedia(presets.standard());
 * ```
 */
import { type Extensions } from '@tiptap/core';

import {
	AUDIO_NODE,
	CAPTION_MENU_EXTENSION_NAME,
	MEDIA_MENU_EXTENSION_NAME,
	VIDEO_NODE
} from './core/constants.js';
import { Audio } from './core/nodes/audio.js';
import { Video } from './core/nodes/video.js';
import {
	createCaptionMenu,
	type CaptionMenuOptions
} from './ui/caption/index.js';
import { createMediaMenu, type MediaMenuOptions } from './ui/media/index.js';

export {
	AUDIO_NODE,
	CAPTION_MENU_EXTENSION_NAME,
	MEDIA_MENU_EXTENSION_NAME,
	VIDEO_NODE
} from './core/constants.js';
export { sanitizeMediaSrc } from './core/media-src.js';
export {
	Audio,
	type AudioAttributes,
	type AudioOptions
} from './core/nodes/audio.js';
export {
	Video,
	type VideoAttributes,
	type VideoOptions
} from './core/nodes/video.js';
export {
	MEDIA_MENU_PLUGIN_KEY,
	MediaMenu,
	createMediaActions,
	createMediaMenu,
	defaultMediaActions,
	mediaMenuShouldShow,
	selectedMediaType,
	type MediaMenuOptions
} from './ui/media/index.js';
export {
	CAPTION_MENU_PLUGIN_KEY,
	CaptionMenu,
	captionAlignment,
	captionMenuShouldShow,
	createCaptionActions,
	createCaptionMenu,
	createToggleCaptionAction,
	defaultCaptionActions,
	type CaptionMenuOptions
} from './ui/caption/index.js';

export type MediaOptions = {
	/** The toolbar for a selected video or audio clip, or `false`. */
	mediaMenu?: Partial<MediaMenuOptions> | false;
	/** The caption toolbar's options, or `false` to leave it out. */
	captionMenu?: Partial<CaptionMenuOptions> | false;
};

const NAMES: ReadonlySet<string> = new Set([
	VIDEO_NODE,
	AUDIO_NODE,
	MEDIA_MENU_EXTENSION_NAME,
	CAPTION_MENU_EXTENSION_NAME
]);

/** The media blocks and their chrome. */
export const createMedia = (options: MediaOptions = {}): Extensions => [
	Video,
	Audio,
	...(options.mediaMenu === false
		? []
		: [createMediaMenu(options.mediaMenu)]),
	...(options.captionMenu === false
		? []
		: [createCaptionMenu(options.captionMenu)])
];

/**
 * Adds the media blocks and their chrome to an extension list, replacing
 * any already there. An upload adapter, if the list has one, then accepts
 * video and audio as well as images.
 */
export const withMedia = (
	extensions: Extensions,
	options: MediaOptions = {}
): Extensions => [
	...extensions.filter((extension) => !NAMES.has(extension.name)),
	...createMedia(options)
];
