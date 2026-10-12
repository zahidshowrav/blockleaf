import type { Selection } from '@tiptap/pm/state';

import {
	DeleteTableIcon,
	HeaderIcon,
	InsertAboveIcon,
	InsertLeftIcon,
	MergeIcon,
	SplitIcon
} from './icons.js';
import {
	createBubbleMenuExtension,
	type BubbleAction,
	type BubbleMenuShouldShow
} from '../bubble-menu/index.js';
import { TrashIcon } from '../drag-handle/icons.js';

export const CELL_MENU_PLUGIN_KEY = 'blockleafCellMenu';

/**
 * Identifies a `CellSelection` by its shape rather than with `instanceof`.
 *
 * Importing `CellSelection` from `@tiptap/pm/tables` would be clearer, but
 * `prosemirror-tables` declares no `sideEffects: false`, so that one import
 * drags the whole package into every consumer — it put 15 kB into the 2 kB
 * schema-only budget. `$anchorCell` and `$headCell` are the two properties
 * that define a cell selection, and they survive minification. See F13.
 */
export const isCellSelection = (selection: Selection): boolean =>
	'$anchorCell' in selection && '$headCell' in selection;

/**
 * Shown only for a selection that spans table cells.
 *
 * A caret inside a single cell is ordinary text editing — the row and column
 * handles already cover that case, and a second toolbar competing with the
 * text one would be noise.
 */
export const cellMenuShouldShow: BubbleMenuShouldShow = ({ editor, state }) => {
	if (!editor.isEditable) return false;
	return isCellSelection(state.selection);
};

/**
 * Every entry calls a command EC-14 or EC-15 already ships. `isAvailable`
 * asks the command itself, so the toolbar cannot claim an operation the
 * editor would refuse.
 */
export const defaultCellActions: BubbleAction[] = [
	{
		id: 'merge-cells',
		title: 'Merge cells',
		icon: MergeIcon,
		isActive: () => false,
		isAvailable: (editor) => editor.can().mergeCells(),
		run: (editor) => editor.chain().focus().mergeCells().run()
	},
	{
		id: 'split-cell',
		title: 'Split cell',
		icon: SplitIcon,
		isActive: () => false,
		isAvailable: (editor) => editor.can().splitCell(),
		run: (editor) => editor.chain().focus().splitCell().run()
	},
	{
		id: 'toggle-header-cell',
		title: 'Toggle header cell',
		icon: HeaderIcon,
		isActive: (editor) => editor.isActive('tableHeader'),
		isAvailable: (editor) => editor.can().toggleHeaderCell(),
		run: (editor) => editor.chain().focus().toggleHeaderCell().run()
	},
	{
		id: 'add-row-after',
		title: 'Insert row below',
		icon: InsertAboveIcon,
		isActive: () => false,
		isAvailable: (editor) => editor.can().addRowAfter(),
		run: (editor) => editor.chain().focus().addRowAfter().run()
	},
	{
		id: 'add-column-after',
		title: 'Insert column right',
		icon: InsertLeftIcon,
		isActive: () => false,
		isAvailable: (editor) => editor.can().addColumnAfter(),
		run: (editor) => editor.chain().focus().addColumnAfter().run()
	},
	{
		id: 'delete-row',
		title: 'Delete row',
		icon: TrashIcon,
		isActive: () => false,
		isAvailable: (editor) => editor.can().deleteRow(),
		run: (editor) => editor.chain().focus().deleteRow().run()
	},
	{
		id: 'delete-table',
		title: 'Delete table',
		icon: DeleteTableIcon,
		isActive: () => false,
		isAvailable: (editor) => editor.can().deleteTable(),
		run: (editor) => editor.chain().focus().deleteTable().run()
	}
];

export type CellMenuOptions = {
	actions?: BubbleAction[] | ((defaults: BubbleAction[]) => BubbleAction[]);
};

/**
 * A second bubble menu instance, with its own plugin key and `shouldShow`.
 * The surface is CH-02's; only what it offers and when it appears differ.
 */
export const createCellMenuExtension = ({
	actions = defaultCellActions
}: CellMenuOptions = {}) =>
	createBubbleMenuExtension({
		actions,
		link: false,
		pluginKey: CELL_MENU_PLUGIN_KEY,
		shouldShow: cellMenuShouldShow
	}).extend({ name: 'cellMenu' });
