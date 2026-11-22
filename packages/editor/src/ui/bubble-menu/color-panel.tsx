import {
	useCallback,
	useRef,
	useState,
	type KeyboardEvent as ReactKeyboardEvent
} from 'react';

import type { BubbleMenuPanelProps } from './types.js';
import { TEXT_COLOR_MARK, TEXT_COLORS } from '../../core/constants.js';
import { defaultLabels } from '../../core/labels.js';

/** `null` is the swatch that takes the colour off. */
const SWATCHES: readonly (string | null)[] = [null, ...TEXT_COLORS];

/**
 * The text colour palette (`PA-05`): "Default" and the nine built-in tokens,
 * as one radio group. The arrow keys move, Enter or Space picks, Escape goes
 * back to the toolbar. Picking applies the colour and closes.
 */
export const ColorPanel = ({
	editor,
	labels = defaultLabels,
	onClose
}: BubbleMenuPanelProps) => {
	const current =
		(editor.getAttributes(TEXT_COLOR_MARK).color as string | undefined) ??
		null;
	const [focused, setFocused] = useState(() =>
		Math.max(SWATCHES.indexOf(current), 0)
	);
	const groupRef = useRef<HTMLDivElement>(null);
	// Focus lands on the current colour once, when the palette opens.
	const focusedOnce = useRef(false);
	const claimFocus = useCallback((node: HTMLButtonElement | null) => {
		if (!node || focusedOnce.current) return;
		focusedOnce.current = true;
		node.focus();
	}, []);

	const focusSwatch = useCallback((index: number) => {
		setFocused(index);
		groupRef.current
			?.querySelectorAll<HTMLButtonElement>('[role="radio"]')
			[index]?.focus();
	}, []);

	const pick = useCallback(
		(color: string | null) => {
			const chain = editor.chain().focus();
			if (color) chain.setTextColor(color).run();
			else chain.unsetTextColor().run();
			onClose();
		},
		[editor, onClose]
	);

	const onKeyDown = useCallback(
		(event: ReactKeyboardEvent<HTMLDivElement>) => {
			const last = SWATCHES.length - 1;
			const moves: Record<string, number> = {
				ArrowRight: focused === last ? 0 : focused + 1,
				ArrowDown: focused === last ? 0 : focused + 1,
				ArrowLeft: focused === 0 ? last : focused - 1,
				ArrowUp: focused === 0 ? last : focused - 1,
				Home: 0,
				End: last
			};
			const next = moves[event.key];
			if (next !== undefined) {
				event.preventDefault();
				focusSwatch(next);
			} else if (event.key === 'Escape') {
				event.preventDefault();
				onClose();
			}
		},
		[focused, focusSwatch, onClose]
	);

	return (
		<div
			ref={groupRef}
			role="radiogroup"
			aria-label={labels.textColor.button}
			className="blockleaf-color-panel"
			onKeyDown={onKeyDown}
		>
			{SWATCHES.map((color, index) => {
				const name = color
					? labels.textColor.colors[
							color as (typeof TEXT_COLORS)[number]
						]
					: labels.textColor.none;
				return (
					<button
						key={color ?? 'none'}
						ref={index === focused ? claimFocus : undefined}
						type="button"
						role="radio"
						aria-checked={color === current}
						aria-label={name}
						title={name}
						data-color={color ?? undefined}
						tabIndex={index === focused ? 0 : -1}
						className="blockleaf-color-panel__swatch"
						// Keeps the selection in the editor while the mouse is down.
						onMouseDown={(event) => event.preventDefault()}
						onClick={() => pick(color)}
					>
						<span
							aria-hidden="true"
							style={
								color
									? {
											color: `var(--bl-text-${color}, currentColor)`
										}
									: undefined
							}
						>
							A
						</span>
					</button>
				);
			})}
		</div>
	);
};
