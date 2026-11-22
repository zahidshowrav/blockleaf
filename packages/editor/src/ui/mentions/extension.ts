import { Extension, type Extensions } from '@tiptap/core';
import { PluginKey } from '@tiptap/pm/state';
import { ReactRenderer } from '@tiptap/react';
import {
	Suggestion,
	exitSuggestion,
	type SuggestionKeyDownProps,
	type SuggestionProps
} from '@tiptap/suggestion';

import { MentionMenu } from './mention-menu.js';
import type {
	MentionItem,
	MentionMenuRef,
	MentionsOptions,
	MentionTrigger
} from './types.js';
import {
	EDITOR_CLASS_NAME,
	MENTION_NODE,
	MENTION_PREFIX,
	MENTIONS_EXTENSION_NAME
} from '../../core/constants.js';
import { defaultLabels } from '../../core/labels.js';
import { Mention } from '../../core/nodes/mention.js';

/** The triggers the options describe: the list, or the one shorthand trigger. */
const triggersOf = (options: MentionsOptions): MentionTrigger[] => {
	if (options.triggers?.length) return options.triggers;
	if (!options.items) return [];
	return [
		{
			char: options.char ?? MENTION_PREFIX,
			kind: options.kind ?? null,
			items: options.items
		}
	];
};

/**
 * Opens the mention picker on `@` — or on each trigger's own character —
 * and inserts the chosen item as a `mention` node.
 */
export const MentionsExtension =
	/* @__PURE__ */ Extension.create<MentionsOptions>({
		name: MENTIONS_EXTENSION_NAME,

		addOptions() {
			return {
				items: undefined,
				char: undefined,
				kind: undefined,
				triggers: undefined,
				labels: defaultLabels
			};
		},

		addProseMirrorPlugins() {
			const labels = this.options.labels ?? defaultLabels;

			return triggersOf(this.options).map((trigger, index) =>
				Suggestion<MentionItem, MentionItem>({
					editor: this.editor,
					char: trigger.char ?? MENTION_PREFIX,
					pluginKey: new PluginKey(`blockleafMentions${index}`),
					allow: ({ state, range }) => {
						if (!state.schema.nodes[MENTION_NODE]) return false;
						const $from = state.doc.resolve(range.from);
						// Code is literal: an `@` in it is an `@`, in a code
						// block or under an inline code mark.
						if ($from.parent.type.spec.code) return false;
						let inCode = false;
						state.doc.nodesBetween(range.from, range.to, (node) => {
							if (
								node.marks.some((mark) => mark.type.spec.code)
							) {
								inCode = true;
							}
						});
						return !inCode && $from.parent.inlineContent;
					},
					// The menu asks the host itself; see `MentionMenu`.
					items: () => [],
					command: ({ editor, range, props }) => {
						editor
							.chain()
							.focus()
							.deleteRange(range)
							.insertMention({
								id: props.id,
								label: props.label,
								kind: props.kind ?? trigger.kind ?? null
							})
							.run();
					},
					render: () => {
						let component: ReactRenderer<MentionMenuRef> | null =
							null;
						let unmount: (() => void) | null = null;

						return {
							onStart: (
								props: SuggestionProps<MentionItem, MentionItem>
							) => {
								component = new ReactRenderer(MentionMenu, {
									props: {
										query: props.query,
										items: trigger.items,
										command: props.command,
										labels
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
								props: SuggestionProps<MentionItem, MentionItem>
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
								return (
									component?.ref?.onKeyDown(props) ?? false
								);
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
			);
		}
	});

/**
 * The mention node and its picker, ready to add to an extension list.
 *
 * ```ts
 * const extensions = [...presets.standard(), ...createMentions({ items })];
 * ```
 */
export const createMentions = (options: MentionsOptions): Extensions => [
	Mention,
	MentionsExtension.configure(options)
];

/**
 * Adds mentions to an extension list, replacing any mention node or picker
 * already in it — two extensions with one name is a Tiptap warning and an
 * undefined winner.
 *
 * ```ts
 * const extensions = withMentions(presets.standard(), {
 * 	items: ({ query }) => searchPeople(query)
 * });
 * ```
 */
export const withMentions = (
	extensions: Extensions,
	options: MentionsOptions
): Extensions => [
	...extensions.filter(
		(extension) =>
			extension.name !== MENTION_NODE &&
			extension.name !== MENTIONS_EXTENSION_NAME
	),
	...createMentions(options)
];
