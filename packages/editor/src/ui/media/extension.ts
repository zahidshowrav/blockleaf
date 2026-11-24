import { Extension } from '@tiptap/core';

import { createMediaActions, selectedMediaType } from './actions.js';
import {
	AUDIO_NODE,
	MEDIA_MENU_EXTENSION_NAME,
	VIDEO_NODE
} from '../../core/constants.js';
import { defaultLabels, type ResolvedLabels } from '../../core/labels.js';
import {
	createBubbleMenuExtension,
	resolveBubbleActions,
	type BubbleAction,
	type BubbleMenuShouldShow
} from '../bubble-menu/index.js';

export const MEDIA_MENU_PLUGIN_KEY = 'blockleafMediaMenu';

const MEDIA_TYPES: ReadonlySet<string> = new Set([VIDEO_NODE, AUDIO_NODE]);

/** Shown for a selected video or audio clip. */
export const mediaMenuShouldShow: BubbleMenuShouldShow = ({ editor }) =>
	editor.isEditable && MEDIA_TYPES.has(selectedMediaType(editor) ?? '');

export type MediaMenuOptions = {
	actions?: BubbleAction[] | ((defaults: BubbleAction[]) => BubbleAction[]);
	/** The resolved label set. Defaults to English. */
	labels: ResolvedLabels;
};

/**
 * The media toolbar, another bubble menu instance like the image menu.
 * Built in `addExtensions`, like the caption toolbar, so its actions follow
 * the labels `BlockleafEditor` hands it.
 */
export const MediaMenu = /* @__PURE__ */ Extension.create<MediaMenuOptions>({
	name: MEDIA_MENU_EXTENSION_NAME,

	addOptions() {
		return {
			actions: undefined,
			labels: defaultLabels
		};
	},

	addExtensions() {
		const { labels, actions } = this.options;
		return [
			createBubbleMenuExtension({
				actions: resolveBubbleActions(
					actions,
					createMediaActions(labels.media)
				),
				labels,
				link: false,
				label: labels.media.toolbar,
				pluginKey: MEDIA_MENU_PLUGIN_KEY,
				shouldShow: mediaMenuShouldShow
			}).extend({ name: 'mediaMenuToolbar' })
		];
	}
});

export const createMediaMenu = (options: Partial<MediaMenuOptions> = {}) =>
	MediaMenu.configure(options);
