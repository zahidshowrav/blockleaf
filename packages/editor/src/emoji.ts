/**
 * Emoji, as an opt-in subpath (`PA-03`).
 *
 * Type `:` and a word, pick from the list, and the emoji goes in as plain
 * text. Nothing new is stored, so a document with emoji in it is readable by
 * every editor and renderer, with or without this import.
 *
 * ```ts
 * import { presets } from '@blockleaf/editor/extensions';
 * import { withEmoji } from '@blockleaf/editor/emoji';
 *
 * const extensions = withEmoji(presets.standard());
 * ```
 *
 * The built-in list is a separate chunk, loaded the first time the picker
 * opens.
 */
export { EMOJI_EXTENSION_NAME } from './core/constants.js';
export {
	parseEmojiData,
	searchEmoji,
	type EmojiItem
} from './core/emoji/search.js';
export {
	EmojiExtension,
	EmojiMenu,
	createEmoji,
	withEmoji,
	type EmojiItemsFn,
	type EmojiMenuProps,
	type EmojiMenuRef,
	type EmojiOptions
} from './ui/emoji/index.js';
