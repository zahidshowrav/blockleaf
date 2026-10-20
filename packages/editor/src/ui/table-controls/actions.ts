import {
	DeleteTableIcon,
	HeaderIcon,
	InsertAboveIcon,
	InsertBelowIcon,
	InsertLeftIcon,
	InsertRightIcon,
	MergeIcon,
	SplitIcon
} from './icons.js';
import type { TableAction } from './types.js';
import { defaultLabels, type TableLabels } from '../../core/labels.js';
import { TrashIcon } from '../drag-handle/icons.js';
import { whenNodeExists } from '../schema-guard.js';

/**
 * Row and column operations, in the order the handle menus show them.
 *
 * Each `run` is one command from EC-14 or EC-15. `isAvailable` asks the same
 * command whether it can run, rather than re-deriving the answer — the
 * command already knows, and two implementations of "can you delete this
 * column" would eventually disagree.
 */
/** The default row and column actions, built against a label set. */
export const createTableActions = (
	labels: TableLabels = defaultLabels.table
): TableAction[] => [
	{
		id: 'add-row-before',
		title: labels.actions['add-row-before'],
		axis: 'row',
		icon: InsertAboveIcon,
		isAvailable: whenNodeExists('table', (editor) =>
			editor.can().addRowBefore()
		),
		run: (editor) => editor.chain().focus().addRowBefore().run()
	},
	{
		id: 'add-row-after',
		title: labels.actions['add-row-after'],
		axis: 'row',
		icon: InsertBelowIcon,
		isAvailable: whenNodeExists('table', (editor) =>
			editor.can().addRowAfter()
		),
		run: (editor) => editor.chain().focus().addRowAfter().run()
	},
	{
		id: 'add-column-before',
		title: labels.actions['add-column-before'],
		axis: 'column',
		icon: InsertLeftIcon,
		isAvailable: whenNodeExists('table', (editor) =>
			editor.can().addColumnBefore()
		),
		run: (editor) => editor.chain().focus().addColumnBefore().run()
	},
	{
		id: 'add-column-after',
		title: labels.actions['add-column-after'],
		axis: 'column',
		icon: InsertRightIcon,
		isAvailable: whenNodeExists('table', (editor) =>
			editor.can().addColumnAfter()
		),
		run: (editor) => editor.chain().focus().addColumnAfter().run()
	},
	{
		id: 'toggle-header-row',
		title: labels.actions['toggle-header-row'],
		axis: 'row',
		icon: HeaderIcon,
		isAvailable: whenNodeExists('table', (editor) =>
			editor.can().toggleHeaderRow()
		),
		run: (editor) => editor.chain().focus().toggleHeaderRow().run()
	},
	{
		id: 'toggle-header-column',
		title: labels.actions['toggle-header-column'],
		axis: 'column',
		icon: HeaderIcon,
		isAvailable: whenNodeExists('table', (editor) =>
			editor.can().toggleHeaderColumn()
		),
		run: (editor) => editor.chain().focus().toggleHeaderColumn().run()
	},
	{
		id: 'merge-cells',
		title: labels.actions['merge-cells'],
		axis: 'both',
		icon: MergeIcon,
		isAvailable: whenNodeExists('table', (editor) =>
			editor.can().mergeCells()
		),
		run: (editor) => editor.chain().focus().mergeCells().run()
	},
	{
		id: 'split-cell',
		title: labels.actions['split-cell'],
		axis: 'both',
		icon: SplitIcon,
		isAvailable: whenNodeExists('table', (editor) =>
			editor.can().splitCell()
		),
		run: (editor) => editor.chain().focus().splitCell().run()
	},
	{
		id: 'delete-row',
		title: labels.actions['delete-row'],
		axis: 'row',
		icon: TrashIcon,
		danger: true,
		isAvailable: whenNodeExists('table', (editor) =>
			editor.can().deleteRow()
		),
		run: (editor) => editor.chain().focus().deleteRow().run()
	},
	{
		id: 'delete-column',
		title: labels.actions['delete-column'],
		axis: 'column',
		icon: TrashIcon,
		danger: true,
		isAvailable: whenNodeExists('table', (editor) =>
			editor.can().deleteColumn()
		),
		run: (editor) => editor.chain().focus().deleteColumn().run()
	},
	{
		id: 'delete-table',
		title: labels.actions['delete-table'],
		axis: 'both',
		icon: DeleteTableIcon,
		danger: true,
		isAvailable: whenNodeExists('table', (editor) =>
			editor.can().deleteTable()
		),
		run: (editor) => editor.chain().focus().deleteTable().run()
	}
];

export const defaultTableActions: TableAction[] =
	/* @__PURE__ */ createTableActions();

export const resolveTableActions = (
	actions?: TableAction[] | ((defaults: TableAction[]) => TableAction[]),
	defaults: TableAction[] = defaultTableActions
): TableAction[] => {
	if (typeof actions === 'function') {
		return actions(defaults);
	}
	if (Array.isArray(actions)) {
		return actions;
	}
	return defaults;
};

export const actionsForAxis = (
	actions: TableAction[],
	axis: 'row' | 'column'
): TableAction[] =>
	actions.filter((action) => action.axis === axis || action.axis === 'both');
