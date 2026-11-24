import type { Editor } from '@tiptap/core';

import {
	AlignCenterIcon,
	AlignLeftIcon,
	AlignRightIcon,
	FullWidthIcon
} from './icons.js';
import { defaultLabels, type ImageLabels } from '../../core/labels.js';
import type { BubbleAction } from '../bubble-menu/types.js';
import { createToggleCaptionAction } from '../caption/actions.js';
import { TrashIcon } from '../drag-handle/icons.js';

const alignOf = (editor: Editor): string | null => {
	const align = editor.getAttributes('image').align;
	return typeof align === 'string' ? align : null;
};

/**
 * Full width for a selected image or video. Offered only where
 * `@blockleaf/editor/media` added the resize commands; pressed while the
 * width is `'full'`.
 */
export const createFullWidthAction = (
	title: string,
	isAvailable: (editor: Editor) => boolean = () => true
): BubbleAction => ({
	id: 'full-width',
	title,
	icon: FullWidthIcon,
	isActive: (editor) => {
		const { selection } = editor.state;
		return (
			'node' in selection &&
			(selection as { node?: { attrs: { width?: unknown } } }).node?.attrs
				.width === 'full'
		);
	},
	isAvailable: (editor) =>
		'toggleMediaFullWidth' in editor.commands && isAvailable(editor),
	run: (editor) => editor.chain().focus().toggleMediaFullWidth().run()
});

/**
 * Every entry calls a command the image node already ships. The toolbar is
 * affordance, never logic.
 */
/** The default image actions, built against a label set. */
export const createImageActions = (
	labels: ImageLabels = defaultLabels.image
): BubbleAction[] => [
	{
		id: 'align-left',
		title: labels.actions['align-left'],
		icon: AlignLeftIcon,
		// An unset alignment renders flush left, so reporting it as inactive
		// would make the pressed state disagree with what is on the page.
		isActive: (editor) => {
			const align = alignOf(editor);
			return align === null || align === 'left';
		},
		run: (editor) => editor.chain().focus().setImageAlign('left').run()
	},
	{
		id: 'align-center',
		title: labels.actions['align-center'],
		icon: AlignCenterIcon,
		isActive: (editor) => alignOf(editor) === 'center',
		run: (editor) => editor.chain().focus().setImageAlign('center').run()
	},
	{
		id: 'align-right',
		title: labels.actions['align-right'],
		icon: AlignRightIcon,
		isActive: (editor) => alignOf(editor) === 'right',
		run: (editor) => editor.chain().focus().setImageAlign('right').run()
	},
	createFullWidthAction(labels.actions['full-width']),
	// Shared with every captionable block's toolbar (`PA-21`).
	createToggleCaptionAction(labels.actions['toggle-caption']),
	{
		id: 'delete-image',
		title: labels.actions['delete-image'],
		icon: TrashIcon,
		isActive: () => false,
		run: (editor) => editor.chain().focus().deleteSelection().run()
	}
];

export const defaultImageActions: BubbleAction[] =
	/* @__PURE__ */ createImageActions();
