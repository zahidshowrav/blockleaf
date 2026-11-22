import { Extension, type Extensions } from '@tiptap/core';
import { PluginKey } from '@tiptap/pm/state';
import { ReactRenderer } from '@tiptap/react';
import {
	Suggestion,
	exitSuggestion,
	type SuggestionKeyDownProps,
	type SuggestionProps
} from '@tiptap/suggestion';

import { EmojiMenu } from './emoji-menu.js';
import type { EmojiItemsFn, EmojiMenuRef, EmojiOptions } from './types.js';
import {
	EDITOR_CLASS_NAME,
	EMOJI_EXTENSION_NAME
} from '../../core/constants.js';
import {
	parseEmojiData,
	searchEmoji,
	type EmojiItem
} from '../../core/emoji/search.js';
import { defaultLabels } from '../../core/labels.js';
import { allowOutsideCode } from '../suggestion-list/allow.js';

const DEFAULT_LIMIT = 8;
const DEFAULT_MIN_QUERY_LENGTH = 2;

let builtIn: Promise<EmojiItem[]> | null = null;

/**
 * The built-in list, fetched and parsed once, the first time any picker
 * asks. A separate chunk: an editor where nobody types `:` never loads it.
 */
const loadBuiltIn = (): Promise<EmojiItem[]> => {
	builtIn ??= import('../../core/emoji/data.js').then(({ EMOJI_DATA }) =>
		parseEmojiData(EMOJI_DATA)
	);
	return builtIn;
};

const builtInItems =
	(limit: number): EmojiItemsFn =>
	async ({ query }) =>
		searchEmoji(await loadBuiltIn(), query, limit);

/**
 * Opens the emoji picker on `:` and inserts the chosen emoji as plain text
 * (`PA-03`). Nothing new is stored: an emoji in a document is the character.
 */
export const EmojiExtension = /* @__PURE__ */ Extension.create<EmojiOptions>({
	name: EMOJI_EXTENSION_NAME,

	addOptions() {
		return {
			char: ':',
			items: undefined,
			limit: DEFAULT_LIMIT,
			minQueryLength: DEFAULT_MIN_QUERY_LENGTH,
			labels: defaultLabels
		};
	},

	addProseMirrorPlugins() {
		const labels = this.options.labels ?? defaultLabels;
		const items =
			this.options.items ??
			builtInItems(this.options.limit ?? DEFAULT_LIMIT);
		const minQueryLength =
			this.options.minQueryLength ?? DEFAULT_MIN_QUERY_LENGTH;

		return [
			Suggestion<EmojiItem, EmojiItem>({
				editor: this.editor,
				char: this.options.char ?? ':',
				pluginKey: new PluginKey('blockleafEmoji'),
				allow: ({ state, range }) => allowOutsideCode(state, range),
				// The menu looks the emoji up itself; see `SuggestionList`.
				items: () => [],
				command: ({ editor, range, props }) => {
					editor
						.chain()
						.focus()
						.deleteRange(range)
						.insertContent(props.emoji)
						.run();
				},
				render: () => {
					let component: ReactRenderer<EmojiMenuRef> | null = null;
					let unmount: (() => void) | null = null;

					return {
						onStart: (
							props: SuggestionProps<EmojiItem, EmojiItem>
						) => {
							component = new ReactRenderer(EmojiMenu, {
								props: {
									query: props.query,
									items,
									command: props.command,
									labels,
									minQueryLength
								},
								editor: props.editor
							});
							const theme = props.editor.view.dom
								.closest(`.${EDITOR_CLASS_NAME}`)
								?.getAttribute('data-theme');
							if (theme) {
								component.element.setAttribute(
									'data-theme',
									theme
								);
							}
							unmount = props.mount(component.element);
						},

						onUpdate: (
							props: SuggestionProps<EmojiItem, EmojiItem>
						) => {
							component?.updateProps({
								query: props.query,
								command: props.command
							});
						},

						onKeyDown: (props: SuggestionKeyDownProps) => {
							if (props.event.key === 'Escape') {
								exitSuggestion(props.view);
								return true;
							}
							return component?.ref?.onKeyDown(props) ?? false;
						},

						onExit: () => {
							unmount?.();
							component?.destroy();
							component = null;
							unmount = null;
						}
					};
				}
			})
		];
	}
});

/** The emoji picker, ready to add to an extension list. */
export const createEmoji = (options: EmojiOptions = {}): Extensions => [
	EmojiExtension.configure(options)
];

/**
 * Adds the emoji picker to an extension list, replacing one already there.
 *
 * ```ts
 * const extensions = withEmoji(presets.standard());
 * ```
 */
export const withEmoji = (
	extensions: Extensions,
	options: EmojiOptions = {}
): Extensions => [
	...extensions.filter(
		(extension) => extension.name !== EMOJI_EXTENSION_NAME
	),
	...createEmoji(options)
];
