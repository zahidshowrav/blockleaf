import type { Editor } from '@tiptap/core';

import { VIDEO_NODE } from '../../core/constants.js';
import { defaultLabels, type MediaLabels } from '../../core/labels.js';
import type { BubbleAction } from '../bubble-menu/types.js';
import { createToggleCaptionAction } from '../caption/actions.js';
import { TrashIcon } from '../drag-handle/icons.js';
import {
	AlignCenterIcon,
	AlignLeftIcon,
	AlignRightIcon
} from '../image/icons.js';

type Alignment = 'left' | 'center' | 'right';

/** The selected node's type name, for a node selection. */
export const selectedMediaType = (editor: Editor): string | null => {
	const { selection } = editor.state;
	if (!('node' in selection)) return null;
	const node = (selection as { node?: { type: { name: string } } }).node;
	return node?.type.name ?? null;
};

const isVideo = (editor: Editor) => selectedMediaType(editor) === VIDEO_NODE;

const alignOf = (editor: Editor): string | null => {
	const align: unknown = editor.getAttributes(VIDEO_NODE).align;
	return typeof align === 'string' ? align : null;
};

const align = (
	value: Alignment,
	title: string,
	icon: BubbleAction['icon']
): BubbleAction => ({
	id: `align-${value}`,
	title,
	icon,
	// An unset alignment renders flush left, as an image's does.
	isActive: (editor) => {
		const current = alignOf(editor);
		return value === 'left'
			? current === null || current === 'left'
			: current === value;
	},
	// Only a video lines up like an image; audio fills the line.
	isAvailable: isVideo,
	run: (editor) => editor.chain().focus().updateVideo({ align: value }).run()
});

/**
 * The toolbar for a selected video or audio clip (`PA-12`, `PA-13`).
 * Alignment shows for video only.
 */
export const createMediaActions = (
	labels: MediaLabels = defaultLabels.media
): BubbleAction[] => [
	align('left', labels.actions['align-left'], AlignLeftIcon),
	align('center', labels.actions['align-center'], AlignCenterIcon),
	align('right', labels.actions['align-right'], AlignRightIcon),
	createToggleCaptionAction(labels.actions['toggle-caption']),
	{
		id: 'delete',
		title: labels.actions.delete,
		icon: TrashIcon,
		isActive: () => false,
		run: (editor) => editor.chain().focus().deleteSelection().run()
	}
];

export const defaultMediaActions: BubbleAction[] =
	/* @__PURE__ */ createMediaActions();
