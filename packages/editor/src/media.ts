/**
 * Media, as an opt-in subpath (`PA-12` to `PA-14`, `PA-21`, `PA-24`).
 *
 * Three blocks — video, audio and a file to download — each uploaded through
 * the host's adapter and each captionable, with a toolbar for a selected one.
 * And the caption toolbar: while the caret is in a caption, it offers the
 * caption's own alignment and a button to remove it. Captions themselves are
 * in the core — any image or table takes one.
 *
 * Images and videos get resize handles and a full width (`PA-24`).
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
	ATTACHMENT_NODE,
	AUDIO_NODE,
	CAPTION_MENU_EXTENSION_NAME,
	MEDIA_MENU_EXTENSION_NAME,
	MEDIA_RESIZE_EXTENSION_NAME,
	VIDEO_NODE
} from './core/constants.js';
import { MediaResize } from './core/media-resize.js';
import { Attachment } from './core/nodes/attachment.js';
import { Audio } from './core/nodes/audio.js';
import { Video } from './core/nodes/video.js';
import {
	createCaptionMenu,
	type CaptionMenuOptions
} from './ui/caption/index.js';
import { createMediaMenu, type MediaMenuOptions } from './ui/media/index.js';

export {
	ATTACHMENT_NODE,
	AUDIO_NODE,
	CAPTION_MENU_EXTENSION_NAME,
	MEDIA_MENU_EXTENSION_NAME,
	MEDIA_RESIZE_EXTENSION_NAME,
	VIDEO_NODE
} from './core/constants.js';
export { formatFileSize, sanitizeMediaSrc } from './core/media-src.js';
export { MIN_MEDIA_WIDTH, MediaResize } from './core/media-resize.js';
export {
	FULL_WIDTH,
	readMediaWidth,
	type MediaWidth
} from './core/media-width.js';
export {
	Attachment,
	type AttachmentAttributes,
	type AttachmentOptions
} from './core/nodes/attachment.js';
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
	/** Resize handles and full width for images and videos; `false` leaves them out. */
	resize?: false;
	/** The toolbar for a selected video, audio clip or file, or `false`. */
	mediaMenu?: Partial<MediaMenuOptions> | false;
	/** The caption toolbar's options, or `false` to leave it out. */
	captionMenu?: Partial<CaptionMenuOptions> | false;
};

const NAMES: ReadonlySet<string> = new Set([
	VIDEO_NODE,
	AUDIO_NODE,
	ATTACHMENT_NODE,
	MEDIA_MENU_EXTENSION_NAME,
	MEDIA_RESIZE_EXTENSION_NAME,
	CAPTION_MENU_EXTENSION_NAME
]);

/** The media blocks and their chrome. */
export const createMedia = (options: MediaOptions = {}): Extensions => [
	Video,
	Audio,
	Attachment,
	...(options.resize === false ? [] : [MediaResize]),
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
 * video, audio and any other file as well as images.
 */
export const withMedia = (
	extensions: Extensions,
	options: MediaOptions = {}
): Extensions => [
	...extensions.filter((extension) => !NAMES.has(extension.name)),
	...createMedia(options)
];
