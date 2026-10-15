import type { SuggestionKeyDownProps } from '@tiptap/suggestion';
import {
	forwardRef,
	useCallback,
	useEffect,
	useImperativeHandle,
	useMemo,
	useRef,
	useState
} from 'react';

import type { SlashCommand, SlashMenuProps, SlashMenuRef } from './types.js';

export const SlashMenu = /* @__PURE__ */ forwardRef<
	SlashMenuRef,
	SlashMenuProps
>(function SlashMenu({ items, command, editor, range, query }, ref) {
	const [selectedIndex, setSelectedIndex] = useState(0);
	const [pickerFor, setPickerFor] = useState<SlashCommand | null>(null);
	const containerRef = useRef<HTMLDivElement>(null);
	const pickerRef = useRef<SlashMenuRef>(null);

	/**
	 * The commands bucketed for display, and the flat order that matches what
	 * is on screen.
	 *
	 * Selection indexes `ordered`, never `items`. The registry declares
	 * commands interleaved across groups — Text, then the headings, then the
	 * lists, then Quote and Code back in Basic blocks — so stepping through
	 * `items` moved the highlight to a different row than the next one down.
	 */
	const { groups, ordered } = useMemo(() => {
		const byGroup = new Map<string, SlashCommand[]>();
		for (const command of items) {
			const list = byGroup.get(command.group) ?? [];
			list.push(command);
			byGroup.set(command.group, list);
		}

		const ordered: SlashCommand[] = [];
		const groups = Array.from(byGroup.entries()).map(
			([group, groupItems]) => ({
				group,
				items: groupItems.map((command) => {
					ordered.push(command);
					return { command, index: ordered.length - 1 };
				})
			})
		);

		return { groups, ordered };
	}, [items]);

	const selectItem = useCallback(
		(index: number) => {
			const item = ordered[index];
			if (!item) return;

			// A command that needs an argument opens its picker instead of
			// running. The suggestion range is left intact so the picker can
			// replace it when it finally does run.
			if (item.picker) {
				setPickerFor(item);
				return;
			}

			command(item);
		},
		[ordered, command]
	);

	const closePicker = useCallback(() => setPickerFor(null), []);

	useImperativeHandle(
		ref,
		() => ({
			onKeyDown: (props: SuggestionKeyDownProps): boolean => {
				const { event } = props;

				// While a picker is open it owns the keyboard.
				if (pickerFor) {
					return pickerRef.current?.onKeyDown(props) ?? false;
				}

				if (ordered.length === 0) {
					return false;
				}

				if (event.key === 'ArrowDown') {
					setSelectedIndex((prev) => (prev + 1) % ordered.length);
					return true;
				}

				if (event.key === 'ArrowUp') {
					setSelectedIndex(
						(prev) => (prev - 1 + ordered.length) % ordered.length
					);
					return true;
				}

				if (event.key === 'Enter') {
					selectItem(selectedIndex);
					return true;
				}

				return false;
			}
		}),
		[ordered, selectedIndex, selectItem, pickerFor]
	);

	// Group all useEffect calls together per project conventions
	useEffect(() => {
		setSelectedIndex(0);
	}, [items, query]);

	useEffect(() => {
		if (!containerRef.current) return;
		const selectedEl = containerRef.current.querySelector<HTMLElement>(
			`[data-index="${selectedIndex}"]`
		);
		if (selectedEl && typeof selectedEl.scrollIntoView === 'function') {
			const isReducedMotion =
				typeof window !== 'undefined' &&
				typeof window.matchMedia === 'function' &&
				window.matchMedia('(prefers-reduced-motion: reduce)').matches;
			selectedEl.scrollIntoView({
				block: 'nearest',
				behavior: isReducedMotion ? 'auto' : 'smooth'
			});
		}
	}, [selectedIndex]);

	if (pickerFor?.picker) {
		const Picker = pickerFor.picker;
		return (
			<div
				className="blockleaf-slash-menu"
				role="presentation"
			>
				<Picker
					ref={pickerRef}
					editor={editor}
					range={range}
					onCancel={closePicker}
				/>
			</div>
		);
	}

	if (items.length === 0) {
		return (
			<div
				ref={containerRef}
				role="status"
				className="blockleaf-slash-menu"
			>
				<div className="blockleaf-slash-menu__empty">
					No results found
				</div>
			</div>
		);
	}

	const activeCommand = ordered[selectedIndex];

	return (
		<div
			ref={containerRef}
			id="blockleaf-slash-menu"
			role="listbox"
			aria-label="Slash commands"
			aria-activedescendant={
				activeCommand
					? `blockleaf-slash-item-${activeCommand.id}`
					: undefined
			}
			className="blockleaf-slash-menu"
			// The list scrolls, so it has to be focusable or a keyboard-only
			// user cannot reach the items below the fold — axe files it as
			// `scrollable-region-focusable`. Normally the editor keeps focus
			// and drives the list through `aria-activedescendant`; this is
			// the fallback for when focus does land here, so the same keys
			// have to work.
			tabIndex={0}
			onKeyDown={(event) => {
				if (items.length === 0) return;

				if (event.key === 'ArrowDown') {
					event.preventDefault();
					setSelectedIndex((prev) => (prev + 1) % items.length);
				} else if (event.key === 'ArrowUp') {
					event.preventDefault();
					setSelectedIndex(
						(prev) => (prev - 1 + items.length) % items.length
					);
				} else if (event.key === 'Enter') {
					event.preventDefault();
					selectItem(selectedIndex);
				}
			}}
		>
			{groups.map(({ group, items: groupItems }) => (
				<div
					key={group}
					role="group"
					aria-label={group}
					className="blockleaf-slash-menu__group"
				>
					<div
						className="blockleaf-slash-menu__group-title"
						role="presentation"
					>
						{group}
					</div>
					{groupItems.map(({ command: cmd, index }) => {
						const isSelected = index === selectedIndex;
						const renderIcon = () => {
							if (!cmd.icon) return null;
							if (typeof cmd.icon === 'function') {
								const IconComp = cmd.icon;
								return <IconComp />;
							}
							return cmd.icon;
						};

						return (
							<button
								key={cmd.id}
								id={`blockleaf-slash-item-${cmd.id}`}
								role="option"
								type="button"
								aria-selected={isSelected}
								data-index={index}
								tabIndex={-1}
								className="blockleaf-slash-menu__item"
								onClick={() => selectItem(index)}
								onMouseEnter={() => setSelectedIndex(index)}
							>
								{cmd.icon && (
									<span
										className="blockleaf-slash-menu__icon"
										aria-hidden="true"
									>
										{renderIcon()}
									</span>
								)}
								<span className="blockleaf-slash-menu__content">
									<span className="blockleaf-slash-menu__title">
										{cmd.title}
									</span>
									{cmd.description && (
										<span className="blockleaf-slash-menu__description">
											{cmd.description}
										</span>
									)}
								</span>
							</button>
						);
					})}
				</div>
			))}
		</div>
	);
});
