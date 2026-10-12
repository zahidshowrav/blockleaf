import type { Editor } from '@tiptap/core';
import type { ComponentType, ReactNode } from 'react';

import type { IconProps } from '../slash-menu/icons.js';

export type TableAxis = 'row' | 'column';

/**
 * An entry in a row or column menu.
 *
 * Every one calls a command `EC-14` or `EC-15` already ships and already
 * tests. The handle is the affordance; the structure change is not
 * implemented here.
 */
export type TableAction = {
	id: string;
	title: string;
	/** Which handle menu it appears in. */
	axis: TableAxis | 'both';
	icon?: ReactNode | ComponentType<IconProps> | (() => ReactNode);
	/** Hides the entry when the command cannot run on this selection. */
	isAvailable?: (editor: Editor) => boolean;
	danger?: boolean;
	run: (editor: Editor) => void;
};

export type TableControlsOptions = {
	/** Custom table actions, or a function receiving the defaults. */
	actions?: TableAction[] | ((defaults: TableAction[]) => TableAction[]);
};

export type TableHandleGeometry = {
	/** Offsets in px from the table's top-left, one per row and column. */
	rows: Array<{ top: number; height: number }>;
	columns: Array<{ left: number; width: number }>;
	/** The table's own offset within the editor container. */
	top: number;
	left: number;
	width: number;
	height: number;
};

export type TableControlsProps = {
	editor: Editor;
	actions: TableAction[];
	/** `null` when the selection is not inside a table. */
	geometry: TableHandleGeometry | null;
	/** Index of the row or column the cursor is in. */
	activeRow: number;
	activeColumn: number;
};

export type TableMenuProps = {
	editor: Editor;
	actions: TableAction[];
	axis: TableAxis;
	onClose: () => void;
};
