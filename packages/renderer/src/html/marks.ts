import { element } from './escape.js';
import {
	fontFamilyToken,
	fontFamilyValue,
	fontSizeToken,
	fontSizeValue,
	highlightBackground,
	highlightColor,
	linkAttributes,
	textColorToken,
	textColorValue
} from '../attrs.js';
import { type MarkRender } from '../walk.js';

export type HtmlMarkRenderer = MarkRender<string>;

const defaults: Record<string, HtmlMarkRenderer> = {
	bold: ({ children }) => element('strong', {}, children),
	italic: ({ children }) => element('em', {}, children),
	strike: ({ children }) => element('s', {}, children),
	underline: ({ children }) => element('u', {}, children),
	subscript: ({ children }) => element('sub', {}, children),
	superscript: ({ children }) => element('sup', {}, children),
	code: ({ children }) => element('code', {}, children),

	fontFamily: ({ mark, children }) => {
		const token = fontFamilyToken(mark);
		if (!token) return children;
		return element(
			'span',
			{
				'data-font-family': token,
				style: `font-family: ${fontFamilyValue(token)}`
			},
			children
		);
	},

	fontSize: ({ mark, children }) => {
		const token = fontSizeToken(mark);
		if (!token) return children;
		return element(
			'span',
			{
				'data-font-size': token,
				style: `font-size: ${fontSizeValue(token)}`
			},
			children
		);
	},

	textColor: ({ mark, children }) => {
		const token = textColorToken(mark);
		if (!token) return children;
		return element(
			'span',
			{ 'data-color': token, style: `color: ${textColorValue(token)}` },
			children
		);
	},

	highlight: ({ mark, children }) => {
		const color = highlightColor(mark);
		return element(
			'mark',
			{
				'data-color': color,
				style: color
					? `background-color: ${highlightBackground(color)}; color: inherit`
					: undefined
			},
			children
		);
	},

	// An href that does not survive sanitisation drops the anchor and keeps
	// the text.
	link: ({ mark, children }) => {
		const attrs = linkAttributes(mark);
		if (!attrs) return children;

		return element(
			'a',
			{ href: attrs.href, target: attrs.target, rel: attrs.rel },
			children
		);
	}
};

export const defaultHtmlMarks = defaults;

/** An unknown mark renders its text without decoration. */
export const unhandledHtmlMark: HtmlMarkRenderer = ({ children }) => children;
