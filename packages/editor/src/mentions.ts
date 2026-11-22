/**
 * Mentions, as an opt-in subpath (`PA-02`).
 *
 * The `mention` node is in the stored schema from version 2, but an editor
 * that never mentions anyone should not ship the picker. Importing from here
 * is what adds it. An editor without it keeps a stored mention as a
 * placeholder and saves it back unchanged.
 *
 * ```ts
 * import { presets } from '@blockleaf/editor/extensions';
 * import { withMentions } from '@blockleaf/editor/mentions';
 *
 * const extensions = withMentions(presets.standard(), {
 * 	items: ({ query }) => searchPeople(query)
 * });
 * ```
 */
export {
	MENTION_NODE,
	MENTION_PREFIX,
	MENTIONS_EXTENSION_NAME
} from './core/constants.js';
export {
	Mention,
	mentionText,
	type MentionAttributes,
	type MentionOptions
} from './core/nodes/mention.js';
export {
	MentionMenu,
	MentionsExtension,
	createMentions,
	withMentions,
	type MentionItem,
	type MentionItemsFn,
	type MentionMenuProps,
	type MentionMenuRef,
	type MentionsOptions,
	type MentionTrigger
} from './ui/mentions/index.js';
