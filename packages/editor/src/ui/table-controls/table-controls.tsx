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
	/**
	 * Incremented by the extension's `Mod+Alt+R` / `Mod+Alt+C` shortcuts.
	 * A counter rather than a boolean so a second press reopens a dismissed
	 * menu.
	 */
	openRequest?: number;
	/** Which menu that request opens. */
	openAxis?: TableAxis;
};

const HANDLE_THICKNESS = 14;

export const TableControls = ({
	editor,
	actions,
	placement,
	onLockChange,
	openRequest = 0,
	openAxis: requestedAxis = 'row'
}: TableControlsComponentProps) => {
	const [openAxis, setOpenAxis] = useState<TableAxis | null>(null);
	const [seenRequest, setSeenRequest] = useState(openRequest);

	// Adjusting state from a changed prop during render, so the menu is in
	// the first paint after the shortcut rather than the second — the second
	// loses the focus the shortcut asked for.
	if (openRequest !== seenRequest) {
		setSeenRequest(openRequest);
		setOpenAxis(requestedAxis);
	}

	const close = useCallback(() => {
		setOpenAxis(null);
		onLockChange?.(false);
		// Opened from the document, so focus returns there rather than to a
		// handle that may be about to move.
		editor.commands.focus();
	}, [onLockChange, editor]);

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
