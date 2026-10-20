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
	defaultLabels,
	type ResolvedLabels,
	type TableLabels
} from '../../core/labels.js';
import {
	createBubbleMenuExtension,
	resolveBubbleActions,
	type BubbleAction,
	type BubbleMenuShouldShow
} from '../bubble-menu/index.js';
import { TrashIcon } from '../drag-handle/icons.js';
import { whenNodeExists } from '../schema-guard.js';

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
/** The default in-cell actions, built against a label set. */
export const createCellActions = (
	labels: TableLabels = defaultLabels.table
): BubbleAction[] => [
	{
		id: 'merge-cells',
		title: labels.actions['merge-cells'],
		icon: MergeIcon,
		isActive: () => false,
		isAvailable: whenNodeExists('table', (editor) =>
			editor.can().mergeCells()
		),
		run: (editor) => editor.chain().focus().mergeCells().run()
	},
	{
		id: 'split-cell',
		title: labels.actions['split-cell'],
		icon: SplitIcon,
		isActive: () => false,
		isAvailable: whenNodeExists('table', (editor) =>
			editor.can().splitCell()
		),
		run: (editor) => editor.chain().focus().splitCell().run()
	},
	{
		id: 'toggle-header-cell',
		title: labels.actions['toggle-header-cell'],
		icon: HeaderIcon,
		isActive: (editor) => editor.isActive('tableHeader'),
		isAvailable: whenNodeExists('table', (editor) =>
			editor.can().toggleHeaderCell()
		),
		run: (editor) => editor.chain().focus().toggleHeaderCell().run()
	},
	{
		id: 'add-row-after',
		title: labels.actions['add-row-after'],
		icon: InsertAboveIcon,
		isActive: () => false,
		isAvailable: whenNodeExists('table', (editor) =>
			editor.can().addRowAfter()
		),
		run: (editor) => editor.chain().focus().addRowAfter().run()
	},
	{
		id: 'add-column-after',
		title: labels.actions['add-column-after'],
		icon: InsertLeftIcon,
		isActive: () => false,
		isAvailable: whenNodeExists('table', (editor) =>
			editor.can().addColumnAfter()
		),
		run: (editor) => editor.chain().focus().addColumnAfter().run()
	},
	{
		id: 'delete-row',
		title: labels.actions['delete-row'],
		icon: TrashIcon,
		isActive: () => false,
		isAvailable: whenNodeExists('table', (editor) =>
			editor.can().deleteRow()
		),
		run: (editor) => editor.chain().focus().deleteRow().run()
	},
	{
		id: 'delete-table',
		title: labels.actions['delete-table'],
		icon: DeleteTableIcon,
		isActive: () => false,
		isAvailable: whenNodeExists('table', (editor) =>
			editor.can().deleteTable()
		),
		run: (editor) => editor.chain().focus().deleteTable().run()
	}
];

export const defaultCellActions: BubbleAction[] =
	/* @__PURE__ */ createCellActions();

export type CellMenuOptions = {
	actions?: BubbleAction[] | ((defaults: BubbleAction[]) => BubbleAction[]);
	/** The resolved label set. Defaults to English. */
	labels?: ResolvedLabels;
};

/**
 * A second bubble menu instance, with its own plugin key and `shouldShow`.
 * The surface is CH-02's; only what it offers and when it appears differ.
 */
export const createCellMenuExtension = ({
	labels = defaultLabels,
	actions
}: CellMenuOptions = {}) =>
	createBubbleMenuExtension({
		// Resolved here rather than handed on: the generic bubble extension
		// would fall back to the text toolbar's actions, not the cell's.
		actions: resolveBubbleActions(actions, createCellActions(labels.table)),
		labels,
		label: labels.table.cellMenu,
		link: false,
		pluginKey: CELL_MENU_PLUGIN_KEY,
		shouldShow: cellMenuShouldShow
	}).extend({ name: 'cellMenu' });
