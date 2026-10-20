import {
	BoldIcon,
	HighlightIcon,
	InlineCodeIcon,
	ItalicIcon,
	StrikeIcon,
	UnderlineIcon
} from './icons.js';
import type { BubbleAction } from './types.js';
import { defaultLabels, type BubbleMenuLabels } from '../../core/labels.js';
import { whenMarkExists } from '../schema-guard.js';

/**
 * The default toolbar, in reading order. Every entry calls a command that
 * `EC` already ships and already tests — see the block split in
 * `docs/progress-tracker.md`.
 */
/** The default mark actions, built against a label set. */
export const createBubbleActions = (
	labels: BubbleMenuLabels = defaultLabels.bubbleMenu
): BubbleAction[] => [
	{
		id: 'bold',
		title: labels.actions['bold'],
		shortcut: 'Mod+B',
		icon: BoldIcon,
		isActive: (editor) => editor.isActive('bold'),
		isAvailable: whenMarkExists('bold', (editor) =>
			editor.can().toggleBold()
		),
		run: (editor) => editor.chain().focus().toggleBold().run()
	},
	{
		id: 'italic',
		title: labels.actions['italic'],
		shortcut: 'Mod+I',
		icon: ItalicIcon,
		isActive: (editor) => editor.isActive('italic'),
		isAvailable: whenMarkExists('italic', (editor) =>
			editor.can().toggleItalic()
		),
		run: (editor) => editor.chain().focus().toggleItalic().run()
	},
	{
		id: 'underline',
		title: labels.actions['underline'],
		shortcut: 'Mod+U',
		icon: UnderlineIcon,
		isActive: (editor) => editor.isActive('underline'),
		isAvailable: whenMarkExists('underline', (editor) =>
			editor.can().toggleUnderline()
		),
		run: (editor) => editor.chain().focus().toggleUnderline().run()
	},
	{
		id: 'strike',
		title: labels.actions['strike'],
		shortcut: 'Mod+Shift+S',
		icon: StrikeIcon,
		isActive: (editor) => editor.isActive('strike'),
		isAvailable: whenMarkExists('strike', (editor) =>
			editor.can().toggleStrike()
		),
		run: (editor) => editor.chain().focus().toggleStrike().run()
	},
	{
		id: 'code',
		title: labels.actions['code'],
		shortcut: 'Mod+E',
		icon: InlineCodeIcon,
		isActive: (editor) => editor.isActive('code'),
		isAvailable: whenMarkExists('code', (editor) =>
			editor.can().toggleCode()
		),
		run: (editor) => editor.chain().focus().toggleCode().run()
	},
	{
		id: 'highlight',
		title: labels.actions['highlight'],
		shortcut: 'Mod+Shift+H',
		icon: HighlightIcon,
		isActive: (editor) => editor.isActive('highlight'),
		isAvailable: whenMarkExists('highlight', (editor) =>
			editor.can().toggleHighlight()
		),
		run: (editor) => editor.chain().focus().toggleHighlight().run()
	}
];

export const defaultBubbleActions: BubbleAction[] =
	/* @__PURE__ */ createBubbleActions();

export const resolveBubbleActions = (
	actions?: BubbleAction[] | ((defaults: BubbleAction[]) => BubbleAction[]),
	defaults: BubbleAction[] = defaultBubbleActions
): BubbleAction[] => {
	if (typeof actions === 'function') {
		return actions(defaults);
	}
	if (Array.isArray(actions)) {
		return actions;
	}
	return defaults;
};
