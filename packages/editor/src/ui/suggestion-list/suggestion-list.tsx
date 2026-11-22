import type { SuggestionKeyDownProps } from '@tiptap/suggestion';
import {
	forwardRef,
	useCallback,
	useEffect,
	useId,
	useImperativeHandle,
	useMemo,
	useRef,
	useState,
	type ReactElement,
	type ReactNode,
	type Ref
} from 'react';

export interface SuggestionListRef {
	onKeyDown: (props: SuggestionKeyDownProps) => boolean;
}

export interface SuggestionListProps<T> {
	query: string;
	/** Finds what to offer. May be async; see the component. */
	items: (props: { query: string }) => T[] | Promise<T[]>;
	command: (item: T) => void;
	/** A stable key per item. */
	itemKey: (item: T) => string;
	/** The content of one row. */
	renderItem: (item: T) => ReactNode;
	strings: { menu: string; empty: string; loading: string };
	/** The block class; rows are `__item`, the status line `__empty`. */
	className: string;
	/** Shows nothing, and lets every key through, until the query is this long. */
	minQueryLength?: number;
}

/** The last answer, and the query it answered. */
type Answer<T> = { query: string; items: T[] };

/** Which row is selected, and in which list — a new list starts at the top. */
type Selection<T> = { list: readonly T[]; index: number };

/**
 * The list a suggestion is picked from — a mention, an emoji.
 *
 * It asks for its items itself rather than through the suggestion plugin,
 * which waits for an answer before it shows anything. Here a slow lookup
 * shows a loading line at once, and an answer that comes back after a newer
 * query's is dropped instead of replacing it.
 */
const SuggestionListInner = <T,>(
	{
		query,
		items,
		command,
		itemKey,
		renderItem,
		strings,
		className,
		minQueryLength = 0
	}: SuggestionListProps<T>,
	ref: Ref<SuggestionListRef>
) => {
	const [answer, setAnswer] = useState<Answer<T> | null>(null);
	const [selection, setSelection] = useState<Selection<T>>({
		list: [],
		index: 0
	});
	const listRef = useRef<HTMLDivElement>(null);
	const id = useId();
	const ready = query.length >= minQueryLength;
	// What is on screen stays while the next answer is on its way, so the
	// list does not blink empty on every keystroke.
	const loading = answer?.query !== query;
	const found = useMemo(
		() => (ready && answer ? answer.items : []),
		[ready, answer]
	);
	const selectedIndex = selection.list === found ? selection.index : 0;
	const select = useCallback(
		(index: number) => setSelection({ list: found, index }),
		[found]
	);

	useImperativeHandle(
		ref,
		() => ({
			onKeyDown: ({ event }: SuggestionKeyDownProps): boolean => {
				if (found.length === 0) return false;
				if (event.key === 'ArrowDown') {
					select((selectedIndex + 1) % found.length);
					return true;
				}
				if (event.key === 'ArrowUp') {
					select((selectedIndex - 1 + found.length) % found.length);
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
		[found, selectedIndex, select, command]
	);

	useEffect(() => {
		if (!ready) return undefined;
		let current = true;
		Promise.resolve()
			.then(() => items({ query }))
			.then(
				(result) => {
					if (current) setAnswer({ query, items: result });
				},
				() => {
					if (current) setAnswer({ query, items: [] });
				}
			);
		return () => {
			current = false;
		};
	}, [items, query, ready]);

	useEffect(() => {
		const selected = listRef.current?.querySelector<HTMLElement>(
			`[data-index="${selectedIndex}"]`
		);
		if (selected && typeof selected.scrollIntoView === 'function') {
			selected.scrollIntoView({ block: 'nearest' });
		}
	}, [selectedIndex]);

	if (!ready) return null;

	if (found.length === 0) {
		return (
			<div
				role="status"
				className={className}
			>
				<div className={`${className}__empty`}>
					{loading ? strings.loading : strings.empty}
				</div>
			</div>
		);
	}

	return (
		<div
			ref={listRef}
			role="listbox"
			aria-label={strings.menu}
			aria-activedescendant={`${id}-${selectedIndex}`}
			aria-busy={loading}
			className={className}
			// The list scrolls, so a keyboard has to be able to reach it.
			// Focus normally stays in the editor, which drives the list.
			tabIndex={0}
		>
			{found.map((item, index) => (
				<button
					key={itemKey(item)}
					id={`${id}-${index}`}
					role="option"
					type="button"
					aria-selected={index === selectedIndex}
					data-index={index}
					tabIndex={-1}
					className={`${className}__item`}
					// Keeps the caret in the editor until the item is chosen.
					onMouseDown={(event) => event.preventDefault()}
					onClick={() => command(item)}
					onMouseEnter={() => select(index)}
				>
					{renderItem(item)}
				</button>
			))}
		</div>
	);
};

export const SuggestionList = /* @__PURE__ */ forwardRef(
	SuggestionListInner
) as <T>(
	props: SuggestionListProps<T> & { ref?: Ref<SuggestionListRef> }
) => ReactElement | null;
