import {
	BoldIcon,
	HighlightIcon,
	InlineCodeIcon,
	ItalicIcon,
	StrikeIcon,
	UnderlineIcon
} from './icons.js';
import type { BubbleAction } from './types.js';
import { whenMarkExists } from '../schema-guard.js';

/**
 * The default toolbar, in reading order. Every entry calls a command that
 * `EC` already ships and already tests — see the block split in
 * `docs/progress-tracker.md`.
 */
export const defaultBubbleActions: BubbleAction[] = [
	{
		id: 'bold',
		title: 'Bold',
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
		title: 'Italic',
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
		title: 'Underline',
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
		title: 'Strikethrough',
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
		title: 'Inline code',
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
		title: 'Highlight',
		shortcut: 'Mod+Shift+H',
		icon: HighlightIcon,
		isActive: (editor) => editor.isActive('highlight'),
		isAvailable: whenMarkExists('highlight', (editor) =>
			editor.can().toggleHighlight()
		),
		run: (editor) => editor.chain().focus().toggleHighlight().run()
	}
];

export const resolveBubbleActions = (
	actions?: BubbleAction[] | ((defaults: BubbleAction[]) => BubbleAction[])
): BubbleAction[] => {
	if (typeof actions === 'function') {
		return actions(defaultBubbleActions);
	}
	if (Array.isArray(actions)) {
		return actions;
	}
	return defaultBubbleActions;
};
