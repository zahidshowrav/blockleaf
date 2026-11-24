/**
 * Media, as an opt-in subpath (`PA-21`).
 *
 * The caption toolbar: while the caret is in a caption, a toolbar offers the
 * caption's own alignment and a button to remove it. Captions themselves are
 * in the core — any image or table takes one — and an editor without this
 * subpath still writes, aligns (through `setCaptionAlign`) and removes them.
 *
 * ```ts
 * import { presets } from '@blockleaf/editor/extensions';
 * import { withMedia } from '@blockleaf/editor/media';
 *
 * const extensions = withMedia(presets.standard());
 * ```
 */
import { type Extensions } from '@tiptap/core';

import { CAPTION_MENU_EXTENSION_NAME } from './core/constants.js';
import {
	createCaptionMenu,
	type CaptionMenuOptions
} from './ui/caption/index.js';

export { CAPTION_MENU_EXTENSION_NAME } from './core/constants.js';
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
	/** The caption toolbar's options, or `false` to leave it out. */
	captionMenu?: Partial<CaptionMenuOptions> | false;
};

/**
 * Adds the media chrome to an extension list, replacing any already there.
 */
export const withMedia = (
	extensions: Extensions,
	options: MediaOptions = {}
): Extensions => {
	const rest = extensions.filter(
		(extension) => extension.name !== CAPTION_MENU_EXTENSION_NAME
	);
	if (options.captionMenu === false) return rest;
	return [...rest, createCaptionMenu(options.captionMenu)];
};
