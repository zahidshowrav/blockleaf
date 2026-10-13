import { attributes, element, escapeText, voidElement } from './escape.js';
import {
	blockId,
	calloutEmoji,
	calloutTone,
	codeLanguage,
	headingLevel,
	imageAttributes,
	isChecked,
	listStart
} from '../attrs.js';
import { type NodeRender } from '../walk.js';

/**
 * The default node renderers for the HTML-string target.
 *
 * Every element matches the React target, which in turn matches the editor. A
 * three-way parity suite holds all of them to each other.
 */

export type HtmlNodeRenderer = NodeRender<string>;

const defaults: Record<string, HtmlNodeRenderer> = {
	doc: ({ children }) => children,

	paragraph: ({ node, children }) =>
		element('p', { 'data-id': blockId(node) }, children),

	heading: ({ node, children }) =>
		element(
			`h${headingLevel(node)}`,
			{ 'data-id': blockId(node) },
			children
		),

	blockquote: ({ node, children }) =>
		element('blockquote', { 'data-id': blockId(node) }, children),

	codeBlock: ({ node, children }) => {
		const language = codeLanguage(node);
		return element(
			'pre',
			{ 'data-id': blockId(node) },
			element(
				'code',
				{ class: language ? `language-${language}` : undefined },
				children
			)
		);
	},

	horizontalRule: ({ node }) =>
		voidElement('hr', { 'data-id': blockId(node) }),

	bulletList: ({ node, children }) =>
		element('ul', { 'data-id': blockId(node) }, children),

	orderedList: ({ node, children }) =>
		element(
			'ol',
			{ 'data-id': blockId(node), start: listStart(node) },
			children
		),

	listItem: ({ node, children }) =>
		element('li', { 'data-id': blockId(node) }, children),

	taskList: ({ node, children }) =>
		element(
			'ul',
			{ 'data-id': blockId(node), 'data-type': 'taskList' },
			children
		),

	// The checkbox is disabled for the same reason as in the React target:
	// nothing here can write a change back.
	taskItem: ({ node, children }) =>
		element(
			'li',
			{
				'data-id': blockId(node),
				'data-checked': isChecked(node) ? 'true' : 'false',
				'data-type': 'taskItem'
			},
			element(
				'label',
				{},
				voidElement('input', {
					type: 'checkbox',
					...(isChecked(node) ? { checked: 'checked' } : {}),
					disabled: 'disabled'
				}) + element('span', {}, '')
			) + element('div', {}, children)
		),

	callout: ({ node, children }) =>
		element(
			'div',
			{
				'data-id': blockId(node),
				'data-emoji': calloutEmoji(node),
				'data-tone': calloutTone(node),
				'data-type': 'callout',
				class: 'blockleaf-callout'
			},
			children
		),

	details: ({ node, children }) =>
		`<details${attributes({ 'data-id': blockId(node) })}${
			node.attrs?.open === true ? ' open' : ''
		}>${children}</details>`,

	image: ({ node }) => {
		const attrs = imageAttributes(node);
		if (!attrs) return '';

		return voidElement('img', {
			'data-id': blockId(node),
			src: attrs.src,
			alt: attrs.alt,
			width: attrs.width,
			'data-align': attrs.align,
			class: 'blockleaf-image'
		});
	},

	text: ({ node }) => escapeText(node.text ?? ''),

	hardBreak: () => voidElement('br', {})
};

export const defaultHtmlNodes = defaults;

/** An unknown node keeps its children and loses its wrapper. */
export const unhandledHtmlNode: HtmlNodeRenderer = ({ children }) => children;
