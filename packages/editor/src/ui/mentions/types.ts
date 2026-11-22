import type { SuggestionKeyDownProps } from '@tiptap/suggestion';

import { type ResolvedLabels } from '../../core/labels.js';

/** One person, page or other thing the picker offers. */
export interface MentionItem {
	/** Stored as the mention's `id`. The host's own key. */
	id: string;
	/** Stored as the mention's `label`, and shown in the picker. */
	label: string;
	/** Stored as the mention's `kind`. Falls back to the trigger's `kind`. */
	kind?: string | null;
	/** A second line in the picker — an email, a page path. Never stored. */
	description?: string;
}

/**
 * Finds what to offer for what was typed after the trigger. May be async —
 * the picker shows its loading line until it settles, and drops an answer
 * that arrives after a newer query's.
 */
export type MentionItemsFn = (props: {
	query: string;
}) => MentionItem[] | Promise<MentionItem[]>;

/** A character that opens the picker, and where its items come from. */
export interface MentionTrigger {
	/** Defaults to `'@'`. */
	char?: string;
	/** Stored on every mention made from this trigger, unless the item has its own. */
	kind?: string | null;
	items: MentionItemsFn;
}

export interface MentionsOptions {
	/** Where the `@` trigger finds its items. Shorthand for one trigger. */
	items?: MentionItemsFn;
	/** The shorthand trigger's character. Defaults to `'@'`. */
	char?: string;
	/** The shorthand trigger's `kind`. */
	kind?: string | null;
	/** More than one trigger, such as `@` for people and `#` for pages. Used instead of the shorthand. */
	triggers?: MentionTrigger[];
	/** The resolved label set. `BlockleafEditor` passes its own. */
	labels?: ResolvedLabels;
}

export interface MentionMenuRef {
	onKeyDown: (props: SuggestionKeyDownProps) => boolean;
}

export interface MentionMenuProps {
	query: string;
	items: MentionItemsFn;
	command: (item: MentionItem) => void;
	labels: ResolvedLabels;
}
