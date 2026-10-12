import {
	forwardRef,
	useImperativeHandle,
	useState,
	type KeyboardEvent as ReactKeyboardEvent
} from 'react';

import type { SlashMenuRef, SlashPickerProps } from './types.js';

export const MAX_TABLE_ROWS = 8;
export const MAX_TABLE_COLS = 8;

const range = (length: number) => Array.from({ length }, (_, i) => i + 1);

/**
 * A rows × columns grid, chosen by pointer or by arrow key.
 *
 * It calls `insertTable` — the command EC-13 already ships and already
 * tests. The picker is the affordance; the table is not built here.
 */
export const GridPicker = /* @__PURE__ */ forwardRef<
	SlashMenuRef,
	SlashPickerProps
>(function GridPicker({ editor, range: commandRange, onCancel }, ref) {
	const [rows, setRows] = useState(3);
	const [cols, setCols] = useState(3);

	const insert = (nextRows: number, nextCols: number) => {
		editor
			.chain()
			.focus()
			.deleteRange(commandRange)
			.insertTable({
				rows: nextRows,
				cols: nextCols,
				withHeaderRow: true
			})
			.run();
	};

	const move = (rowDelta: number, colDelta: number) => {
		setRows((current) =>
			Math.min(Math.max(current + rowDelta, 1), MAX_TABLE_ROWS)
		);
		setCols((current) =>
			Math.min(Math.max(current + colDelta, 1), MAX_TABLE_COLS)
		);
	};

	const handleKey = (key: string): boolean => {
		switch (key) {
			case 'ArrowDown':
				move(1, 0);
				return true;
			case 'ArrowUp':
				move(-1, 0);
				return true;
			case 'ArrowRight':
				move(0, 1);
				return true;
			case 'ArrowLeft':
				move(0, -1);
				return true;
			case 'Enter':
				insert(rows, cols);
				return true;
			case 'Escape':
			case 'Backspace':
				onCancel();
				return true;
			default:
				return false;
		}
	};

	useImperativeHandle(ref, () => ({
		onKeyDown: ({ event }) => handleKey(event.key)
	}));

	const label = `Insert a ${rows} by ${cols} table`;

	return (
		<div
			className="blockleaf-grid-picker"
			role="application"
			aria-label="Table size"
			onKeyDown={(event: ReactKeyboardEvent<HTMLDivElement>) => {
				if (handleKey(event.key)) {
					event.preventDefault();
				}
			}}
		>
			<div
				className="blockleaf-grid-picker__grid"
				role="presentation"
			>
				{range(MAX_TABLE_ROWS).map((row) => (
					<div
						key={row}
						className="blockleaf-grid-picker__row"
						role="presentation"
					>
						{range(MAX_TABLE_COLS).map((col) => (
							<button
								key={col}
								type="button"
								tabIndex={-1}
								data-row={row}
								data-col={col}
								data-selected={row <= rows && col <= cols}
								aria-label={`${row} by ${col}`}
								className="blockleaf-grid-picker__cell"
								onMouseEnter={() => {
									setRows(row);
									setCols(col);
								}}
								onClick={() => insert(row, col)}
							/>
						))}
					</div>
				))}
			</div>

			<p
				className="blockleaf-grid-picker__label"
				aria-live="polite"
			>
				{rows} × {cols}
			</p>

			<span className="blockleaf-grid-picker__hint">{label}</span>
		</div>
	);
});
