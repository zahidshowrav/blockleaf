import type { Editor } from '@tiptap/core';
import type { EditorState, PluginKey } from '@tiptap/pm/state';
import type { EditorView } from '@tiptap/pm/view';
import type { ComponentType, ReactNode } from 'react';

import { type ResolvedLabels } from '../../core/labels.js';
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

export type BubbleMenuPanelProps = {
	editor: Editor;
	/** The resolved label set. A panel takes the slice it needs. */
	labels?: ResolvedLabels;
	/** Returns focus to the toolbar when the panel closes. */
	onClose: () => void;
};

/**
 * A field that replaces the toolbar until it is dismissed.
 *
 * The link editor is one of these. Anything needing a value the toolbar
 * cannot express as a toggle — an href, an alt string — is a panel rather
 * than a second menu, so the surface and its keyboard handling stay in one
 * place.
 */
export type BubbleMenuPanel = {
	id: string;
	/** Receives the editor so it can say 'Edit' rather than 'Add'. */
	label: (editor: Editor) => string;
	icon?: ReactNode | ComponentType<IconProps> | (() => ReactNode);
	/** Appended to the tooltip, e.g. 'Mod+K'. */
	shortcut?: string;
	/** Drives `aria-pressed` on the button that opens it. */
	isActive?: (editor: Editor) => boolean;
	component: ComponentType<BubbleMenuPanelProps>;
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
	/** The resolved label set. Defaults to English. */
	labels?: ResolvedLabels;
	/** Custom actions array, or a function receiving the defaults. */
	actions?: BubbleAction[] | ((defaults: BubbleAction[]) => BubbleAction[]);
	/** Whether the link editor is reachable from the toolbar. Defaults to `true`. */
	link?: boolean;
	/** An extra panel offered beside the actions, after the link button. */
	panel?: BubbleMenuPanel;
	/** `aria-label` for the toolbar. Defaults to `Text formatting`. */
	label?: string;
	pluginKey?: PluginKey | string;
	/** Debounce before the menu repositions. Defaults to Tiptap's 250 ms. */
	updateDelay?: number;
	shouldShow?: BubbleMenuShouldShow | null;
	appendTo?: HTMLElement | (() => HTMLElement);
};

export type BubbleMenuProps = {
	editor: Editor;
	labels?: ResolvedLabels;
	actions: BubbleAction[];
	link: boolean;
	panel?: BubbleMenuPanel;
	label?: string;
	/**
	 * Incremented by the extension's `Mod-K` shortcut. A counter rather than a
	 * boolean so a second press reopens the editor after it was dismissed.
	 */
	openLinkRequest?: number;
};

export type LinkEditorProps = BubbleMenuPanelProps;
