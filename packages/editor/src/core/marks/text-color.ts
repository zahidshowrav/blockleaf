import { Mark } from '@tiptap/core';

import { readStyleToken, tokenMarkConfig } from './token-mark.js';
import { TEXT_COLOR_MARK } from '../constants.js';

/** A stored or pasted colour token, kept only if it is one. */
export const readColorToken = readStyleToken;

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
 * Text colour. A mark of its own rather than an attribute on a
 * shared `textStyle` mark: font family and size are marks of their
 * own too, so none of them ever adds an attribute an older editor would
 * drop.
 *
 * Stores a token, not a colour: `red` is a red that reads on white
 * and a different one that reads on the dark theme.
 */
export const TextColor = /* @__PURE__ */ Mark.create({
	name: TEXT_COLOR_MARK,

	...tokenMarkConfig({
		attribute: 'color',
		dataAttribute: 'data-color',
		style: textColorStyle
	}),

	addCommands() {
		return {
			setTextColor:
				(color) =>
				({ commands }) =>
					readStyleToken(color)
						? commands.setMark(this.name, { color })
						: false,
			unsetTextColor:
				() =>
				({ commands }) =>
					commands.unsetMark(this.name)
		};
	}
});
