import { type EmojiItem } from '../../core/emoji/search.js';
import { type ResolvedLabels } from '../../core/labels.js';
import type { SuggestionListRef } from '../suggestion-list/suggestion-list.js';

/** Finds the emoji to offer for what was typed after the `:`. May be async. */
export type EmojiItemsFn = (props: {
	query: string;
}) => EmojiItem[] | Promise<EmojiItem[]>;

export interface EmojiOptions {
	/** The character that opens the picker. Defaults to `':'`. */
	char?: string;
	/**
	 * Where the emoji come from. Defaults to the built-in list, Emoji 14.0 and
	 * older, loaded the first time the picker opens.
	 */
	items?: EmojiItemsFn;
	/** How many matches the picker shows. Defaults to 8. */
	limit?: number;
	/**
	 * How much has to be typed after the `:` before the picker shows.
	 * Defaults to 2, so `:)` and `10 :30` stay text.
	 */
	minQueryLength?: number;
	/** The resolved label set. `BlockleafEditor` passes its own. */
	labels?: ResolvedLabels;
}

export type EmojiMenuRef = SuggestionListRef;

export interface EmojiMenuProps {
	query: string;
	items: EmojiItemsFn;
	command: (item: EmojiItem) => void;
	labels: ResolvedLabels;
	minQueryLength?: number;
}
