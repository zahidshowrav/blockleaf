import { mergeAttributes, type MarkConfig } from '@tiptap/core';

import { STYLE_TOKEN } from '../constants.js';

/** A stored or pasted token, kept only if it is one. */
export const readStyleToken = (value: unknown): string | undefined =>
	typeof value === 'string' && STYLE_TOKEN.test(value) ? value : undefined;

interface TokenMarkOptions {
	/** The one attribute the mark stores — `color`, `family`, `size`. */
	attribute: string;
	/** The HTML attribute that carries the token — `data-color`. */
	dataAttribute: string;
	/** The inline CSS a token resolves to. */
	style: (token: string) => string;
}

/**
 * The parts every token mark shares (`F26`): one attribute holding a token,
 * a `<span>` that carries it in a data attribute and resolves it through a
 * custom property, and parsing that keeps only a valid token. Text colour,
 * font family and font size are each this plus their own commands.
 */
export const tokenMarkConfig = ({
	attribute,
	dataAttribute,
	style
}: TokenMarkOptions): Pick<
	MarkConfig,
	'addAttributes' | 'parseHTML' | 'renderHTML'
> => ({
	addAttributes() {
		return {
			[attribute]: {
				default: null,
				parseHTML: (element) =>
					readStyleToken(element.getAttribute(dataAttribute)) ?? null,
				renderHTML: (attributes) => {
					const token = readStyleToken(attributes[attribute]);
					return token
						? { [dataAttribute]: token, style: style(token) }
						: {};
				}
			}
		};
	},

	parseHTML() {
		return [
			{
				tag: `span[${dataAttribute}]`,
				getAttrs: (element) =>
					readStyleToken(element.getAttribute(dataAttribute))
						? null
						: false
			}
		];
	},

	renderHTML({ HTMLAttributes }) {
		return ['span', mergeAttributes(HTMLAttributes), 0];
	}
});
