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
import { TrashIcon } from '../drag-handle/icons.js';

/**
 * Row and column operations, in the order the handle menus show them.
 *
 * Each `run` is one command from EC-14 or EC-15. `isAvailable` asks the same
 * command whether it can run, rather than re-deriving the answer — the
 * command already knows, and two implementations of "can you delete this
 * column" would eventually disagree.
 */
export const defaultTableActions: TableAction[] = [
	{
		id: 'add-row-before',
		title: 'Insert row above',
		axis: 'row',
		icon: InsertAboveIcon,
		isAvailable: (editor) => editor.can().addRowBefore(),
		run: (editor) => editor.chain().focus().addRowBefore().run()
	},
	{
		id: 'add-row-after',
		title: 'Insert row below',
		axis: 'row',
		icon: InsertBelowIcon,
		isAvailable: (editor) => editor.can().addRowAfter(),
		run: (editor) => editor.chain().focus().addRowAfter().run()
	},
	{
		id: 'add-column-before',
		title: 'Insert column left',
		axis: 'column',
		icon: InsertLeftIcon,
		isAvailable: (editor) => editor.can().addColumnBefore(),
		run: (editor) => editor.chain().focus().addColumnBefore().run()
	},
	{
		id: 'add-column-after',
		title: 'Insert column right',
		axis: 'column',
		icon: InsertRightIcon,
		isAvailable: (editor) => editor.can().addColumnAfter(),
		run: (editor) => editor.chain().focus().addColumnAfter().run()
	},
	{
		id: 'toggle-header-row',
		title: 'Toggle header row',
		axis: 'row',
		icon: HeaderIcon,
		isAvailable: (editor) => editor.can().toggleHeaderRow(),
		run: (editor) => editor.chain().focus().toggleHeaderRow().run()
	},
	{
		id: 'toggle-header-column',
		title: 'Toggle header column',
		axis: 'column',
		icon: HeaderIcon,
		isAvailable: (editor) => editor.can().toggleHeaderColumn(),
		run: (editor) => editor.chain().focus().toggleHeaderColumn().run()
	},
	{
		id: 'merge-cells',
		title: 'Merge cells',
		axis: 'both',
		icon: MergeIcon,
		isAvailable: (editor) => editor.can().mergeCells(),
		run: (editor) => editor.chain().focus().mergeCells().run()
	},
	{
		id: 'split-cell',
		title: 'Split cell',
		axis: 'both',
		icon: SplitIcon,
		isAvailable: (editor) => editor.can().splitCell(),
		run: (editor) => editor.chain().focus().splitCell().run()
	},
	{
		id: 'delete-row',
		title: 'Delete row',
		axis: 'row',
		icon: TrashIcon,
		danger: true,
		isAvailable: (editor) => editor.can().deleteRow(),
		run: (editor) => editor.chain().focus().deleteRow().run()
	},
	{
		id: 'delete-column',
		title: 'Delete column',
		axis: 'column',
		icon: TrashIcon,
		danger: true,
		isAvailable: (editor) => editor.can().deleteColumn(),
		run: (editor) => editor.chain().focus().deleteColumn().run()
	},
	{
		id: 'delete-table',
		title: 'Delete table',
		axis: 'both',
		icon: DeleteTableIcon,
		danger: true,
		isAvailable: (editor) => editor.can().deleteTable(),
		run: (editor) => editor.chain().focus().deleteTable().run()
	}
];

export const resolveTableActions = (
	actions?: TableAction[] | ((defaults: TableAction[]) => TableAction[])
): TableAction[] => {
	if (typeof actions === 'function') {
		return actions(defaultTableActions);
	}
	if (Array.isArray(actions)) {
		return actions;
	}
	return defaultTableActions;
};

export const actionsForAxis = (
	actions: TableAction[],
	axis: 'row' | 'column'
): TableAction[] =>
	actions.filter((action) => action.axis === axis || action.axis === 'both');
