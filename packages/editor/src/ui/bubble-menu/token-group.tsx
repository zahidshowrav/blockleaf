import {
	useCallback,
	useRef,
	useState,
	type KeyboardEvent as ReactKeyboardEvent,
	type ReactNode
} from 'react';

export interface TokenOption {
	/** The token, or `null` for the option that takes the style off. */
	value: string | null;
	/** Announced, and shown as a tooltip. */
	name: string;
	/** What the option shows. */
	content: ReactNode;
}

export interface TokenGroupProps {
	label: string;
	options: readonly TokenOption[];
	/** The token applied now, or `null` for none. */
	current: string | null;
	onPick: (value: string | null) => void;
	onEscape: () => void;
	/** Takes focus when the panel opens. Only one group in a panel should. */
	autoFocus?: boolean;
	/** The block class: `__option` is each button. */
	className: string;
}

/**
 * One choice of a style token, as a radio group (`PA-05`, `PA-10`): the
 * arrow keys move and wrap, Home and End jump, Enter or Space picks, Escape
 * leaves. A panel with two groups — family and size, text and background —
 * is two tab stops, one per group, as the radio pattern has it.
 */
export const TokenGroup = ({
	label,
	options,
	current,
	onPick,
	onEscape,
	autoFocus = false,
	className
}: TokenGroupProps) => {
	const [focused, setFocused] = useState(() =>
		Math.max(
			options.findIndex((option) => option.value === current),
			0
		)
	);
	const groupRef = useRef<HTMLDivElement>(null);
	const focusedOnce = useRef(!autoFocus);
	const claimFocus = useCallback((node: HTMLButtonElement | null) => {
		if (!node || focusedOnce.current) return;
		focusedOnce.current = true;
		node.focus();
	}, []);

	const focusOption = useCallback((index: number) => {
		setFocused(index);
		groupRef.current
			?.querySelectorAll<HTMLButtonElement>('[role="radio"]')
			[index]?.focus();
	}, []);

	const onKeyDown = useCallback(
		(event: ReactKeyboardEvent<HTMLDivElement>) => {
			const last = options.length - 1;
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
				focusOption(next);
			} else if (event.key === 'Escape') {
				event.preventDefault();
				onEscape();
			}
		},
		[focused, focusOption, onEscape, options.length]
	);

	return (
		<div
			ref={groupRef}
			role="radiogroup"
			aria-label={label}
			className={className}
			onKeyDown={onKeyDown}
		>
			{options.map((option, index) => (
				<button
					key={option.value ?? 'none'}
					ref={index === focused ? claimFocus : undefined}
					type="button"
					role="radio"
					aria-checked={option.value === current}
					aria-label={option.name}
					title={option.name}
					tabIndex={index === focused ? 0 : -1}
					className={`${className}__option`}
					// Keeps the selection in the editor while the mouse is down.
					onMouseDown={(event) => event.preventDefault()}
					onClick={() => onPick(option.value)}
				>
					{option.content}
				</button>
			))}
		</div>
	);
};
