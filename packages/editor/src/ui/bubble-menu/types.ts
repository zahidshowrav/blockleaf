import type { Editor } from '@tiptap/core';
import type { EditorState, PluginKey } from '@tiptap/pm/state';
import type { EditorView } from '@tiptap/pm/view';
import type { ComponentType, ReactNode } from 'react';

import type { IconProps } from '../slash-menu/icons.js';

/**
 * A single toggle in the bubble menu toolbar.
 *
 * `run` calls a command that already exists in `src/core` — the toolbar is
 * affordance, never logic. If a button needs behaviour the command API cannot
 * express, the command is what is missing.
 */
export type BubbleAction = {
	id: string;
	title: string;
	/** Rendered in the tooltip after the title, e.g. `Mod+B`. */
	shortcut?: string;
	icon?: ReactNode | ComponentType<IconProps> | (() => ReactNode);
	/** Drives `aria-pressed`. */
	isActive: (editor: Editor) => boolean;
	/** Hides the button when the mark cannot apply to the current selection. */
	isAvailable?: (editor: Editor) => boolean;
	run: (editor: Editor) => void;
};

export type BubbleMenuShouldShow = (props: {
	editor: Editor;
	element: HTMLElement;
	view: EditorView;
	state: EditorState;
	oldState?: EditorState;
	from: number;
	to: number;
}) => boolean;

export type BubbleMenuOptions = {
	/** Custom actions array, or a function receiving the defaults. */
	actions?: BubbleAction[] | ((defaults: BubbleAction[]) => BubbleAction[]);
	/** Whether the link editor is reachable from the toolbar. Defaults to `true`. */
	link?: boolean;
	pluginKey?: PluginKey | string;
	/** Debounce before the menu repositions. Defaults to Tiptap's 250 ms. */
	updateDelay?: number;
	shouldShow?: BubbleMenuShouldShow | null;
	appendTo?: HTMLElement | (() => HTMLElement);
};

export type BubbleMenuProps = {
	editor: Editor;
	actions: BubbleAction[];
	link: boolean;
	/**
	 * Incremented by the extension's `Mod-K` shortcut. A counter rather than a
	 * boolean so a second press reopens the editor after it was dismissed.
	 */
	openLinkRequest?: number;
};

export type LinkEditorProps = {
	editor: Editor;
	/** Returns focus to the toolbar when the editor closes. */
	onClose: () => void;
};
