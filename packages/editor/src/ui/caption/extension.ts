import { Extension } from '@tiptap/core';

import { createCaptionActions } from './actions.js';
import {
	CAPTION_MENU_EXTENSION_NAME,
	CAPTION_NODE
} from '../../core/constants.js';
import { defaultLabels, type ResolvedLabels } from '../../core/labels.js';
import {
	createBubbleMenuExtension,
	resolveBubbleActions,
	type BubbleAction,
	type BubbleMenuShouldShow
} from '../bubble-menu/index.js';

export const CAPTION_MENU_PLUGIN_KEY = 'blockleafCaptionMenu';

/**
 * Shown while the caret sits in a caption with nothing selected. A selection
 * inside the caption belongs to the text toolbar, which bolds and links it;
 * the two never show together.
 */
export const captionMenuShouldShow: BubbleMenuShouldShow = ({
	editor,
	state
}) => {
	if (!editor.isEditable) return false;
	const { selection } = state;
	return selection.empty && selection.$from.parent.type.name === CAPTION_NODE;
};

export type CaptionMenuOptions = {
	actions?: BubbleAction[] | ((defaults: BubbleAction[]) => BubbleAction[]);
	/** The resolved label set. Defaults to English. */
	labels: ResolvedLabels;
};

/**
 * The caption toolbar (`PA-21`): the caption's own alignment, and a button
 * to remove it. Another instance of the bubble menu, like the image and
 * cell menus.
 *
 * A wrapper rather than the bubble menu itself, so its actions are built
 * from the labels it ends up with: `BlockleafEditor` reconfigures it with
 * the `labels` prop after the host has already added it.
 */
export const CaptionMenu = /* @__PURE__ */ Extension.create<CaptionMenuOptions>(
	{
		name: CAPTION_MENU_EXTENSION_NAME,

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
						createCaptionActions(labels.caption)
					),
					labels,
					link: false,
					label: labels.caption.toolbar,
					pluginKey: CAPTION_MENU_PLUGIN_KEY,
					shouldShow: captionMenuShouldShow
				}).extend({ name: 'captionMenuToolbar' })
			];
		}
	}
);

export const createCaptionMenu = (options: Partial<CaptionMenuOptions> = {}) =>
	CaptionMenu.configure(options);
