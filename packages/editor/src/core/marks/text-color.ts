import { Mark, mergeAttributes } from '@tiptap/core';

import { TEXT_COLOR_MARK } from '../constants.js';

/**
 * What a colour token may look like: lower case, a letter first, at most 32
 * characters. The built-in nine are tokens like any other; a host can define
 * more in CSS. Checked because the token ends up inside a `style` attribute,
 * and nothing that could close the `var()` may get there.
 */
const TOKEN = /^[a-z][a-z0-9-]{0,31}$/;

/** A stored or pasted token, kept only if it is one. */
export const readColorToken = (value: unknown): string | undefined =>
	typeof value === 'string' && TOKEN.test(value) ? value : undefined;

/** The CSS a token resolves to: its custom property, else the text colour. */
export const textColorStyle = (token: string): string =>
	`color: var(--bl-text-${token}, currentColor)`;

declare module '@tiptap/core' {
	interface Commands<ReturnType> {
		textColor: {
			/** Colours the selection with a token — `'red'`, or one a host defines. */
			setTextColor: (color: string) => ReturnType;
			/** Takes the colour off the selection. */
			unsetTextColor: () => ReturnType;
		};
	}
}

/**
 * Text colour (`PA-05`). A mark of its own rather than an attribute on a
 * shared `textStyle` mark (`F26`): font family and size come later as marks
 * of their own too, so none of them ever adds an attribute an older editor
 * would drop.
 *
 * Stores a token, not a colour (`F18`): `red` is a red that reads on white
 * and a different one that reads on the dark theme.
 */
export const TextColor = /* @__PURE__ */ Mark.create({
	name: TEXT_COLOR_MARK,

	addAttributes() {
		return {
			color: {
				default: null,
				parseHTML: (element) =>
					readColorToken(element.getAttribute('data-color')) ?? null,
				renderHTML: (attributes) => {
					const color = readColorToken(attributes.color);
					return color
						? { 'data-color': color, style: textColorStyle(color) }
						: {};
				}
			}
		};
	},

	parseHTML() {
		return [
			{
				tag: 'span[data-color]',
				getAttrs: (element) =>
					readColorToken(element.getAttribute('data-color'))
						? null
						: false
			}
		];
	},

	renderHTML({ HTMLAttributes }) {
		return ['span', mergeAttributes(HTMLAttributes), 0];
	},

	addCommands() {
		return {
			setTextColor:
				(color) =>
				({ commands }) =>
					readColorToken(color)
						? commands.setMark(this.name, { color })
						: false,
			unsetTextColor:
				() =>
				({ commands }) =>
					commands.unsetMark(this.name)
		};
	}
});
