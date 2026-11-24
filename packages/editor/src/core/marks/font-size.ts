import { Mark } from '@tiptap/core';

import { readStyleToken, tokenMarkConfig } from './token-mark.js';
import { FONT_SIZE_MARK } from '../constants.js';

/** The CSS a size token resolves to: its custom property, else the surrounding size. */
export const fontSizeStyle = (token: string): string =>
	`font-size: var(--bl-font-size-${token}, 1em)`;

declare module '@tiptap/core' {
	interface Commands<ReturnType> {
		fontSize: {
			/** Sets the selection in a size token — `'lg'`, or one a host defines. */
			setFontSize: (size: string) => ReturnType;
			/** Takes the size off the selection. */
			unsetFontSize: () => ReturnType;
		};
	}
}

/**
 * Font size. A token, never a length: `lg` resolves
 * through `--bl-font-size-lg`, an `em` value, so it scales with the editor
 * and with a reader's own text size, which a stored `18px` would not. A
 * mark of its own.
 */
export const FontSize = /* @__PURE__ */ Mark.create({
	name: FONT_SIZE_MARK,

	...tokenMarkConfig({
		attribute: 'size',
		dataAttribute: 'data-font-size',
		style: fontSizeStyle
	}),

	addCommands() {
		return {
			setFontSize:
				(size) =>
				({ commands }) =>
					readStyleToken(size)
						? commands.setMark(this.name, { size })
						: false,
			unsetFontSize:
				() =>
				({ commands }) =>
					commands.unsetMark(this.name)
		};
	}
});
