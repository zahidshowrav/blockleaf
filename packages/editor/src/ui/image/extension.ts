import type { Node as ProseMirrorNode } from '@tiptap/pm/model';
import type { Selection } from '@tiptap/pm/state';

import { createImageActions } from './actions.js';
import { AltEditor } from './alt-editor.js';
import { AltTextIcon } from './icons.js';
import { defaultLabels, type ResolvedLabels } from '../../core/labels.js';
import {
	createBubbleMenuExtension,
	resolveBubbleActions,
	type BubbleAction,
	type BubbleMenuShouldShow
} from '../bubble-menu/index.js';

export const IMAGE_MENU_PLUGIN_KEY = 'blockleafImageMenu';

/**
 * Identifies a node selection on an image by its shape.
 *
 * `instanceof NodeSelection` would need the value import from
 * `@tiptap/pm/state`, and ProseMirror packages declare no `sideEffects` — the
 * same trap F13 recorded for `CellSelection`. `node` is the property that
 * defines a node selection and it survives minification.
 */
export const isImageSelection = (selection: Selection): boolean => {
	if (!('node' in selection)) return false;
	const { node } = selection as Selection & { node?: ProseMirrorNode };
	return node?.type.name === 'image';
};

/**
 * Shown only for a selected image. The text bubble menu already stands down
 * here — its `shouldShow` requires text in the range, and an atom node has
 * none — so the two never compete.
 */
export const imageMenuShouldShow: BubbleMenuShouldShow = ({
	editor,
	state
}) => {
	if (!editor.isEditable) return false;
	return isImageSelection(state.selection);
};

export type ImageMenuOptions = {
	actions?: BubbleAction[] | ((defaults: BubbleAction[]) => BubbleAction[]);
	/** The resolved label set. Defaults to English. */
	labels?: ResolvedLabels;
};

/**
 * A third bubble menu instance, after the text toolbar (CH-02) and the cell
 * menu (CH-08). The surface is CH-02's; only what it offers and when it
 * appears differ.
 */
export const createImageMenuExtension = ({
	labels = defaultLabels,
	actions
}: ImageMenuOptions = {}) =>
	createBubbleMenuExtension({
		actions: resolveBubbleActions(
			actions,
			createImageActions(labels.image)
		),
		labels,
		link: false,
		label: labels.image.toolbar,
		panel: {
			id: 'alt',
			label: (editor) =>
				typeof editor.getAttributes('image').alt === 'string'
					? labels.image.editAlt
					: labels.image.addAlt,
			icon: AltTextIcon,
			isActive: (editor) =>
				typeof editor.getAttributes('image').alt === 'string',
			component: AltEditor
		},
		pluginKey: IMAGE_MENU_PLUGIN_KEY,
		shouldShow: imageMenuShouldShow
	}).extend({ name: 'imageMenu' });
