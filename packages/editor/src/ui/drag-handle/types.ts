import type { Editor } from '@tiptap/core';
import type { PluginKey } from '@tiptap/pm/state';
import type { ComponentType, ReactNode } from 'react';

import type { IconProps } from '../slash-menu/icons.js';

export type BlockActionGroup = 'Turn into' | 'Actions' | (string & {});

/**
 * An entry in the block menu. `pos` is the document position *before* the
 * top-level block the handle is pointing at, which is what every command in
 * `src/core` that acts on a whole block already takes.
 */
export type BlockAction = {
	id: string;
	title: string;
	group: BlockActionGroup;
	shortcut?: string;
	icon?: ReactNode | ComponentType<IconProps> | (() => ReactNode);
	/** Marks the current block type in a "Turn into" list. */
	isActive?: (editor: Editor, pos: number) => boolean;
	/** Hides the entry when it cannot apply — first block cannot move up. */
	isAvailable?: (editor: Editor, pos: number) => boolean;
	/** Rendered in the destructive style. */
	danger?: boolean;
	run: (editor: Editor, pos: number) => void;
};

export type DragHandleOptions = {
	/** Custom block actions, or a function receiving the defaults. */
	actions?: BlockAction[] | ((defaults: BlockAction[]) => BlockAction[]);
	/** Whether the `+` button that inserts a block below is shown. Defaults to `true`. */
	insertButton?: boolean;
	pluginKey?: PluginKey;
};

export type BlockHandleProps = {
	editor: Editor;
	actions: BlockAction[];
	insertButton: boolean;
	/** `null` when no block is hovered — the handle renders nothing. */
	pos: number | null;
};

export type BlockMenuProps = {
	editor: Editor;
	actions: BlockAction[];
	pos: number;
	onClose: () => void;
};
