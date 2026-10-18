import { Extension } from '@tiptap/core';
import { ReactRenderer } from '@tiptap/react';
import {
	Suggestion,
	exitSuggestion,
	type SuggestionKeyDownProps,
	type SuggestionProps
} from '@tiptap/suggestion';

import {
	createCommandRegistry,
	defaultSlashCommands,
	type CommandRegistry
} from './registry.js';
import { SlashMenu } from './slash-menu.js';
import type { SlashCommand, SlashMenuOptions, SlashMenuRef } from './types.js';

export const SlashMenuExtension =
	/* @__PURE__ */ Extension.create<SlashMenuOptions>({
		name: 'slashMenu',

		addOptions() {
			return {
				registry: undefined,
				items: undefined,
				char: '/',
				pluginKey: undefined
			};
		},

		addProseMirrorPlugins() {
			const registry: CommandRegistry =
				this.options.registry ??
				(typeof this.options.items === 'function'
					? createCommandRegistry(
							this.options.items(defaultSlashCommands)
						)
					: Array.isArray(this.options.items)
						? createCommandRegistry(this.options.items)
						: createCommandRegistry(defaultSlashCommands));

			return [
				Suggestion<SlashCommand, SlashCommand>({
					editor: this.editor,
					char: this.options.char ?? '/',
					pluginKey: this.options.pluginKey,
					allow: ({ state, range }) => {
						const $from = state.doc.resolve(range.from);
						for (let depth = $from.depth; depth > 0; depth--) {
							const node = $from.node(depth);
							if (node.type.name === 'codeBlock') {
								return false;
							}
						}
						return true;
					},
					items: ({ editor, query }) => {
						return registry
							.filter(query)
							.filter(
								(command) =>
									command.isAvailable?.(editor) ?? true
							);
					},
					command: ({ editor, range, props }) => {
						editor.chain().focus().deleteRange(range).run();
						props.run(editor);
					},
					render: () => {
						let component: ReactRenderer<SlashMenuRef> | null =
							null;
						let unmount: (() => void) | null = null;

						return {
							onStart: (
								props: SuggestionProps<
									SlashCommand,
									SlashCommand
								>
							) => {
								component = new ReactRenderer(SlashMenu, {
									props: {
										...props,
										items: props.items
									},
									editor: props.editor
								});

								const editorEl =
									props.editor.view.dom.closest(
										'.blockleaf-editor'
									);
								if (
									editorEl &&
									editorEl.getAttribute('data-theme') ===
										'dark' &&
									component.element
								) {
									component.element.setAttribute(
										'data-theme',
										'dark'
									);
								}

								unmount = props.mount(component.element);
							},

							onUpdate: (
								props: SuggestionProps<
									SlashCommand,
									SlashCommand
								>
							) => {
								component?.updateProps({
									...props,
									items: props.items
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
			];
		}
	});

export const createSlashMenuExtension = (options?: SlashMenuOptions) => {
	return SlashMenuExtension.configure(options);
};
