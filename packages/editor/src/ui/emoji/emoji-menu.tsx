import { forwardRef } from 'react';

import type { EmojiMenuProps, EmojiMenuRef } from './types.js';
import { type EmojiItem } from '../../core/emoji/search.js';
import { SuggestionList } from '../suggestion-list/suggestion-list.js';

const itemKey = (item: EmojiItem) => item.emoji;

const renderItem = (item: EmojiItem) => (
	<>
		<span
			className="blockleaf-emoji-menu__emoji"
			aria-hidden="true"
		>
			{item.emoji}
		</span>
		<span className="blockleaf-emoji-menu__label">{item.name}</span>
	</>
);

/**
 * The list an emoji is picked from: the emoji, then its name, which is what
 * a screen reader announces. The lookup, the loading line and the keyboard
 * are `SuggestionList`'s.
 */
export const EmojiMenu = /* @__PURE__ */ forwardRef<
	EmojiMenuRef,
	EmojiMenuProps
>(function EmojiMenu({ query, items, command, labels, minQueryLength }, ref) {
	return (
		<SuggestionList
			ref={ref}
			query={query}
			items={items}
			command={command}
			itemKey={itemKey}
			renderItem={renderItem}
			strings={labels.emoji}
			className="blockleaf-emoji-menu"
			minQueryLength={minQueryLength}
		/>
	);
});
