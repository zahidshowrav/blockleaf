import type { Editor, Range } from '@tiptap/core';
import type { PluginKey } from '@tiptap/pm/state';
import type { SuggestionKeyDownProps } from '@tiptap/suggestion';
import type { ComponentType, ReactNode, Ref } from 'react';

import type { IconProps } from './icons.js';
import type { CommandRegistry } from './registry.js';
import { type ResolvedLabels } from '../../core/labels.js';

export type SlashCommandGroup =
	'Basic blocks' | 'Headings' | 'Lists' | 'Advanced' | (string & {});

export type SlashCommand = {
	id: string;
	title: string;
	description?: string;
	aliases?: string[];
	group: SlashCommandGroup;
	icon?: ReactNode | ComponentType<IconProps> | (() => ReactNode);
	keywords?: string[];
	/**
	 * Rendered in place of the list when the item is chosen, for commands
	 * that need an argument before they can run. When present it replaces
	 * `run`, which still has to exist as the keyboard-only fallback — the
	 * picker is chrome, and `EC` must stay reachable without it.
	 */
	picker?: ComponentType<SlashPickerProps & { ref?: Ref<SlashMenuRef> }>;
	/**
	 * Hides the item when it returns false. For commands whose extension is
	 * optional: the image item is not offered unless an upload adapter is
	 * configured, because without one the command does not exist. Items
	 * without it are always shown.
	 */
	isAvailable?: (editor: Editor) => boolean;
	run: (editor: Editor) => void;
};

export type SlashPickerProps = {
	editor: Editor;
	/** The resolved label set, so a picker can name itself. */
	labels?: ResolvedLabels;
	/** The `/query` text to replace when the command finally runs. */
	range: Range;
	/** Dismiss the picker and return to the list. */
	onCancel: () => void;
};

export type SlashMenuRef = {
	onKeyDown: (props: SuggestionKeyDownProps) => boolean;
};

export type SlashMenuProps = {
	items: SlashCommand[];
	labels?: ResolvedLabels;
	command: (item: SlashCommand) => void;
	editor: Editor;
	range: Range;
	query: string;
};

export type SlashMenuOptions = {
	registry?: CommandRegistry;
	/** Strings the menu renders. Defaults to English. */
	labels?: ResolvedLabels;
	items?: SlashCommand[] | ((defaults: SlashCommand[]) => SlashCommand[]);
	char?: string;
	pluginKey?: PluginKey;
};
