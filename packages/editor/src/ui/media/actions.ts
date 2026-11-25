import type { Editor } from '@tiptap/core';

import { EMBED_NODE, VIDEO_NODE } from '../../core/constants.js';
import { defaultLabels, type MediaLabels } from '../../core/labels.js';
import type { BubbleAction } from '../bubble-menu/types.js';
import { createToggleCaptionAction } from '../caption/actions.js';
import { TrashIcon } from '../drag-handle/icons.js';
import { createFullWidthAction } from '../image/actions.js';
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

/** The blocks that line up like an image: a video and an embed. */
const ALIGNABLE: ReadonlySet<string> = new Set([VIDEO_NODE, EMBED_NODE]);

const isAlignable = (editor: Editor) =>
	ALIGNABLE.has(selectedMediaType(editor) ?? '');

const alignOf = (editor: Editor): string | null => {
	const type = selectedMediaType(editor);
	const align: unknown = type ? editor.getAttributes(type).align : null;
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
	// Audio and files fill the line.
	isAvailable: isAlignable,
	run: (editor) => {
		const type = selectedMediaType(editor);
		return type
			? editor
					.chain()
					.focus()
					.updateAttributes(type, { align: value })
					.run()
			: false;
	}
});

/**
 * The toolbar for a selected video, audio clip, file or embed.
 * Alignment and full width show for a video and an embed.
 */
export const createMediaActions = (
	labels: MediaLabels = defaultLabels.media
): BubbleAction[] => [
	align('left', labels.actions['align-left'], AlignLeftIcon),
	align('center', labels.actions['align-center'], AlignCenterIcon),
	align('right', labels.actions['align-right'], AlignRightIcon),
	createFullWidthAction(labels.actions['full-width'], isAlignable),
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
