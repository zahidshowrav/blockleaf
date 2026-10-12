import type { Editor } from '@tiptap/core';
import { useCallback, useState } from 'react';

import type { TablePlacement } from './plugin.js';
import { TableMenu } from './table-menu.js';
import type { TableAction, TableAxis } from './types.js';
import { GripIcon } from '../drag-handle/icons.js';

export type TableControlsComponentProps = {
	editor: Editor;
	actions: TableAction[];
	/** `null` when the selection is not inside a table. */
	placement: TablePlacement | null;
	/** Told when a menu opens, so the handles stop tracking the selection. */
	onLockChange?: (locked: boolean) => void;
};

const HANDLE_THICKNESS = 14;

export const TableControls = ({
	editor,
	actions,
	placement,
	onLockChange
}: TableControlsComponentProps) => {
	const [openAxis, setOpenAxis] = useState<TableAxis | null>(null);

	const close = useCallback(() => {
		setOpenAxis(null);
		onLockChange?.(false);
	}, [onLockChange]);

	const open = useCallback(
		(axis: TableAxis) => {
			setOpenAxis(axis);
			onLockChange?.(true);
		},
		[onLockChange]
	);

	if (!placement) {
		return null;
	}

	return (
		<div className="blockleaf-table-controls">
			<button
				type="button"
				className="blockleaf-table-controls__handle"
				data-axis="column"
				aria-label="Column actions"
				aria-haspopup="menu"
				aria-expanded={openAxis === 'column'}
				title="Column actions"
				style={{
					left: `${placement.columnLeft}px`,
					top: `${placement.tableTop - HANDLE_THICKNESS - 2}px`,
					width: `${placement.columnWidth}px`,
					height: `${HANDLE_THICKNESS}px`
				}}
				onClick={() =>
					openAxis === 'column' ? close() : open('column')
				}
			>
				<GripIcon
					aria-hidden="true"
					width="10"
					height="10"
				/>
			</button>

			<button
				type="button"
				className="blockleaf-table-controls__handle"
				data-axis="row"
				aria-label="Row actions"
				aria-haspopup="menu"
				aria-expanded={openAxis === 'row'}
				title="Row actions"
				style={{
					top: `${placement.rowTop}px`,
					left: `${placement.tableLeft - HANDLE_THICKNESS - 2}px`,
					height: `${placement.rowHeight}px`,
					width: `${HANDLE_THICKNESS}px`
				}}
				onClick={() => (openAxis === 'row' ? close() : open('row'))}
			>
				<GripIcon
					aria-hidden="true"
					width="10"
					height="10"
				/>
			</button>

			{openAxis && (
				<div
					className="blockleaf-table-controls__menu-anchor"
					style={
						openAxis === 'column'
							? {
									left: `${placement.columnLeft}px`,
									top: `${placement.tableTop}px`
								}
							: {
									left: `${placement.tableLeft}px`,
									top: `${placement.rowTop}px`
								}
					}
				>
					<TableMenu
						editor={editor}
						actions={actions}
						axis={openAxis}
						onClose={close}
					/>
				</div>
			)}
		</div>
	);
};
