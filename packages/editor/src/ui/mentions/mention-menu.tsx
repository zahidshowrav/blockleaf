import { forwardRef } from 'react';

import type { MentionItem, MentionMenuProps, MentionMenuRef } from './types.js';
import { SuggestionList } from '../suggestion-list/suggestion-list.js';

const itemKey = (item: MentionItem) => `${item.kind ?? ''}:${item.id}`;

const renderItem = (item: MentionItem) => (
	<>
		<span className="blockleaf-mention-menu__label">{item.label}</span>
		{item.description ? (
			<span className="blockleaf-mention-menu__description">
				{item.description}
			</span>
		) : null}
	</>
);

/**
 * The list a mention is picked from: a name, and a second line when the host
 * gives one. The lookup, the loading line and the keyboard are
 * `SuggestionList`'s.
 */
export const MentionMenu = /* @__PURE__ */ forwardRef<
	MentionMenuRef,
	MentionMenuProps
>(function MentionMenu({ query, items, command, labels }, ref) {
	return (
		<SuggestionList
			ref={ref}
			query={query}
			items={items}
			command={command}
			itemKey={itemKey}
			renderItem={renderItem}
			strings={labels.mentions}
			className="blockleaf-mention-menu"
		/>
	);
});
