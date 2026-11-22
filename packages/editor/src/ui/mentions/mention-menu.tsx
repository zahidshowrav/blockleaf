import type { SuggestionKeyDownProps } from '@tiptap/suggestion';
import {
	forwardRef,
	useEffect,
	useId,
	useImperativeHandle,
	useRef,
	useState
} from 'react';

import type { MentionItem, MentionMenuProps, MentionMenuRef } from './types.js';

type Lookup =
	| { state: 'loading'; items: MentionItem[] }
	| { state: 'done'; items: MentionItem[] };

/**
 * The list a mention is picked from.
 *
 * It asks the host for items itself rather than through the suggestion
 * plugin, which waits for an answer before it shows anything. Here a slow
 * lookup shows a loading line at once, and an answer that comes back after a
 * newer query's is dropped instead of replacing it.
 */
export const MentionMenu = /* @__PURE__ */ forwardRef<
	MentionMenuRef,
	MentionMenuProps
>(function MentionMenu({ query, items, command, labels }, ref) {
	const [lookup, setLookup] = useState<Lookup>({
		state: 'loading',
		items: []
	});
	const [selectedIndex, setSelectedIndex] = useState(0);
	const listRef = useRef<HTMLDivElement>(null);
	const id = useId();
	const found = lookup.items;

	useImperativeHandle(
		ref,
		() => ({
			onKeyDown: ({ event }: SuggestionKeyDownProps): boolean => {
				if (found.length === 0) return false;
				if (event.key === 'ArrowDown') {
					setSelectedIndex((index) => (index + 1) % found.length);
					return true;
				}
				if (event.key === 'ArrowUp') {
					setSelectedIndex(
						(index) => (index - 1 + found.length) % found.length
					);
					return true;
				}
				if (event.key === 'Enter' || event.key === 'Tab') {
					const item = found[selectedIndex];
					if (!item) return false;
					command(item);
					return true;
				}
				return false;
			}
		}),
		[found, selectedIndex, command]
	);

	useEffect(() => {
		let current = true;
		// Keeps what is on screen while the next answer is on its way, so the
		// list does not blink empty on every keystroke.
		setLookup((previous) => ({ state: 'loading', items: previous.items }));
		Promise.resolve()
			.then(() => items({ query }))
			.then(
				(result) => {
					if (current) setLookup({ state: 'done', items: result });
				},
				() => {
					if (current) setLookup({ state: 'done', items: [] });
				}
			);
		return () => {
			current = false;
		};
	}, [items, query]);

	useEffect(() => {
		setSelectedIndex(0);
	}, [found]);

	useEffect(() => {
		const selected = listRef.current?.querySelector<HTMLElement>(
			`[data-index="${selectedIndex}"]`
		);
		if (selected && typeof selected.scrollIntoView === 'function') {
			selected.scrollIntoView({ block: 'nearest' });
		}
	}, [selectedIndex]);

	if (found.length === 0) {
		return (
			<div
				role="status"
				className="blockleaf-mention-menu"
			>
				<div className="blockleaf-mention-menu__empty">
					{lookup.state === 'loading'
						? labels.mentions.loading
						: labels.mentions.empty}
				</div>
			</div>
		);
	}

	return (
		<div
			ref={listRef}
			role="listbox"
			aria-label={labels.mentions.menu}
			aria-activedescendant={`${id}-${selectedIndex}`}
			aria-busy={lookup.state === 'loading'}
			className="blockleaf-mention-menu"
			// The list scrolls, so a keyboard has to be able to reach it.
			// Focus normally stays in the editor, which drives the list.
			tabIndex={0}
		>
			{found.map((item, index) => (
				<button
					key={`${item.kind ?? ''}:${item.id}`}
					id={`${id}-${index}`}
					role="option"
					type="button"
					aria-selected={index === selectedIndex}
					data-index={index}
					tabIndex={-1}
					className="blockleaf-mention-menu__item"
					// Keeps the caret in the editor until the item is chosen.
					onMouseDown={(event) => event.preventDefault()}
					onClick={() => command(item)}
					onMouseEnter={() => setSelectedIndex(index)}
				>
					<span className="blockleaf-mention-menu__label">
						{item.label}
					</span>
					{item.description ? (
						<span className="blockleaf-mention-menu__description">
							{item.description}
						</span>
					) : null}
				</button>
			))}
		</div>
	);
});
