import type { Editor } from '@tiptap/core';
import { findParentNode } from '@tiptap/core';
import type { Node as ProseMirrorNode } from '@tiptap/pm/model';

import { CAPTION_NODE, FIGURE_NODE } from '../../core/constants.js';
import { defaultLabels, type CaptionLabels } from '../../core/labels.js';
import type { BubbleAction } from '../bubble-menu/types.js';
import { TrashIcon } from '../drag-handle/icons.js';
import {
	AlignCenterIcon,
	AlignLeftIcon,
	AlignRightIcon
} from '../image/icons.js';
import { CaptionIcon } from '../table-controls/icons.js';

type Alignment = 'left' | 'center' | 'right';

const ALIGNMENTS: ReadonlySet<string> = new Set(['left', 'center', 'right']);

const figureAround = (editor: Editor): ProseMirrorNode | null =>
	findParentNode((node) => node.type.name === FIGURE_NODE)(
		editor.state.selection
	)?.node ?? null;

/**
 * The alignment the caption shows: its own, or else its block's, as the
 * stylesheet draws it. The toolbar reports what is on the page,
 * the way the image toolbar treats an unset alignment as left.
 */
export const captionAlignment = (editor: Editor): Alignment | null => {
	const figure = figureAround(editor);
	const caption = figure?.lastChild;
	if (!figure || caption?.type.name !== CAPTION_NODE) return null;
	const own: unknown = caption.attrs.textAlign;
	if (typeof own === 'string' && ALIGNMENTS.has(own)) return own as Alignment;
	const block: unknown = figure.firstChild?.attrs.align;
	if (typeof block === 'string' && ALIGNMENTS.has(block)) {
		return block as Alignment;
	}
	return 'left';
};

/** Whether the caption has an alignment of its own, rather than its block's. */
const ownAlignment = (editor: Editor): unknown =>
	figureAround(editor)?.lastChild?.attrs.textAlign;

const align = (
	id: `align-${Alignment}`,
	value: Alignment,
	title: string,
	icon: BubbleAction['icon']
): BubbleAction => ({
	id,
	title,
	icon,
	isActive: (editor) => captionAlignment(editor) === value,
	// Pressing the caption's own alignment again takes it off, so the
	// caption follows its block once more.
	run: (editor) =>
		editor
			.chain()
			.focus()
			.setCaptionAlign(ownAlignment(editor) === value ? null : value)
			.run()
});

/**
 * The button every captionable block's toolbar shares: adds a
 * caption under the selected block, or takes it away. Pressed while the
 * block has one.
 */
export const createToggleCaptionAction = (title: string): BubbleAction => ({
	id: 'toggle-caption',
	title,
	icon: CaptionIcon,
	isActive: (editor) =>
		editor.state.selection.$from.parent.type.name === FIGURE_NODE,
	// A host's own extension list may have no figure at all.
	isAvailable: (editor) =>
		'toggleCaption' in editor.commands && editor.can().toggleCaption(),
	run: (editor) => editor.chain().focus().toggleCaption().run()
});

/** The caption toolbar's actions, built against a label set. */
export const createCaptionActions = (
	labels: CaptionLabels = defaultLabels.caption
): BubbleAction[] => [
	align('align-left', 'left', labels.actions['align-left'], AlignLeftIcon),
	align(
		'align-center',
		'center',
		labels.actions['align-center'],
		AlignCenterIcon
	),
	align(
		'align-right',
		'right',
		labels.actions['align-right'],
		AlignRightIcon
	),
	{
		id: 'remove-caption',
		title: labels.actions['remove-caption'],
		icon: TrashIcon,
		isActive: () => false,
		run: (editor) => editor.chain().focus().toggleCaption().run()
	}
];

export const defaultCaptionActions: BubbleAction[] =
	/* @__PURE__ */ createCaptionActions();
