import { Node, mergeAttributes, wrappingInputRule } from '@tiptap/core';

export interface CalloutOptions {
	HTMLAttributes: Record<string, unknown>;
}

declare module '@tiptap/core' {
	interface Commands<ReturnType> {
		callout: {
			setCallout: (attrs?: {
				emoji?: string;
				tone?: string;
			}) => ReturnType;
			toggleCallout: (attrs?: {
				emoji?: string;
				tone?: string;
			}) => ReturnType;
			unsetCallout: () => ReturnType;
		};
	}
}

export const Callout = Node.create<CalloutOptions>({
	name: 'callout',
	group: 'block',
	content: 'block+',
	defining: true,

	addOptions() {
		return {
			HTMLAttributes: {}
		};
	},

	addAttributes() {
		return {
			emoji: {
				default: '💡',
				parseHTML: (element) =>
					element.getAttribute('data-emoji') || '💡',
				renderHTML: (attributes) => ({
					'data-emoji': attributes.emoji
				})
			},
			tone: {
				default: 'info',
				parseHTML: (element) =>
					element.getAttribute('data-tone') || 'info',
				renderHTML: (attributes) => ({
					'data-tone': attributes.tone
				})
			}
		};
	},

	parseHTML() {
		return [
			{
				tag: 'div[data-type="callout"]'
			}
		];
	},

	renderHTML({ HTMLAttributes }) {
		return [
			'div',
			mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
				'data-type': 'callout',
				class: 'blockleaf-callout'
			}),
			0
		];
	},

	addCommands() {
		return {
			setCallout:
				(attrs) =>
				({ commands }) => {
					return commands.wrapIn(this.name, attrs);
				},
			toggleCallout:
				(attrs) =>
				({ commands }) => {
					return commands.toggleWrap(this.name, attrs);
				},
			unsetCallout:
				() =>
				({ commands }) => {
					return commands.lift(this.name);
				}
		};
	},

	addInputRules() {
		return [
			wrappingInputRule({
				find: /^\s*:::\s$/,
				type: this.type
			})
		];
	},

	addKeyboardShortcuts() {
		return {
			'Mod-Shift-c': () => this.editor.commands.toggleCallout(),
			'Mod-Shift-C': () => this.editor.commands.toggleCallout()
		};
	}
});
