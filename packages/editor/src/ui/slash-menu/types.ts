import type { Editor, Range } from '@tiptap/core';
import type { PluginKey } from '@tiptap/pm/state';
import type { SuggestionKeyDownProps } from '@tiptap/suggestion';
import type { ComponentType, ReactNode } from 'react';

import type { IconProps } from './icons.js';
import type { CommandRegistry } from './registry.js';

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
	run: (editor: Editor) => void;
};

export type SlashMenuRef = {
	onKeyDown: (props: SuggestionKeyDownProps) => boolean;
};

export type SlashMenuProps = {
	items: SlashCommand[];
	command: (item: SlashCommand) => void;
	editor: Editor;
	range: Range;
	query: string;
};

export type SlashMenuOptions = {
	registry?: CommandRegistry;
	items?: SlashCommand[] | ((defaults: SlashCommand[]) => SlashCommand[]);
	char?: string;
	pluginKey?: PluginKey;
};
